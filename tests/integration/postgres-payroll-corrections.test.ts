import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import type { FastifyInstance } from "fastify";

// HR-5.1 Chunk 3 — governed corrections, revision lineage, post-lock adjustments, idempotency, DB
// immutability, and REAL PostgreSQL concurrency (correction-vs-lock, approve-vs-correct,
// correction-vs-correction, lock retries). TEST/SYNTHETIC — no money execution.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const NOW = new Date();

suite("HR-5.1 payroll corrections & concurrency", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let payrollAdminId = "";
  let payrollToken = "";
  let workerToken = "";
  let employerToken = "";
  let employerUserId = "";
  let workerId = "";
  let orgId = "";
  let scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const start = new Date("2026-08-10T13:00:00Z");
  const end = new Date("2026-08-10T21:00:00Z");

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }

  async function makeAssignmentAndTimesheet() {
    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-CX-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: payrollAdminId, title: "Shift", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto", startAt: start, endAt: end, status: "approved_for_dispatch", createdByUserId: payrollAdminId } });
    const review = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: payrollAdminId } });
    const offer = await prisma.workerOffer.create({ data: { dispatchReviewId: review.id, jobRequestId: job.id, organizationId: scope.organizationId, residenceId: scope.residenceId, departmentId: scope.departmentId, workerIdentityId: workerId, status: "accepted", expiresAt: new Date(NOW.getTime() + 24 * 3_600_000), approvedAt: NOW, sentAt: NOW, respondedAt: NOW, createdByUserId: payrollAdminId } });
    const terms = await prisma.workerOfferTermsVersion.create({ data: { workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: "America/Toronto", startAt: start, endAt: end, workGroupId: scope.workGroupId, roleDefinitionId: scope.roleDefinitionId, createdByUserId: payrollAdminId } });
    await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: workerId, termsVersionId: terms.id, responseType: "accepted" } });
    const result = await createPrismaAssignmentRepository(prisma).createAssignmentFromAcceptedOfferAtomically({ workerOfferId: offer.id, expectedDispatchReviewId: review.id, expectedOfferVersion: 1, actorUserId: payrollAdminId, correlationId: `cx-${randomUUID().slice(0, 8)}`, now: NOW });
    const assignmentId = ((result as Record<string, unknown>).assignmentId ?? ((result as Record<string, unknown>).assignment as { id?: string } | undefined)?.id ?? "") as string;
    const attId = randomUUID(); const tsId = randomUUID(); const s = start.toISOString(); const e = end.toISOString(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(`INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'checked_out',$10,$11,'America/Toronto','confirmed','none',$12,1,$13,$13)`, attId, assignmentId, job.id, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, payrollAdminId, n);
    await prisma.$executeRawUnsafe(`INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',1,1,$11,$12,'America/Toronto',480,480,0,$13,$14,1,$13,$13)`, tsId, assignmentId, attId, job.id, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, n, payrollAdminId);
  }

  async function setContractRate(rateMinor: number) {
    // supersede the current active contract and activate a new one (effective Jul 1, so it governs
    // the Aug 10 shift). This is the governed authoritative-input change that a correction consumes.
    await prisma.$executeRawUnsafe(`UPDATE employer_contracts SET status='superseded' WHERE organization_id=$1 AND status='active'`, orgId);
    // effective_from stays Jul 1 (governs the Aug 10 shift); activated_at/created_at use real
    // monotonic now() so the newest contract wins the effective-date tie deterministically.
    const cid = randomUUID();
    await prisma.$executeRawUnsafe(`INSERT INTO employer_contracts (id, organization_id, version, status, currency, activated_at, effective_from, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,'active','CAD',now(),'2026-07-01T00:00:00Z',$4,now(),now())`, cid, orgId, `v-${rateMinor}-${randomUUID().slice(0, 8)}`, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO contract_role_rates (id, contract_id, work_group_id, role_definition_id, hourly_rate_minor, created_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,now())`, cid, scope.workGroupId, scope.roleDefinitionId, rateMinor);
  }

  let periodSeq = 0;
  const createPeriod = () => {
    // each test needs a distinct governed window (unique per org+jurisdiction+window) that still
    // contains the Aug 10 shift — vary the END time by a per-call offset.
    periodSeq += 1;
    return app.inject({ method: "POST", url: "/platform/payroll/periods", headers: auth(payrollToken), payload: { organizationId: orgId, jurisdictionCountry: "CA", jurisdictionRegion: "QC", periodStart: "2026-08-01T00:00:00Z", periodEnd: `2026-08-14T${String(periodSeq).padStart(2, "0")}:00:00Z`, currency: "CAD", timezone: "America/Toronto" } });
  };
  const calc = (periodId: string) => app.inject({ method: "POST", url: "/platform/payroll/calculations", headers: auth(payrollToken), payload: { payrollPeriodId: periodId, workerIdentityId: workerId } });
  const transition = (id: string, action: string, version: number) => app.inject({ method: "POST", url: `/platform/payroll/calculations/${id}/transition`, headers: auth(payrollToken), payload: { action, expectedVersion: version } });
  const correct = (id: string, version: number, reason: string, key?: string, token = payrollToken) => app.inject({ method: "POST", url: `/platform/payroll/calculations/${id}/correct`, headers: auth(token), payload: { expectedVersion: version, reason, correlationKey: key } });
  async function freshPeriodCalc() { const p = await createPeriod(); const c = await calc(p.json().period.id); return c.json().calculation; }
  async function lockCalc(c: { id: string; version: number }) {
    const a = await transition(c.id, "approve", c.version);
    await transition(c.id, "lock", a.json().calculation.version);
  }

  beforeAll(async () => {
    app = buildApi({ countryCurrency: "CAD", env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async (u: string) => (u === payrollAdminId ? ["PAYROLL_ADMINISTRATOR"] : u === employerUserId ? ["ORGANIZATION_OWNER"] : ["WORKER_ACCESS"]) });
    await app.ready();
    const admin = await register(`cx-admin-${randomUUID()}@e2e.local`); payrollAdminId = admin.user.id; payrollToken = admin.token;
    const w = await register(`cx-w-${randomUUID()}@e2e.local`); workerToken = w.token;
    workerId = (await prisma.workerIdentity.create({ data: { userId: w.user.id, displayName: "W", status: "active" } })).id;
    const emp = await register(`cx-emp-${randomUUID()}@e2e.local`); employerUserId = emp.user.id; employerToken = emp.token;
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-CX-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "CxCare", status: "active", createdByUserId: payrollAdminId } });
    orgId = org.id;
    await prisma.organizationMembership.create({ data: { organizationId: org.id, userId: employerUserId, status: "active", acceptedAt: NOW } });
    const res = await prisma.residence.create({ data: { publicId: `RES-CX-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: payrollAdminId, province: "QC", city: "Laval" } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-CX-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: payrollAdminId } });
    scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
    await setContractRate(3000);
    await makeAssignmentAndTimesheet();
  });

  afterAll(async () => { await app?.close(); await prisma.$disconnect(); });

  it("pre-lock correction creates a new revision; the old revision is superseded + financially unchanged", async () => {
    const c1 = await freshPeriodCalc();
    const grossBefore = c1.grossPayMinor;
    await setContractRate(3500);
    const res = await correct(c1.id, c1.version, "governed rate correction");
    expect(res.statusCode).toBe(201);
    expect(res.json().outcome).toBe("created");
    expect(res.json().calculation.revision).toBe(2);
    expect(res.json().calculation.correctionType).toBe("pre_lock_revision");
    const old = await prisma.payrollCalculation.findUniqueOrThrow({ where: { id: c1.id } });
    expect(old.status).toBe("superseded");
    expect(old.grossPayMinor).toBe(grossBefore);
    await setContractRate(3000);
  });

  it("post-lock correction creates a linked adjustment with a signed delta; the locked original is immutable", async () => {
    const c1 = await freshPeriodCalc();
    await lockCalc(c1);
    const lockedGross = (await prisma.payrollCalculation.findUniqueOrThrow({ where: { id: c1.id } })).grossPayMinor;
    await setContractRate(3500);
    const locked = await prisma.payrollCalculation.findUniqueOrThrow({ where: { id: c1.id } });
    const res = await correct(c1.id, locked.version, "post-lock correction");
    expect(res.statusCode).toBe(201);
    expect(res.json().calculation.correctionType).toBe("post_lock_adjustment");
    expect(res.json().calculation.adjustsCalculationId).toBe(c1.id);
    expect(res.json().calculation.adjustment.netDirection).toBe("credit");
    // locked original financially unchanged
    const after = await prisma.payrollCalculation.findUniqueOrThrow({ where: { id: c1.id } });
    expect(after.status).toBe("locked");
    expect(after.grossPayMinor).toBe(lockedGross);
    await setContractRate(3000);
  });

  it("DB rejects a direct UPDATE of a LOCKED calculation (trigger-enforced immutability)", async () => {
    const c1 = await freshPeriodCalc();
    await lockCalc(c1);
    await expect(prisma.$executeRawUnsafe(`UPDATE payroll_calculations SET gross_pay_minor = 1 WHERE id = $1`, c1.id)).rejects.toThrow(/locked and immutable/);
  });

  it("DB rejects a direct UPDATE/DELETE of an APPROVED calculation's earning lines (trigger-enforced)", async () => {
    const c1 = await freshPeriodCalc();
    await transition(c1.id, "approve", c1.version);
    await expect(prisma.$executeRawUnsafe(`UPDATE payroll_earning_lines SET amount_minor = 1 WHERE payroll_calculation_id = $1`, c1.id)).rejects.toThrow(/immutable/);
    await expect(prisma.$executeRawUnsafe(`DELETE FROM payroll_earning_lines WHERE payroll_calculation_id = $1`, c1.id)).rejects.toThrow(/immutable/);
  });

  it("worker and employer cannot correct; only payroll authority can (tenant/role isolation)", async () => {
    const c1 = await freshPeriodCalc();
    expect((await correct(c1.id, c1.version, "x", undefined, workerToken)).statusCode).toBe(403);
    expect((await correct(c1.id, c1.version, "x", undefined, employerToken)).statusCode).toBe(403);
  });

  it("duplicate correction submission with the same correlation key commits exactly once", async () => {
    const c1 = await freshPeriodCalc();
    await setContractRate(3500);
    const key = `idem-${randomUUID()}`;
    const first = await correct(c1.id, c1.version, "rate corrected", key);
    expect(first.statusCode).toBe(201);
    const retry = await correct(c1.id, c1.version, "rate corrected", key);
    expect(retry.json().outcome).toBe("duplicate");
    expect(retry.json().calculation.id).toBe(first.json().calculation.id);
    await setContractRate(3000);
  });

  it("replay of a superseded historical revision still verifies after a correction", async () => {
    const c1 = await freshPeriodCalc();
    await setContractRate(3500);
    await correct(c1.id, c1.version, "rate corrected");
    const verify = await app.inject({ method: "POST", url: `/platform/payroll/calculations/${c1.id}/verify`, headers: auth(payrollToken) });
    expect(verify.json().ok).toBe(true);
    await setContractRate(3000);
  });

  it("RACE: correction vs lock — one coherent outcome, no duplicate/lost/500", async () => {
    const c1 = await freshPeriodCalc();
    const a = await transition(c1.id, "approve", c1.version);
    await setContractRate(3500);
    const approvedVersion = a.json().calculation.version;
    const [lockRes, corrRes] = await Promise.all([transition(c1.id, "lock", approvedVersion), correct(c1.id, approvedVersion, "concurrent correction")]);
    // Both target version N. Exactly one mutates it; the loser is a governed 409 (never 500).
    const codes = [lockRes.statusCode, corrRes.statusCode].sort();
    expect(codes).toContain(409);
    expect(codes.filter((c) => c >= 500)).toHaveLength(0);
    // family remains coherent: exactly one live approvable/locked head
    const rows = await prisma.payrollCalculation.findMany({ where: { familyRootId: c1.id } });
    expect(rows.filter((r) => ["calculated", "in_review", "approved"].includes(r.status)).length).toBeLessThanOrEqual(1);
    await setContractRate(3000);
  });

  it("RACE: approve vs correct on the same revision — approval binds to the exact revision, no accidental 500", async () => {
    const c1 = await freshPeriodCalc();
    await setContractRate(3500);
    const [appr, corr] = await Promise.all([transition(c1.id, "approve", c1.version), correct(c1.id, c1.version, "concurrent correction")]);
    const codes = [appr.statusCode, corr.statusCode];
    expect(codes.filter((c) => c >= 500)).toHaveLength(0);
    expect(codes).toContain(409); // one bound to version N, the other stale
    await setContractRate(3000);
  });

  it("RACE: two concurrent corrections of the same revision — one wins, unique revisions, no 500", async () => {
    const c1 = await freshPeriodCalc();
    await setContractRate(3500);
    const [x, y] = await Promise.all([correct(c1.id, c1.version, "corr A"), correct(c1.id, c1.version, "corr B")]);
    const created = [x, y].filter((r) => r.statusCode === 201);
    expect(created.length).toBe(1);
    expect([x, y].filter((r) => r.statusCode >= 500)).toHaveLength(0);
    const revs = (await prisma.payrollCalculation.findMany({ where: { familyRootId: c1.id } })).map((r) => r.revision);
    expect(new Set(revs).size).toBe(revs.length); // unique revision numbers
    await setContractRate(3000);
  });

  it("RACE: concurrent lock retries are safe — at most one lock transition, no 500", async () => {
    const c1 = await freshPeriodCalc();
    const a = await transition(c1.id, "approve", c1.version);
    const v = a.json().calculation.version;
    const [l1, l2] = await Promise.all([transition(c1.id, "lock", v), transition(c1.id, "lock", v)]);
    const ok = [l1, l2].filter((r) => r.statusCode === 200);
    expect(ok.length).toBe(1);
    expect([l1, l2].find((r) => r.statusCode !== 200)!.statusCode).toBe(409);
  });
});
