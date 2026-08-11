// HR service — the governed HR domain (HR-1 foundation).
//
// Boundaries:
//   - HR OWNS: worker HR profile, credentials, standing, HR cases, HR audit.
//   - HR CONSUMES (never owns): verification state, marketplace, dispatch, offers,
//     assignments, payroll, payments. It stores only references + safe metadata.
//   - HR standing is NORMALIZED + INDEPENDENT of verification — identity_verified does NOT
//     imply ACTIVE standing.
//   - Governed decisions (standing / case transitions / credential lifecycle) require HR
//     authority and are AUDITED (append-only); material history is never silently overwritten.
//   - Workers/employers cannot alter HR standing. Employers never read HR cases.

import {
  deriveCredentialStatus,
  canTransitionCase,
  isValidStanding,
  type HrStanding,
  type HrCredentialStatus,
  type HrCaseStatus
} from "./hrDomain";

export type HrErrorCode = "denied" | "not_found" | "invalid" | "conflict";
export class HrError extends Error {
  readonly code: HrErrorCode;
  constructor(code: HrErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "HrError";
  }
}

export type HrProfileRecord = Readonly<{
  id: string;
  workerIdentityId: string;
  standing: HrStanding;
  standingReason: string | null;
  updatedAt: string;
}>;

export type HrCredentialRecord = Readonly<{
  id: string;
  workerIdentityId: string;
  credentialType: string;
  issuer: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: HrCredentialStatus; // stored status
  effectiveStatus: HrCredentialStatus; // derived at read (expiry applied)
  verificationReference: string | null;
  supersededById: string | null;
  updatedAt: string;
}>;

export type HrCaseRecord = Readonly<{
  id: string;
  workerIdentityId: string;
  caseType: string;
  status: HrCaseStatus;
  reason: string | null;
  openedByUserId: string;
  createdAt: string;
  updatedAt: string;
}>;

export type HrEventInput = Readonly<{
  subjectType: "profile" | "credential" | "case";
  subjectId: string;
  workerIdentityId: string;
  eventType: string;
  priorState?: string | null;
  newState: string;
  reason?: string | null;
  source: "worker" | "hr_admin" | "platform_admin" | "system";
  actorUserId?: string | null;
  correlationId?: string | null;
}>;

export type Page<T> = Readonly<{ items: readonly T[]; nextCursor: string | null }>;

// ── Ports ──

export type HrWorkerResolver = Readonly<{
  resolveByUserId(userId: string): Promise<{ workerIdentityId: string } | null>;
}>;

export type HrStore = Readonly<{
  getProfile(workerIdentityId: string): Promise<HrProfileRecord | null>;
  createProfile(workerIdentityId: string): Promise<HrProfileRecord>;
  setStanding(input: { workerIdentityId: string; standing: HrStanding; reason: string | null }): Promise<HrProfileRecord>;

  listCredentials(workerIdentityId: string): Promise<readonly Omit<HrCredentialRecord, "effectiveStatus">[]>;
  getCredential(id: string): Promise<Omit<HrCredentialRecord, "effectiveStatus"> | null>;
  addCredential(input: {
    workerIdentityId: string;
    credentialType: string;
    issuer: string | null;
    issuedAt: Date | null;
    expiresAt: Date | null;
    verificationReference: string | null;
    safeMetadata: Record<string, unknown> | null;
  }): Promise<Omit<HrCredentialRecord, "effectiveStatus">>;
  setCredentialStatus(input: { id: string; status: HrCredentialStatus; supersededById?: string | null }): Promise<Omit<HrCredentialRecord, "effectiveStatus">>;

  createCase(input: { workerIdentityId: string; caseType: string; reason: string | null; openedByUserId: string }): Promise<HrCaseRecord>;
  getCase(id: string): Promise<HrCaseRecord | null>;
  setCaseStatus(input: { id: string; status: HrCaseStatus }): Promise<HrCaseRecord>;
  listCasesForWorker(workerIdentityId: string): Promise<readonly HrCaseRecord[]>;

  // Bounded, paginated queues (indexed) — never list-all.
  pageExpiringCredentials(input: { cursor: string | null; limit: number; before: Date }): Promise<Page<Omit<HrCredentialRecord, "effectiveStatus">>>;
  pageReviewCases(input: { cursor: string | null; limit: number; statuses: readonly HrCaseStatus[] }): Promise<Page<HrCaseRecord>>;

  appendEvent(event: HrEventInput): Promise<void>;
}>;

export type HrDeps = Readonly<{
  workers: HrWorkerResolver;
  store: HrStore;
  now?: () => Date;
  warningDays?: number;
}>;

export type HrService = ReturnType<typeof createHrService>;

const MAX_PAGE = 100;

export function createHrService(deps: HrDeps) {
  const now = deps.now ?? (() => new Date());
  const withEffective = (c: Omit<HrCredentialRecord, "effectiveStatus">): HrCredentialRecord => ({
    ...c,
    effectiveStatus: deriveCredentialStatus({ storedStatus: c.status, expiresAt: c.expiresAt, now: now(), ...(deps.warningDays !== undefined ? { warningDays: deps.warningDays } : {}) })
  });

  async function ensureProfile(workerIdentityId: string): Promise<HrProfileRecord> {
    const existing = await deps.store.getProfile(workerIdentityId);
    if (existing) return existing;
    const created = await deps.store.createProfile(workerIdentityId);
    await deps.store.appendEvent({ subjectType: "profile", subjectId: created.id, workerIdentityId, eventType: "profile_created", newState: created.standing, source: "system" });
    return created;
  }

  return {
    // ── Worker self-view (own profile + credentials + standing). NOT HR case notes. ──
    async getWorkerSelfView(input: { userId: string }): Promise<{ standing: HrStanding; credentials: readonly HrCredentialRecord[] }> {
      const worker = await deps.workers.resolveByUserId(input.userId);
      if (!worker) throw new HrError("denied", "Only a worker can view their HR profile.");
      const profile = await ensureProfile(worker.workerIdentityId);
      const credentials = (await deps.store.listCredentials(worker.workerIdentityId)).map(withEffective);
      return { standing: profile.standing, credentials };
    },

    // ── HR authority: full record (profile + credentials + cases) ──
    async getWorkerHrRecord(workerIdentityId: string): Promise<{ profile: HrProfileRecord; credentials: readonly HrCredentialRecord[]; cases: readonly HrCaseRecord[] }> {
      const profile = await ensureProfile(workerIdentityId);
      const [credentials, cases] = await Promise.all([deps.store.listCredentials(workerIdentityId), deps.store.listCasesForWorker(workerIdentityId)]);
      return { profile, credentials: credentials.map(withEffective), cases };
    },

    // Governed standing decision. Independent of verification; audited.
    async setStanding(input: { actorUserId: string; workerIdentityId: string; standing: string; reason?: string | null; source?: "hr_admin" | "platform_admin" }): Promise<HrProfileRecord> {
      if (!isValidStanding(input.standing)) throw new HrError("invalid", "Unknown HR standing.");
      const profile = await ensureProfile(input.workerIdentityId);
      const updated = await deps.store.setStanding({ workerIdentityId: input.workerIdentityId, standing: input.standing, reason: input.reason ?? null });
      await deps.store.appendEvent({
        subjectType: "profile", subjectId: profile.id, workerIdentityId: input.workerIdentityId, eventType: "standing_changed",
        priorState: profile.standing, newState: input.standing, reason: input.reason ?? null, source: input.source ?? "hr_admin", actorUserId: input.actorUserId
      });
      return updated;
    },

    // Add a credential (governed record — never a raw document).
    async addCredential(input: {
      actorUserId: string; workerIdentityId: string; credentialType: string; issuer?: string | null;
      issuedAt?: string | null; expiresAt?: string | null; verificationReference?: string | null; safeMetadata?: Record<string, unknown> | null;
    }): Promise<HrCredentialRecord> {
      if (!input.credentialType.trim()) throw new HrError("invalid", "A credentialType is required.");
      await ensureProfile(input.workerIdentityId);
      const rec = await deps.store.addCredential({
        workerIdentityId: input.workerIdentityId, credentialType: input.credentialType.trim(), issuer: input.issuer ?? null,
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        verificationReference: input.verificationReference ?? null, safeMetadata: input.safeMetadata ?? null
      });
      await deps.store.appendEvent({ subjectType: "credential", subjectId: rec.id, workerIdentityId: input.workerIdentityId, eventType: "credential_added", newState: rec.status, source: "hr_admin", actorUserId: input.actorUserId });
      return withEffective(rec);
    },

    // Renew a credential: create a NEW record and link the OLD one (history preserved).
    async renewCredential(input: { actorUserId: string; credentialId: string; expiresAt?: string | null; issuedAt?: string | null; verificationReference?: string | null }): Promise<{ old: HrCredentialRecord; renewed: HrCredentialRecord }> {
      const old = await deps.store.getCredential(input.credentialId);
      if (!old) throw new HrError("not_found", "That credential was not found.");
      const renewed = await deps.store.addCredential({
        workerIdentityId: old.workerIdentityId, credentialType: old.credentialType, issuer: old.issuer,
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : now(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        verificationReference: input.verificationReference ?? old.verificationReference, safeMetadata: null
      });
      const supersededOld = await deps.store.setCredentialStatus({ id: old.id, status: "replaced", supersededById: renewed.id });
      await deps.store.appendEvent({ subjectType: "credential", subjectId: old.id, workerIdentityId: old.workerIdentityId, eventType: "credential_replaced", priorState: old.status, newState: "replaced", source: "hr_admin", actorUserId: input.actorUserId, correlationId: renewed.id });
      await deps.store.appendEvent({ subjectType: "credential", subjectId: renewed.id, workerIdentityId: old.workerIdentityId, eventType: "credential_added", newState: renewed.status, source: "hr_admin", actorUserId: input.actorUserId, correlationId: old.id });
      return { old: withEffective(supersededOld), renewed: withEffective(renewed) };
    },

    async revokeCredential(input: { actorUserId: string; credentialId: string; reason?: string | null }): Promise<HrCredentialRecord> {
      const cred = await deps.store.getCredential(input.credentialId);
      if (!cred) throw new HrError("not_found", "That credential was not found.");
      const updated = await deps.store.setCredentialStatus({ id: cred.id, status: "revoked" });
      await deps.store.appendEvent({ subjectType: "credential", subjectId: cred.id, workerIdentityId: cred.workerIdentityId, eventType: "credential_revoked", priorState: cred.status, newState: "revoked", reason: input.reason ?? null, source: "hr_admin", actorUserId: input.actorUserId });
      return withEffective(updated);
    },

    // ── HR cases (governed lifecycle, audited) ──
    async openCase(input: { actorUserId: string; workerIdentityId: string; caseType: string; reason?: string | null }): Promise<HrCaseRecord> {
      if (!input.caseType.trim()) throw new HrError("invalid", "A caseType is required.");
      await ensureProfile(input.workerIdentityId);
      const created = await deps.store.createCase({ workerIdentityId: input.workerIdentityId, caseType: input.caseType.trim(), reason: input.reason ?? null, openedByUserId: input.actorUserId });
      await deps.store.appendEvent({ subjectType: "case", subjectId: created.id, workerIdentityId: input.workerIdentityId, eventType: "case_opened", newState: created.status, reason: input.reason ?? null, source: "hr_admin", actorUserId: input.actorUserId });
      return created;
    },

    async transitionCase(input: { actorUserId: string; caseId: string; to: HrCaseStatus; reason?: string | null }): Promise<HrCaseRecord> {
      const current = await deps.store.getCase(input.caseId);
      if (!current) throw new HrError("not_found", "That case was not found.");
      if (!canTransitionCase(current.status, input.to)) {
        throw new HrError("conflict", `Cannot move a case from ${current.status} to ${input.to}.`);
      }
      const updated = await deps.store.setCaseStatus({ id: input.caseId, status: input.to });
      await deps.store.appendEvent({ subjectType: "case", subjectId: input.caseId, workerIdentityId: current.workerIdentityId, eventType: "case_transitioned", priorState: current.status, newState: input.to, reason: input.reason ?? null, source: "hr_admin", actorUserId: input.actorUserId });
      return updated;
    },

    // ── Bounded, paginated operational queues (never list-all) ──
    async pageExpiringCredentials(input: { cursor?: string | null; limit?: number; withinDays?: number }): Promise<Page<HrCredentialRecord>> {
      const limit = Math.min(Math.max(input.limit ?? 25, 1), MAX_PAGE);
      const before = new Date(now().getTime() + (input.withinDays ?? deps.warningDays ?? 30) * 24 * 60 * 60 * 1000);
      const page = await deps.store.pageExpiringCredentials({ cursor: input.cursor ?? null, limit, before });
      return { items: page.items.map(withEffective), nextCursor: page.nextCursor };
    },

    async pageReviewCases(input: { cursor?: string | null; limit?: number }): Promise<Page<HrCaseRecord>> {
      const limit = Math.min(Math.max(input.limit ?? 25, 1), MAX_PAGE);
      return deps.store.pageReviewCases({ cursor: input.cursor ?? null, limit, statuses: ["opened", "under_review", "action_required"] });
    }
  };
}

// ── Prisma adapters ──

type HrPrisma = {
  workerIdentity: { findUnique(args: unknown): Promise<{ id: string } | null> };
  hrProfile: {
    findUnique(args: unknown): Promise<ProfileRow | null>;
    create(args: unknown): Promise<ProfileRow>;
    update(args: unknown): Promise<ProfileRow>;
  };
  hrCredential: {
    findUnique(args: unknown): Promise<CredentialRow | null>;
    findMany(args: unknown): Promise<CredentialRow[]>;
    create(args: unknown): Promise<CredentialRow>;
    update(args: unknown): Promise<CredentialRow>;
  };
  hrCase: {
    findUnique(args: unknown): Promise<CaseRow | null>;
    findMany(args: unknown): Promise<CaseRow[]>;
    create(args: unknown): Promise<CaseRow>;
    update(args: unknown): Promise<CaseRow>;
  };
  hrEvent: { create(args: unknown): Promise<unknown> };
};

type ProfileRow = { id: string; workerIdentityId: string; standing: HrStanding; standingReason: string | null; updatedAt: Date };
type CredentialRow = { id: string; workerIdentityId: string; credentialType: string; issuer: string | null; issuedAt: Date | null; expiresAt: Date | null; status: HrCredentialStatus; verificationReference: string | null; supersededById: string | null; updatedAt: Date };
type CaseRow = { id: string; workerIdentityId: string; caseType: string; status: HrCaseStatus; reason: string | null; openedByUserId: string; createdAt: Date; updatedAt: Date };

const toProfile = (r: ProfileRow): HrProfileRecord => ({ id: r.id, workerIdentityId: r.workerIdentityId, standing: r.standing, standingReason: r.standingReason, updatedAt: r.updatedAt.toISOString() });
const toCred = (r: CredentialRow): Omit<HrCredentialRecord, "effectiveStatus"> => ({ id: r.id, workerIdentityId: r.workerIdentityId, credentialType: r.credentialType, issuer: r.issuer, issuedAt: r.issuedAt?.toISOString() ?? null, expiresAt: r.expiresAt?.toISOString() ?? null, status: r.status, verificationReference: r.verificationReference, supersededById: r.supersededById, updatedAt: r.updatedAt.toISOString() });
const toCase = (r: CaseRow): HrCaseRecord => ({ id: r.id, workerIdentityId: r.workerIdentityId, caseType: r.caseType, status: r.status, reason: r.reason, openedByUserId: r.openedByUserId, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });

export function createPrismaHrWorkerResolver(prisma: HrPrisma): HrWorkerResolver {
  return {
    async resolveByUserId(userId) {
      const w = await prisma.workerIdentity.findUnique({ where: { userId }, select: { id: true } });
      return w ? { workerIdentityId: w.id } : null;
    }
  };
}

export function createPrismaHrStore(prisma: HrPrisma): HrStore {
  return {
    async getProfile(workerIdentityId) {
      const r = await prisma.hrProfile.findUnique({ where: { workerIdentityId } });
      return r ? toProfile(r) : null;
    },
    async createProfile(workerIdentityId) {
      return toProfile(await prisma.hrProfile.create({ data: { workerIdentityId } }));
    },
    async setStanding({ workerIdentityId, standing, reason }) {
      return toProfile(await prisma.hrProfile.update({ where: { workerIdentityId }, data: { standing, standingReason: reason } }));
    },
    async listCredentials(workerIdentityId) {
      const rows = await prisma.hrCredential.findMany({ where: { workerIdentityId }, orderBy: { createdAt: "desc" } });
      return rows.map(toCred);
    },
    async getCredential(id) {
      const r = await prisma.hrCredential.findUnique({ where: { id } });
      return r ? toCred(r) : null;
    },
    async addCredential(input) {
      return toCred(await prisma.hrCredential.create({ data: { ...input, safeMetadata: (input.safeMetadata ?? undefined) as object | undefined, status: "valid" } }));
    },
    async setCredentialStatus({ id, status, supersededById }) {
      return toCred(await prisma.hrCredential.update({ where: { id }, data: { status, ...(supersededById !== undefined ? { supersededById } : {}) } }));
    },
    async createCase(input) {
      return toCase(await prisma.hrCase.create({ data: input }));
    },
    async getCase(id) {
      const r = await prisma.hrCase.findUnique({ where: { id } });
      return r ? toCase(r) : null;
    },
    async setCaseStatus({ id, status }) {
      return toCase(await prisma.hrCase.update({ where: { id }, data: { status } }));
    },
    async listCasesForWorker(workerIdentityId) {
      const rows = await prisma.hrCase.findMany({ where: { workerIdentityId }, orderBy: { createdAt: "desc" } });
      return rows.map(toCase);
    },
    async pageExpiringCredentials({ cursor, limit, before }) {
      const rows = await prisma.hrCredential.findMany({
        where: { status: { in: ["valid", "expiring"] }, expiresAt: { not: null, lte: before } },
        orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      });
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit).map(toCred);
      return { items, nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null };
    },
    async pageReviewCases({ cursor, limit, statuses }) {
      const rows = await prisma.hrCase.findMany({
        where: { status: { in: [...statuses] } },
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      });
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit).map(toCase);
      return { items, nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null };
    },
    async appendEvent(event) {
      await prisma.hrEvent.create({
        data: {
          subjectType: event.subjectType, subjectId: event.subjectId, workerIdentityId: event.workerIdentityId,
          eventType: event.eventType, priorState: event.priorState ?? null, newState: event.newState,
          reason: event.reason ?? null, source: event.source, actorUserId: event.actorUserId ?? null, correlationId: event.correlationId ?? null
        }
      });
    }
  };
}
