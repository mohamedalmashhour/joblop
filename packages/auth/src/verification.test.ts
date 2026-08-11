import { beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  createVerificationService,
  createFixtureIdentityProvider,
  createFixtureBackgroundCheckProvider,
  createFixtureBusinessProvider,
  createHmacCallbackVerifier,
  normalizeFixtureCallback,
  applyWorkerExpiry,
  VerificationError,
  type EmployerVerificationRecord,
  type VerificationEventInput,
  type VerificationQueueEntry,
  type VerificationStore,
  type WorkerVerificationRecord,
  type WorkerVerificationType
} from "./verification";

type Mut<T> = { -readonly [K in keyof T]: T[K] };

// In-memory store mirroring the unique (worker,type) + single-per-org constraints.
function makeStore() {
  const workers: Mut<WorkerVerificationRecord>[] = [];
  const employers: Mut<EmployerVerificationRecord>[] = [];
  const events: VerificationEventInput[] = [];
  let seq = 0;
  const iso = () => new Date(1_700_000_000_000 + seq * 1000).toISOString();
  const store: VerificationStore = {
    async getWorker({ workerIdentityId, verificationType }) {
      return workers.find((w) => w.workerIdentityId === workerIdentityId && w.verificationType === verificationType) ?? null;
    },
    async listWorker(workerIdentityId) {
      return workers.filter((w) => w.workerIdentityId === workerIdentityId);
    },
    async findWorkerByReference(ref) {
      return workers.find((w) => w.providerReference === ref) ?? null;
    },
    async getWorkerById(id) {
      return workers.find((w) => w.id === id) ?? null;
    },
    async upsertWorkerRequest({ workerIdentityId, verificationType, provider, providerReference, requestedAt }) {
      let rec = workers.find((w) => w.workerIdentityId === workerIdentityId && w.verificationType === verificationType);
      if (!rec) {
        rec = { id: `wv-${seq++}`, workerIdentityId, verificationType, status: "pending", provider, providerReference, requestedAt: requestedAt.toISOString(), completedAt: null, expiresAt: null, updatedAt: iso() };
        workers.push(rec);
      } else {
        Object.assign(rec, { provider, providerReference, status: "pending", requestedAt: requestedAt.toISOString(), completedAt: null, expiresAt: null });
      }
      return { ...rec };
    },
    async setWorkerStatus({ id, status, completedAt, expiresAt }) {
      const rec = workers.find((w) => w.id === id)!;
      rec.status = status;
      if (completedAt !== undefined) rec.completedAt = completedAt?.toISOString() ?? null;
      if (expiresAt !== undefined) rec.expiresAt = expiresAt?.toISOString() ?? null;
      return { ...rec };
    },
    async getEmployer(organizationId) {
      return employers.find((e) => e.organizationId === organizationId) ?? null;
    },
    async findEmployerByReference(ref) {
      return employers.find((e) => e.providerReference === ref) ?? null;
    },
    async getEmployerById(id) {
      return employers.find((e) => e.id === id) ?? null;
    },
    async upsertEmployerRequest({ organizationId, provider, providerReference, requestedAt }) {
      let rec = employers.find((e) => e.organizationId === organizationId);
      if (!rec) {
        rec = { id: `ev-${seq++}`, organizationId, status: "pending", provider, providerReference, requestedAt: requestedAt.toISOString(), completedAt: null, expiresAt: null, updatedAt: iso() };
        employers.push(rec);
      } else {
        Object.assign(rec, { provider, providerReference, status: "pending", requestedAt: requestedAt.toISOString(), completedAt: null, expiresAt: null });
      }
      return { ...rec };
    },
    async setEmployerStatus({ id, status, completedAt, expiresAt }) {
      const rec = employers.find((e) => e.id === id)!;
      rec.status = status;
      if (completedAt !== undefined) rec.completedAt = completedAt?.toISOString() ?? null;
      if (expiresAt !== undefined) rec.expiresAt = expiresAt?.toISOString() ?? null;
      return { ...rec };
    },
    async listQueue({ statuses }) {
      const w: VerificationQueueEntry[] = workers.filter((r) => !statuses || statuses.includes(r.status)).map((r) => ({ subjectType: "worker", id: r.id, subjectId: r.workerIdentityId, verificationType: r.verificationType, status: r.status, provider: r.provider, requestedAt: r.requestedAt, expiresAt: r.expiresAt }));
      const e: VerificationQueueEntry[] = employers.filter((r) => !statuses || statuses.includes(r.status)).map((r) => ({ subjectType: "employer", id: r.id, subjectId: r.organizationId, verificationType: null, status: r.status, provider: r.provider, requestedAt: r.requestedAt, expiresAt: r.expiresAt }));
      return [...w, ...e];
    },
    async appendEvent(event) {
      events.push(event);
    }
  };
  return { store, workers, employers, events };
}

function makeService(over?: { worker?: { workerIdentityId: string } | null }) {
  const ctx = makeStore();
  const service = createVerificationService({
    workers: { async resolveByUserId() { return over && "worker" in over ? over.worker ?? null : { workerIdentityId: "w-1" }; } },
    store: ctx.store,
    identityProvider: createFixtureIdentityProvider(),
    backgroundCheckProvider: createFixtureBackgroundCheckProvider(),
    businessProvider: createFixtureBusinessProvider()
  });
  return { service, ...ctx };
}

describe("verification service", () => {
  let ctx: ReturnType<typeof makeService>;
  beforeEach(() => {
    ctx = makeService();
  });

  it("worker request → pending (idempotent), never self-verified", async () => {
    const first = await ctx.service.requestWorkerVerification({ userId: "u-1", verificationType: "identity" });
    expect(first.status).toBe("pending");
    const again = await ctx.service.requestWorkerVerification({ userId: "u-1", verificationType: "identity" });
    expect(again.status).toBe("pending");
    expect(ctx.workers).toHaveLength(1);
    // an event was audited
    expect(ctx.events.some((e) => e.subjectType === "worker" && e.newStatus === "pending" && e.source === "worker")).toBe(true);
  });

  it("non-worker cannot request", async () => {
    const svc = makeService({ worker: null }).service;
    await expect(svc.requestWorkerVerification({ userId: "x", verificationType: "identity" })).rejects.toMatchObject({ code: "denied" });
  });

  it("provider callback ingestion is idempotent and drives verified state + audit", async () => {
    const rec = await ctx.service.requestWorkerVerification({ userId: "u-1", verificationType: "identity" });
    const result = { provider: "fixture", providerReference: rec.providerReference!, outcome: "verified" as const, expiresAt: null, resultMetadata: { checkedName: true } };
    const first = await ctx.service.ingestWorkerResult(result);
    expect(first.applied).toBe(true);
    expect(first.record?.status).toBe("verified");
    // replay is idempotent
    const replay = await ctx.service.ingestWorkerResult(result);
    expect(replay.applied).toBe(false);
    expect(ctx.events.filter((e) => e.source === "provider").length).toBe(1);
  });

  it("unknown provider reference is ignored (not applied)", async () => {
    const res = await ctx.service.ingestWorkerResult({ provider: "fixture", providerReference: "does-not-exist", outcome: "verified" });
    expect(res).toEqual({ applied: false, record: null });
  });

  it("derived worker trust reflects verified identity; expiry applied at read", async () => {
    const rec = await ctx.service.requestWorkerVerification({ userId: "u-1", verificationType: "identity" });
    await ctx.service.ingestWorkerResult({ provider: "fixture", providerReference: rec.providerReference!, outcome: "verified", expiresAt: "2000-01-01T00:00:00.000Z" });
    const trust = await ctx.service.workerTrust("w-1");
    expect(trust.identity).toBe("expired"); // past expiry → expired at read
  });

  it("employer verification lifecycle + isEmployerVerified is authoritative", async () => {
    await ctx.service.requestEmployerVerification({ organizationId: "org-1" });
    expect(await ctx.service.isEmployerVerified("org-1")).toBe(false); // pending
    const rec = ctx.employers[0]!;
    await ctx.service.ingestEmployerResult({ provider: "fixture", providerReference: rec.providerReference!, outcome: "verified" });
    expect(await ctx.service.isEmployerVerified("org-1")).toBe(true);
  });

  it("admin review is a governed decision with audit (never a raw toggle)", async () => {
    const rec = await ctx.service.requestWorkerVerification({ userId: "u-1", verificationType: "background_check" });
    const reviewed = await ctx.service.adminReviewWorker({ reviewerUserId: "admin-1", workerVerificationId: rec.id, decision: "verified" });
    expect(reviewed.status).toBe("verified");
    expect(ctx.events.some((e) => e.source === "admin" && e.actorUserId === "admin-1" && e.newStatus === "verified")).toBe(true);
  });

  it("admin review of a missing record throws not_found", async () => {
    await expect(ctx.service.adminReviewWorker({ reviewerUserId: "a", workerVerificationId: "nope", decision: "verified" })).rejects.toBeInstanceOf(VerificationError);
  });

  it("queue lists pending worker + employer subjects", async () => {
    await ctx.service.requestWorkerVerification({ userId: "u-1", verificationType: "identity" });
    await ctx.service.requestEmployerVerification({ organizationId: "org-1" });
    const queue = await ctx.service.listQueue({ statuses: ["pending"] });
    expect(queue.filter((q) => q.subjectType === "worker")).toHaveLength(1);
    expect(queue.filter((q) => q.subjectType === "employer")).toHaveLength(1);
  });
});

describe("verification callback authenticity", () => {
  it("HMAC verifier accepts a correctly-signed body and rejects tampered/unsigned", () => {
    const secret = "shhh-super-secret-value";
    const verifier = createHmacCallbackVerifier(secret);
    const body = JSON.stringify({ providerReference: "fixture-id-abc", outcome: "verified" });
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifier.verify({ rawBody: body, signature: sig })).toBe(true);
    expect(verifier.verify({ rawBody: body, signature: "deadbeef" })).toBe(false);
    expect(verifier.verify({ rawBody: `${body} ` /* tampered */, signature: sig })).toBe(false);
    expect(verifier.verify({ rawBody: body, signature: null })).toBe(false);
  });

  it("normalizeFixtureCallback maps a valid body and rejects garbage", () => {
    expect(normalizeFixtureCallback({ providerReference: "r", outcome: "verified" })).toMatchObject({ providerReference: "r", outcome: "verified" });
    expect(normalizeFixtureCallback({ providerReference: "r", outcome: "banana" })).toBeNull();
    expect(normalizeFixtureCallback({ outcome: "verified" })).toBeNull();
    expect(normalizeFixtureCallback(null)).toBeNull();
  });
});

describe("expiry helper", () => {
  it("verified-but-expired reads as expired; still-valid reads as verified", () => {
    const base: WorkerVerificationRecord = { id: "1", workerIdentityId: "w", verificationType: "identity" as WorkerVerificationType, status: "verified", provider: "fixture", providerReference: "r", requestedAt: null, completedAt: null, expiresAt: "2000-01-01T00:00:00.000Z", updatedAt: "2000-01-01T00:00:00.000Z" };
    expect(applyWorkerExpiry(base, new Date("2026-01-01T00:00:00.000Z"))).toBe("expired");
    expect(applyWorkerExpiry({ ...base, expiresAt: "2100-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:00:00.000Z"))).toBe("verified");
  });
});
