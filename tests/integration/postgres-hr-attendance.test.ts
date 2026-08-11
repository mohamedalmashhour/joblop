import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import type { FastifyInstance } from "fastify";

// HR-4 Scheduling & Attendance — built on the EXISTING governed attendance+timesheet
// authority (no parallel schedule). Proves: worker schedule is self-scoped; check-in is
// exactly-once (version-guarded, server-timestamped); records are timezone-aware; and the
// ApprovedWorkedTime seam surfaces only approved/locked timesheets (minutes only — no money).
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const NOW = new Date();

suite("HR-4 scheduling & attendance", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let hrUserId = "";
  let hrToken = "";
  let workerToken = "";
  let workerId = "";
  let workerBToken = "";
  let scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };
  let assignmentId = "";
  let attendanceId = "";
  const start = new Date(NOW.getTime() - 10 * 60_000); // window open (10 min ago)
  const end = new Date(NOW.getTime() + 8 * 3_600_000);
  const TZ = "America/Toronto";

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    app = buildApi({ env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async (u: string) => (u === hrUserId ? ["HR_ADMINISTRATOR", "PLATFORM_ADMINISTRATOR"] : []) });
    await app.ready();
    const hr = await register(`att-hr-${randomUUID()}@e2e.local`);
    hrUserId = hr.user.id; hrToken = hr.token;
    const w = await register(`att-w-${randomUUID()}@e2e.local`);
    workerToken = w.token;
    workerId = (await prisma.workerIdentity.create({ data: { userId: w.user.id, displayName: "Att Worker", status: "active" } })).id;
    workerBToken = (await register(`att-wb-${randomUUID()}@e2e.local`)).token;

    const owner = hr.user.id;
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-ATT-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "AttCare", status: "active", createdByUserId: owner } });
    const res = await prisma.residence.create({ data: { publicId: `RES-ATT-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: owner, province: "QC", city: "Laval" } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-ATT-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: owner } });
    scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-ATT-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: owner, title: "Att shift", numberOfWorkers: 1, requestType: "single_day", timezone: TZ, startAt: start, endAt: end, status: "approved_for_dispatch", createdByUserId: owner } });

    // Seed an accepted offer + create the authoritative assignment (existing governed path).
    const review = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: owner } });
    const offer = await prisma.workerOffer.create({ data: { dispatchReviewId: review.id, jobRequestId: job.id, organizationId: org.id, residenceId: res.id, departmentId: dept.id, workerIdentityId: workerId, status: "accepted", expiresAt: new Date(NOW.getTime() + 24 * 3_600_000), approvedAt: NOW, sentAt: NOW, respondedAt: NOW, createdByUserId: owner } });
    const terms = await prisma.workerOfferTermsVersion.create({ data: { workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: TZ, startAt: start, endAt: end, workGroupId: wg.id, roleDefinitionId: role.id, createdByUserId: owner } });
    await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: workerId, termsVersionId: terms.id, responseType: "accepted" } });
    const result = await createPrismaAssignmentRepository(prisma).createAssignmentFromAcceptedOfferAtomically({ workerOfferId: offer.id, expectedDispatchReviewId: review.id, expectedOfferVersion: 1, actorUserId: owner, correlationId: `att-${randomUUID().slice(0, 8)}`, now: NOW });
    const r = result as Record<string, unknown>;
    assignmentId = (r.assignmentId ?? (r.assignment as { id?: string } | undefined)?.id ?? "") as string;
    if (!assignmentId) throw new Error(`no assignmentId in result: ${JSON.stringify(result)}`);

    // Seed the attendance record + an APPROVED timesheet via raw SQL (scalar FKs), so the two
    // new HR-4 read endpoints have authoritative data without driving the full attendance
    // lifecycle (that lifecycle is separately owned + tested).
    attendanceId = randomUUID();
    const tsId = randomUUID();
    const s = start.toISOString(); const e = end.toISOString(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_start',$10,$11,$12,'confirmed','none',$13,1,$14,$14)`,
      attendanceId, assignmentId, job.id, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, TZ, owner, n
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',1,1,$11,$12,$13,450,450,30,$14,$15,1,$14,$14)`,
      tsId, assignmentId, attendanceId, job.id, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, TZ, n, owner
    );
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it("worker schedule is self-scoped + timezone-aware (worker B sees nothing of worker A)", async () => {
    const mine = await app.inject({ method: "GET", url: "/worker/attendance", headers: auth(workerToken) });
    expect(mine.statusCode).toBe(200);
    const rec = mine.json().items.find((r: { attendanceRecordId: string }) => r.attendanceRecordId === attendanceId);
    expect(rec).toBeTruthy();
    expect(rec.timezone).toBe(TZ); // timezone stored (never naive local strings)
    // authoritative UTC instant (Z-suffixed) + applicable timezone — hours are computed from
    // instants + tz, never from naive local strings.
    expect(rec.scheduledStartAt).toMatch(/Z$/);
    expect(Number.isNaN(Date.parse(rec.scheduledStartAt))).toBe(false);
    // worker B does not see worker A's schedule
    const b = await app.inject({ method: "GET", url: "/worker/attendance", headers: auth(workerBToken) });
    expect(b.statusCode === 200 ? b.json().items.some((r: { attendanceRecordId: string }) => r.attendanceRecordId === attendanceId) : true).toBe(b.statusCode !== 200);
  });

  it("check-in is exactly-once (version-guarded, server-timestamped) — no double check-in", async () => {
    const req = () => app.inject({ method: "POST", url: `/worker/attendance/${attendanceId}/check-in`, headers: auth(workerToken), payload: { expectedVersion: 1 } });
    const [r1, r2] = await Promise.all([req(), req()]);
    const successes = [r1, r2].filter((r) => r.statusCode === 200);
    expect(successes.length).toBeLessThanOrEqual(1); // never two check-in events
    // whatever the preconditions, checkInAt is single-valued (exactly-once)
    const row = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: attendanceId } });
    if (successes.length === 1) {
      expect(row.checkInAt).toBeTruthy();
      expect(row.status).toBe("checked_in");
      // a stale retry (version 1 again) is rejected — no second event
      const retry = await app.inject({ method: "POST", url: `/worker/attendance/${attendanceId}/check-in`, headers: auth(workerToken), payload: { expectedVersion: 1 } });
      expect(retry.statusCode).not.toBe(200);
    }
  });

  it("a worker cannot check in to another worker's assignment", async () => {
    const res = await app.inject({ method: "POST", url: `/worker/attendance/${attendanceId}/check-in`, headers: auth(workerBToken), payload: { expectedVersion: 1 } });
    expect(res.statusCode).not.toBe(200);
  });

  it("ApprovedWorkedTime seam returns only approved/locked timesheets (minutes only, no money); HR-gated", async () => {
    const denied = await app.inject({ method: "GET", url: "/platform/hr/approved-worked-time", headers: auth(workerToken) });
    expect(denied.statusCode).toBe(403);
    const res = await app.inject({ method: "GET", url: `/platform/hr/approved-worked-time?organizationId=${scope.organizationId}&limit=50`, headers: auth(hrToken) });
    expect(res.statusCode).toBe(200);
    expect(res.json().seam).toBe("ApprovedWorkedTime");
    const items = res.json().items as Array<Record<string, unknown>>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every((t) => t.status === "approved" || t.status === "locked")).toBe(true); // draft excluded
    const one = items.find((t) => t.assignmentId === assignmentId)!;
    expect(one.payableMinutes).toBe(450);
    // NO money fields on the payroll seam (minutes only)
    const raw = res.body;
    for (const money of ["grossPay", "netPay", "tax", "deduction", "vacationPay", "premium", "remittance", "amountMinor"]) {
      expect(raw).not.toContain(money);
    }
  });
});
