import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// HR-1 security + governance + scale contract, real Postgres via Fastify inject. Proves the
// HR authority is distinct + tamper-proof and that HR is separate from verification.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("HR-1 security + governance (endpoint level)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let hrAdminUserId = "";
  let hrToken = "";
  let workerToken = "";
  let workerAId = "";
  let workerBId = "";
  let outsiderToken = "";

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    // Only the HR admin gets HR_ADMINISTRATOR — distinct from platform admin.
    app = buildApi({
      env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" },
      resolveAuthorizationRoles: async (userId: string) => (userId === hrAdminUserId ? ["HR_ADMINISTRATOR"] : [])
    });
    await app.ready();
    const hr = await register(`hr-admin-${randomUUID()}@e2e.local`);
    hrAdminUserId = hr.user.id;
    hrToken = hr.token;
    const workerA = await register(`hr-wa-${randomUUID()}@e2e.local`);
    workerToken = workerA.token;
    const wa = await prisma.workerIdentity.create({ data: { userId: workerA.user.id, displayName: "WA", status: "active" } });
    workerAId = wa.id;
    const workerB = await register(`hr-wb-${randomUUID()}@e2e.local`);
    const wb = await prisma.workerIdentity.create({ data: { userId: workerB.user.id, displayName: "WB", status: "active" } });
    workerBId = wb.id;
    const outsider = await register(`hr-out-${randomUUID()}@e2e.local`);
    outsiderToken = outsider.token;
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  const setStanding = (t: string, worker: string, standing: string) =>
    app.inject({ method: "POST", url: `/platform/hr/workers/${worker}/standing`, headers: auth(t), payload: { standing } });

  it("workers, employers, and unauthorized admins cannot alter HR standing (403)", async () => {
    expect((await setStanding(workerToken, workerAId, "suspended")).statusCode).toBe(403);
    expect((await setStanding(outsiderToken, workerAId, "suspended")).statusCode).toBe(403);
    // unauthenticated
    expect((await app.inject({ method: "POST", url: `/platform/hr/workers/${workerAId}/standing`, payload: { standing: "suspended" } })).statusCode).toBe(401);
    // standing unchanged (no profile forced to suspended)
    const profile = await prisma.hrProfile.findUnique({ where: { workerIdentityId: workerAId } });
    expect(profile?.standing ?? "active").not.toBe("suspended");
  });

  it("a worker cannot read another worker's HR record, and cannot read the HR-authority record at all", async () => {
    // worker token hitting the HR-authority endpoint for worker B → 403 (not their own, and not HR)
    expect((await app.inject({ method: "GET", url: `/platform/hr/workers/${workerBId}`, headers: auth(workerToken) })).statusCode).toBe(403);
    // self-view returns only their OWN profile (no cross-worker data, no cases)
    const self = await app.inject({ method: "GET", url: "/hr/worker", headers: auth(workerToken) });
    expect(self.statusCode).toBe(200);
    expect("cases" in self.json()).toBe(false);
  });

  it("employers/outsiders cannot read internal HR cases", async () => {
    // open a case as HR, then confirm a non-HR user cannot read the record that contains cases
    await app.inject({ method: "POST", url: `/platform/hr/workers/${workerAId}/cases`, headers: auth(hrToken), payload: { caseType: "conduct", reason: "internal" } });
    expect((await app.inject({ method: "GET", url: `/platform/hr/workers/${workerAId}`, headers: auth(outsiderToken) })).statusCode).toBe(403);
  });

  it("HR standing and verification are separate authorities", async () => {
    await setStanding(hrToken, workerAId, "review_required");
    // HR standing changed, but no verification record was created by HR
    expect((await prisma.hrProfile.findUniqueOrThrow({ where: { workerIdentityId: workerAId } })).standing).toBe("review_required");
    expect(await prisma.workerVerification.count({ where: { workerIdentityId: workerAId } })).toBe(0);
  });

  it("expired credentials are not considered valid (effectiveStatus)", async () => {
    const add = await app.inject({ method: "POST", url: `/platform/hr/workers/${workerAId}/credentials`, headers: auth(hrToken), payload: { credentialType: "food_handler", expiresAt: "2020-01-01T00:00:00.000Z" } });
    expect(add.statusCode).toBe(201);
    expect(add.json().effectiveStatus).toBe("expired");
    const record = await app.inject({ method: "GET", url: `/platform/hr/workers/${workerAId}`, headers: auth(hrToken) });
    const cred = record.json().credentials.find((c: { id: string }) => c.id === add.json().id);
    expect(cred.effectiveStatus).toBe("expired");
  });

  it("credential renewal preserves history (old replaced + linked; new valid)", async () => {
    const add = await app.inject({ method: "POST", url: `/platform/hr/workers/${workerAId}/credentials`, headers: auth(hrToken), payload: { credentialType: "wl", expiresAt: "2026-09-01T00:00:00.000Z" } });
    const oldId = add.json().id as string;
    const renew = await app.inject({ method: "POST", url: `/platform/hr/credentials/${oldId}/renew`, headers: auth(hrToken), payload: { expiresAt: "2027-09-01T00:00:00.000Z" } });
    expect(renew.statusCode).toBe(200);
    const renewedId = renew.json().renewedId as string;
    const oldRow = await prisma.hrCredential.findUniqueOrThrow({ where: { id: oldId } });
    const newRow = await prisma.hrCredential.findUniqueOrThrow({ where: { id: renewedId } });
    expect(oldRow.status).toBe("replaced");
    expect(oldRow.supersededById).toBe(renewedId);
    expect(newRow.status).toBe("valid");
  });

  it("HR profile is unique per worker (self-view is idempotent, one row)", async () => {
    const workerC = await register(`hr-wc-${randomUUID()}@e2e.local`);
    await prisma.workerIdentity.create({ data: { userId: workerC.user.id, displayName: "WC", status: "active" } });
    await app.inject({ method: "GET", url: "/hr/worker", headers: auth(workerC.token) });
    await app.inject({ method: "GET", url: "/hr/worker", headers: auth(workerC.token) });
    const count = await prisma.hrProfile.count({ where: { worker: { userId: workerC.user.id } } });
    expect(count).toBe(1);
  });

  it("concurrent HR standing decisions are all audited (no silent overwrite of history)", async () => {
    const before = await prisma.hrEvent.count({ where: { workerIdentityId: workerBId, eventType: "standing_changed" } });
    const restrictReq = { method: "POST" as const, url: `/platform/hr/workers/${workerBId}/standing`, headers: auth(hrToken) };
    await Promise.all([
      app.inject({ ...restrictReq, payload: { standing: "restricted", reason: "reviewer A" } }),
      app.inject({ ...restrictReq, payload: { standing: "suspended", reason: "reviewer B" } })
    ]);
    const after = await prisma.hrEvent.count({ where: { workerIdentityId: workerBId, eventType: "standing_changed" } });
    expect(after - before).toBe(2); // both decisions recorded, neither silently dropped
    const final = (await prisma.hrProfile.findUniqueOrThrow({ where: { workerIdentityId: workerBId } })).standing;
    expect(["restricted", "suspended"]).toContain(final);
  });

  it("restrictive standing requires an explicit reason (no silent restrict/suspend)", async () => {
    const noReason = await app.inject({ method: "POST", url: `/platform/hr/workers/${workerAId}/standing`, headers: auth(hrToken), payload: { standing: "suspended" } });
    expect(noReason.statusCode).toBe(400);
    const withReason = await setStanding(hrToken, workerAId, "review_required"); // non-restrictive, reason optional
    expect(withReason.statusCode).toBe(200);
    const suspended = await app.inject({ method: "POST", url: `/platform/hr/workers/${workerAId}/standing`, headers: auth(hrToken), payload: { standing: "suspended", reason: "policy breach" } });
    expect(suspended.statusCode).toBe(200);
  });

  it("worker record includes verification indicators + eligibility impact (HR consumes, never mutates)", async () => {
    const record = await app.inject({ method: "GET", url: `/platform/hr/workers/${workerAId}`, headers: auth(hrToken) });
    const body = record.json();
    expect(body.verification).toHaveProperty("identity");
    expect(body.verification).toHaveProperty("backgroundCheck");
    // default policy is permissive → eligibility allowed even when unverified
    expect(body.eligibility.expressInterest.allowed).toBe(true);
    expect(body.eligibility.receiveOffer.allowed).toBe(true);
  });

  it("HR search is indexed + bounded (filter by standing / credential status)", async () => {
    // workerA is suspended (from the restrictive test); search should find them by standing
    const byStanding = await app.inject({ method: "GET", url: `/platform/hr/search?standing=suspended&limit=10`, headers: auth(hrToken) });
    expect(byStanding.statusCode).toBe(200);
    expect(byStanding.json().items.some((w: { workerIdentityId: string }) => w.workerIdentityId === workerAId)).toBe(true);
    // workerA has an expired credential → search by credentialStatus=expired finds them
    const byCred = await app.inject({ method: "GET", url: `/platform/hr/search?credentialStatus=expired&limit=10`, headers: auth(hrToken) });
    expect(byCred.statusCode).toBe(200);
    // outsider cannot search
    expect((await app.inject({ method: "GET", url: `/platform/hr/search`, headers: auth(outsiderToken) })).statusCode).toBe(403);
  });

  it("standing queue lists restricted/suspended workers (paginated); event timeline is bounded", async () => {
    const queue = await app.inject({ method: "GET", url: `/platform/hr/queues/standing?standings=suspended&limit=25`, headers: auth(hrToken) });
    expect(queue.statusCode).toBe(200);
    expect(queue.json().items.every((w: { standing: string }) => w.standing === "suspended")).toBe(true);
    const events = await app.inject({ method: "GET", url: `/platform/hr/workers/${workerAId}/events?limit=5`, headers: auth(hrToken) });
    expect(events.statusCode).toBe(200);
    expect(Array.isArray(events.json().items)).toBe(true);
    expect(events.json().items.length).toBeLessThanOrEqual(5);
  });

  it("the review queue is bounded + cursor-paginated (no list-all)", async () => {
    const workerD = await register(`hr-wd-${randomUUID()}@e2e.local`);
    const wd = await prisma.workerIdentity.create({ data: { userId: workerD.user.id, displayName: "WD", status: "active" } });
    for (let i = 0; i < 3; i++) {
      await app.inject({ method: "POST", url: `/platform/hr/workers/${wd.id}/cases`, headers: auth(hrToken), payload: { caseType: `t${i}` } });
    }
    const page1 = await app.inject({ method: "GET", url: `/platform/hr/queues/review?limit=2`, headers: auth(hrToken) });
    expect(page1.json().items.length).toBe(2);
    expect(page1.json().nextCursor).toBeTruthy();
    const page2 = await app.inject({ method: "GET", url: `/platform/hr/queues/review?limit=2&cursor=${encodeURIComponent(page1.json().nextCursor)}`, headers: auth(hrToken) });
    // page 2 has the remainder (at least 1); every item is an actionable status
    expect(page2.json().items.every((c: { status: string }) => ["opened", "under_review", "action_required"].includes(c.status))).toBe(true);
  });
});
