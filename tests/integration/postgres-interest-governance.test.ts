import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canadaAddressAdapter } from "@rwos/country-canada";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// Governed-boundary + concurrency contract for Express Interest against real Postgres.
// Proves interest is a dispatch SIGNAL that never creates an offer or assignment, that the
// governed offer (created via the existing worker-offer model) links back explicitly, and
// that concurrent double-submits collapse to a single active interest (partial unique index).
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("marketplace interest governance + concurrency", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let adminUserId = "";
  let workerToken = "";
  let workerId = "";
  let otherWorkerId = "";
  let jobId = "";
  let scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }

  const adminAuth = () => ({ authorization: `Bearer ${adminToken}` });
  let adminToken = "";

  beforeAll(async () => {
    // Inject a role resolver that grants PLATFORM_ADMINISTRATOR only to the admin user.
    app = buildApi({
      countryAddress: canadaAddressAdapter,
      countryCurrency: "CAD",
      env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" },
      resolveAuthorizationRoles: async (userId: string) => (userId === adminUserId ? ["PLATFORM_ADMINISTRATOR"] : [])
    });
    await app.ready();

    const admin = await register(`gov-admin-${randomUUID()}@e2e.local`);
    adminUserId = admin.user.id;
    adminToken = admin.token;
    const worker = await register(`gov-worker-${randomUUID()}@e2e.local`);
    workerToken = worker.token;
    const wid = await prisma.workerIdentity.create({ data: { userId: worker.user.id, displayName: "Gov Worker", status: "active" } });
    workerId = wid.id;
    const otherUser = await register(`gov-other-${randomUUID()}@e2e.local`);
    const owid = await prisma.workerIdentity.create({ data: { userId: otherUser.user.id, displayName: "Other Worker", status: "active" } });
    otherWorkerId = owid.id;

    const owner = admin.user.id;
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-GOV-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "GovCare", status: "active", createdByUserId: owner } });
    const res = await prisma.residence.create({ data: { publicId: `RES-GOV-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: owner, province: "QC", city: "Laval", latitude: 45.5706, longitude: -73.753, geocodeProvider: "fixture", geocodeResolvedAt: new Date() } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-GOV-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: owner } });
    scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
    const job = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-GOV-${randomUUID().slice(0, 10)}`,
        ...scope, creatorUserId: owner, title: "Gov shift", numberOfWorkers: 2, requestType: "single_day", timezone: "America/Toronto",
        startAt: new Date(Date.now() + 20 * 3_600_000), endAt: new Date(Date.now() + 28 * 3_600_000), status: "approved_for_dispatch", createdByUserId: owner
      }
    });
    jobId = job.id;
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  let reviewId = "";
  async function seedOffer(workerIdentityId: string) {
    // A job has at most one dispatch review; reuse it across offers (the governed model).
    if (!reviewId) {
      const review = await prisma.dispatchReview.create({ data: { jobRequestId: jobId, ...scope, requiredWorkerCount: 2, state: "candidate_review", createdByUserId: adminUserId } });
      reviewId = review.id;
    }
    const offer = await prisma.workerOffer.create({ data: { dispatchReviewId: reviewId, jobRequestId: jobId, organizationId: scope.organizationId, residenceId: scope.residenceId, departmentId: scope.departmentId, workerIdentityId, status: "sent", expiresAt: new Date(Date.now() + 24 * 3_600_000), createdByUserId: adminUserId } });
    return offer.id;
  }

  it("concurrent double-submit collapses to exactly one active interest", async () => {
    const bursts = await Promise.all(
      Array.from({ length: 6 }, () => app.inject({ method: "POST", url: `/marketplace/jobs/${jobId}/interest`, headers: { authorization: `Bearer ${workerToken}` }, payload: { postalCode: "H7V 1A1" } }))
    );
    expect(bursts.every((r) => r.statusCode === 200)).toBe(true);
    const active = await prisma.workerJobInterest.count({ where: { workerIdentityId: workerId, jobRequestId: jobId, status: { notIn: ["withdrawn", "not_selected"] } } });
    expect(active).toBe(1);
    // and NO offer / assignment created by interest
    expect(await prisma.workerOffer.count({ where: { workerIdentityId: workerId, jobRequestId: jobId } })).toBe(0);
    expect(await prisma.assignment.count({ where: { workerIdentityId: workerId, jobRequestId: jobId } })).toBe(0);
  });

  it("platform sees interested workers (worker cannot); shortlist is intent-only", async () => {
    // non-admin worker is denied the platform view
    const denied = await app.inject({ method: "GET", url: `/platform/job-requests/${jobId}/interested-workers`, headers: { authorization: `Bearer ${workerToken}` } });
    expect(denied.statusCode).toBe(403);
    // admin sees the interested worker
    const list = await app.inject({ method: "GET", url: `/platform/job-requests/${jobId}/interested-workers`, headers: adminAuth() });
    expect(list.statusCode).toBe(200);
    const entry = list.json().interested.find((x: { workerIdentityId: string }) => x.workerIdentityId === workerId);
    expect(entry).toBeTruthy();
    expect(entry.displayName).toBe("Gov Worker");
    // shortlist → status changes, still no offer/assignment
    const sl = await app.inject({ method: "POST", url: `/platform/job-interests/${entry.interestId}/shortlist`, headers: adminAuth() });
    expect(sl.statusCode).toBe(200);
    expect(sl.json().interest.status).toBe("shortlisted");
    expect(await prisma.assignment.count({ where: { workerIdentityId: workerId, jobRequestId: jobId } })).toBe(0);
  });

  it("link-offer rejects a mismatched offer, links a matching one; interest never creates the assignment", async () => {
    const list = await app.inject({ method: "GET", url: `/platform/job-requests/${jobId}/interested-workers`, headers: adminAuth() });
    const interestId = list.json().interested.find((x: { workerIdentityId: string }) => x.workerIdentityId === workerId).interestId;

    // an offer for a DIFFERENT worker cannot be linked
    const otherOfferId = await seedOffer(otherWorkerId);
    const mismatch = await app.inject({ method: "POST", url: `/platform/job-interests/${interestId}/link-offer`, headers: adminAuth(), payload: { workerOfferId: otherOfferId } });
    expect(mismatch.statusCode).toBe(409);

    // a genuine offer for THIS worker links → offer_created
    const offerId = await seedOffer(workerId);
    const link = await app.inject({ method: "POST", url: `/platform/job-interests/${interestId}/link-offer`, headers: adminAuth(), payload: { workerOfferId: offerId } });
    expect(link.statusCode).toBe(200);
    expect(link.json().interest.status).toBe("offer_created");
    expect(link.json().interest.workerOfferId).toBe(offerId);
    // linking an offer is NOT accepting it — no assignment exists yet
    expect(await prisma.assignment.count({ where: { workerIdentityId: workerId, jobRequestId: jobId } })).toBe(0);

    // worker can no longer withdraw once an offer exists (governed lifecycle owns it)
    const withdraw = await app.inject({ method: "DELETE", url: `/marketplace/jobs/${jobId}/interest`, headers: { authorization: `Bearer ${workerToken}` } });
    expect(withdraw.json().withdrawn).toBe(false);

    // platform marks accepted (mirrors the governed offer acceptance) → offer_accepted
    const accepted = await app.inject({ method: "POST", url: `/platform/job-interests/${interestId}/offer-accepted`, headers: adminAuth() });
    expect(accepted.json().interest.status).toBe("offer_accepted");
  });
});
