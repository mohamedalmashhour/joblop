import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canadaAddressAdapter } from "@rwos/country-canada";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// Endpoint-level security/privacy contract for the worker marketplace, against real
// Postgres via Fastify inject. Proves the locked guarantees end-to-end:
//   - no exact coordinate / street address leaks through search or detail
//   - hidden (draft) + non-existent jobs → 404 (cannot be probed by id)
//   - unauthorized requests → 401
//   - saved jobs are worker-scoped (no cross-worker visibility)
//   - the browser cannot fabricate saved state or a verified badge
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("marketplace security + privacy (endpoint level)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  const exactLat = 45.5702; // seeded worksite exact coords — must NEVER appear in any DTO
  const exactLng = -73.7528;
  const streetAddress = "1234 Rue Secrète";

  let tokenA = "";
  let tokenB = "";
  let visibleJobId = "";
  let draftJobId = "";
  let orgId = "";

  async function register(email: string): Promise<{ token: string; userId: string }> {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" }
    });
    const body = res.json();
    return { token: body.token, userId: body.user.id };
  }

  beforeAll(async () => {
    app = buildApi({ countryAddress: canadaAddressAdapter, env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" } });
    await app.ready();

    const a = await register(`sec-a-${randomUUID()}@e2e.local`);
    const b = await register(`sec-b-${randomUUID()}@e2e.local`);
    tokenA = a.token;
    tokenB = b.token;
    await prisma.workerIdentity.create({ data: { userId: a.userId, displayName: "A", status: "active" } });
    await prisma.workerIdentity.create({ data: { userId: b.userId, displayName: "B", status: "active" } });

    // Seed an org with an active Laval residence carrying EXACT coords + a street address,
    // one visible job and one hidden (draft) job.
    const owner = a.userId;
    const org = await prisma.employerOrganization.create({
      data: { publicId: `ORG-SEC-${randomUUID().slice(0, 8)}`, legalName: "Secret Legal Name Inc.", displayName: "SecureCare", status: "active", createdByUserId: owner }
    });
    orgId = org.id;
    const res = await prisma.residence.create({
      data: { publicId: `RES-SEC-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "Internal Residence Name", status: "active", createdByUserId: owner, province: "QC", city: "Laval", addressLine1: streetAddress, latitude: exactLat, longitude: exactLng, geocodeProvider: "fixture", geocodeResolvedAt: new Date() }
    });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-SEC-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: owner } });
    const mkJob = (status: "approved_for_dispatch" | "draft") =>
      prisma.jobRequest.create({
        data: {
          jobRequestNumber: `JR-SEC-${randomUUID().slice(0, 10)}`,
          organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id,
          creatorUserId: owner, title: "Secure shift", numberOfWorkers: 2, requestType: "single_day", timezone: "America/Toronto",
          startAt: new Date(Date.now() + 20 * 3_600_000), endAt: new Date(Date.now() + 28 * 3_600_000),
          status, createdByUserId: owner
        }
      });
    visibleJobId = (await mkJob("approved_for_dispatch")).id;
    draftJobId = (await mkJob("draft")).id;
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  async function search(token: string, extra: Record<string, unknown> = {}) {
    return app.inject({ method: "POST", url: "/marketplace/jobs/search", headers: auth(token), payload: { postalCode: "H7V 1A1", radiusKm: 25, ...extra } });
  }

  it("search never leaks exact coordinates or the street address", async () => {
    const res = await search(tokenA);
    expect(res.statusCode).toBe(200);
    const raw = res.body;
    expect(raw).not.toContain(String(exactLat));
    expect(raw).not.toContain(String(exactLng));
    expect(raw).not.toContain(streetAddress);
    expect(raw).not.toContain("Secret Legal Name"); // legal name never exposed
    expect(raw).not.toContain("Internal Residence Name"); // residence internal name never exposed
    // approximate point is rounded (2dp)
    const job = res.json().jobs.find((j: { jobRequestId: string }) => j.jobRequestId === visibleJobId);
    expect(job.mapPoint.approximate).toBe(true);
    expect(job.verifiedEmployer).toBe(false); // never inferred
  });

  it("detail never leaks exact coordinates / address and reports verified=false", async () => {
    const res = await app.inject({ method: "GET", url: `/marketplace/jobs/${visibleJobId}?postalCode=H7V%201A1`, headers: auth(tokenA) });
    expect(res.statusCode).toBe(200);
    const raw = res.body;
    expect(raw).not.toContain(String(exactLat));
    expect(raw).not.toContain(String(exactLng));
    expect(raw).not.toContain(streetAddress);
    expect(res.json().job.employer.verified).toBe(false);
  });

  it("hidden (draft) job detail returns 404 — cannot be probed by id", async () => {
    const res = await app.inject({ method: "GET", url: `/marketplace/jobs/${draftJobId}`, headers: auth(tokenA) });
    expect(res.statusCode).toBe(404);
  });

  it("non-existent job detail returns 404", async () => {
    const res = await app.inject({ method: "GET", url: `/marketplace/jobs/11111111-1111-4111-8111-111111111111`, headers: auth(tokenA) });
    expect(res.statusCode).toBe(404);
  });

  it("unauthorized requests are denied (401)", async () => {
    expect((await app.inject({ method: "GET", url: `/marketplace/jobs/${visibleJobId}` })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: `/marketplace/saved-jobs` })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: `/marketplace/jobs/search`, payload: { postalCode: "H7V 1A1" } })).statusCode).toBe(401);
  });

  it("saved jobs are worker-scoped — worker B cannot see worker A's saves", async () => {
    // A saves the visible job
    const saveRes = await app.inject({ method: "POST", url: "/marketplace/saved-jobs", headers: auth(tokenA), payload: { jobRequestId: visibleJobId } });
    expect(saveRes.statusCode).toBe(200);
    // A's list has it, B's list does not
    const aList = (await app.inject({ method: "GET", url: "/marketplace/saved-jobs", headers: auth(tokenA) })).json();
    const bList = (await app.inject({ method: "GET", url: "/marketplace/saved-jobs", headers: auth(tokenB) })).json();
    expect(aList.saved.some((s: { jobRequestId: string }) => s.jobRequestId === visibleJobId)).toBe(true);
    expect(bList.saved.some((s: { jobRequestId: string }) => s.jobRequestId === visibleJobId)).toBe(false);
    // and A's search shows saved=true while B's shows saved=false for the same job
    const aJob = (await search(tokenA)).json().jobs.find((j: { jobRequestId: string }) => j.jobRequestId === visibleJobId);
    const bJob = (await search(tokenB)).json().jobs.find((j: { jobRequestId: string }) => j.jobRequestId === visibleJobId);
    expect(aJob.saved).toBe(true);
    expect(bJob.saved).toBe(false);
  });

  it("the browser cannot fabricate saved state via the search body", async () => {
    // B sends saved:true in the payload; the server ignores it and computes saved=false.
    const bJob = (await search(tokenB, { saved: true, jobs: [{ jobRequestId: visibleJobId, saved: true }] }))
      .json()
      .jobs.find((j: { jobRequestId: string }) => j.jobRequestId === visibleJobId);
    expect(bJob.saved).toBe(false);
  });

  it("employer profile exposes only public fields (no legal name / address / verified)", async () => {
    const res = await app.inject({ method: "GET", url: `/marketplace/employers/${orgId}`, headers: auth(tokenA) });
    expect(res.statusCode).toBe(200);
    const raw = res.body;
    expect(raw).not.toContain("Secret Legal Name");
    expect(raw).not.toContain(streetAddress);
    expect(res.json().employer.verified).toBe(false);
    expect(res.json().employer.name).toBe("SecureCare");
  });
});
