import { beforeEach, describe, expect, it } from "vitest";
import {
  createWorkerJobInterestService,
  WorkerJobInterestError,
  type InterestRecord,
  type InterestStore,
  type InterestEngagementReader,
  type InterestJobReader,
  type InterestWorkerIdentityResolver
} from "./workerJobInterest";

// In-memory fakes mirroring the DB partial-unique (one active interest per worker+job).
function makeStore() {
  const rows: InterestRecord[] = [];
  let seq = 0;
  const active = (s: string) => ["submitted", "under_review", "shortlisted", "offer_created", "offer_accepted"].includes(s);
  const store: InterestStore = {
    async insert({ workerIdentityId, jobRequestId, organizationId, distanceKmAtInterest }) {
      if (rows.some((r) => r.workerIdentityId === workerIdentityId && r.jobRequestId === jobRequestId && active(r.status))) {
        const err = new Error("unique") as Error & { code?: string };
        err.code = "P2002";
        throw err;
      }
      const rec: InterestRecord = {
        id: `int-${seq++}`,
        workerIdentityId,
        jobRequestId,
        organizationId,
        status: "submitted",
        distanceKmAtInterest,
        workerOfferId: null,
        createdAt: new Date(1_700_000_000_000 + seq * 1000).toISOString(),
        updatedAt: new Date(1_700_000_000_000 + seq * 1000).toISOString()
      };
      rows.push(rec);
      return rec;
    },
    async findActive({ workerIdentityId, jobRequestId }) {
      return rows.find((r) => r.workerIdentityId === workerIdentityId && r.jobRequestId === jobRequestId && active(r.status)) ?? null;
    },
    async withdrawActive({ workerIdentityId, jobRequestId }) {
      let withdrawn = false;
      for (const r of rows) {
        if (r.workerIdentityId === workerIdentityId && r.jobRequestId === jobRequestId && ["submitted", "under_review", "shortlisted"].includes(r.status)) {
          (r as { status: string }).status = "withdrawn";
          withdrawn = true;
        }
      }
      return { withdrawn };
    },
    async listForWorker(workerIdentityId) {
      return rows.filter((r) => r.workerIdentityId === workerIdentityId);
    },
    async listForJob(jobRequestId) {
      return rows.filter((r) => r.jobRequestId === jobRequestId && active(r.status));
    },
    async getById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async setStatus({ id, status, workerOfferId }) {
      const r = rows.find((x) => x.id === id);
      if (!r) throw new Error("not found");
      (r as { status: string }).status = status;
      if (workerOfferId !== undefined) (r as { workerOfferId: string | null }).workerOfferId = workerOfferId;
      return r;
    }
  };
  return { store, rows };
}

function makeDeps(over?: {
  worker?: { workerIdentityId: string } | null;
  jobStatus?: string | null;
  residenceStatus?: string;
  assigned?: boolean;
  offered?: boolean;
}) {
  const { store, rows } = makeStore();
  const identities: InterestWorkerIdentityResolver = {
    async resolveByUserId() {
      return over && "worker" in over ? over.worker ?? null : { workerIdentityId: "w-1" };
    }
  };
  const jobs: InterestJobReader = {
    async getJob() {
      if (over && over.jobStatus === null) return null;
      return {
        status: over?.jobStatus ?? "approved_for_dispatch",
        organizationId: "org-1",
        residenceStatus: over?.residenceStatus ?? "active",
        latitude: 45.6,
        longitude: -73.7
      };
    }
  };
  const engagement: InterestEngagementReader = {
    async hasActiveAssignment() {
      return over?.assigned ?? false;
    },
    async hasActiveOffer() {
      return over?.offered ?? false;
    }
  };
  return { deps: { identities, jobs, engagement, store }, rows };
}

describe("worker job interest", () => {
  let ctx: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    ctx = makeDeps();
  });

  it("expresses interest and is idempotent on repeat", async () => {
    const svc = createWorkerJobInterestService(ctx.deps);
    const first = await svc.expressInterest({ userId: "u-1", jobRequestId: "job-a" });
    expect(first.alreadyInterested).toBe(false);
    expect(first.interest.status).toBe("submitted");
    const second = await svc.expressInterest({ userId: "u-1", jobRequestId: "job-a" });
    expect(second.alreadyInterested).toBe(true);
    expect(second.interest.id).toBe(first.interest.id);
    expect((await svc.listForWorker({ userId: "u-1" })).length).toBe(1);
  });

  it("does NOT create an offer or assignment (only an intent record)", async () => {
    const svc = createWorkerJobInterestService(ctx.deps);
    await svc.expressInterest({ userId: "u-1", jobRequestId: "job-a" });
    expect(ctx.rows[0]!.workerOfferId).toBeNull();
    expect(ctx.rows[0]!.status).toBe("submitted"); // never jumps to offer/assignment
  });

  it("rejects a non-worker", async () => {
    const svc = createWorkerJobInterestService(makeDeps({ worker: null }).deps);
    await expect(svc.expressInterest({ userId: "x", jobRequestId: "job-a" })).rejects.toMatchObject({ code: "denied" });
  });

  it("is ineligible when the job is not open", async () => {
    const svc = createWorkerJobInterestService(makeDeps({ jobStatus: "draft" }).deps);
    await expect(svc.expressInterest({ userId: "u-1", jobRequestId: "job-a" })).rejects.toMatchObject({
      code: "ineligible",
      reasons: ["job_not_open"]
    });
  });

  it("is ineligible when the worker is already assigned or already has an active offer", async () => {
    const assignedSvc = createWorkerJobInterestService(makeDeps({ assigned: true }).deps);
    await expect(assignedSvc.expressInterest({ userId: "u-1", jobRequestId: "job-a" })).rejects.toMatchObject({
      reasons: ["already_assigned"]
    });
    const offeredSvc = createWorkerJobInterestService(makeDeps({ offered: true }).deps);
    await expect(offeredSvc.expressInterest({ userId: "u-1", jobRequestId: "job-a" })).rejects.toMatchObject({
      reasons: ["active_offer_exists"]
    });
  });

  it("not_found when the job does not exist", async () => {
    const svc = createWorkerJobInterestService(makeDeps({ jobStatus: null }).deps);
    await expect(svc.expressInterest({ userId: "u-1", jobRequestId: "ghost" })).rejects.toBeInstanceOf(WorkerJobInterestError);
    await expect(svc.expressInterest({ userId: "u-1", jobRequestId: "ghost" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("withdraw is idempotent and lets the worker re-express afterwards", async () => {
    const svc = createWorkerJobInterestService(ctx.deps);
    await svc.expressInterest({ userId: "u-1", jobRequestId: "job-a" });
    expect(await svc.withdraw({ userId: "u-1", jobRequestId: "job-a" })).toEqual({ withdrawn: true });
    expect(await svc.withdraw({ userId: "u-1", jobRequestId: "job-a" })).toEqual({ withdrawn: false });
    // re-express creates a fresh active interest (previous one is withdrawn history)
    const again = await svc.expressInterest({ userId: "u-1", jobRequestId: "job-a" });
    expect(again.alreadyInterested).toBe(false);
    expect(again.interest.status).toBe("submitted");
  });

  it("withdraw does NOT undo an interest once an offer has been created", async () => {
    const svc = createWorkerJobInterestService(ctx.deps);
    const { interest } = await svc.expressInterest({ userId: "u-1", jobRequestId: "job-a" });
    await svc.linkOffer({ interestId: interest.id, workerOfferId: "offer-1" });
    // now the interest is offer_created — withdrawal is a no-op (governed lifecycle owns it)
    expect(await svc.withdraw({ userId: "u-1", jobRequestId: "job-a" })).toEqual({ withdrawn: false });
    expect(ctx.rows[0]!.status).toBe("offer_created");
  });

  it("platform can link a governed offer + mark accepted (never worker-driven)", async () => {
    const svc = createWorkerJobInterestService(ctx.deps);
    const { interest } = await svc.expressInterest({ userId: "u-1", jobRequestId: "job-a" });
    const linked = await svc.linkOffer({ interestId: interest.id, workerOfferId: "offer-9" });
    expect(linked.status).toBe("offer_created");
    expect(linked.workerOfferId).toBe("offer-9");
    const accepted = await svc.markOfferAccepted(interest.id);
    expect(accepted.status).toBe("offer_accepted");
  });

  it("checkEligibility reports reasons without recording anything", async () => {
    const svc = createWorkerJobInterestService(makeDeps({ assigned: true }).deps);
    const result = await svc.checkEligibility({ userId: "u-1", jobRequestId: "job-a" });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("already_assigned");
    expect(await svc.listForWorker({ userId: "u-1" })).toHaveLength(0); // nothing recorded
  });
});
