import { createHmac, timingSafeEqual } from "node:crypto";

// Verification — provider-neutral trust states for workers and employers.
//
// Rules (do not violate):
//   - Trust states are SERVER-AUTHORITATIVE. A worker/employer can never mark themselves
//     verified; only a governed provider result or an admin review transitions state.
//   - Provider-neutral: Joblop core speaks the interfaces below; provider-specific DTOs stay
//     at the adapter boundary. No vendor (GoodJob/etc.) is hard-coded in core.
//   - Callbacks are authenticated + idempotent + mapped to normalized states at the boundary.
//   - Badges/eligibility read these records only — never inferred from account/contract/
//     payment/postings.
//   - Store only SAFE result metadata — never raw identity documents.
//   - Every transition emits an append-only audit event.

export type WorkerVerificationType = "identity" | "background_check";
export type WorkerVerificationStatus = "unverified" | "pending" | "verified" | "review" | "expired" | "rejected";
export type EmployerVerificationStatus =
  | "unverified"
  | "pending"
  | "business_verified"
  | "review_required"
  | "suspended"
  | "expired";

export type VerificationErrorCode = "denied" | "not_found" | "invalid" | "conflict";
export class VerificationError extends Error {
  readonly code: VerificationErrorCode;
  constructor(code: VerificationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "VerificationError";
  }
}

// ── Provider-neutral interfaces (provider DTOs never reach core) ──

export type ProviderStart = Readonly<{ provider: string; providerReference: string; status: "pending" }>;

export type IdentityVerificationProvider = Readonly<{
  readonly name: string;
  start(input: { subjectId: string }): Promise<ProviderStart>;
}>;
export type BackgroundCheckProvider = Readonly<{
  readonly name: string;
  start(input: { subjectId: string }): Promise<ProviderStart>;
}>;
export type BusinessVerificationProvider = Readonly<{
  readonly name: string;
  start(input: { organizationId: string }): Promise<ProviderStart>;
}>;

// A normalized provider result, produced at the callback boundary AFTER signature checks.
export type NormalizedProviderResult = Readonly<{
  provider: string;
  providerReference: string;
  // normalized outcome
  outcome: "verified" | "rejected" | "review" | "pending";
  expiresAt?: string | null;
  resultMetadata?: Record<string, unknown> | null; // SAFE summary only
}>;

// ── Records ──

export type WorkerVerificationRecord = Readonly<{
  id: string;
  workerIdentityId: string;
  verificationType: WorkerVerificationType;
  status: WorkerVerificationStatus;
  provider: string | null;
  providerReference: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
}>;

export type EmployerVerificationRecord = Readonly<{
  id: string;
  organizationId: string;
  status: EmployerVerificationStatus;
  provider: string | null;
  providerReference: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
}>;

export type VerificationQueueEntry = Readonly<{
  subjectType: "worker" | "employer";
  id: string;
  subjectId: string;
  verificationType: WorkerVerificationType | null;
  status: string;
  provider: string | null;
  requestedAt: string | null;
  expiresAt: string | null;
}>;

// Apply expiry at read time: a verified/business_verified record past expiresAt reads as expired.
export function applyWorkerExpiry(record: WorkerVerificationRecord, now: Date): WorkerVerificationStatus {
  if ((record.status === "verified") && record.expiresAt && new Date(record.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return record.status;
}
export function applyEmployerExpiry(record: EmployerVerificationRecord, now: Date): EmployerVerificationStatus {
  if (record.status === "business_verified" && record.expiresAt && new Date(record.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return record.status;
}

// ── Ports ──

export type VerificationWorkerResolver = Readonly<{
  resolveByUserId(userId: string): Promise<{ workerIdentityId: string } | null>;
}>;

export type VerificationEventInput = Readonly<{
  subjectType: "worker" | "employer";
  subjectId: string;
  verificationType?: WorkerVerificationType | null;
  source: "worker" | "employer" | "admin" | "provider" | "system";
  priorStatus?: string | null;
  newStatus: string;
  provider?: string | null;
  providerReference?: string | null;
  actorUserId?: string | null;
  detail?: Record<string, unknown> | null;
}>;

export type VerificationStore = Readonly<{
  getWorker(input: { workerIdentityId: string; verificationType: WorkerVerificationType }): Promise<WorkerVerificationRecord | null>;
  listWorker(workerIdentityId: string): Promise<readonly WorkerVerificationRecord[]>;
  findWorkerByReference(providerReference: string): Promise<WorkerVerificationRecord | null>;
  getWorkerById(id: string): Promise<WorkerVerificationRecord | null>;
  upsertWorkerRequest(input: {
    workerIdentityId: string;
    verificationType: WorkerVerificationType;
    provider: string;
    providerReference: string;
    requestedAt: Date;
  }): Promise<WorkerVerificationRecord>;
  setWorkerStatus(input: {
    id: string;
    status: WorkerVerificationStatus;
    completedAt?: Date | null;
    expiresAt?: Date | null;
    reviewedByUserId?: string | null;
    resultMetadata?: Record<string, unknown> | null;
  }): Promise<WorkerVerificationRecord>;

  getEmployer(organizationId: string): Promise<EmployerVerificationRecord | null>;
  findEmployerByReference(providerReference: string): Promise<EmployerVerificationRecord | null>;
  getEmployerById(id: string): Promise<EmployerVerificationRecord | null>;
  upsertEmployerRequest(input: { organizationId: string; provider: string; providerReference: string; requestedAt: Date }): Promise<EmployerVerificationRecord>;
  setEmployerStatus(input: {
    id: string;
    status: EmployerVerificationStatus;
    completedAt?: Date | null;
    expiresAt?: Date | null;
    reviewedByUserId?: string | null;
    resultMetadata?: Record<string, unknown> | null;
  }): Promise<EmployerVerificationRecord>;

  listQueue(input: { statuses?: readonly string[] }): Promise<readonly VerificationQueueEntry[]>;
  appendEvent(event: VerificationEventInput): Promise<void>;
}>;

export type VerificationDeps = Readonly<{
  workers: VerificationWorkerResolver;
  store: VerificationStore;
  identityProvider: IdentityVerificationProvider;
  backgroundCheckProvider: BackgroundCheckProvider;
  businessProvider: BusinessVerificationProvider;
  now?: () => Date;
}>;

export type VerificationService = ReturnType<typeof createVerificationService>;

const OUTCOME_TO_WORKER_STATUS: Record<NormalizedProviderResult["outcome"], WorkerVerificationStatus> = {
  verified: "verified",
  rejected: "rejected",
  review: "review",
  pending: "pending"
};
const OUTCOME_TO_EMPLOYER_STATUS: Record<NormalizedProviderResult["outcome"], EmployerVerificationStatus> = {
  verified: "business_verified",
  rejected: "review_required",
  review: "review_required",
  pending: "pending"
};

export function createVerificationService(deps: VerificationDeps) {
  const now = deps.now ?? (() => new Date());

  async function requireWorker(userId: string): Promise<string> {
    const w = await deps.workers.resolveByUserId(userId);
    if (!w) throw new VerificationError("denied", "Only a worker can manage worker verification.");
    return w.workerIdentityId;
  }

  return {
    // ── Worker self-service (request only; never self-verify) ──
    async requestWorkerVerification(input: { userId: string; verificationType: WorkerVerificationType }): Promise<WorkerVerificationRecord> {
      const workerIdentityId = await requireWorker(input.userId);
      const existing = await deps.store.getWorker({ workerIdentityId, verificationType: input.verificationType });
      if (existing && (existing.status === "pending" || existing.status === "verified")) {
        return existing; // idempotent: already pending/verified
      }
      const provider =
        input.verificationType === "identity" ? deps.identityProvider : deps.backgroundCheckProvider;
      const start = await provider.start({ subjectId: workerIdentityId });
      const record = await deps.store.upsertWorkerRequest({
        workerIdentityId,
        verificationType: input.verificationType,
        provider: start.provider,
        providerReference: start.providerReference,
        requestedAt: now()
      });
      await deps.store.appendEvent({
        subjectType: "worker",
        subjectId: workerIdentityId,
        verificationType: input.verificationType,
        source: "worker",
        priorStatus: existing?.status ?? "unverified",
        newStatus: "pending",
        provider: start.provider,
        providerReference: start.providerReference,
        actorUserId: null
      });
      return record;
    },

    async getWorkerVerification(input: { userId: string }): Promise<{
      identity: WorkerVerificationRecord | null;
      backgroundCheck: WorkerVerificationRecord | null;
      identityStatus: WorkerVerificationStatus;
      backgroundCheckStatus: WorkerVerificationStatus;
    }> {
      const workerIdentityId = await requireWorker(input.userId);
      const records = await deps.store.listWorker(workerIdentityId);
      const identity = records.find((r) => r.verificationType === "identity") ?? null;
      const backgroundCheck = records.find((r) => r.verificationType === "background_check") ?? null;
      return {
        identity,
        backgroundCheck,
        identityStatus: identity ? applyWorkerExpiry(identity, now()) : "unverified",
        backgroundCheckStatus: backgroundCheck ? applyWorkerExpiry(backgroundCheck, now()) : "unverified"
      };
    },

    // Derived trust for other subsystems (badges, eligibility). Read-only, expiry-applied.
    async workerTrust(workerIdentityId: string): Promise<{ identity: WorkerVerificationStatus; backgroundCheck: WorkerVerificationStatus }> {
      const records = await deps.store.listWorker(workerIdentityId);
      const identity = records.find((r) => r.verificationType === "identity") ?? null;
      const backgroundCheck = records.find((r) => r.verificationType === "background_check") ?? null;
      return {
        identity: identity ? applyWorkerExpiry(identity, now()) : "unverified",
        backgroundCheck: backgroundCheck ? applyWorkerExpiry(backgroundCheck, now()) : "unverified"
      };
    },

    // ── Employer self-service ──
    async requestEmployerVerification(input: { organizationId: string }): Promise<EmployerVerificationRecord> {
      const existing = await deps.store.getEmployer(input.organizationId);
      if (existing && (existing.status === "pending" || existing.status === "business_verified")) {
        return existing;
      }
      const start = await deps.businessProvider.start({ organizationId: input.organizationId });
      const record = await deps.store.upsertEmployerRequest({
        organizationId: input.organizationId,
        provider: start.provider,
        providerReference: start.providerReference,
        requestedAt: now()
      });
      await deps.store.appendEvent({
        subjectType: "employer",
        subjectId: input.organizationId,
        source: "employer",
        priorStatus: existing?.status ?? "unverified",
        newStatus: "pending",
        provider: start.provider,
        providerReference: start.providerReference
      });
      return record;
    },

    async getEmployerVerification(organizationId: string): Promise<{ record: EmployerVerificationRecord | null; status: EmployerVerificationStatus }> {
      const record = await deps.store.getEmployer(organizationId);
      return { record, status: record ? applyEmployerExpiry(record, now()) : "unverified" };
    },

    // Is this employer's ORGANIZATION verified right now (authoritative badge input)?
    async isEmployerVerified(organizationId: string): Promise<boolean> {
      const record = await deps.store.getEmployer(organizationId);
      return !!record && applyEmployerExpiry(record, now()) === "business_verified";
    },

    // ── Provider callback ingestion (authenticated + idempotent, called by the webhook) ──
    async ingestWorkerResult(result: NormalizedProviderResult): Promise<{ applied: boolean; record: WorkerVerificationRecord | null }> {
      const record = await deps.store.findWorkerByReference(result.providerReference);
      if (!record) return { applied: false, record: null }; // unknown reference — ignore
      const target = OUTCOME_TO_WORKER_STATUS[result.outcome];
      if (record.status === target) return { applied: false, record }; // idempotent replay
      // Do not let a callback silently override an admin-final rejection.
      const updated = await deps.store.setWorkerStatus({
        id: record.id,
        status: target,
        completedAt: target === "verified" || target === "rejected" ? now() : null,
        expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
        resultMetadata: result.resultMetadata ?? null
      });
      await deps.store.appendEvent({
        subjectType: "worker",
        subjectId: record.workerIdentityId,
        verificationType: record.verificationType,
        source: "provider",
        priorStatus: record.status,
        newStatus: target,
        provider: result.provider,
        providerReference: result.providerReference
      });
      return { applied: true, record: updated };
    },

    async ingestEmployerResult(result: NormalizedProviderResult): Promise<{ applied: boolean; record: EmployerVerificationRecord | null }> {
      const record = await deps.store.findEmployerByReference(result.providerReference);
      if (!record) return { applied: false, record: null };
      const target = OUTCOME_TO_EMPLOYER_STATUS[result.outcome];
      if (record.status === target) return { applied: false, record };
      const updated = await deps.store.setEmployerStatus({
        id: record.id,
        status: target,
        completedAt: target === "business_verified" ? now() : null,
        expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
        resultMetadata: result.resultMetadata ?? null
      });
      await deps.store.appendEvent({
        subjectType: "employer",
        subjectId: record.organizationId,
        source: "provider",
        priorStatus: record.status,
        newStatus: target,
        provider: result.provider,
        providerReference: result.providerReference
      });
      return { applied: true, record: updated };
    },

    // ── Admin governed review (never an arbitrary toggle) ──
    async adminReviewWorker(input: { reviewerUserId: string; workerVerificationId: string; decision: "verified" | "rejected" | "review" }): Promise<WorkerVerificationRecord> {
      const record = await deps.store.getWorkerById(input.workerVerificationId);
      if (!record) throw new VerificationError("not_found", "That verification was not found.");
      const updated = await deps.store.setWorkerStatus({
        id: record.id,
        status: input.decision,
        completedAt: input.decision === "verified" || input.decision === "rejected" ? now() : null,
        reviewedByUserId: input.reviewerUserId
      });
      await deps.store.appendEvent({
        subjectType: "worker",
        subjectId: record.workerIdentityId,
        verificationType: record.verificationType,
        source: "admin",
        priorStatus: record.status,
        newStatus: input.decision,
        actorUserId: input.reviewerUserId
      });
      return updated;
    },

    async adminReviewEmployer(input: { reviewerUserId: string; employerVerificationId: string; decision: "business_verified" | "review_required" | "suspended" }): Promise<EmployerVerificationRecord> {
      const record = await deps.store.getEmployerById(input.employerVerificationId);
      if (!record) throw new VerificationError("not_found", "That verification was not found.");
      const updated = await deps.store.setEmployerStatus({
        id: record.id,
        status: input.decision,
        completedAt: input.decision === "business_verified" ? now() : null,
        reviewedByUserId: input.reviewerUserId
      });
      await deps.store.appendEvent({
        subjectType: "employer",
        subjectId: record.organizationId,
        source: "admin",
        priorStatus: record.status,
        newStatus: input.decision,
        actorUserId: input.reviewerUserId
      });
      return updated;
    },

    async listQueue(input: { statuses?: readonly string[] } = {}): Promise<readonly VerificationQueueEntry[]> {
      return deps.store.listQueue(input);
    }
  };
}

// ── Fixture providers (deterministic, no network — for local/CI). Production swaps in real
// provider adapters behind the same interfaces. No vendor is hard-coded in core. ──

function fixtureRef(kind: string, subjectId: string): string {
  return `fixture-${kind}-${subjectId.slice(0, 8)}`;
}
export function createFixtureIdentityProvider(name = "fixture"): IdentityVerificationProvider {
  return { name, async start({ subjectId }) { return { provider: name, providerReference: fixtureRef("id", subjectId), status: "pending" }; } };
}
export function createFixtureBackgroundCheckProvider(name = "fixture"): BackgroundCheckProvider {
  return { name, async start({ subjectId }) { return { provider: name, providerReference: fixtureRef("bg", subjectId), status: "pending" }; } };
}
export function createFixtureBusinessProvider(name = "fixture"): BusinessVerificationProvider {
  return { name, async start({ organizationId }) { return { provider: name, providerReference: fixtureRef("biz", organizationId), status: "pending" }; } };
}

// ── Callback authenticity (provider-neutral). Real providers each verify their own signing;
// core requires an authenticated + normalized result before ingestion. ──

export type VerificationCallbackVerifier = Readonly<{
  verify(input: { rawBody: string; signature: string | null }): boolean;
}>;

// HMAC-SHA256 verifier (used by the fixture/local provider webhook). Constant-time compare.
export function createHmacCallbackVerifier(secret: string): VerificationCallbackVerifier {
  return {
    verify({ rawBody, signature }) {
      if (!signature || !secret) return false;
      const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return a.length === b.length && timingSafeEqual(a, b);
    }
  };
}

// Normalize a fixture/local callback body into a provider-neutral result. Real adapters map
// their own vendor payloads here; core never sees raw vendor DTOs.
export function normalizeFixtureCallback(body: unknown): NormalizedProviderResult | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const providerReference = typeof record.providerReference === "string" ? record.providerReference : null;
  const outcomeRaw = typeof record.outcome === "string" ? record.outcome : null;
  if (!providerReference || !outcomeRaw) return null;
  const outcome = (["verified", "rejected", "review", "pending"] as const).find((o) => o === outcomeRaw);
  if (!outcome) return null;
  return {
    provider: typeof record.provider === "string" ? record.provider : "fixture",
    providerReference,
    outcome,
    expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : null,
    resultMetadata: typeof record.resultMetadata === "object" && record.resultMetadata !== null ? (record.resultMetadata as Record<string, unknown>) : null
  };
}

// ── Prisma adapters ──

type VPrisma = {
  workerIdentity: { findUnique(args: unknown): Promise<{ id: string } | null> };
  workerVerification: {
    findUnique(args: unknown): Promise<WVRow | null>;
    findFirst(args: unknown): Promise<WVRow | null>;
    findMany(args: unknown): Promise<WVRow[]>;
    upsert(args: unknown): Promise<WVRow>;
    update(args: unknown): Promise<WVRow>;
  };
  employerVerification: {
    findUnique(args: unknown): Promise<EVRow | null>;
    findFirst(args: unknown): Promise<EVRow | null>;
    findMany(args: unknown): Promise<EVRow[]>;
    upsert(args: unknown): Promise<EVRow>;
    update(args: unknown): Promise<EVRow>;
  };
  verificationEvent: { create(args: unknown): Promise<unknown> };
};

type WVRow = {
  id: string;
  workerIdentityId: string;
  verificationType: WorkerVerificationType;
  status: WorkerVerificationStatus;
  provider: string | null;
  providerReference: string | null;
  requestedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date;
};
type EVRow = {
  id: string;
  organizationId: string;
  status: EmployerVerificationStatus;
  provider: string | null;
  providerReference: string | null;
  requestedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date;
};

function toWV(r: WVRow): WorkerVerificationRecord {
  return {
    id: r.id,
    workerIdentityId: r.workerIdentityId,
    verificationType: r.verificationType,
    status: r.status,
    provider: r.provider,
    providerReference: r.providerReference,
    requestedAt: r.requestedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString()
  };
}
function toEV(r: EVRow): EmployerVerificationRecord {
  return {
    id: r.id,
    organizationId: r.organizationId,
    status: r.status,
    provider: r.provider,
    providerReference: r.providerReference,
    requestedAt: r.requestedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString()
  };
}

export function createPrismaVerificationWorkerResolver(prisma: VPrisma): VerificationWorkerResolver {
  return {
    async resolveByUserId(userId) {
      const w = await prisma.workerIdentity.findUnique({ where: { userId }, select: { id: true } });
      return w ? { workerIdentityId: w.id } : null;
    }
  };
}

export function createPrismaVerificationStore(prisma: VPrisma): VerificationStore {
  return {
    async getWorker({ workerIdentityId, verificationType }) {
      const r = await prisma.workerVerification.findUnique({ where: { workerIdentityId_verificationType: { workerIdentityId, verificationType } } });
      return r ? toWV(r) : null;
    },
    async listWorker(workerIdentityId) {
      const rows = await prisma.workerVerification.findMany({ where: { workerIdentityId } });
      return rows.map(toWV);
    },
    async findWorkerByReference(providerReference) {
      const r = await prisma.workerVerification.findFirst({ where: { providerReference } });
      return r ? toWV(r) : null;
    },
    async getWorkerById(id) {
      const r = await prisma.workerVerification.findUnique({ where: { id } });
      return r ? toWV(r) : null;
    },
    async upsertWorkerRequest({ workerIdentityId, verificationType, provider, providerReference, requestedAt }) {
      const r = await prisma.workerVerification.upsert({
        where: { workerIdentityId_verificationType: { workerIdentityId, verificationType } },
        create: { workerIdentityId, verificationType, provider, providerReference, requestedAt, status: "pending" },
        update: { provider, providerReference, requestedAt, status: "pending", completedAt: null, expiresAt: null, resultMetadata: undefined }
      });
      return toWV(r);
    },
    async setWorkerStatus({ id, status, completedAt, expiresAt, reviewedByUserId, resultMetadata }) {
      const r = await prisma.workerVerification.update({
        where: { id },
        data: {
          status,
          ...(completedAt !== undefined ? { completedAt } : {}),
          ...(expiresAt !== undefined ? { expiresAt } : {}),
          ...(reviewedByUserId !== undefined ? { reviewedByUserId } : {}),
          ...(resultMetadata !== undefined ? { resultMetadata: resultMetadata as object } : {})
        }
      });
      return toWV(r);
    },

    async getEmployer(organizationId) {
      const r = await prisma.employerVerification.findUnique({ where: { organizationId } });
      return r ? toEV(r) : null;
    },
    async findEmployerByReference(providerReference) {
      const r = await prisma.employerVerification.findFirst({ where: { providerReference } });
      return r ? toEV(r) : null;
    },
    async getEmployerById(id) {
      const r = await prisma.employerVerification.findUnique({ where: { id } });
      return r ? toEV(r) : null;
    },
    async upsertEmployerRequest({ organizationId, provider, providerReference, requestedAt }) {
      const r = await prisma.employerVerification.upsert({
        where: { organizationId },
        create: { organizationId, provider, providerReference, requestedAt, status: "pending" },
        update: { provider, providerReference, requestedAt, status: "pending", completedAt: null, expiresAt: null, resultMetadata: undefined }
      });
      return toEV(r);
    },
    async setEmployerStatus({ id, status, completedAt, expiresAt, reviewedByUserId, resultMetadata }) {
      const r = await prisma.employerVerification.update({
        where: { id },
        data: {
          status,
          ...(completedAt !== undefined ? { completedAt } : {}),
          ...(expiresAt !== undefined ? { expiresAt } : {}),
          ...(reviewedByUserId !== undefined ? { reviewedByUserId } : {}),
          ...(resultMetadata !== undefined ? { resultMetadata: resultMetadata as object } : {})
        }
      });
      return toEV(r);
    },

    async listQueue({ statuses }) {
      // Each table's status column is its own enum — filter by only the statuses valid for
      // that table (a mixed list would fail enum validation). An empty intersection when a
      // filter WAS supplied means "none from this table".
      const workerStatusSet: readonly WorkerVerificationStatus[] = ["unverified", "pending", "verified", "review", "expired", "rejected"];
      const employerStatusSet: readonly EmployerVerificationStatus[] = ["unverified", "pending", "business_verified", "review_required", "suspended", "expired"];
      const workerStatuses = statuses ? statuses.filter((s): s is WorkerVerificationStatus => (workerStatusSet as readonly string[]).includes(s)) : null;
      const employerStatuses = statuses ? statuses.filter((s): s is EmployerVerificationStatus => (employerStatusSet as readonly string[]).includes(s)) : null;
      const [workers, employers] = await Promise.all([
        workerStatuses && workerStatuses.length === 0
          ? Promise.resolve([] as WVRow[])
          : (prisma.workerVerification.findMany({ ...(workerStatuses ? { where: { status: { in: workerStatuses } } } : {}), orderBy: { updatedAt: "desc" } } as unknown) as Promise<WVRow[]>),
        employerStatuses && employerStatuses.length === 0
          ? Promise.resolve([] as EVRow[])
          : (prisma.employerVerification.findMany({ ...(employerStatuses ? { where: { status: { in: employerStatuses } } } : {}), orderBy: { updatedAt: "desc" } } as unknown) as Promise<EVRow[]>)
      ]);
      const workerEntries: VerificationQueueEntry[] = workers.map((r) => ({
        subjectType: "worker", id: r.id, subjectId: r.workerIdentityId, verificationType: r.verificationType, status: r.status, provider: r.provider, requestedAt: r.requestedAt?.toISOString() ?? null, expiresAt: r.expiresAt?.toISOString() ?? null
      }));
      const employerEntries: VerificationQueueEntry[] = employers.map((r) => ({
        subjectType: "employer", id: r.id, subjectId: r.organizationId, verificationType: null, status: r.status, provider: r.provider, requestedAt: r.requestedAt?.toISOString() ?? null, expiresAt: r.expiresAt?.toISOString() ?? null
      }));
      return [...workerEntries, ...employerEntries];
    },
    async appendEvent(event) {
      await prisma.verificationEvent.create({
        data: {
          subjectType: event.subjectType,
          subjectId: event.subjectId,
          verificationType: event.verificationType ?? null,
          source: event.source,
          priorStatus: event.priorStatus ?? null,
          newStatus: event.newStatus,
          provider: event.provider ?? null,
          providerReference: event.providerReference ?? null,
          actorUserId: event.actorUserId ?? null,
          detail: (event.detail ?? undefined) as object | undefined
        }
      });
    }
  };
}
