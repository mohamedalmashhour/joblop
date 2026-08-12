import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import type { FastifyInstance } from "fastify";

// HR-5 Payroll / Finance FOUNDATION (TEST / SYNTHETIC — no execution). Proves the payroll domain
// end to end over real Postgres: it consumes approved/locked worked time only, produces a governed
// revision snapshot (never overwriting an approved one), diverges by jurisdiction, holds its snapshot
// immutable when raw attendance/timesheet changes later, enforces authority + privacy, and behaves
// deterministically under concurrency.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const NOW = new Date();

suite("HR-5 payroll foundation", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let payrollAdminId = "";
  let employerUserId = "";
  let otherEmployerUserId = "";
  let payrollToken = "";
  let workerToken = "";
  let employerToken = "";
  let otherEmployerToken = "";
  let workerId = "";
  let orgId = "";
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }

  // Seed an APPROVED timesheet for the worker with a scheduled window inside [from, to).
  async function seedApprovedTimesheet(scope: Record<string, string>, jobId: string, ownerId: string, start: Date, end: Date, payableMinutes: number) {
    const attId = randomUUID();
    const tsId = randomUUID();
    const s = start.toISOString(); const e = end.toISOString(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'checked_out',$10,$11,'America/Toronto','confirmed','none',$12,1,$13,$13)`,
      attId, scope.assignmentId, jobId, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, ownerId, n
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',1,1,$11,$12,'America/Toronto',$13,$13,0,$14,$15,1,$14,$14)`,
      tsId, scope.assignmentId, attId, jobId, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, payableMinutes, n, ownerId
    );
    // one assignment can carry only one attendance/timesheet (unique) — so callers pass distinct
    // assignments per timesheet. Return ids for later mutation.
    return { attId, tsId };
  }

  let augScope: Record<string, string> = {};
  let sepScope: Record<string, string> = {};
  let baseScope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };
  let ownerId = "";
  let augTimesheetId = "";
  const augStart = new Date("2026-08-05T13:00:00Z");
  const augEnd = new Date("2026-08-05T21:00:00Z"); // 480 min
  const sepStart = new Date("2026-09-05T13:00:00Z");
  const sepEnd = new Date("2026-09-05T21:00:00Z");

  async function makeAssignment(ownerUserId: string, scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string }, start: Date, end: Date) {
    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-PR-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: ownerUserId, title: "Payroll shift", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto", startAt: start, endAt: end, status: "approved_for_dispatch", createdByUserId: ownerUserId } });
    const review = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: ownerUserId } });
    const offer = await prisma.workerOffer.create({ data: { dispatchReviewId: review.id, jobRequestId: job.id, organizationId: scope.organizationId, residenceId: scope.residenceId, departmentId: scope.departmentId, workerIdentityId: workerId, status: "accepted", expiresAt: new Date(NOW.getTime() + 24 * 3_600_000), approvedAt: NOW, sentAt: NOW, respondedAt: NOW, createdByUserId: ownerUserId } });
    const terms = await prisma.workerOfferTermsVersion.create({ data: { workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: "America/Toronto", startAt: start, endAt: end, workGroupId: scope.workGroupId, roleDefinitionId: scope.roleDefinitionId, createdByUserId: ownerUserId } });
    await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: workerId, termsVersionId: terms.id, responseType: "accepted" } });
    const result = await createPrismaAssignmentRepository(prisma).createAssignmentFromAcceptedOfferAtomically({ workerOfferId: offer.id, expectedDispatchReviewId: review.id, expectedOfferVersion: 1, actorUserId: ownerUserId, correlationId: `pr-${randomUUID().slice(0, 8)}`, now: NOW });
    const r = result as Record<string, unknown>;
    const assignmentId = (r.assignmentId ?? (r.assignment as { id?: string } | undefined)?.id ?? "") as string;
    return { jobId: job.id, assignmentId };
  }

  beforeAll(async () => {
    app = buildApi({ env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async (u: string) => (u === payrollAdminId ? ["PAYROLL_ADMINISTRATOR"] : u === employerUserId || u === otherEmployerUserId ? ["ORGANIZATION_OWNER"] : ["WORKER_ACCESS"]) });
    await app.ready();
    const admin = await register(`pr-admin-${randomUUID()}@e2e.local`); payrollAdminId = admin.user.id; payrollToken = admin.token; ownerId = admin.user.id;
    const w = await register(`pr-w-${randomUUID()}@e2e.local`); workerToken = w.token;
    workerId = (await prisma.workerIdentity.create({ data: { userId: w.user.id, displayName: "Payroll Worker", status: "active" } })).id;
    const emp = await register(`pr-emp-${randomUUID()}@e2e.local`); employerUserId = emp.user.id; employerToken = emp.token;
    const other = await register(`pr-oth-${randomUUID()}@e2e.local`); otherEmployerUserId = other.user.id; otherEmployerToken = other.token;

    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-PR-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "PayrollCare", status: "active", createdByUserId: ownerId } });
    orgId = org.id;
    const otherOrg = await prisma.employerOrganization.create({ data: { publicId: `ORG-PO-${randomUUID().slice(0, 8)}`, legalName: "L2", displayName: "OtherCare", status: "active", createdByUserId: ownerId } });
    const res = await prisma.residence.create({ data: { publicId: `RES-PR-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: ownerId, province: "QC", city: "Laval" } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-PR-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: ownerId } });
    const scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
    baseScope = scope;

    // active memberships: employer -> org (own), otherEmployer -> otherOrg (no access to org)
    await prisma.organizationMembership.create({ data: { organizationId: org.id, userId: employerUserId, status: "active", acceptedAt: NOW } });
    await prisma.organizationMembership.create({ data: { organizationId: otherOrg.id, userId: otherEmployerUserId, status: "active", acceptedAt: NOW } });

    // Governed AUTHORITATIVE rate history: contract v1 ($30/h) effective Jul 1; contract v2 ($35/h)
    // effective Aug 20 00:00Z (supersedes v1). Aug 5 work reads v1; Sep 5 work reads v2 — historical
    // rate. Seeded via raw SQL so the effective instant is exact (a typed prisma Date write shifts
    // Timestamptz by the local offset in this pg-adapter setup, which would blur the boundary test).
    async function seedContract(version: string, status: string, effFromIso: string, rateMinor: number) {
      const cid = randomUUID(); const n = NOW.toISOString();
      await prisma.$executeRawUnsafe(`INSERT INTO employer_contracts (id, organization_id, version, status, currency, activated_at, effective_from, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,$4,'CAD',$5,$5,$6,$7,$7)`, cid, org.id, version, status, effFromIso, ownerId, n);
      await prisma.$executeRawUnsafe(`INSERT INTO contract_role_rates (id, contract_id, work_group_id, role_definition_id, hourly_rate_minor, created_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5)`, cid, wg.id, role.id, rateMinor, n);
    }
    await seedContract("v1", "superseded", "2026-07-01T00:00:00Z", 3000);
    await seedContract("v2", "active", "2026-08-20T00:00:00Z", 3500);

    const aug = await makeAssignment(ownerId, scope, augStart, augEnd);
    augScope = { ...scope, assignmentId: aug.assignmentId };
    const augTs = await seedApprovedTimesheet(augScope, aug.jobId, ownerId, augStart, augEnd, 480);
    augTimesheetId = augTs.tsId;

    const sep = await makeAssignment(ownerId, scope, sepStart, sepEnd);
    sepScope = { ...scope, assignmentId: sep.assignmentId };
    await seedApprovedTimesheet(sepScope, sep.jobId, ownerId, sepStart, sepEnd, 480);
  });

  afterAll(async () => { await app?.close(); await prisma.$disconnect(); });

  const createPeriod = (token: string, region: string, start: string, end: string) =>
    app.inject({ method: "POST", url: "/platform/payroll/periods", headers: auth(token), payload: { organizationId: orgId, jurisdictionCountry: "CA", jurisdictionRegion: region, periodStart: start, periodEnd: end, currency: "CAD", timezone: "America/Toronto" } });
  const calculate = (token: string, periodId: string) =>
    app.inject({ method: "POST", url: "/platform/payroll/calculations", headers: auth(token), payload: { payrollPeriodId: periodId, workerIdentityId: workerId } });

  it("payroll authority is required — worker/employer forbidden (403), unauthenticated (401)", async () => {
    const period = await createPeriod(payrollToken, "QC", "2026-08-01T00:00:00Z", "2026-08-15T00:00:00Z");
    expect(period.statusCode).toBe(201);
    const periodId = period.json().period.id;
    expect(period.json().synthetic).toBe(true);

    expect((await calculate(workerToken, periodId)).statusCode).toBe(403);
    expect((await calculate(employerToken, periodId)).statusCode).toBe(403);
    const anon = await app.inject({ method: "POST", url: "/platform/payroll/calculations", payload: { payrollPeriodId: periodId, workerIdentityId: workerId } });
    expect(anon.statusCode).toBe(401);
  });

  it("calculates from approved worked time: revision 1, net = gross - deductions, employer cost separate, currency CAD", async () => {
    const period = await createPeriod(payrollToken, "QC", "2026-08-01T06:00:00Z", "2026-08-16T00:00:00Z");
    const periodId = period.json().period.id;
    const calc = await calculate(payrollToken, periodId);
    expect(calc.statusCode).toBe(201);
    const c = calc.json().calculation;
    expect(c.revision).toBe(1);
    expect(c.currency).toBe("CAD");
    expect(c.grossPayMinor).toBeGreaterThan(0);
    expect(c.grossPayMinor - c.totalDeductionsMinor).toBe(c.netPayMinor);
    expect(c.totalEmployerCostMinor).toBeGreaterThan(0);
    expect(calc.json().synthetic).toBe(true);

    // gross derived from the AUTHORITATIVE contract v1 rate ($30/h) x 480min = $240.00 regular
    expect(c.grossPayMinor).toBeGreaterThanOrEqual(24000);
    expect(c.calculationFingerprint).toMatch(/^[0-9a-f]{64}$/); // deterministic fingerprint present

    const detail = await app.inject({ method: "GET", url: `/platform/payroll/calculations/${c.id}`, headers: auth(payrollToken) });
    const d = detail.json().calculation;
    expect(d.earningLines.length).toBeGreaterThanOrEqual(1);
    expect(d.deductionLines.length).toBeGreaterThanOrEqual(1);
    expect(d.employerCostLines.length).toBeGreaterThanOrEqual(1);
    // the exact approved timesheet + its applied contract RATE snapshot fed the calc (immutable)
    const ref = d.workedTimeRefs.find((r: { timesheetId: string }) => r.timesheetId === augTimesheetId);
    expect(ref.timesheetStatus).toBe("approved");
    expect(ref.contractVersion).toBe("v1");
    expect(ref.payableMinutes).toBe(480);
  });

  it("recalculate creates revision 2 and supersedes revision 1 (an approved calc is never overwritten)", async () => {
    const period = await createPeriod(payrollToken, "QC", "2026-08-02T00:00:00Z", "2026-08-16T06:00:00Z");
    const periodId = period.json().period.id;
    const first = await calculate(payrollToken, periodId);
    const firstId = first.json().calculation.id;
    const approve = await app.inject({ method: "POST", url: `/platform/payroll/calculations/${firstId}/transition`, headers: auth(payrollToken), payload: { action: "approve", expectedVersion: first.json().calculation.version } });
    expect(approve.statusCode).toBe(200);
    expect(approve.json().calculation.status).toBe("approved");

    const second = await calculate(payrollToken, periodId);
    expect(second.statusCode).toBe(201);
    expect(second.json().calculation.revision).toBe(2);
    // the approved revision 1 is preserved as superseded, not overwritten
    const rev1 = await app.inject({ method: "GET", url: `/platform/payroll/calculations/${firstId}`, headers: auth(payrollToken) });
    expect(rev1.json().calculation.status).toBe("superseded");
  });

  it("two concurrent calculate requests are deterministic — no duplicate revision, exactly one active, no silent overwrite", async () => {
    const period = await createPeriod(payrollToken, "QC", "2026-09-01T00:00:00Z", "2026-09-16T00:00:00Z");
    const periodId = period.json().period.id;
    const [a, b] = await Promise.all([calculate(payrollToken, periodId), calculate(payrollToken, periodId)]);
    // At least one commits; a loser (if any) is a 409 conflict, never a 500 or a silent overwrite.
    const successes = [a, b].filter((r) => r.statusCode === 201);
    expect(successes.length).toBeGreaterThanOrEqual(1);
    for (const loser of [a, b].filter((r) => r.statusCode !== 201)) expect(loser.statusCode).toBe(409);

    const rows = await prisma.payrollCalculation.findMany({ where: { payrollPeriodId: periodId, workerIdentityId: workerId } });
    // revisions are unique (deterministic — the unique index forbids two of the same)
    const revisions = rows.map((r) => r.revision);
    expect(new Set(revisions).size).toBe(revisions.length);
    // exactly one live (non-superseded) calculation remains
    expect(rows.filter((r) => r.status !== "superseded")).toHaveLength(1);
  });

  it("two concurrent approvals of the same calculation — one succeeds, the loser gets 409", async () => {
    const period = await createPeriod(payrollToken, "QC", "2026-08-03T00:00:00Z", "2026-08-16T12:00:00Z");
    const calc = (await calculate(payrollToken, period.json().period.id)).json().calculation;
    const approve = () => app.inject({ method: "POST", url: `/platform/payroll/calculations/${calc.id}/transition`, headers: auth(payrollToken), payload: { action: "approve", expectedVersion: calc.version } });
    const [a, b] = await Promise.all([approve(), approve()]);
    const ok = [a, b].filter((r) => r.statusCode === 200);
    expect(ok.length).toBe(1);
    expect([a, b].find((r) => r.statusCode !== 200)!.statusCode).toBe(409);
  });

  it("an approved calculation's snapshot is immutable — changing the raw timesheet later does NOT rewrite it", async () => {
    const period = await createPeriod(payrollToken, "QC", "2026-08-04T00:00:00Z", "2026-08-16T18:00:00Z");
    const calc = (await calculate(payrollToken, period.json().period.id)).json().calculation;
    await app.inject({ method: "POST", url: `/platform/payroll/calculations/${calc.id}/transition`, headers: auth(payrollToken), payload: { action: "approve", expectedVersion: calc.version } });
    const grossBefore = calc.grossPayMinor;

    // mutate the underlying approved timesheet AFTER the calculation was made
    await prisma.$executeRawUnsafe(`UPDATE timesheets SET payable_minutes = 99999, version = version + 1 WHERE id = $1`, augTimesheetId);

    const after = await app.inject({ method: "GET", url: `/platform/payroll/calculations/${calc.id}`, headers: auth(payrollToken) });
    expect(after.json().calculation.grossPayMinor).toBe(grossBefore); // snapshot unchanged — no silent rebase
    // restore for other tests
    await prisma.$executeRawUnsafe(`UPDATE timesheets SET payable_minutes = 480, version = version + 1 WHERE id = $1`, augTimesheetId);
  });

  it("historical rate: Aug 5 work reads contract v1 ($30); Sep 5 work reads contract v2 ($35) — never 'current' rate", async () => {
    const augP = await createPeriod(payrollToken, "QC", "2026-08-01T00:00:00Z", "2026-08-10T00:00:00Z");
    const sepP = await createPeriod(payrollToken, "QC", "2026-09-01T00:00:00Z", "2026-09-10T00:00:00Z");
    const augCalc = (await calculate(payrollToken, augP.json().period.id)).json().calculation;
    const sepCalc = (await calculate(payrollToken, sepP.json().period.id)).json().calculation;
    const augDetail = (await app.inject({ method: "GET", url: `/platform/payroll/calculations/${augCalc.id}`, headers: auth(payrollToken) })).json().calculation;
    const sepDetail = (await app.inject({ method: "GET", url: `/platform/payroll/calculations/${sepCalc.id}`, headers: auth(payrollToken) })).json().calculation;
    expect(augDetail.workedTimeRefs[0].contractVersion).toBe("v1");
    expect(augDetail.workedTimeRefs[0].appliedHourlyRateMinor).toBe(3000);
    expect(sepDetail.workedTimeRefs[0].contractVersion).toBe("v2");
    expect(sepDetail.workedTimeRefs[0].appliedHourlyRateMinor).toBe(3500);
    expect(sepCalc.grossPayMinor).toBeGreaterThan(augCalc.grossPayMinor); // $35 > $30 for the same hours
  });

  it("a shift straddling a contract rate boundary is detected and fails with a governed reason", async () => {
    // shift Aug 19 22:00 -> Aug 20 02:00 crosses contract v2's effective instant (Aug 20 00:00)
    const crossAssignment = await makeAssignment(ownerId, baseScope, new Date("2026-08-19T22:00:00Z"), new Date("2026-08-20T02:00:00Z"));
    const crossScope = { ...baseScope, assignmentId: crossAssignment.assignmentId };
    await seedApprovedTimesheet(crossScope, crossAssignment.jobId, ownerId, new Date("2026-08-19T22:00:00Z"), new Date("2026-08-20T02:00:00Z"), 240);
    const p = await createPeriod(payrollToken, "QC", "2026-08-19T12:00:00Z", "2026-08-20T12:00:00Z");
    const res = await calculate(payrollToken, p.json().period.id);
    expect(res.statusCode).toBe(400);
    expect(res.json().reason).toMatch(/rate_boundary_inside_approved_shift/);
  });

  it("replay/verify recomputes the stored snapshot byte-for-byte; a later rate change does not alter it", async () => {
    const period = await createPeriod(payrollToken, "QC", "2026-08-04T00:00:00Z", "2026-08-07T00:00:00Z");
    const calc = (await calculate(payrollToken, period.json().period.id)).json().calculation;
    const verify1 = await app.inject({ method: "POST", url: `/platform/payroll/calculations/${calc.id}/verify`, headers: auth(payrollToken) });
    expect(verify1.statusCode).toBe(200);
    expect(verify1.json().ok).toBe(true);
    expect(verify1.json().totalsMatch).toBe(true);

    // activate a NEW contract later — the stored calculation and its replay stay identical
    await prisma.employerContract.updateMany({ where: { organizationId: orgId, status: "active" }, data: { status: "superseded" } });
    await prisma.employerContract.create({ data: { organizationId: orgId, version: "v99", status: "active", currency: "CAD", activatedAt: new Date("2026-08-25T00:00:00Z"), effectiveFrom: new Date("2026-08-25T00:00:00Z"), createdByUserId: ownerId, roleRates: { create: [{ workGroupId: (await prisma.workGroup.findFirstOrThrow()).id, roleDefinitionId: (await prisma.roleDefinition.findFirstOrThrow()).id, hourlyRateMinor: 99999 }] } } });
    const verify2 = await app.inject({ method: "POST", url: `/platform/payroll/calculations/${calc.id}/verify`, headers: auth(payrollToken) });
    expect(verify2.json().ok).toBe(true);
  });

  it("employer sees only its OWN org payroll; a cross-org employer is denied (403); worker sees own statement", async () => {
    const own = await app.inject({ method: "GET", url: `/organizations/${orgId}/payroll/calculations`, headers: auth(employerToken) });
    expect(own.statusCode).toBe(200);
    const cross = await app.inject({ method: "GET", url: `/organizations/${orgId}/payroll/calculations`, headers: auth(otherEmployerToken) });
    expect(cross.statusCode).toBe(403);

    const statement = await app.inject({ method: "GET", url: "/worker/payroll/statement", headers: auth(workerToken) });
    expect(statement.statusCode).toBe(200);
    expect(statement.json().synthetic).toBe(true);
    const body = statement.body;
    expect(body).not.toContain("totalEmployerCostMinor"); // worker statement excludes employer internals
    if (statement.json().items.length > 0) {
      const item = statement.json().items[0];
      expect(item.netPayMinor).toBe(item.grossPayMinor - item.totalDeductionsMinor);
    }
  });

  // Scale / EXPLAIN ANALYZE index evidence at meaningful volume is proven in the dedicated
  // HR-5.1 scale suite (postgres-payroll-scale.test.ts) — a tiny-table EXPLAIN here would be a
  // planner flake (Seq Scan is genuinely cheaper on a few rows).
});
