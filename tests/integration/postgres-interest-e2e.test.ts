import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canadaAddressAdapter } from "@rwos/country-canada";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// FULL governed handoff E2E with database proof, through the real endpoints:
//   worker Express Interest → admin shortlist → governed WorkerOffer (accepted) exists →
//   admin links interest to offer (offer_created) → platform creates the authoritative
//   Assignment from the accepted offer → interest mirrors offer_accepted.
//
// DB proof asserted at each step:
//   Express Interest = 0 assignments
//   Shortlist        = 0 assignments
//   Offer created/linked (offer_created) = 0 assignments
//   Assignment created via the governed lifecycle = exactly one assignment
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("marketplace interest → governed dispatch handoff (full E2E + DB proof)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let adminUserId = "";
  let adminToken = "";
  let workerToken = "";
  let workerId = "";
  let jobId = "";
  let dispatchReviewId = "";
  let offerId = "";
  let interestId = "";
  const startAt = new Date(Date.now() + 30 * 3_600_000);
  const endAt = new Date(Date.now() + 38 * 3_600_000);
  const now = new Date();

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }
  const adminAuth = () => ({ authorization: `Bearer ${adminToken}` });
  const workerAuth = () => ({ authorization: `Bearer ${workerToken}` });
  const assignmentsForWorker = () => prisma.assignment.count({ where: { workerIdentityId: workerId, jobRequestId: jobId } });

  beforeAll(async () => {
    app = buildApi({
      countryAddress: canadaAddressAdapter,
      env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" },
      resolveAuthorizationRoles: async (userId: string) => (userId === adminUserId ? ["PLATFORM_ADMINISTRATOR"] : [])
    });
    await app.ready();

    const admin = await register(`e2e-admin-${randomUUID()}@e2e.local`);
    adminUserId = admin.user.id;
    adminToken = admin.token;
    const worker = await register(`e2e-worker-${randomUUID()}@e2e.local`);
    workerToken = worker.token;
    const wid = await prisma.workerIdentity.create({ data: { userId: worker.user.id, displayName: "E2E Worker", status: "active" } });
    workerId = wid.id;

    const owner = admin.user.id;
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-E2E-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "E2ECare", status: "active", createdByUserId: owner } });
    const res = await prisma.residence.create({ data: { publicId: `RES-E2E-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: owner, province: "QC", city: "Laval", latitude: 45.5707, longitude: -73.7531, geocodeProvider: "fixture", geocodeResolvedAt: new Date() } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-E2E-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: owner } });
    const scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
    const job = await prisma.jobRequest.create({
      data: { jobRequestNumber: `JR-E2E-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: owner, title: "E2E shift", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto", startAt, endAt, status: "approved_for_dispatch", createdByUserId: owner }
    });
    jobId = job.id;
    const dispatch = await prisma.dispatchReview.create({ data: { jobRequestId: jobId, ...scope, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: owner } });
    dispatchReviewId = dispatch.id;

    // Seed a governed offer that the worker has ACCEPTED (stands in for the offers-panel +
    // worker acceptance flow), so the platform can create the authoritative assignment.
    const offer = await prisma.workerOffer.create({
      data: { dispatchReviewId, jobRequestId: jobId, organizationId: org.id, residenceId: res.id, departmentId: dept.id, workerIdentityId: workerId, status: "accepted", expiresAt: new Date(startAt.getTime() - 3_600_000), approvedAt: now, sentAt: now, respondedAt: now, createdByUserId: owner }
    });
    const terms = await prisma.workerOfferTermsVersion.create({
      data: { workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: "America/Toronto", startAt, endAt, workGroupId: wg.id, roleDefinitionId: role.id, createdByUserId: owner }
    });
    await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: workerId, termsVersionId: terms.id, responseType: "accepted" } });
    offerId = offer.id;
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it("step 1: worker expresses interest → submitted; DB proof: 0 assignments", async () => {
    const res = await app.inject({ method: "POST", url: `/marketplace/jobs/${jobId}/interest`, headers: workerAuth(), payload: { postalCode: "H7V 1A1" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().interest.status).toBe("submitted");
    const row = await prisma.workerJobInterest.findFirstOrThrow({ where: { workerIdentityId: workerId, jobRequestId: jobId } });
    interestId = row.id;
    expect(await assignmentsForWorker()).toBe(0);
  });

  it("step 2: admin sees the interested worker and shortlists → shortlisted; DB proof: 0 assignments", async () => {
    const list = await app.inject({ method: "GET", url: `/platform/job-requests/${jobId}/interested-workers`, headers: adminAuth() });
    expect(list.json().interested.some((x: { workerIdentityId: string }) => x.workerIdentityId === workerId)).toBe(true);
    const sl = await app.inject({ method: "POST", url: `/platform/job-interests/${interestId}/shortlist`, headers: adminAuth() });
    expect(sl.json().interest.status).toBe("shortlisted");
    expect(await assignmentsForWorker()).toBe(0);
  });

  it("step 3: admin links the governed offer → offer_created; DB proof: 0 assignments (offer alone is not an assignment)", async () => {
    const link = await app.inject({ method: "POST", url: `/platform/job-interests/${interestId}/link-offer`, headers: adminAuth(), payload: { workerOfferId: offerId } });
    expect(link.statusCode).toBe(200);
    expect(link.json().interest.status).toBe("offer_created");
    expect(link.json().interest.workerOfferId).toBe(offerId);
    expect(await assignmentsForWorker()).toBe(0);
  });

  it("step 4: platform creates the authoritative assignment from the accepted offer → exactly one assignment; interest mirrors offer_accepted", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/platform/assignments",
      headers: adminAuth(),
      payload: { workerOfferId: offerId, dispatchReviewId, expectedOfferVersion: 1 }
    });
    expect(create.statusCode).toBe(201);
    // exactly one assignment now exists — created only by the governed lifecycle
    expect(await assignmentsForWorker()).toBe(1);
    // and the marketplace interest now mirrors the authoritative state
    const row = await prisma.workerJobInterest.findUniqueOrThrow({ where: { id: interestId } });
    expect(row.status).toBe("offer_accepted");
  });

  it("my-interests reflects the linked offer + accepted status for the worker", async () => {
    const mine = await app.inject({ method: "GET", url: "/marketplace/my-interests", headers: workerAuth() });
    const item = mine.json().interests.find((i: { jobRequestId: string }) => i.jobRequestId === jobId);
    expect(item.status).toBe("offer_accepted");
    expect(item.offerStatus).toBe("accepted");
  });
});
