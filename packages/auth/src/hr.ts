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

// Worker-EDITABLE intake (seeded #5). Worker-entered facts — NOT HR-authority data (standing /
// credentials / cases stay HR-owned). All fields optional; an incomplete intake never blocks offers.
export type HrIntakeRecord = Readonly<{
  legalFirstName: string | null;
  legalLastName: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  hasDrivingLicence: boolean;
  licenceClass: string | null;
  licenceExpiry: string | null; // ISO date (YYYY-MM-DD) or null
  hasVehicle: boolean;
  vehicleType: string | null;
  canTravelKm: number | null;
  transportNotes: string | null;
  // Separate, explicit marketing-email consent (CASL): true once the worker opts in. Distinct from the
  // service/account relationship; transactional messages never depend on it.
  marketingEmailOptIn: boolean;
  updatedAt: string;
}>;
// Partial patch the worker submits; only present keys are written.
export type HrIntakeInput = Partial<Omit<HrIntakeRecord, "updatedAt">>;

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

// Restrictive standings require an explicit reason (governance): you cannot silently
// restrict/suspend/deactivate a worker.
export const RESTRICTIVE_STANDINGS: readonly HrStanding[] = ["restricted", "suspended", "inactive"];

export type HrEventRecord = Readonly<{
  id: string;
  subjectType: string;
  subjectId: string;
  eventType: string;
  priorState: string | null;
  newState: string;
  reason: string | null;
  source: string;
  actorUserId: string | null;
  correlationId: string | null;
  createdAt: string;
}>;

// A bounded worker summary for queues/search (never a full-table dump).
export type HrWorkerSummary = Readonly<{
  workerIdentityId: string;
  displayName: string | null;
  standing: HrStanding;
  updatedAt: string;
}>;

export type HrSearchFilters = Readonly<{
  query?: string | null;
  standing?: HrStanding | null;
  credentialType?: string | null;
  credentialStatus?: HrCredentialStatus | null;
  caseStatus?: HrCaseStatus | null;
}>;

// ── Ports ──

export type HrWorkerResolver = Readonly<{
  resolveByUserId(userId: string): Promise<{ workerIdentityId: string } | null>;
}>;

export type HrStore = Readonly<{
  getProfile(workerIdentityId: string): Promise<HrProfileRecord | null>;
  /** Creates the worker's profile; null when one already exists (a concurrent request created it). */
  createProfile(workerIdentityId: string): Promise<HrProfileRecord | null>;
  setStanding(input: { workerIdentityId: string; standing: HrStanding; reason: string | null }): Promise<HrProfileRecord>;

  getIntake(workerIdentityId: string): Promise<HrIntakeRecord | null>;
  upsertIntake(input: { workerIdentityId: string; data: HrIntakeInput }): Promise<HrIntakeRecord>;

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

  listWorkerEvents(input: { workerIdentityId: string; cursor: string | null; limit: number }): Promise<Page<HrEventRecord>>;
  pageByStanding(input: { standings: readonly HrStanding[]; cursor: string | null; limit: number }): Promise<Page<HrWorkerSummary>>;
  searchWorkers(input: { filters: HrSearchFilters; cursor: string | null; limit: number }): Promise<Page<HrWorkerSummary>>;

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

// Validate + bound a worker intake patch. Only keys PRESENT in the input are written. Country-neutral:
// licence class / province are free strings here (any allowed-list lives in config, not this core).
function validateIntakeInput(input: HrIntakeInput): HrIntakeInput {
  const text = (v: unknown, max: number): string | null => {
    if (v === null || v === undefined) return null;
    const t = String(v).trim();
    if (!t) return null;
    if (t.length > max) throw new HrError("invalid", "A field exceeds its maximum length.");
    return t;
  };
  const out: Record<string, unknown> = {};
  if ("legalFirstName" in input) out.legalFirstName = text(input.legalFirstName, 120);
  if ("legalLastName" in input) out.legalLastName = text(input.legalLastName, 120);
  if ("phone" in input) out.phone = text(input.phone, 32);
  if ("addressLine" in input) out.addressLine = text(input.addressLine, 200);
  if ("city" in input) out.city = text(input.city, 120);
  if ("province" in input) out.province = text(input.province, 120);
  if ("postalCode" in input) out.postalCode = text(input.postalCode, 16);
  if ("licenceClass" in input) out.licenceClass = text(input.licenceClass, 16);
  if ("vehicleType" in input) out.vehicleType = text(input.vehicleType, 60);
  if ("transportNotes" in input) out.transportNotes = text(input.transportNotes, 500);
  if ("hasDrivingLicence" in input) out.hasDrivingLicence = Boolean(input.hasDrivingLicence);
  if ("hasVehicle" in input) out.hasVehicle = Boolean(input.hasVehicle);
  // Marketing consent is stored as a timestamp (consent proof); clearing sets it null.
  if ("marketingEmailOptIn" in input) out.marketingEmailOptInAt = input.marketingEmailOptIn ? new Date() : null;
  if ("licenceExpiry" in input) {
    const v = input.licenceExpiry;
    if (v === null || v === undefined || v === "") out.licenceExpiry = null;
    else {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new HrError("invalid", "Invalid licence expiry date.");
      out.licenceExpiry = d.toISOString().slice(0, 10);
    }
  }
  if ("canTravelKm" in input) {
    const v = input.canTravelKm;
    if (v === null || v === undefined) out.canTravelKm = null;
    else {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 100000) throw new HrError("invalid", "Invalid travel distance.");
      out.canTravelKm = n;
    }
  }
  return out as HrIntakeInput;
}

export function createHrService(deps: HrDeps) {
  const now = deps.now ?? (() => new Date());
  const withEffective = (c: Omit<HrCredentialRecord, "effectiveStatus">): HrCredentialRecord => ({
    ...c,
    effectiveStatus: deriveCredentialStatus({ storedStatus: c.status, expiresAt: c.expiresAt, now: now(), ...(deps.warningDays !== undefined ? { warningDays: deps.warningDays } : {}) })
  });

  async function ensureProfile(workerIdentityId: string): Promise<HrProfileRecord> {
    const existing = await deps.store.getProfile(workerIdentityId);
    if (existing) return existing;
    // The profile is created lazily on first touch, so two first requests for the same worker (two
    // reviewers, or a reviewer and the worker) can both see "no profile". Only one insert wins the
    // unique worker index; the other uses the winner's profile instead of failing the request and
    // dropping its change.
    const created = await deps.store.createProfile(workerIdentityId);
    if (!created) {
      const winner = await deps.store.getProfile(workerIdentityId);
      if (!winner) throw new Error("HR profile create reported a duplicate but no profile exists.");
      return winner;
    }
    await deps.store.appendEvent({ subjectType: "profile", subjectId: created.id, workerIdentityId, eventType: "profile_created", newState: created.standing, source: "system" });
    return created;
  }

  return {
    // ── Worker self-view (own profile + credentials + standing). NOT HR case notes. ──
    async getWorkerSelfView(input: { userId: string }): Promise<{ standing: HrStanding; credentials: readonly HrCredentialRecord[]; intake: HrIntakeRecord | null }> {
      const worker = await deps.workers.resolveByUserId(input.userId);
      if (!worker) throw new HrError("denied", "Only a worker can view their HR profile.");
      const profile = await ensureProfile(worker.workerIdentityId);
      const [credentials, intake] = await Promise.all([
        deps.store.listCredentials(worker.workerIdentityId).then((rows) => rows.map(withEffective)),
        deps.store.getIntake(worker.workerIdentityId)
      ]);
      return { standing: profile.standing, credentials, intake };
    },

    // Worker-editable intake (seeded #5). The worker edits only their OWN intake; HR standing,
    // credentials and cases are never writable here. All fields optional; validated + bounded.
    async upsertWorkerIntake(input: { userId: string; input: HrIntakeInput }): Promise<HrIntakeRecord> {
      const worker = await deps.workers.resolveByUserId(input.userId);
      if (!worker) throw new HrError("denied", "Only a worker can edit their HR intake.");
      const profile = await ensureProfile(worker.workerIdentityId);
      const clean = validateIntakeInput(input.input);
      const rec = await deps.store.upsertIntake({ workerIdentityId: worker.workerIdentityId, data: clean });
      await deps.store.appendEvent({ subjectType: "profile", subjectId: profile.id, workerIdentityId: worker.workerIdentityId, eventType: "intake_updated", newState: "updated", source: "worker", actorUserId: input.userId });
      return rec;
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
      // Restrictive states require an explicit reason — no silent restrict/suspend/deactivate.
      if (RESTRICTIVE_STANDINGS.includes(input.standing) && !input.reason?.trim()) {
        throw new HrError("invalid", "A reason is required to restrict, suspend, or deactivate a worker.");
      }
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
    },

    // Full HR event timeline for a worker (bounded, paginated).
    async listWorkerEvents(input: { workerIdentityId: string; cursor?: string | null; limit?: number }): Promise<Page<HrEventRecord>> {
      const limit = Math.min(Math.max(input.limit ?? 50, 1), MAX_PAGE);
      return deps.store.listWorkerEvents({ workerIdentityId: input.workerIdentityId, cursor: input.cursor ?? null, limit });
    },

    // Restricted / suspended (or any-standing) worker queue — bounded, paginated.
    async pageByStanding(input: { standings: readonly HrStanding[]; cursor?: string | null; limit?: number }): Promise<Page<HrWorkerSummary>> {
      const limit = Math.min(Math.max(input.limit ?? 25, 1), MAX_PAGE);
      return deps.store.pageByStanding({ standings: input.standings, cursor: input.cursor ?? null, limit });
    },

    // Indexed, bounded HR search — never a full-table scan.
    async searchWorkers(input: { filters: HrSearchFilters; cursor?: string | null; limit?: number }): Promise<Page<HrWorkerSummary>> {
      const limit = Math.min(Math.max(input.limit ?? 25, 1), MAX_PAGE);
      return deps.store.searchWorkers({ filters: input.filters, cursor: input.cursor ?? null, limit });
    }
  };
}

// ── Prisma adapters ──

type HrPrisma = {
  workerIdentity: { findUnique(args: unknown): Promise<{ id: string } | null> };
  hrProfile: {
    findUnique(args: unknown): Promise<ProfileRow | null>;
    findMany(args: unknown): Promise<unknown[]>;
    create(args: unknown): Promise<ProfileRow>;
    update(args: unknown): Promise<ProfileRow>;
  };
  hrEvent: { create(args: unknown): Promise<unknown>; findMany(args: unknown): Promise<unknown[]> };
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
  workerHrIntake: {
    findUnique(args: unknown): Promise<IntakeRow | null>;
    upsert(args: unknown): Promise<IntakeRow>;
  };
};

type ProfileRow = { id: string; workerIdentityId: string; standing: HrStanding; standingReason: string | null; updatedAt: Date };
type ProfileWithWorkerRow = ProfileRow & { worker: { displayName: string | null } };
type EventRow = { id: string; subjectType: string; subjectId: string; eventType: string; priorState: string | null; newState: string; reason: string | null; source: string; actorUserId: string | null; correlationId: string | null; createdAt: Date };
type CredentialRow = { id: string; workerIdentityId: string; credentialType: string; issuer: string | null; issuedAt: Date | null; expiresAt: Date | null; status: HrCredentialStatus; verificationReference: string | null; supersededById: string | null; updatedAt: Date };
type CaseRow = { id: string; workerIdentityId: string; caseType: string; status: HrCaseStatus; reason: string | null; openedByUserId: string; createdAt: Date; updatedAt: Date };
type IntakeRow = {
  legalFirstName: string | null; legalLastName: string | null; phone: string | null;
  addressLine: string | null; city: string | null; province: string | null; postalCode: string | null;
  hasDrivingLicence: boolean; licenceClass: string | null; licenceExpiry: Date | null;
  hasVehicle: boolean; vehicleType: string | null; canTravelKm: number | null; transportNotes: string | null;
  marketingEmailOptInAt: Date | null;
  updatedAt: Date;
};

const toProfile = (r: ProfileRow): HrProfileRecord => ({ id: r.id, workerIdentityId: r.workerIdentityId, standing: r.standing, standingReason: r.standingReason, updatedAt: r.updatedAt.toISOString() });
const toCred = (r: CredentialRow): Omit<HrCredentialRecord, "effectiveStatus"> => ({ id: r.id, workerIdentityId: r.workerIdentityId, credentialType: r.credentialType, issuer: r.issuer, issuedAt: r.issuedAt?.toISOString() ?? null, expiresAt: r.expiresAt?.toISOString() ?? null, status: r.status, verificationReference: r.verificationReference, supersededById: r.supersededById, updatedAt: r.updatedAt.toISOString() });
const toCase = (r: CaseRow): HrCaseRecord => ({ id: r.id, workerIdentityId: r.workerIdentityId, caseType: r.caseType, status: r.status, reason: r.reason, openedByUserId: r.openedByUserId, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
const toIntake = (r: IntakeRow): HrIntakeRecord => ({
  legalFirstName: r.legalFirstName, legalLastName: r.legalLastName, phone: r.phone,
  addressLine: r.addressLine, city: r.city, province: r.province, postalCode: r.postalCode,
  hasDrivingLicence: r.hasDrivingLicence, licenceClass: r.licenceClass,
  licenceExpiry: r.licenceExpiry ? r.licenceExpiry.toISOString().slice(0, 10) : null,
  hasVehicle: r.hasVehicle, vehicleType: r.vehicleType, canTravelKm: r.canTravelKm,
  transportNotes: r.transportNotes, marketingEmailOptIn: r.marketingEmailOptInAt != null,
  updatedAt: r.updatedAt.toISOString()
});
// Map a validated intake patch to Prisma data (licenceExpiry ISO date → Date for @db.Date).
const toIntakeData = (data: HrIntakeInput): Record<string, unknown> => {
  const d: Record<string, unknown> = { ...data };
  if ("licenceExpiry" in d) d.licenceExpiry = d.licenceExpiry ? new Date(d.licenceExpiry as string) : null;
  return d;
};

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
      try {
        return toProfile(await prisma.hrProfile.create({ data: { workerIdentityId } }));
      } catch (error) {
        // hr_profiles_worker_identity_id_key: a concurrent request created it first.
        if (error && typeof error === "object" && (error as { code?: unknown }).code === "P2002") return null;
        throw error;
      }
    },
    async setStanding({ workerIdentityId, standing, reason }) {
      return toProfile(await prisma.hrProfile.update({ where: { workerIdentityId }, data: { standing, standingReason: reason } }));
    },
    async getIntake(workerIdentityId) {
      const r = await prisma.workerHrIntake.findUnique({ where: { workerIdentityId } });
      return r ? toIntake(r) : null;
    },
    async upsertIntake({ workerIdentityId, data }) {
      const d = toIntakeData(data);
      const r = await prisma.workerHrIntake.upsert({ where: { workerIdentityId }, create: { workerIdentityId, ...d }, update: d });
      return toIntake(r);
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
    async listWorkerEvents({ workerIdentityId, cursor, limit }) {
      const rows = (await prisma.hrEvent.findMany({
        where: { workerIdentityId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      })) as EventRow[];
      const hasMore = rows.length > limit;
      const items: HrEventRecord[] = rows.slice(0, limit).map((r) => ({ id: r.id, subjectType: r.subjectType, subjectId: r.subjectId, eventType: r.eventType, priorState: r.priorState, newState: r.newState, reason: r.reason, source: r.source, actorUserId: r.actorUserId, correlationId: r.correlationId, createdAt: r.createdAt.toISOString() }));
      return { items, nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null };
    },
    async pageByStanding({ standings, cursor, limit }) {
      const rows = (await prisma.hrProfile.findMany({
        where: { standing: { in: [...standings] } },
        include: { worker: { select: { displayName: true } } },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      })) as ProfileWithWorkerRow[];
      const hasMore = rows.length > limit;
      const items: HrWorkerSummary[] = rows.slice(0, limit).map((r) => ({ workerIdentityId: r.workerIdentityId, displayName: r.worker.displayName, standing: r.standing, updatedAt: r.updatedAt.toISOString() }));
      return { items, nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null };
    },
    async searchWorkers({ filters, cursor, limit }) {
      // Indexed, bounded relation-filter query — never an unrestricted full-table scan.
      const workerWhere: Record<string, unknown> = {};
      if (filters.query && filters.query.trim()) workerWhere.displayName = { contains: filters.query.trim(), mode: "insensitive" };
      if (filters.credentialType || filters.credentialStatus) {
        workerWhere.hrCredentials = { some: { ...(filters.credentialType ? { credentialType: filters.credentialType } : {}), ...(filters.credentialStatus ? { status: filters.credentialStatus } : {}) } };
      }
      if (filters.caseStatus) workerWhere.hrCases = { some: { status: filters.caseStatus } };
      const rows = (await prisma.hrProfile.findMany({
        where: { ...(filters.standing ? { standing: filters.standing } : {}), ...(Object.keys(workerWhere).length ? { worker: workerWhere } : {}) },
        include: { worker: { select: { displayName: true } } },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      })) as ProfileWithWorkerRow[];
      const hasMore = rows.length > limit;
      const items: HrWorkerSummary[] = rows.slice(0, limit).map((r) => ({ workerIdentityId: r.workerIdentityId, displayName: r.worker.displayName, standing: r.standing, updatedAt: r.updatedAt.toISOString() }));
      return { items, nextCursor: hasMore ? (rows[limit - 1]?.id ?? null) : null };
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
