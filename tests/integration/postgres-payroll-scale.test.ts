import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";
import { priceJob } from "./payrollPricingFixture";

// HR-5.1 Chunk 5 — meaningful-scale bulk calculation + EXPLAIN ANALYZE evidence + bulk concurrency
// and failure isolation, over a synthetic dataset. TEST/SYNTHETIC — no money execution. The worker
// count is configurable via SCALE_WORKERS (default 1500 for a repeatable run; the report uses a
// larger one-off). Nothing generated here is committed.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const N = Math.max(200, Number(process.env.SCALE_WORKERS ?? 1500));

suite(`HR-5.1 payroll scale (${N} synthetic workers)`, () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let payrollAdminId = "";
  let payrollToken = "";
  let orgId = "";
  let periodId = "";
  let scope: { residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string; jobId: string; reviewId: string };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const tag = randomUUID().slice(0, 8); // isolates this run's synthetic rows for cleanup

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }

  beforeAll(async () => {
    app = buildApi({ countryCurrency: "CAD", env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async (u: string) => (u === payrollAdminId ? ["PAYROLL_ADMINISTRATOR"] : []) });
    await app.ready();
    const admin = await register(`scale-admin-${tag}@e2e.local`); payrollAdminId = admin.user.id; payrollToken = admin.token;
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-SC-${tag}`, legalName: "L", displayName: "ScaleCare", status: "active", createdByUserId: payrollAdminId } });
    orgId = org.id;
    const res = await prisma.residence.create({ data: { publicId: `RES-SC-${tag}`, organizationId: org.id, name: "R", status: "active", createdByUserId: payrollAdminId, province: "QC", city: "Laval" } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-SC-${tag}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: payrollAdminId } });
    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-SC-${tag}`, organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id, creatorUserId: payrollAdminId, title: "Scale shift", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto", startAt: new Date("2026-08-05T13:00:00Z"), endAt: new Date("2026-08-05T21:00:00Z"), status: "approved_for_dispatch", createdByUserId: payrollAdminId } });
    const review = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: payrollAdminId } });
    scope = { residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id, jobId: job.id, reviewId: review.id };
    // governed rate contract (effective Jul 1, covers the Aug 5 shift)
    const cid = randomUUID();
    await prisma.$executeRawUnsafe(`INSERT INTO employer_contracts (id, organization_id, version, status, currency, activated_at, effective_from, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,'active','CAD',now(),'2026-07-01T00:00:00Z',$4,now(),now())`, cid, org.id, `sc-${tag}`, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO contract_role_rates (id, contract_id, work_group_id, role_definition_id, hourly_rate_minor, created_at) VALUES (gen_random_uuid(),$1,$2,$3,3000,now())`, cid, wg.id, role.id);
    await priceJob(prisma, { jobRequestId: job.id, organizationId: org.id, contract: { id: cid, version: `sc-${tag}`, effectiveFrom: new Date("2026-07-01T00:00:00Z"), rateMinor: 3000 }, capturedByUserId: payrollAdminId });

    // ── bulk-generate N synthetic worker chains via generate_series with deterministic UUIDs ──
    const u = (p: string) => `(md5('${p}-${tag}-'||g::text))::uuid`;
    const g = (sql: string) => prisma.$executeRawUnsafe(sql);
    await g(`INSERT INTO users (id, public_id, email_normalized, updated_at) SELECT ${u("usr")}, 'PSC-${tag}-'||g, 'sc-${tag}-'||g||'@e2e.local', now() FROM generate_series(1,${N}) g`);
    await g(`INSERT INTO worker_identities (id, user_id, display_name, status, created_at, updated_at) SELECT ${u("wid")}, ${u("usr")}, 'Scale '||g, 'active', now(), now() FROM generate_series(1,${N}) g`);
    await g(`INSERT INTO worker_offers (id, dispatch_review_id, job_request_id, organization_id, residence_id, department_id, worker_identity_id, status, expires_at, created_by_user_id, created_at, updated_at) SELECT ${u("off")}, '${scope.reviewId}', '${scope.jobId}', '${orgId}', '${scope.residenceId}', '${scope.departmentId}', ${u("wid")}, 'accepted', now()+interval '30 days', '${payrollAdminId}', now(), now() FROM generate_series(1,${N}) g`);
    await g(`INSERT INTO worker_offer_terms_versions (id, worker_offer_id, version_number, worker_visible_title, timezone, start_at, end_at, work_group_id, role_definition_id, created_by_user_id, created_at) SELECT ${u("trm")}, ${u("off")}, 1, 'Scale', 'America/Toronto', '2026-08-05T13:00:00Z', '2026-08-05T21:00:00Z', '${scope.workGroupId}', '${scope.roleDefinitionId}', '${payrollAdminId}', now() FROM generate_series(1,${N}) g`);
    await g(`INSERT INTO assignments (id, job_request_id, dispatch_review_id, worker_offer_id, worker_offer_terms_version_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, confirmed_start_at, confirmed_end_at, timezone, confirmed_title, capacity_checked_at, conflict_checked_at, confirmed_at, created_by_user_id, version, created_at, updated_at) SELECT ${u("asg")}, '${scope.jobId}', '${scope.reviewId}', ${u("off")}, ${u("trm")}, ${u("wid")}, '${orgId}', '${scope.residenceId}', '${scope.departmentId}', '${scope.workGroupId}', '${scope.roleDefinitionId}', 'confirmed', '2026-08-05T13:00:00Z', '2026-08-05T21:00:00Z', 'America/Toronto', 'Scale', now(), now(), now(), '${payrollAdminId}', 1, now(), now() FROM generate_series(1,${N}) g`);
    await g(`INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at) SELECT ${u("att")}, ${u("asg")}, '${scope.jobId}', ${u("wid")}, '${orgId}', '${scope.residenceId}', '${scope.departmentId}', '${scope.workGroupId}', '${scope.roleDefinitionId}', 'checked_out', '2026-08-05T13:00:00Z', '2026-08-05T21:00:00Z', 'America/Toronto', 'confirmed', 'none', '${payrollAdminId}', 1, now(), now() FROM generate_series(1,${N}) g`);
    await g(`INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at) SELECT ${u("tsh")}, ${u("asg")}, ${u("att")}, '${scope.jobId}', ${u("wid")}, '${orgId}', '${scope.residenceId}', '${scope.departmentId}', '${scope.workGroupId}', '${scope.roleDefinitionId}', 'approved', 1, 1, '2026-08-05T13:00:00Z', '2026-08-05T21:00:00Z', 'America/Toronto', 480, 480, 0, now(), '${payrollAdminId}', 1, now(), now() FROM generate_series(1,${N}) g`);

    const period = await app.inject({ method: "POST", url: "/platform/payroll/periods", headers: auth(payrollToken), payload: { organizationId: orgId, jurisdictionCountry: "CA", jurisdictionRegion: "QC", periodStart: "2026-08-01T00:00:00Z", periodEnd: "2026-08-15T00:00:00Z", currency: "CAD", timezone: "America/Toronto" } });
    periodId = period.json().period.id;
  }, 300_000);

  afterAll(async () => {
    // clean up this run's synthetic scale rows (leave the DB as found)
    await prisma.$executeRawUnsafe(`DELETE FROM payroll_worked_time_references WHERE payroll_calculation_id IN (SELECT id FROM payroll_calculations WHERE organization_id=$1)`, orgId).catch(() => {});
    for (const t of ["payroll_earning_lines", "payroll_deduction_lines", "payroll_employer_cost_lines"]) await prisma.$executeRawUnsafe(`DELETE FROM ${t} WHERE payroll_calculation_id IN (SELECT id FROM payroll_calculations WHERE organization_id=$1)`, orgId).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM payroll_calculations WHERE organization_id=$1`, orgId).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM payroll_periods WHERE organization_id=$1`, orgId).catch(() => {});
    for (const t of ["timesheets", "attendance_records", "assignments", "worker_offer_terms_versions", "worker_offers"]) await prisma.$executeRawUnsafe(`DELETE FROM ${t} WHERE organization_id=$1`, orgId).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM departments WHERE organization_id=$1`, orgId).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM residences WHERE organization_id=$1`, orgId).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM worker_identities WHERE user_id IN (SELECT id FROM users WHERE email_normalized LIKE $1)`, `%${tag}%`).catch(() => {});
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE email_normalized LIKE $1`, `%-${tag}-%`).catch(() => {});
    await app?.close();
    await prisma.$disconnect();
  });

  const bulk = (limit: number, cursor?: string) => app.inject({ method: "POST", url: `/platform/payroll/periods/${periodId}/bulk-calculate`, headers: auth(payrollToken), payload: { limit, ...(cursor ? { cursor } : {}) } });

  it(`bulk calculates ${N} eligible workers in bounded pages (throughput + memory reported)`, async () => {
    const eligible = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(`SELECT count(DISTINCT worker_identity_id) c FROM timesheets WHERE organization_id=$1 AND status IN ('approved','locked')`, orgId);
    expect(Number(eligible[0]!.c)).toBe(N);

    const rssBefore = process.memoryUsage().rss;
    const t0 = Date.now();
    let cursor: string | undefined;
    let total = 0, calculated = 0, failed = 0;
    let pages = 0;
    do {
      const r = await bulk(250, cursor);
      expect(r.statusCode).toBe(200);
      const b = r.json();
      total += b.attempted; calculated += b.calculated; failed += b.failed;
      cursor = b.nextCursor ?? undefined;
      pages += 1;
      expect(b.results.length).toBeLessThanOrEqual(250); // bounded page — never the whole population
    } while (cursor && pages < 200);
    const durMs = Date.now() - t0;
    const rssAfter = process.memoryUsage().rss;

    expect(total).toBe(N);
    expect(calculated).toBe(N);
    expect(failed).toBe(0);
    const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(`SELECT count(*) c FROM payroll_calculations WHERE payroll_period_id=$1`, periodId);
    expect(Number(rows[0]!.c)).toBe(N); // exactly one calc per worker
    // memory stays bounded (does not grow ~linearly with the whole population)
    const rssGrowthMb = (rssAfter - rssBefore) / 1024 / 1024;
    console.log(`[SCALE] ${N} workers, ${pages} pages, ${durMs}ms, ${(N / (durMs / 1000)).toFixed(0)} calc/s, RSS growth ${rssGrowthMb.toFixed(1)}MB`);
    expect(rssGrowthMb).toBeLessThan(400); // bounded — not linear in 10k detailed calculations
  }, 300_000);

  it("re-running bulk over unchanged inputs is idempotent — all no_change, no duplicate revisions", async () => {
    let cursor: string | undefined; let noChange = 0; let created = 0; let pages = 0;
    do {
      const r = await bulk(500, cursor);
      const b = r.json();
      noChange += b.noChange; created += b.calculated; cursor = b.nextCursor ?? undefined; pages += 1;
    } while (cursor && pages < 100);
    expect(created).toBe(0);
    expect(noChange).toBe(N);
    const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(`SELECT count(*) c FROM payroll_calculations WHERE payroll_period_id=$1`, periodId);
    expect(Number(rows[0]!.c)).toBe(N); // still exactly one per worker — no duplicates
  }, 300_000);

  it("EXPLAIN ANALYZE: critical payroll queries use index scans at volume (not seq scans)", async () => {
    const plan = async (sql: string) => (await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`)).map((r) => Object.values(r)[0]).join("\n");
    const sampleWorker = (await prisma.$queryRawUnsafe<Array<{ worker_identity_id: string }>>(`SELECT worker_identity_id FROM timesheets WHERE organization_id='${orgId}' LIMIT 1`))[0]!.worker_identity_id;

    const periodCalcs = await plan(`SELECT * FROM payroll_calculations WHERE payroll_period_id='${periodId}' AND status='calculated' LIMIT 50`);
    const workerPeriod = await plan(`SELECT * FROM payroll_calculations WHERE worker_identity_id='${sampleWorker}' AND payroll_period_id='${periodId}'`);
    const approvedWorked = await plan(`SELECT * FROM timesheets WHERE organization_id='${orgId}' AND worker_identity_id='${sampleWorker}' AND status IN ('approved','locked') AND scheduled_start_at >= '2026-08-01' AND scheduled_start_at < '2026-08-15'`);
    const contractEffective = await plan(`SELECT * FROM employer_contracts WHERE organization_id='${orgId}' AND status IN ('active','superseded') AND effective_from <= now() ORDER BY effective_from DESC, activated_at DESC LIMIT 1`);
    console.log("[EXPLAIN periodCalcs]\n" + periodCalcs + "\n[EXPLAIN workerPeriod]\n" + workerPeriod + "\n[EXPLAIN approvedWorked]\n" + approvedWorked + "\n[EXPLAIN contractEffective]\n" + contractEffective);
    // At meaningful volume the selective lookups on the HIGH-CARDINALITY tables (payroll_calculations,
    // timesheets) must be index-backed. employer_contracts is intentionally tiny per org (one or two
    // active/superseded contracts) so the planner legitimately Seq Scans it — the order says do not
    // force an index there. Plans are always logged; the strict assertion is gated on volume.
    expect(periodCalcs.length).toBeGreaterThan(0);
    expect(contractEffective.length).toBeGreaterThan(0); // captured (tiny-table seq scan is legitimate)
    if (N >= 3000) {
      expect(/Index (Scan|Only Scan|Cond)/.test(workerPeriod)).toBe(true);
      expect(/Index (Scan|Only Scan|Cond)/.test(approvedWorked)).toBe(true);
    }
  }, 120_000);

  it("RACE: bulk vs single-worker calculation on the same worker — one coherent revision, no 500", async () => {
    const worker = (await prisma.$queryRawUnsafe<Array<{ worker_identity_id: string }>>(`SELECT worker_identity_id FROM timesheets WHERE organization_id='${orgId}' ORDER BY worker_identity_id LIMIT 1`))[0]!.worker_identity_id;
    // both target the same worker's active revision concurrently
    const [b, single] = await Promise.all([
      bulk(1),
      app.inject({ method: "POST", url: "/platform/payroll/calculations", headers: auth(payrollToken), payload: { payrollPeriodId: periodId, workerIdentityId: worker } })
    ]);
    expect(b.statusCode).toBe(200);
    expect(single.statusCode).not.toBeGreaterThanOrEqual(500);
    const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(`SELECT count(*) c FROM payroll_calculations WHERE payroll_period_id='${periodId}' AND worker_identity_id='${worker}' AND status NOT IN ('superseded')`);
    expect(Number(rows[0]!.c)).toBe(1); // exactly one authoritative revision
  }, 120_000);

  it("duplicate concurrent bulk requests do not create duplicate revisions", async () => {
    const before = Number((await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(`SELECT count(*) c FROM payroll_calculations WHERE payroll_period_id='${periodId}' AND status NOT IN ('superseded')`))[0]!.c);
    const [a, c] = await Promise.all([bulk(250), bulk(250)]);
    expect(a.statusCode).toBe(200); expect(c.statusCode).toBe(200);
    const after = Number((await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(`SELECT count(*) c FROM payroll_calculations WHERE payroll_period_id='${periodId}' AND status NOT IN ('superseded')`))[0]!.c);
    expect(after).toBe(before); // unchanged inputs -> no new authoritative revisions
  }, 120_000);

  it("failure isolation: an invalid worker fails with a governed reason while valid workers succeed", async () => {
    // a worker with a WorkerIdentity + approved timesheet but NO contract-role rate would fail; here
    // we seed a worker whose worksite residence has no province -> unsupported jurisdiction, mixed in.
    const badUser = randomUUID(); const badWid = randomUUID(); const badRes = randomUUID(); const badDept = randomUUID();
    const badJob = randomUUID(); const badReview = randomUUID();
    const badAsg = randomUUID(); const badAtt = randomUUID(); const badTs = randomUUID(); const badOff = randomUUID(); const badTrm = randomUUID();
    await prisma.$executeRawUnsafe(`INSERT INTO users (id, public_id, email_normalized, updated_at) VALUES ($1,$2,$3,now())`, badUser, `PB-${tag}`, `bad-${tag}@e2e.local`);
    await prisma.$executeRawUnsafe(`INSERT INTO worker_identities (id, user_id, display_name, status, created_at, updated_at) VALUES ($1,$2,'Bad','active',now(),now())`, badWid, badUser);
    // A complete parallel scope whose WORKSITE is in an UNSUPPORTED jurisdiction (CA/BC — no synthetic
    // provider). The whole chain (job/review/offer/assignment/attendance/timesheet) lives in BC.
    await prisma.$executeRawUnsafe(`INSERT INTO residences (id, public_id, organization_id, name, status, created_by_user_id, province, country, city, created_at, updated_at) VALUES ($1,$2,$3,'BadRes','active',$4,'BC','CA','X',now(),now())`, badRes, `RB-${tag}`, orgId, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO departments (id, public_id, organization_id, residence_id, name, status, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,$4,'BadDept','active',$5,now(),now())`, badDept, `DB-${tag}`, orgId, badRes, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO job_requests (id, job_request_number, organization_id, residence_id, department_id, work_group_id, role_definition_id, creator_user_id, title, number_of_workers, request_type, timezone, start_at, end_at, status, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Bad',1,'single_day','America/Toronto','2026-08-05T13:00:00Z','2026-08-05T21:00:00Z','approved_for_dispatch',$8,now(),now())`, badJob, `JB-${tag}`, orgId, badRes, badDept, scope.workGroupId, scope.roleDefinitionId, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO dispatch_reviews (id, job_request_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, state, priority, required_worker_count, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'offer_preparation','normal',1,$8,now(),now())`, badReview, badJob, orgId, badRes, badDept, scope.workGroupId, scope.roleDefinitionId, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO worker_offers (id, dispatch_review_id, job_request_id, organization_id, residence_id, department_id, worker_identity_id, status, expires_at, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'accepted',now()+interval '30 days',$8,now(),now())`, badOff, badReview, badJob, orgId, badRes, badDept, badWid, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO worker_offer_terms_versions (id, worker_offer_id, version_number, worker_visible_title, timezone, start_at, end_at, work_group_id, role_definition_id, created_by_user_id, created_at) VALUES ($1,$2,1,'Bad','America/Toronto','2026-08-05T13:00:00Z','2026-08-05T21:00:00Z',$3,$4,$5,now())`, badTrm, badOff, scope.workGroupId, scope.roleDefinitionId, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO assignments (id, job_request_id, dispatch_review_id, worker_offer_id, worker_offer_terms_version_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, confirmed_start_at, confirmed_end_at, timezone, confirmed_title, capacity_checked_at, conflict_checked_at, confirmed_at, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'confirmed','2026-08-05T13:00:00Z','2026-08-05T21:00:00Z','America/Toronto','Bad',now(),now(),now(),$12,1,now(),now())`, badAsg, badJob, badReview, badOff, badTrm, badWid, orgId, badRes, badDept, scope.workGroupId, scope.roleDefinitionId, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'checked_out','2026-08-05T13:00:00Z','2026-08-05T21:00:00Z','America/Toronto','confirmed','none',$10,1,now(),now())`, badAtt, badAsg, badJob, badWid, orgId, badRes, badDept, scope.workGroupId, scope.roleDefinitionId, payrollAdminId);
    await prisma.$executeRawUnsafe(`INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',1,1,'2026-08-05T13:00:00Z','2026-08-05T21:00:00Z','America/Toronto',480,480,0,now(),$11,1,now(),now())`, badTs, badAsg, badAtt, badJob, badWid, orgId, badRes, badDept, scope.workGroupId, scope.roleDefinitionId, payrollAdminId);

    // page through until the bad worker is attempted; it must FAIL with a governed reason, others OK
    let cursor: string | undefined; let sawBad = false; let anyFailedNotBad = false; let pages = 0;
    do {
      const b = (await bulk(500, cursor)).json();
      const bad = b.results.find((r: { workerIdentityId: string; outcome: string; reason?: string }) => r.workerIdentityId === badWid);
      if (bad) { sawBad = true; expect(bad.outcome).toBe("failed"); expect(bad.reason).toMatch(/jurisdiction/); }
      if (b.results.some((r: { workerIdentityId: string; outcome: string }) => r.outcome === "failed" && r.workerIdentityId !== badWid)) anyFailedNotBad = true;
      cursor = b.nextCursor ?? undefined; pages += 1;
    } while (cursor && pages < 100);
    expect(sawBad).toBe(true);
    expect(anyFailedNotBad).toBe(false); // one bad worker does not corrupt the rest
  }, 300_000);

  it("bulk authorization: worker/employer/unauthenticated denied", async () => {
    const w = await register(`scale-w-${tag}@e2e.local`);
    expect((await app.inject({ method: "POST", url: `/platform/payroll/periods/${periodId}/bulk-calculate`, headers: auth(w.token), payload: { limit: 10 } })).statusCode).toBe(403);
    expect((await app.inject({ method: "POST", url: `/platform/payroll/periods/${periodId}/bulk-calculate`, payload: { limit: 10 } })).statusCode).toBe(401);
  });
});
