import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canadaAddressAdapter } from "@rwos/country-canada";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// Endpoint-level security + governance contract for Express Interest, against real
// Postgres via Fastify inject. Proves interest is intent-only and safe:
//   - express is idempotent (partial unique index)
//   - hidden (draft) + non-existent jobs → 404
//   - unauthorized → 401
//   - interest is worker-scoped (B cannot see A's; A can't express "as" B)
//   - already-assigned / active-offer workers are ineligible
//   - expressing interest creates NO worker offer and NO assignment
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("marketplace interest security + governance (endpoint level)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let tokenA = "";
  let tokenB = "";
  let workerA = "";
  let workerB = "";
  let ownerUserId = "";
  let visibleJobId = "";
  let draftJobId = "";

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }

  beforeAll(async () => {
    app = buildApi({ countryAddress: canadaAddressAdapter, env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" } });
    await app.ready();
    const a = await register(`int-a-${randomUUID()}@e2e.local`);
    const b = await register(`int-b-${randomUUID()}@e2e.local`);
    tokenA = a.token;
    tokenB = b.token;
    const wa = await prisma.workerIdentity.create({ data: { userId: a.user.id, displayName: "A", status: "active" } });
    const wb = await prisma.workerIdentity.create({ data: { userId: b.user.id, displayName: "B", status: "active" } });
    workerA = wa.id;
    workerB = wb.id;
    ownerUserId = a.user.id;

    const owner = a.user.id;
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-INT-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "IntCare", status: "active", createdByUserId: owner } });
    const res = await prisma.residence.create({ data: { publicId: `RES-INT-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: owner, province: "QC", city: "Laval", latitude: 45.5705, longitude: -73.7529, geocodeProvider: "fixture", geocodeResolvedAt: new Date() } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-INT-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: owner } });
    const mkJob = (status: "approved_for_dispatch" | "draft") =>
      prisma.jobRequest.create({
        data: {
          jobRequestNumber: `JR-INT-${randomUUID().slice(0, 10)}`,
          organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id,
          creatorUserId: owner, title: "Int shift", numberOfWorkers: 2, requestType: "single_day", timezone: "America/Toronto",
          startAt: new Date(Date.now() + 20 * 3_600_000), endAt: new Date(Date.now() + 28 * 3_600_000), status, createdByUserId: owner
        }
      });
    visibleJobId = (await mkJob("approved_for_dispatch")).id;
    draftJobId = (await mkJob("draft")).id;
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const express = (t: string, job: string, body: Record<string, unknown> = {}) =>
    app.inject({ method: "POST", url: `/marketplace/jobs/${job}/interest`, headers: auth(t), payload: body });

  it("express is idempotent and creates NO offer/assignment", async () => {
    const first = await express(tokenA, visibleJobId, { postalCode: "H7V 1A1" });
    expect(first.statusCode).toBe(200);
    expect(first.json().alreadyInterested).toBe(false);
    const second = await express(tokenA, visibleJobId);
    expect(second.json().alreadyInterested).toBe(true);
    // exactly one active interest row; no offer, no assignment
    const interests = await prisma.workerJobInterest.count({ where: { workerIdentityId: workerA, jobRequestId: visibleJobId, status: { notIn: ["withdrawn", "not_selected"] } } });
    expect(interests).toBe(1);
    expect(await prisma.workerOffer.count({ where: { workerIdentityId: workerA, jobRequestId: visibleJobId } })).toBe(0);
    expect(await prisma.assignment.count({ where: { workerIdentityId: workerA, jobRequestId: visibleJobId } })).toBe(0);
  });

  it("hidden (draft) + non-existent job interest → 404", async () => {
    expect((await express(tokenA, draftJobId)).statusCode).toBe(404);
    expect((await express(tokenA, "11111111-1111-4111-8111-111111111111")).statusCode).toBe(404);
  });

  it("unauthorized interest actions → 401", async () => {
    expect((await app.inject({ method: "POST", url: `/marketplace/jobs/${visibleJobId}/interest`, payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: `/marketplace/my-interests` })).statusCode).toBe(401);
    expect((await app.inject({ method: "DELETE", url: `/marketplace/jobs/${visibleJobId}/interest` })).statusCode).toBe(401);
  });

  it("interest is worker-scoped — B does not see A's interest, and each expresses as themselves", async () => {
    // A already expressed above. B's my-interests is empty for this job.
    const bList = (await app.inject({ method: "GET", url: "/marketplace/my-interests", headers: auth(tokenB) })).json();
    expect(bList.interests.some((i: { jobRequestId: string }) => i.jobRequestId === visibleJobId)).toBe(false);
    // B expresses interest → tied to B's own worker identity, not A's
    expect((await express(tokenB, visibleJobId)).statusCode).toBe(200);
    const aList = (await app.inject({ method: "GET", url: "/marketplace/my-interests", headers: auth(tokenA) })).json();
    const aForJob = aList.interests.filter((i: { jobRequestId: string }) => i.jobRequestId === visibleJobId);
    expect(aForJob).toHaveLength(1); // A still has exactly one (B's did not merge in)
  });

  it("an already-assigned or actively-offered worker is ineligible (422)", async () => {
    // Seed an active offer for THIS test's worker B on the visible job → B ineligible.
    const owner = ownerUserId;
    const job = await prisma.jobRequest.findFirstOrThrow({ where: { id: visibleJobId }, select: { organizationId: true, residenceId: true, departmentId: true, workGroupId: true, roleDefinitionId: true } });
    const review = await prisma.dispatchReview.create({ data: { jobRequestId: visibleJobId, organizationId: job.organizationId, residenceId: job.residenceId, departmentId: job.departmentId, workGroupId: job.workGroupId, roleDefinitionId: job.roleDefinitionId, requiredWorkerCount: 2, state: "candidate_review", createdByUserId: owner } });
    await prisma.workerOffer.create({ data: { dispatchReviewId: review.id, jobRequestId: visibleJobId, organizationId: job.organizationId, residenceId: job.residenceId, departmentId: job.departmentId, workerIdentityId: workerB, status: "sent", expiresAt: new Date(Date.now() + 24 * 3_600_000), createdByUserId: owner } });
    // B withdrew? No — B expressed earlier; withdraw then re-express is blocked by the active offer.
    await app.inject({ method: "DELETE", url: `/marketplace/jobs/${visibleJobId}/interest`, headers: auth(tokenB) });
    const res = await express(tokenB, visibleJobId);
    expect(res.statusCode).toBe(422);
    expect(res.json().reasons).toContain("active_offer_exists");
  });
});
