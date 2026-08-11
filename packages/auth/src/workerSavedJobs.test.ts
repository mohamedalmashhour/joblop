import { beforeEach, describe, expect, it } from "vitest";
import {
  createWorkerSavedJobsService,
  WorkerSavedJobError,
  type SavedJobRecord,
  type SavedJobStore,
  type SavedJobVisibilityReader,
  type WorkerIdentityResolver
} from "./workerSavedJobs";

// In-memory fakes mirroring the DB unique (worker, job) constraint and visibility gate.
function makeDeps(over?: {
  worker?: { workerIdentityId: string } | null;
  jobStatus?: string | null;
}) {
  const saved = new Map<string, Set<string>>(); // workerIdentityId -> jobRequestIds
  const savedAt = new Map<string, number>(); // "worker|job" -> order

  const identities: WorkerIdentityResolver = {
    async resolveByUserId() {
      return over && "worker" in over ? over.worker ?? null : { workerIdentityId: "w-1" };
    }
  };
  const visibility: SavedJobVisibilityReader = {
    async getJobStatus() {
      if (over && "jobStatus" in over) {
        return over.jobStatus === null ? null : { status: over.jobStatus! };
      }
      return { status: "approved_for_dispatch" };
    }
  };
  let seq = 0;
  const store: SavedJobStore = {
    async save({ workerIdentityId, jobRequestId }) {
      const set = saved.get(workerIdentityId) ?? new Set<string>();
      if (set.has(jobRequestId)) return { alreadySaved: true };
      set.add(jobRequestId);
      saved.set(workerIdentityId, set);
      savedAt.set(`${workerIdentityId}|${jobRequestId}`, seq++);
      return { alreadySaved: false };
    },
    async unsave({ workerIdentityId, jobRequestId }) {
      const set = saved.get(workerIdentityId);
      const removed = set?.delete(jobRequestId) ?? false;
      return { removed };
    },
    async list(workerIdentityId) {
      const set = saved.get(workerIdentityId) ?? new Set<string>();
      const rows: SavedJobRecord[] = [...set].map((jobRequestId) => ({
        jobRequestId,
        savedAt: new Date(1_700_000_000_000 + (savedAt.get(`${workerIdentityId}|${jobRequestId}`) ?? 0) * 1000).toISOString()
      }));
      return rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    },
    async savedIdsAmong({ workerIdentityId, jobRequestIds }) {
      const set = saved.get(workerIdentityId) ?? new Set<string>();
      return jobRequestIds.filter((id) => set.has(id));
    }
  };
  return { identities, visibility, store, saved };
}

describe("worker saved jobs", () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps();
  });

  it("saves a marketplace-visible job (idempotent second save)", async () => {
    const svc = createWorkerSavedJobsService(deps);
    const first = await svc.save({ userId: "u-1", jobRequestId: "job-a" });
    expect(first).toEqual({ saved: true, alreadySaved: false });
    const second = await svc.save({ userId: "u-1", jobRequestId: "job-a" });
    expect(second).toEqual({ saved: true, alreadySaved: true });
    expect(await svc.list({ userId: "u-1" })).toHaveLength(1);
  });

  it("rejects a non-worker (denied)", async () => {
    const svc = createWorkerSavedJobsService(makeDeps({ worker: null }));
    await expect(svc.save({ userId: "u-x", jobRequestId: "job-a" })).rejects.toMatchObject({
      constructor: WorkerSavedJobError,
      code: "denied"
    });
  });

  it("cannot save a job that does not exist (not_found)", async () => {
    const svc = createWorkerSavedJobsService(makeDeps({ jobStatus: null }));
    await expect(svc.save({ userId: "u-1", jobRequestId: "ghost" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("cannot save a non-visible (draft/cancelled) job — treated as not found", async () => {
    const svc = createWorkerSavedJobsService(makeDeps({ jobStatus: "draft" }));
    await expect(svc.save({ userId: "u-1", jobRequestId: "job-draft" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("unsave is idempotent", async () => {
    const svc = createWorkerSavedJobsService(deps);
    await svc.save({ userId: "u-1", jobRequestId: "job-a" });
    expect(await svc.unsave({ userId: "u-1", jobRequestId: "job-a" })).toEqual({ removed: true });
    expect(await svc.unsave({ userId: "u-1", jobRequestId: "job-a" })).toEqual({ removed: false });
    expect(await svc.list({ userId: "u-1" })).toHaveLength(0);
  });

  it("savedIdsAmong returns only this worker's saved subset; empty input short-circuits", async () => {
    const svc = createWorkerSavedJobsService(deps);
    await svc.save({ userId: "u-1", jobRequestId: "job-a" });
    await svc.save({ userId: "u-1", jobRequestId: "job-c" });
    const among = await svc.savedIdsAmong({ userId: "u-1", jobRequestIds: ["job-a", "job-b", "job-c"] });
    expect([...among].sort()).toEqual(["job-a", "job-c"]);
    expect(await svc.savedIdsAmong({ userId: "u-1", jobRequestIds: [] })).toEqual([]);
  });

  it("saved lists are worker-scoped (no cross-worker leakage)", async () => {
    const svc = createWorkerSavedJobsService(deps);
    await svc.save({ userId: "u-1", jobRequestId: "job-a" });
    // switch the resolver to a different worker identity
    const other = createWorkerSavedJobsService({
      ...deps,
      identities: { async resolveByUserId() { return { workerIdentityId: "w-2" }; } }
    });
    expect(await other.list({ userId: "u-2" })).toHaveLength(0);
  });
});
