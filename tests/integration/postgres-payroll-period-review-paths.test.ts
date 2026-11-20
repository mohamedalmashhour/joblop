import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import { contractInForce, priceJob, type FixtureContract } from "./payrollPricingFixture";

/**
 * HR-6.1 Chunk 1 FINALIZATION — live PostgreSQL/API proof of the per-worker failure PATHS using
 * repository-standard HR-5.1 marketplace seeds (approved worked time + governed contract rates).
 * For each seeded worker the read-only period review endpoint must return the deterministic flag,
 * and — for authority parity — the governed calculation path (POST /platform/payroll/calculations)
 * must fail with the SAME governed reason (throwing before any write) or succeed for the valid one.
 * The review endpoint itself must mutate nothing.
 */
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const NOW = new Date();

suite("HR-6.1 period review — per-worker failure paths (live PG)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let ownerId = ""; // payroll admin = owner/creator
  let payrollToken = "";
  let wgId = "";
  let roleId = "";
  let roleNoRate = ""; // a role with no contract rate (for MISSING_AUTHORITATIVE_INPUT)

  const start = new Date("2026-08-05T13:00:00Z");
  const end = new Date("2026-08-05T21:00:00Z"); // 480 min
  const periodStart = new Date("2026-08-01T00:00:00Z");
  const periodEnd = new Date("2026-08-16T00:00:00Z");

  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const review = (periodId: string) => app.inject({ method: "GET", url: `/platform/payroll/periods/${periodId}/review-context`, headers: auth(payrollToken) });
  const calculate = (periodId: string, workerIdentityId: string) => app.inject({ method: "POST", url: "/platform/payroll/calculations", headers: auth(payrollToken), payload: { payrollPeriodId: periodId, workerIdentityId } });
  const register = async (email: string) => (await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } })).json() as { token: string; user: { id: string } };

  async function newWorker() {
    const u = await register(`prp-w-${randomUUID()}@e2e.local`);
    return (await prisma.workerIdentity.create({ data: { userId: u.user.id, displayName: "W", status: "active" } })).id;
  }
  async function newOrg() {
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-PRP-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "PRP", status: "active", createdByUserId: ownerId } });
    return org.id;
  }
  async function newResidence(orgId: string, province: string) {
    const tag = randomUUID().slice(0, 8);
    const res = await prisma.residence.create({ data: { publicId: `RES-${tag}`, organizationId: orgId, name: `R-${province}-${tag}`, status: "active", createdByUserId: ownerId, province, city: "C" } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-${tag}`, organizationId: orgId, residenceId: res.id, name: `D-${tag}`, status: "active", createdByUserId: ownerId } });
    return { residenceId: res.id, departmentId: dept.id };
  }
  async function newPeriod(orgId: string, region: string) {
    return (await prisma.payrollPeriod.create({ data: { organizationId: orgId, jurisdictionCountry: "CA", jurisdictionRegion: region, periodStart, periodEnd, timezone: "America/Toronto", currency: "CAD", ruleProviderKey: "synthetic-fixture", ruleProviderVersion: "synthetic-2026.08", createdByUserId: ownerId } })).id;
  }
  const contractsByOrg = new Map<string, FixtureContract[]>();
  async function seedContract(orgId: string, version: string, status: string, effFromIso: string, rateMinor: number, roleDefinitionId: string) {
    const cid = randomUUID(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(`INSERT INTO employer_contracts (id, organization_id, version, status, currency, activated_at, effective_from, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,$4,'CAD',$5,$5,$6,$7,$7)`, cid, orgId, version, status, effFromIso, ownerId, n);
    await prisma.$executeRawUnsafe(`INSERT INTO contract_role_rates (id, contract_id, work_group_id, role_definition_id, hourly_rate_minor, created_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5)`, cid, wgId, roleDefinitionId, rateMinor, n);
    contractsByOrg.set(orgId, [...(contractsByOrg.get(orgId) ?? []), { id: cid, version, effectiveFrom: new Date(effFromIso), rateMinor }]);
  }
  async function makeAssignment(workerId: string, scope: Record<string, string>, s: Date, e: Date) {
    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: ownerId, title: "Shift", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto", startAt: s, endAt: e, status: "approved_for_dispatch", createdByUserId: ownerId } });
    const dr = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: ownerId } });
    const offer = await prisma.workerOffer.create({ data: { dispatchReviewId: dr.id, jobRequestId: job.id, organizationId: scope.organizationId, residenceId: scope.residenceId, departmentId: scope.departmentId, workerIdentityId: workerId, status: "accepted", expiresAt: new Date(NOW.getTime() + 24 * 3_600_000), approvedAt: NOW, sentAt: NOW, respondedAt: NOW, createdByUserId: ownerId } });
    const terms = await prisma.workerOfferTermsVersion.create({ data: { workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: "America/Toronto", startAt: s, endAt: e, workGroupId: scope.workGroupId, roleDefinitionId: scope.roleDefinitionId, createdByUserId: ownerId } });
    await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: workerId, termsVersionId: terms.id, responseType: "accepted" } });
    const result = await createPrismaAssignmentRepository(prisma).createAssignmentFromAcceptedOfferAtomically({ workerOfferId: offer.id, expectedDispatchReviewId: dr.id, expectedOfferVersion: 1, actorUserId: ownerId, correlationId: `prp-${randomUUID().slice(0, 8)}`, now: NOW });
    const r = result as Record<string, unknown>;
    return { jobId: job.id, assignmentId: (r.assignmentId ?? (r.assignment as { id?: string } | undefined)?.id ?? "") as string };
  }
  async function seedApprovedTimesheet(workerId: string, scope: Record<string, string>, jobId: string, s: Date, e: Date, minutes: number) {
    const attId = randomUUID(); const tsId = randomUUID(); const si = s.toISOString(); const ei = e.toISOString(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(`INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'checked_out',$10,$11,'America/Toronto','confirmed','none',$12,1,$13,$13)`, attId, scope.assignmentId, jobId, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, si, ei, ownerId, n);
    await prisma.$executeRawUnsafe(`INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',1,1,$11,$12,'America/Toronto',$13,$13,0,$14,$15,1,$14,$14)`, tsId, scope.assignmentId, attId, jobId, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, si, ei, minutes, n, ownerId);
  }
  async function addShift(workerId: string, orgId: string, r: { residenceId: string; departmentId: string }, roleDefinitionId: string, s: Date, e: Date) {
    const base = { organizationId: orgId, residenceId: r.residenceId, departmentId: r.departmentId, workGroupId: wgId, roleDefinitionId };
    const a = await makeAssignment(workerId, base, s, e);
    const contract = contractInForce(contractsByOrg.get(orgId) ?? [], s);
    if (contract) await priceJob(prisma, { jobRequestId: a.jobId, organizationId: orgId, contract, capturedByUserId: ownerId });
    await seedApprovedTimesheet(workerId, { ...base, assignmentId: a.assignmentId }, a.jobId, s, e, 480);
  }

  // scenario state
  const S = { ready: { period: "", worker: "" }, missing: { period: "", worker: "" }, ambiguous: { period: "", worker: "" }, boundary: { period: "", worker: "" } };

  beforeAll(async () => {
    app = buildApi({ countryCurrency: "CAD", env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async (u: string) => (u === ownerId ? ["PAYROLL_ADMINISTRATOR"] : ["WORKER_ACCESS"]) });
    await app.ready();
    const admin = await register(`prp-admin-${randomUUID()}@e2e.local`); ownerId = admin.user.id; payrollToken = admin.token;
    const ord = () => 100000 + Math.floor(Math.random() * 800000); // avoid unique display_order clashes
    const wg = await prisma.workGroup.create({ data: { key: `wg-${randomUUID().slice(0, 8)}`, displayLabel: "WG", displayOrder: ord() } }); wgId = wg.id;
    roleId = (await prisma.roleDefinition.create({ data: { workGroupId: wgId, key: `role-${randomUUID().slice(0, 8)}`, displayLabel: "R", displayOrder: ord() } })).id;
    roleNoRate = (await prisma.roleDefinition.create({ data: { workGroupId: wgId, key: `role-nr-${randomUUID().slice(0, 8)}`, displayLabel: "NR", displayOrder: ord() } })).id;

    // READY: contract rate present, single QC worksite.
    {
      const org = await newOrg(); const qc = await newResidence(org, "QC");
      await seedContract(org, "v1", "active", "2026-07-01T00:00:00Z", 3000, roleId);
      const w = await newWorker(); await addShift(w, org, qc, roleId, start, end);
      S.ready = { period: await newPeriod(org, "QC"), worker: w };
    }
    // MISSING_AUTHORITATIVE_INPUT: approved worked time but NO effective rate for the role.
    {
      const org = await newOrg(); const qc = await newResidence(org, "QC");
      const w = await newWorker(); await addShift(w, org, qc, roleNoRate, start, end); // no contract seeded
      S.missing = { period: await newPeriod(org, "QC"), worker: w };
    }
    // AMBIGUOUS_JURISDICTION: two approved shifts at QC + ON worksites in the same period.
    {
      const org = await newOrg(); const qc = await newResidence(org, "QC"); const on = await newResidence(org, "ON");
      await seedContract(org, "v1", "active", "2026-07-01T00:00:00Z", 3000, roleId);
      const w = await newWorker();
      await addShift(w, org, qc, roleId, start, end);
      await addShift(w, org, on, roleId, new Date("2026-08-06T13:00:00Z"), new Date("2026-08-06T21:00:00Z"));
      S.ambiguous = { period: await newPeriod(org, "QC"), worker: w };
    }
    // A contract change mid-shift: the job is priced from v1, and v2 takes effect during the shift.
    {
      const org = await newOrg(); const qc = await newResidence(org, "QC");
      await seedContract(org, "v1", "superseded", "2026-07-01T00:00:00Z", 3000, roleId);
      await seedContract(org, "v2", "active", "2026-08-05T17:00:00Z", 3500, roleId); // mid-shift boundary
      const w = await newWorker(); await addShift(w, org, qc, roleId, start, end);
      S.boundary = { period: await newPeriod(org, "QC"), worker: w };
    }
  });

  afterAll(async () => { await app?.close(); await prisma.$disconnect(); });

  function workerView(body: unknown, workerId: string) {
    const ctx = (body as { context: { workers: { workerRef: string; blocked: boolean; flags: { code: string }[] }[] } }).context;
    return ctx.workers.find((w) => w.workerRef === `worker-${workerId.slice(0, 8)}`);
  }

  it("VALID worker → READY_TO_CALCULATE (no false blocking flag); calculate() succeeds (parity)", async () => {
    const w = workerView((await review(S.ready.period)).json(), S.ready.worker);
    expect(w).toBeDefined();
    expect(w!.blocked).toBe(false);
    expect(w!.flags.map((f) => f.code)).toEqual(["READY_TO_CALCULATE"]);
    // parity: the governed path actually calculates for this worker (isolated fixture DB)
    const calc = await calculate(S.ready.period, S.ready.worker);
    expect(calc.statusCode).toBe(201);
  });

  it("MISSING_AUTHORITATIVE_INPUT → flag + calculate() fails missing_rate (parity, no write)", async () => {
    const before = await prisma.payrollCalculation.count();
    const w = workerView((await review(S.missing.period)).json(), S.missing.worker);
    expect(w!.flags.some((f) => f.code === "MISSING_AUTHORITATIVE_INPUT")).toBe(true);
    expect(w!.blocked).toBe(true);
    const calc = await calculate(S.missing.period, S.missing.worker);
    expect(calc.statusCode).toBe(400);
    expect(String(calc.json().reason)).toMatch(/missing_rate/);
    expect(await prisma.payrollCalculation.count()).toBe(before); // failed calc wrote nothing
  });

  it("AMBIGUOUS_JURISDICTION → flag + calculate() fails ambiguous_multi_jurisdiction (parity, no write)", async () => {
    const before = await prisma.payrollCalculation.count();
    const w = workerView((await review(S.ambiguous.period)).json(), S.ambiguous.worker);
    expect(w!.flags.some((f) => f.code === "AMBIGUOUS_JURISDICTION")).toBe(true);
    expect(w!.blocked).toBe(true);
    const calc = await calculate(S.ambiguous.period, S.ambiguous.worker);
    expect(calc.statusCode).toBe(400);
    expect(String(calc.json().reason)).toMatch(/ambiguous_multi_jurisdiction/);
    expect(await prisma.payrollCalculation.count()).toBe(before);
  });

  // The rate is frozen on the job, so a contract change mid-shift is not a boundary: review must not
  // block it, and calculation must pay the frozen rate. The flag itself stays unit-tested in
  // packages/auth/src/payrollPeriodReview.test.ts.
  it("a contract change mid-shift → no false boundary flag; calculate() pays the frozen rate (parity)", async () => {
    const w = workerView((await review(S.boundary.period)).json(), S.boundary.worker);
    expect(w!.flags.some((f) => f.code === "INTRA_SHIFT_RATE_BOUNDARY")).toBe(false);
    expect(w!.blocked).toBe(false);
    const calc = await calculate(S.boundary.period, S.boundary.worker);
    expect(calc.statusCode).toBe(201);
    const row = await prisma.payrollWorkedTimeReference.findFirstOrThrow({ where: { payrollCalculationId: calc.json().calculation.id } });
    expect(row.appliedHourlyRateMinor).toBe(3000);
    expect(row.contractVersion).toBe("v1");
  });

  it("IMMUTABILITY: the review endpoint itself mutates no authoritative state", async () => {
    const snap = async () => ({
      calcs: await prisma.payrollCalculation.count(),
      timesheets: await prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(*)::bigint AS c FROM timesheets`),
      contracts: await prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(*)::bigint AS c FROM employer_contracts`),
      periodRows: await prisma.payrollPeriod.count()
    });
    const before = await snap();
    // exercise the review endpoint across every seeded period — reads only
    for (const s of [S.missing, S.ambiguous, S.boundary]) await review(s.period);
    const after = await snap();
    expect(after).toEqual(before);
  });
});
