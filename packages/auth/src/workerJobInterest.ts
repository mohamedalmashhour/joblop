// Worker Job Interest — governed marketplace INTENT.
//
// Boundary rules (do not violate):
//   - Expressing interest creates an intent record ONLY. It never creates a worker offer
//     or an assignment, and never bypasses platform dispatch.
//   - Eligibility is SERVER-AUTHORITATIVE. The browser cannot declare itself eligible.
//   - At most one ACTIVE interest per (worker, job); repeated clicks are idempotent
//     (backed by a partial unique index → P2002 on a concurrent double-submit).
//   - Interest statuses are marketplace intent only; they never replace the offer/
//     assignment state machines. Platform dispatch reviews interest, then issues a
//     governed offer through the EXISTING worker-offer service; the offer is linked back.
//   - Free. No fee, no paid/boosted access.

export const ACTIVE_INTEREST_STATUSES = [
  "submitted",
  "under_review",
  "shortlisted",
  "offer_created",
  "offer_accepted"
] as const;

// A worker already engaged with this request (active assignment) is not eligible to
// re-express interest.
const ACTIVE_ASSIGNMENT_STATUSES = [
  "pending_validation",
  "confirmed",
  "worker_acknowledged",
  "ready_for_attendance",
  "in_attendance_window",
  "attendance_handoff"
] as const;

// A worker already holding a live offer for this request should not double-express.
const ACTIVE_OFFER_STATUSES = ["draft", "approved", "sent", "delivered", "viewed"] as const;

const MARKETPLACE_VISIBLE_STATUSES = ["submitted", "approved_for_dispatch"] as const;

export type WorkerJobInterestErrorCode = "denied" | "not_found" | "invalid" | "ineligible" | "conflict";
export class WorkerJobInterestError extends Error {
  readonly code: WorkerJobInterestErrorCode;
  readonly reasons: readonly string[];
  constructor(code: WorkerJobInterestErrorCode, message: string, reasons: readonly string[] = []) {
    super(message);
    this.code = code;
    this.reasons = reasons;
    this.name = "WorkerJobInterestError";
  }
}

export type EligibilityReason =
  | "job_not_found"
  | "job_not_open"
  | "already_assigned"
  | "active_offer_exists";

export type EligibilityResult = Readonly<{
  eligible: boolean;
  reasons: readonly EligibilityReason[];
  evaluatedAt: string;
}>;

export type InterestStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "not_selected"
  | "withdrawn"
  | "offer_created"
  | "offer_accepted";

export type InterestRecord = Readonly<{
  id: string;
  workerIdentityId: string;
  jobRequestId: string;
  organizationId: string;
  status: InterestStatus;
  distanceKmAtInterest: number | null;
  workerOfferId: string | null;
  createdAt: string;
  updatedAt: string;
}>;

// ── Ports ──

export type InterestWorkerIdentityResolver = Readonly<{
  resolveByUserId(userId: string): Promise<{ workerIdentityId: string } | null>;
}>;

export type InterestJobReader = Readonly<{
  getJob(jobRequestId: string): Promise<
    | {
        status: string;
        organizationId: string;
        residenceStatus: string;
        latitude: number | null;
        longitude: number | null;
      }
    | null
  >;
}>;

export type InterestEngagementReader = Readonly<{
  hasActiveAssignment(input: { workerIdentityId: string; jobRequestId: string }): Promise<boolean>;
  hasActiveOffer(input: { workerIdentityId: string; jobRequestId: string }): Promise<boolean>;
}>;

export type InterestStore = Readonly<{
  insert(input: {
    workerIdentityId: string;
    jobRequestId: string;
    organizationId: string;
    distanceKmAtInterest: number | null;
    eligibilitySnapshot: EligibilityResult;
  }): Promise<InterestRecord>;
  findActive(input: { workerIdentityId: string; jobRequestId: string }): Promise<InterestRecord | null>;
  withdrawActive(input: { workerIdentityId: string; jobRequestId: string }): Promise<{ withdrawn: boolean }>;
  listForWorker(workerIdentityId: string): Promise<readonly InterestRecord[]>;
  listForJob(jobRequestId: string): Promise<readonly InterestRecord[]>;
  getById(id: string): Promise<InterestRecord | null>;
  setStatus(input: { id: string; status: InterestStatus; workerOfferId?: string | null }): Promise<InterestRecord>;
}>;

export type WorkerJobInterestDeps = Readonly<{
  identities: InterestWorkerIdentityResolver;
  jobs: InterestJobReader;
  engagement: InterestEngagementReader;
  store: InterestStore;
  now?: () => Date;
}>;

export type WorkerJobInterestService = ReturnType<typeof createWorkerJobInterestService>;

export function createWorkerJobInterestService(deps: WorkerJobInterestDeps) {
  const now = deps.now ?? (() => new Date());

  async function requireWorker(userId: string): Promise<string> {
    const identity = await deps.identities.resolveByUserId(userId);
    if (!identity) throw new WorkerJobInterestError("denied", "Only a worker can express interest.");
    return identity.workerIdentityId;
  }

  // Server-authoritative eligibility. Returns the structured result (also stored as an
  // audit snapshot). The browser never supplies any of these inputs.
  async function evaluateEligibility(input: {
    workerIdentityId: string;
    jobRequestId: string;
  }): Promise<{ result: EligibilityResult; organizationId: string | null }> {
    const reasons: EligibilityReason[] = [];
    const job = await deps.jobs.getJob(input.jobRequestId);
    if (!job) {
      return { result: { eligible: false, reasons: ["job_not_found"], evaluatedAt: now().toISOString() }, organizationId: null };
    }
    const open =
      (MARKETPLACE_VISIBLE_STATUSES as readonly string[]).includes(job.status) && job.residenceStatus === "active";
    if (!open) reasons.push("job_not_open");
    const [assigned, offered] = await Promise.all([
      deps.engagement.hasActiveAssignment({ workerIdentityId: input.workerIdentityId, jobRequestId: input.jobRequestId }),
      deps.engagement.hasActiveOffer({ workerIdentityId: input.workerIdentityId, jobRequestId: input.jobRequestId })
    ]);
    if (assigned) reasons.push("already_assigned");
    if (offered) reasons.push("active_offer_exists");
    return {
      result: { eligible: reasons.length === 0, reasons, evaluatedAt: now().toISOString() },
      organizationId: job.organizationId
    };
  }

  return {
    ACTIVE_INTEREST_STATUSES,

    // Public: check eligibility without recording (drives the CTA's enabled/disabled state).
    async checkEligibility(input: { userId: string; jobRequestId: string }): Promise<EligibilityResult> {
      const workerIdentityId = await requireWorker(input.userId);
      const { result } = await evaluateEligibility({ workerIdentityId, jobRequestId: input.jobRequestId });
      return result;
    },

    // Express interest. Idempotent: an existing active interest is returned as-is. Records
    // an intent ONLY — never an offer or assignment.
    async expressInterest(input: {
      userId: string;
      jobRequestId: string;
      distanceKmAtInterest?: number | null;
    }): Promise<{ interest: InterestRecord; alreadyInterested: boolean }> {
      const workerIdentityId = await requireWorker(input.userId);
      const existing = await deps.store.findActive({ workerIdentityId, jobRequestId: input.jobRequestId });
      if (existing) return { interest: existing, alreadyInterested: true };

      const { result, organizationId } = await evaluateEligibility({ workerIdentityId, jobRequestId: input.jobRequestId });
      if (!organizationId) {
        throw new WorkerJobInterestError("not_found", "That job is not available.");
      }
      if (!result.eligible) {
        throw new WorkerJobInterestError("ineligible", "You can't express interest in this job right now.", result.reasons);
      }
      try {
        const interest = await deps.store.insert({
          workerIdentityId,
          jobRequestId: input.jobRequestId,
          organizationId,
          distanceKmAtInterest: input.distanceKmAtInterest ?? null,
          eligibilitySnapshot: result
        });
        return { interest, alreadyInterested: false };
      } catch (error) {
        // Concurrent double-submit hit the partial unique index — return the winner.
        if (isInterestUniqueViolation(error)) {
          const winner = await deps.store.findActive({ workerIdentityId, jobRequestId: input.jobRequestId });
          if (winner) return { interest: winner, alreadyInterested: true };
        }
        throw error;
      }
    },

    // Worker withdraws their active interest. Idempotent. Does NOT touch any offer/assignment
    // — once the lifecycle has reached the governed offer/assignment boundary, withdrawal
    // here has no effect on it.
    async withdraw(input: { userId: string; jobRequestId: string }): Promise<{ withdrawn: boolean }> {
      const workerIdentityId = await requireWorker(input.userId);
      return deps.store.withdrawActive({ workerIdentityId, jobRequestId: input.jobRequestId });
    },

    async listForWorker(input: { userId: string }): Promise<readonly InterestRecord[]> {
      const workerIdentityId = await requireWorker(input.userId);
      return deps.store.listForWorker(workerIdentityId);
    },

    // Active interest for a specific (worker, job) — hydrates the details-page CTA state.
    async getActive(input: { userId: string; jobRequestId: string }): Promise<InterestRecord | null> {
      const workerIdentityId = await requireWorker(input.userId);
      return deps.store.findActive({ workerIdentityId, jobRequestId: input.jobRequestId });
    },

    // ── Platform / dispatch authority (NOT worker-callable) ──

    // Interested workers for a job request — a dispatch review signal, never auto-selection.
    async listInterestedForJob(jobRequestId: string): Promise<readonly InterestRecord[]> {
      return deps.store.listForJob(jobRequestId);
    },

    async getById(interestId: string): Promise<InterestRecord | null> {
      return deps.store.getById(interestId);
    },

    async markUnderReview(interestId: string): Promise<InterestRecord> {
      return deps.store.setStatus({ id: interestId, status: "under_review" });
    },
    async shortlist(interestId: string): Promise<InterestRecord> {
      return deps.store.setStatus({ id: interestId, status: "shortlisted" });
    },
    async markNotSelected(interestId: string): Promise<InterestRecord> {
      return deps.store.setStatus({ id: interestId, status: "not_selected" });
    },

    // Link a governed offer created through the existing worker-offer service. This does NOT
    // create the offer — it records that one now exists for this interest.
    async linkOffer(input: { interestId: string; workerOfferId: string }): Promise<InterestRecord> {
      return deps.store.setStatus({ id: input.interestId, status: "offer_created", workerOfferId: input.workerOfferId });
    },
    async markOfferAccepted(interestId: string): Promise<InterestRecord> {
      return deps.store.setStatus({ id: interestId, status: "offer_accepted" });
    }
  };
}

// ── Prisma adapters ──

type PrismaLike = {
  jobRequest: { findUnique(args: unknown): Promise<Record<string, unknown> | null> };
  assignment: { count(args: unknown): Promise<number> };
  workerOffer: { count(args: unknown): Promise<number> };
  workerJobInterest: {
    create(args: unknown): Promise<InterestRow>;
    findFirst(args: unknown): Promise<InterestRow | null>;
    findUnique(args: unknown): Promise<InterestRow | null>;
    findMany(args: unknown): Promise<InterestRow[]>;
    updateMany(args: unknown): Promise<{ count: number }>;
    update(args: unknown): Promise<InterestRow>;
  };
};

type InterestRow = {
  id: string;
  workerIdentityId: string;
  jobRequestId: string;
  organizationId: string;
  status: InterestStatus;
  distanceKmAtInterest: number | null;
  workerOfferId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: InterestRow): InterestRecord {
  return {
    id: row.id,
    workerIdentityId: row.workerIdentityId,
    jobRequestId: row.jobRequestId,
    organizationId: row.organizationId,
    status: row.status,
    distanceKmAtInterest: row.distanceKmAtInterest,
    workerOfferId: row.workerOfferId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function createPrismaInterestWorkerIdentityResolver(prisma: {
  workerIdentity: { findUnique(args: unknown): Promise<{ id: string } | null> };
}): InterestWorkerIdentityResolver {
  return {
    async resolveByUserId(userId) {
      const identity = await prisma.workerIdentity.findUnique({ where: { userId }, select: { id: true } });
      return identity ? { workerIdentityId: identity.id } : null;
    }
  };
}

export function createPrismaInterestJobReader(prisma: PrismaLike): InterestJobReader {
  return {
    async getJob(jobRequestId) {
      const job = (await prisma.jobRequest.findUnique({
        where: { id: jobRequestId },
        select: {
          status: true,
          organizationId: true,
          residence: { select: { status: true, latitude: true, longitude: true } }
        }
      })) as
        | { status: string; organizationId: string; residence: { status: string; latitude: number | null; longitude: number | null } }
        | null;
      if (!job) return null;
      return {
        status: job.status,
        organizationId: job.organizationId,
        residenceStatus: job.residence.status,
        latitude: job.residence.latitude,
        longitude: job.residence.longitude
      };
    }
  };
}

export function createPrismaInterestEngagementReader(prisma: PrismaLike): InterestEngagementReader {
  return {
    async hasActiveAssignment({ workerIdentityId, jobRequestId }) {
      const count = await prisma.assignment.count({
        where: { workerIdentityId, jobRequestId, status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] } }
      });
      return count > 0;
    },
    async hasActiveOffer({ workerIdentityId, jobRequestId }) {
      const count = await prisma.workerOffer.count({
        where: { workerIdentityId, jobRequestId, status: { in: [...ACTIVE_OFFER_STATUSES] } }
      });
      return count > 0;
    }
  };
}

export function createPrismaInterestStore(prisma: PrismaLike): InterestStore {
  return {
    async insert({ workerIdentityId, jobRequestId, organizationId, distanceKmAtInterest, eligibilitySnapshot }) {
      const row = await prisma.workerJobInterest.create({
        data: {
          workerIdentityId,
          jobRequestId,
          organizationId,
          distanceKmAtInterest,
          eligibilitySnapshot: eligibilitySnapshot as unknown as object,
          status: "submitted"
        }
      });
      return toRecord(row);
    },
    async findActive({ workerIdentityId, jobRequestId }) {
      const row = await prisma.workerJobInterest.findFirst({
        where: { workerIdentityId, jobRequestId, status: { in: [...ACTIVE_INTEREST_STATUSES] } }
      });
      return row ? toRecord(row) : null;
    },
    async withdrawActive({ workerIdentityId, jobRequestId }) {
      // Only withdraw a genuinely active, pre-offer interest. Once an offer exists
      // (offer_created/offer_accepted) the governed lifecycle owns it — do not silently undo.
      const result = await prisma.workerJobInterest.updateMany({
        where: { workerIdentityId, jobRequestId, status: { in: ["submitted", "under_review", "shortlisted"] } },
        data: { status: "withdrawn" }
      });
      return { withdrawn: result.count > 0 };
    },
    async listForWorker(workerIdentityId) {
      const rows = await prisma.workerJobInterest.findMany({
        where: { workerIdentityId },
        orderBy: { createdAt: "desc" }
      });
      return rows.map(toRecord);
    },
    async listForJob(jobRequestId) {
      const rows = await prisma.workerJobInterest.findMany({
        where: { jobRequestId, status: { in: [...ACTIVE_INTEREST_STATUSES] } },
        orderBy: { createdAt: "asc" }
      });
      return rows.map(toRecord);
    },
    async getById(id) {
      const row = await prisma.workerJobInterest.findUnique({ where: { id } });
      return row ? toRecord(row) : null;
    },
    async setStatus({ id, status, workerOfferId }) {
      const row = await prisma.workerJobInterest.update({
        where: { id },
        data: { status, ...(workerOfferId !== undefined ? { workerOfferId } : {}) }
      });
      return toRecord(row);
    }
  };
}

function isInterestUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}
