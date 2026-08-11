import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID, createHmac } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// Verification security contract, real Postgres via Fastify inject. Proves trust is
// server-authoritative + tamper-proof:
//   - a worker can never mark themselves verified (request → pending only; review is admin)
//   - provider callbacks must be signed (fabricated → 401), are idempotent (replay no-op)
//   - admin review is PLATFORM_ADMINISTRATOR only
//   - employer verification request requires org membership
//   - the Verified-Employer badge reflects real state (false until verified; false when expired)
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const CALLBACK_SECRET = "verification-callback-secret-000000000000";

suite("verification security (endpoint level)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let adminUserId = "";
  let adminToken = "";
  let workerToken = "";
  let workerId = "";
  let orgId = "";
  let visibleJobId = "";

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const sign = (body: unknown) => createHmac("sha256", CALLBACK_SECRET).update(JSON.stringify(body)).digest("hex");

  beforeAll(async () => {
    app = buildApi({
      env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test", VERIFICATION_CALLBACK_SECRET: CALLBACK_SECRET },
      resolveAuthorizationRoles: async (userId: string) => (userId === adminUserId ? ["PLATFORM_ADMINISTRATOR"] : [])
    });
    await app.ready();
    const admin = await register(`ver-admin-${randomUUID()}@e2e.local`);
    adminUserId = admin.user.id;
    adminToken = admin.token;
    const worker = await register(`ver-worker-${randomUUID()}@e2e.local`);
    workerToken = worker.token;
    const wid = await prisma.workerIdentity.create({ data: { userId: worker.user.id, displayName: "Ver Worker", status: "active" } });
    workerId = wid.id;

    const owner = admin.user.id;
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-VER-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "VerCare", status: "active", createdByUserId: owner } });
    orgId = org.id;
    const res = await prisma.residence.create({ data: { publicId: `RES-VER-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: owner, province: "QC", city: "Laval", latitude: 45.5708, longitude: -73.7532, geocodeProvider: "fixture", geocodeResolvedAt: new Date() } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-VER-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: owner } });
    const job = await prisma.jobRequest.create({
      data: { jobRequestNumber: `JR-VER-${randomUUID().slice(0, 10)}`, organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id, creatorUserId: owner, title: "Ver shift", numberOfWorkers: 2, requestType: "single_day", timezone: "America/Toronto", startAt: new Date(Date.now() + 20 * 3_600_000), endAt: new Date(Date.now() + 28 * 3_600_000), status: "approved_for_dispatch", createdByUserId: owner }
    });
    visibleJobId = job.id;
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it("worker request → pending only; the worker cannot self-verify or use admin review", async () => {
    const req = await app.inject({ method: "POST", url: "/verification/worker/request", headers: auth(workerToken), payload: { verificationType: "identity" } });
    expect(req.statusCode).toBe(200);
    expect(req.json().status).toBe("pending");
    const record = await prisma.workerVerification.findFirstOrThrow({ where: { workerIdentityId: workerId, verificationType: "identity" } });
    expect(record.status).toBe("pending");
    // worker cannot call the platform review endpoint
    const review = await app.inject({ method: "POST", url: `/platform/verification/workers/${record.id}/review`, headers: auth(workerToken), payload: { decision: "verified" } });
    expect(review.statusCode).toBe(403);
  });

  it("provider callback must be signed; a fabricated signature is rejected", async () => {
    const record = await prisma.workerVerification.findFirstOrThrow({ where: { workerIdentityId: workerId, verificationType: "identity" } });
    const body = { providerReference: record.providerReference, outcome: "verified" };
    const bad = await app.inject({ method: "POST", url: "/verification/callback", headers: { "x-verification-signature": "deadbeef" }, payload: body });
    expect(bad.statusCode).toBe(401);
    // unsigned too
    const unsigned = await app.inject({ method: "POST", url: "/verification/callback", payload: body });
    expect(unsigned.statusCode).toBe(401);
    // status unchanged
    expect((await prisma.workerVerification.findUniqueOrThrow({ where: { id: record.id } })).status).toBe("pending");
  });

  it("a correctly-signed callback verifies the worker and is idempotent on replay", async () => {
    const record = await prisma.workerVerification.findFirstOrThrow({ where: { workerIdentityId: workerId, verificationType: "identity" } });
    const body = { providerReference: record.providerReference, outcome: "verified" };
    const first = await app.inject({ method: "POST", url: "/verification/callback", headers: { "x-verification-signature": sign(body) }, payload: body });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ subject: "worker", applied: true });
    expect((await prisma.workerVerification.findUniqueOrThrow({ where: { id: record.id } })).status).toBe("verified");
    // replay is idempotent
    const replay = await app.inject({ method: "POST", url: "/verification/callback", headers: { "x-verification-signature": sign(body) }, payload: body });
    expect(replay.json().applied).toBe(false);
    // exactly one provider event recorded
    const events = await prisma.verificationEvent.count({ where: { subjectId: workerId, source: "provider" } });
    expect(events).toBe(1);
  });

  it("admin review is platform-only and audited", async () => {
    const bg = await app.inject({ method: "POST", url: "/verification/worker/request", headers: auth(workerToken), payload: { verificationType: "background_check" } });
    expect(bg.statusCode).toBe(200);
    const record = await prisma.workerVerification.findFirstOrThrow({ where: { workerIdentityId: workerId, verificationType: "background_check" } });
    const ok = await app.inject({ method: "POST", url: `/platform/verification/workers/${record.id}/review`, headers: auth(adminToken), payload: { decision: "verified" } });
    expect(ok.statusCode).toBe(200);
    expect((await prisma.workerVerification.findUniqueOrThrow({ where: { id: record.id } })).status).toBe("verified");
    expect(await prisma.verificationEvent.count({ where: { subjectId: workerId, source: "admin", actorUserId: adminUserId } })).toBeGreaterThan(0);
  });

  it("employer verification request requires org membership", async () => {
    // the worker is not a member of the org → 403
    const denied = await app.inject({ method: "POST", url: `/organizations/${orgId}/verification/request`, headers: auth(workerToken) });
    expect(denied.statusCode).toBe(403);
  });

  it("Verified-Employer badge reflects real state (false until verified, false when expired)", async () => {
    // before: not verified
    const before = await app.inject({ method: "GET", url: `/marketplace/jobs/${visibleJobId}`, headers: auth(workerToken) });
    expect(before.json().job.employer.verified).toBe(false);
    // seed authoritative business_verified
    await prisma.employerVerification.create({ data: { organizationId: orgId, status: "business_verified", provider: "fixture", providerReference: `biz-${randomUUID().slice(0, 8)}`, completedAt: new Date() } });
    const after = await app.inject({ method: "GET", url: `/marketplace/jobs/${visibleJobId}`, headers: auth(workerToken) });
    expect(after.json().job.employer.verified).toBe(true);
    // expire it → badge false again (expiry applied server-side)
    await prisma.employerVerification.update({ where: { organizationId: orgId }, data: { expiresAt: new Date(Date.now() - 3_600_000) } });
    const expired = await app.inject({ method: "GET", url: `/marketplace/jobs/${visibleJobId}`, headers: auth(workerToken) });
    expect(expired.json().job.employer.verified).toBe(false);
  });
});
