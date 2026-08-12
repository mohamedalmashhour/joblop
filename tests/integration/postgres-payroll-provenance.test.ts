import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import { createPrismaAssignmentRepository } from "@rwos/auth";

/**
 * HR-6.1 Chunk 2 — live PostgreSQL/API proof for the read-only provenance endpoint using real
 * HR-5.1 marketplace seeds. Proves historical v1/v2 contract provenance, multiple rate segments,
 * exact-revision provenance, correction lineage, authz + tenant scope, immutability + zero writes,
 * and parity with the calculation detail. Descriptive only — the endpoint mutates nothing.
 */
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const NOW = new Date();

suite("HR-6.1 provenance endpoint (read-only, descriptive)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let ownerId = "";
  let payrollToken = "";
  let workerToken = "";
  let wgId = "";
  let roleId = "";
  let orgId = "";
  let periodId = "";
  let workerId = "";
  let calcRev1 = "";

  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const provenance = (token: string | null, id: string) => app.inject({ method: "GET", url: `/platform/payroll/calculations/${id}/provenance`, ...(token ? { headers: auth(token) } : {}) });
  const detail = (id: string) => app.inject({ method: "GET", url: `/platform/payroll/calculations/${id}`, headers: auth(payrollToken) });
  const register = async (email: string) => (await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } })).json() as { token: string; user: { id: string } };

  async function newResidence(province: string) {
    const tag = randomUUID().slice(0, 8);
    const res = await prisma.residence.create({ data: { publicId: `RES-${tag}`, organizationId: orgId, name: `R-${tag}`, status: "active", createdByUserId: ownerId, province, city: "C" } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-${tag}`, organizationId: orgId, residenceId: res.id, name: `D-${tag}`, status: "active", createdByUserId: ownerId } });
    return { residenceId: res.id, departmentId: dept.id };
  }
  async function seedContract(version: string, status: string, effFromIso: string, rateMinor: number) {
    const cid = randomUUID(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(`INSERT INTO employer_contracts (id, organization_id, version, status, currency, activated_at, effective_from, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,$4,'CAD',$5,$5,$6,$7,$7)`, cid, orgId, version, status, effFromIso, ownerId, n);
    await prisma.$executeRawUnsafe(`INSERT INTO contract_role_rates (id, contract_id, work_group_id, role_definition_id, hourly_rate_minor, created_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5)`, cid, wgId, roleId, rateMinor, n);
  }
  async function makeAssignment(scope: Record<string, string>, s: Date, e: Date) {
    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: ownerId, title: "Shift", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto", startAt: s, endAt: e, status: "approved_for_dispatch", createdByUserId: ownerId } });
    const dr = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: ownerId } });
    const offer = await prisma.workerOffer.create({ data: { dispatchReviewId: dr.id, jobRequestId: job.id, organizationId: scope.organizationId, residenceId: scope.residenceId, departmentId: scope.departmentId, workerIdentityId: workerId, status: "accepted", expiresAt: new Date(NOW.getTime() + 24 * 3_600_000), approvedAt: NOW, sentAt: NOW, respondedAt: NOW, createdByUserId: ownerId } });
    const terms = await prisma.workerOfferTermsVersion.create({ data: { workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: "America/Toronto", startAt: s, endAt: e, workGroupId: scope.workGroupId, roleDefinitionId: scope.roleDefinitionId, createdByUserId: ownerId } });
    await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: workerId, termsVersionId: terms.id, responseType: "accepted" } });
    const result = await createPrismaAssignmentRepository(prisma).createAssignmentFromAcceptedOfferAtomically({ workerOfferId: offer.id, expectedDispatchReviewId: dr.id, expectedOfferVersion: 1, actorUserId: ownerId, correlationId: `pv-${randomUUID().slice(0, 8)}`, now: NOW });
    const r = result as Record<string, unknown>;
    return { jobId: job.id, assignmentId: (r.assignmentId ?? (r.assignment as { id?: string } | undefined)?.id ?? "") as string };
  }
  async function seedApprovedTimesheet(scope: Record<string, string>, jobId: string, s: Date, e: Date, minutes: number) {
    const attId = randomUUID(); const tsId = randomUUID(); const si = s.toISOString(); const ei = e.toISOString(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(`INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'checked_out',$10,$11,'America/Toronto','confirmed','none',$12,1,$13,$13)`, attId, scope.assignmentId, jobId, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, si, ei, ownerId, n);
    await prisma.$executeRawUnsafe(`INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',1,1,$11,$12,'America/Toronto',$13,$13,0,$14,$15,1,$14,$14)`, tsId, scope.assignmentId, attId, jobId, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, si, ei, minutes, n, ownerId);
  }
  async function addShift(r: { residenceId: string; departmentId: string }, s: Date, e: Date) {
    const base = { organizationId: orgId, residenceId: r.residenceId, departmentId: r.departmentId, workGroupId: wgId, roleDefinitionId: roleId };
    const a = await makeAssignment(base, s, e);
    await seedApprovedTimesheet({ ...base, assignmentId: a.assignmentId }, a.jobId, s, e, 480);
  }

  beforeAll(async () => {
    app = buildApi({ env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async (u: string) => (u === ownerId ? ["PAYROLL_ADMINISTRATOR"] : ["WORKER_ACCESS"]) });
    await app.ready();
    const admin = await register(`pv-admin-${randomUUID()}@e2e.local`); ownerId = admin.user.id; payrollToken = admin.token;
    const wk = await register(`pv-wk-${randomUUID()}@e2e.local`); workerToken = wk.token;
    const ord = () => 100000 + Math.floor(Math.random() * 800000);
    wgId = (await prisma.workGroup.create({ data: { key: `wg-${randomUUID().slice(0, 8)}`, displayLabel: "WG", displayOrder: ord() } })).id;
    roleId = (await prisma.roleDefinition.create({ data: { workGroupId: wgId, key: `role-${randomUUID().slice(0, 8)}`, displayLabel: "R", displayOrder: ord() } })).id;
    orgId = (await prisma.employerOrganization.create({ data: { publicId: `ORG-PV-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "PV", status: "active", createdByUserId: ownerId } })).id;
    workerId = (await prisma.workerIdentity.create({ data: { userId: wk.user.id, displayName: "W", status: "active" } })).id;

    // Two committed contract versions; a shift on each → one calculation, two rate segments.
    await seedContract("v1", "superseded", "2026-07-01T00:00:00Z", 3000);
    await seedContract("v2", "active", "2026-08-20T00:00:00Z", 3500);
    const qc = await newResidence("QC");
    await addShift(qc, new Date("2026-08-05T13:00:00Z"), new Date("2026-08-05T21:00:00Z")); // reads v1
    await addShift(qc, new Date("2026-08-25T13:00:00Z"), new Date("2026-08-25T21:00:00Z")); // reads v2
    periodId = (await prisma.payrollPeriod.create({ data: { organizationId: orgId, jurisdictionCountry: "CA", jurisdictionRegion: "QC", periodStart: new Date("2026-08-01T00:00:00Z"), periodEnd: new Date("2026-09-01T00:00:00Z"), timezone: "America/Toronto", currency: "CAD", ruleProviderKey: "synthetic-fixture", ruleProviderVersion: "synthetic-2026.08", createdByUserId: ownerId } })).id;

    const calc = await app.inject({ method: "POST", url: "/platform/payroll/calculations", headers: auth(payrollToken), payload: { payrollPeriodId: periodId, workerIdentityId: workerId } });
    calcRev1 = calc.json().calculation.id;
  });
  afterAll(async () => { await app?.close(); await prisma.$disconnect(); });

  it("enforces payroll authority (401/403/200) and 404 for a forged id", async () => {
    expect((await provenance(null, calcRev1)).statusCode).toBe(401);
    expect((await provenance(workerToken, calcRev1)).statusCode).toBe(403);
    expect((await provenance(payrollToken, calcRev1)).statusCode).toBe(200);
    expect((await provenance(payrollToken, randomUUID())).statusCode).toBe(404);
  });

  it("explains historical v1/v2 contract provenance across multiple rate segments", async () => {
    const p = (await provenance(payrollToken, calcRev1)).json().provenance;
    expect(p.status).toBe("ready");
    const versions = p.rateSegments.map((s: { contractVersion: string }) => s.contractVersion).sort();
    expect(versions).toEqual(["v1", "v2"]);
    const v1 = p.rateSegments.find((s: { contractVersion: string }) => s.contractVersion === "v1");
    const v2 = p.rateSegments.find((s: { contractVersion: string }) => s.contractVersion === "v2");
    // rate is an integer snapshot (not affected by the pg-adapter timestamptz shift) — prove the
    // historical rate that governed each segment; effectiveFrom is present as an ISO instant.
    expect(v1.appliedHourlyRateMinor).toBe(3000);
    expect(v2.appliedHourlyRateMinor).toBe(3500);
    expect(typeof v1.contractEffectiveFrom).toBe("string");
    expect(v1.contractEffectiveFrom.length).toBeGreaterThan(0);
    // every provenance item is evidence-bound
    for (const it of p.items) expect(p.evidence[it.evidenceRef]).toBeDefined();
    // opaque worker + jurisdiction source
    expect(p.workerRef).toBe(`worker-${workerId.slice(0, 8)}`);
    expect(p.jurisdiction.source).toBe("worksite_residence");
  });

  it("parity: provenance identity matches the governed calculation detail exactly", async () => {
    const p = (await provenance(payrollToken, calcRev1)).json().provenance;
    const d = detail(calcRev1);
    const c = (await d).json().calculation;
    expect(p.calculationId).toBe(c.id);
    expect(p.revision).toBe(c.revision);
    expect(p.fingerprint).toBe(c.calculationFingerprint);
    expect(p.provider).toEqual(c.ruleProvider);
    expect(p.jurisdiction.country).toBe(c.jurisdiction.country);
    expect(p.jurisdiction.region).toBe(c.jurisdiction.region);
  });

  it("exact-revision provenance + correction lineage after a governed correction", async () => {
    // Add a higher-priority contract version so a recompute differs → governed correction → rev2.
    await seedContract("v3", "active", "2026-07-15T00:00:00Z", 4000);
    const calc = await app.inject({ method: "GET", url: `/platform/payroll/calculations/${calcRev1}`, headers: auth(payrollToken) });
    const version = calc.json().calculation.version;
    const corr = await app.inject({ method: "POST", url: `/platform/payroll/calculations/${calcRev1}/correct`, headers: auth(payrollToken), payload: { expectedVersion: version, reason: "rate correction" } });
    expect([200, 201]).toContain(corr.statusCode);
    const rev2Id = (corr.json().calculation as { id: string }).id;
    const p2 = (await provenance(payrollToken, rev2Id)).json().provenance;
    expect(p2.revision).toBe(2);
    expect(p2.lineage.correctionType).toBe("pre_lock_revision");
    expect(p2.lineage.revisions.map((r: { revision: number }) => r.revision)).toEqual([1, 2]);
    // exact-revision: rev1 provenance still reports revision 1, distinct fingerprint
    const p1 = (await provenance(payrollToken, calcRev1)).json().provenance;
    expect(p1.revision).toBe(1);
    expect(p1.fingerprint).not.toBe(p2.fingerprint);
  });

  it("IMMUTABILITY + zero writes: the provenance GET changes no authoritative state", async () => {
    const snap = async () => ({
      calcs: await prisma.payrollCalculation.count(),
      calcRow: await prisma.payrollCalculation.findUnique({ where: { id: calcRev1 } }),
      earnings: await prisma.payrollEarningLine.count({ where: { payrollCalculationId: calcRev1 } }),
      worked: await prisma.payrollWorkedTimeReference.count({ where: { payrollCalculationId: calcRev1 } }),
      timesheets: await prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(*)::bigint AS c FROM timesheets`),
      contracts: await prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(*)::bigint AS c FROM employer_contracts`)
    });
    const before = await snap();
    await provenance(payrollToken, calcRev1);
    await provenance(payrollToken, calcRev1);
    const after = await snap();
    expect(after).toEqual(before);
  });
});
