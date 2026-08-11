// Worker Saved Jobs — the "bookmark an opportunity" capability of the worker marketplace.
//
// A worker saves open marketplace jobs to revisit. Design rules:
//   - User(worker)-scoped: a worker can only see/mutate their OWN saved list.
//   - Idempotent save: saving the same job twice is a no-op (DB unique + P2002 catch),
//     so the UI's "save" button is safe to double-tap.
//   - Only marketplace-visible jobs can be saved (you cannot bookmark a private/closed
//     request by guessing its id) — visibility is server-authoritative.
//   - No money, no worker-facing fees. Saving is free and creates no obligation.

const MARKETPLACE_VISIBLE_STATUSES: readonly string[] = ["submitted", "approved_for_dispatch"];

export type WorkerSavedJobErrorCode = "denied" | "not_found" | "invalid";
export class WorkerSavedJobError extends Error {
  readonly code: WorkerSavedJobErrorCode;
  constructor(code: WorkerSavedJobErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "WorkerSavedJobError";
  }
}

// ── Ports (structural, for unit-testing with fakes) ──

export type WorkerIdentityResolver = Readonly<{
  // Resolve the worker identity for a session user, or null if the user is not a worker.
  resolveByUserId(userId: string): Promise<{ workerIdentityId: string } | null>;
}>;

export type SavedJobVisibilityReader = Readonly<{
  // Returns the job's marketplace status, or null if it doesn't exist.
  getJobStatus(jobRequestId: string): Promise<{ status: string } | null>;
}>;

export type SavedJobRecord = Readonly<{
  jobRequestId: string;
  savedAt: string; // ISO
}>;

export type SavedJobStore = Readonly<{
  // Idempotent: returns already_saved=false on first save, true if it already existed.
  save(input: { workerIdentityId: string; jobRequestId: string }): Promise<{ alreadySaved: boolean }>;
  // Idempotent: returns removed=false if there was nothing to remove.
  unsave(input: { workerIdentityId: string; jobRequestId: string }): Promise<{ removed: boolean }>;
  list(workerIdentityId: string): Promise<readonly SavedJobRecord[]>;
  // Which of the given jobs this worker has saved (for hydrating List/Detail toggles).
  savedIdsAmong(input: { workerIdentityId: string; jobRequestIds: readonly string[] }): Promise<readonly string[]>;
}>;

export type WorkerSavedJobsDeps = Readonly<{
  identities: WorkerIdentityResolver;
  visibility: SavedJobVisibilityReader;
  store: SavedJobStore;
}>;

export type WorkerSavedJobsService = ReturnType<typeof createWorkerSavedJobsService>;

export function createWorkerSavedJobsService(deps: WorkerSavedJobsDeps) {
  async function requireWorker(userId: string): Promise<string> {
    const identity = await deps.identities.resolveByUserId(userId);
    if (!identity) {
      throw new WorkerSavedJobError("denied", "Only a worker can save marketplace jobs.");
    }
    return identity.workerIdentityId;
  }

  return {
    // Save (bookmark) a marketplace-visible job for the current worker. Idempotent.
    async save(input: { userId: string; jobRequestId: string }): Promise<{ saved: true; alreadySaved: boolean }> {
      const workerIdentityId = await requireWorker(input.userId);
      const job = await deps.visibility.getJobStatus(input.jobRequestId);
      if (!job) {
        throw new WorkerSavedJobError("not_found", "That job could not be found.");
      }
      if (!MARKETPLACE_VISIBLE_STATUSES.includes(job.status)) {
        // Do not reveal non-visible jobs via the save endpoint — treat as not found.
        throw new WorkerSavedJobError("not_found", "That job is not open in the marketplace.");
      }
      const { alreadySaved } = await deps.store.save({ workerIdentityId, jobRequestId: input.jobRequestId });
      return { saved: true, alreadySaved };
    },

    // Remove a saved job. Idempotent — unsaving something not saved is a success.
    async unsave(input: { userId: string; jobRequestId: string }): Promise<{ removed: boolean }> {
      const workerIdentityId = await requireWorker(input.userId);
      return deps.store.unsave({ workerIdentityId, jobRequestId: input.jobRequestId });
    },

    // The worker's own saved list, newest first (store-ordered).
    async list(input: { userId: string }): Promise<readonly SavedJobRecord[]> {
      const workerIdentityId = await requireWorker(input.userId);
      return deps.store.list(workerIdentityId);
    },

    // Which of a set of jobs (e.g. the current search page) the worker has saved.
    async savedIdsAmong(input: { userId: string; jobRequestIds: readonly string[] }): Promise<readonly string[]> {
      if (input.jobRequestIds.length === 0) return [];
      const workerIdentityId = await requireWorker(input.userId);
      return deps.store.savedIdsAmong({ workerIdentityId, jobRequestIds: input.jobRequestIds });
    }
  };
}

// ── Prisma adapters (production wiring) ──

type PrismaLike = {
  workerIdentity: { findUnique(args: unknown): Promise<{ id: string } | null> };
  jobRequest: { findUnique(args: unknown): Promise<{ status: string } | null> };
  workerSavedJob: {
    create(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<{ count: number }>;
    findMany(args: unknown): Promise<Array<{ jobRequestId: string; savedAt: Date }>>;
  };
};

export function createPrismaWorkerIdentityResolver(prisma: PrismaLike): WorkerIdentityResolver {
  return {
    async resolveByUserId(userId) {
      const identity = await prisma.workerIdentity.findUnique({ where: { userId }, select: { id: true } });
      return identity ? { workerIdentityId: identity.id } : null;
    }
  };
}

export function createPrismaSavedJobVisibilityReader(prisma: PrismaLike): SavedJobVisibilityReader {
  return {
    async getJobStatus(jobRequestId) {
      const job = await prisma.jobRequest.findUnique({ where: { id: jobRequestId }, select: { status: true } });
      return job ? { status: job.status } : null;
    }
  };
}

export function createPrismaSavedJobStore(prisma: PrismaLike): SavedJobStore {
  return {
    async save({ workerIdentityId, jobRequestId }) {
      try {
        await prisma.workerSavedJob.create({ data: { workerIdentityId, jobRequestId } });
        return { alreadySaved: false };
      } catch (error) {
        if (isSavedJobUniqueViolation(error)) return { alreadySaved: true };
        throw error;
      }
    },
    async unsave({ workerIdentityId, jobRequestId }) {
      const result = await prisma.workerSavedJob.deleteMany({ where: { workerIdentityId, jobRequestId } });
      return { removed: result.count > 0 };
    },
    async list(workerIdentityId) {
      const rows = await prisma.workerSavedJob.findMany({
        where: { workerIdentityId },
        orderBy: { savedAt: "desc" },
        select: { jobRequestId: true, savedAt: true }
      });
      return rows.map((r) => ({ jobRequestId: r.jobRequestId, savedAt: r.savedAt.toISOString() }));
    },
    async savedIdsAmong({ workerIdentityId, jobRequestIds }) {
      const rows = await prisma.workerSavedJob.findMany({
        where: { workerIdentityId, jobRequestId: { in: [...jobRequestIds] } },
        select: { jobRequestId: true, savedAt: true }
      });
      return rows.map((r) => r.jobRequestId);
    }
  };
}

function isSavedJobUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}
