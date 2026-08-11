import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import type { FastifyInstance } from "fastify";

// HR-4.1 — Attendance concurrency + HTTP status mapping. Proves the fix for the reported
// defect: a stale expectedVersion is a CONCURRENCY conflict (409), never an authentication
// failure (401). The underlying exactly-once/version-guard semantics are unchanged — this
// suite only pins the reported outcome of two-device / cross-worker / unauthenticated races.
//
// Required mapping (per the HR-4.1 order):
//   authentication failure          -> 401
//   authorization failure           -> 403
//   missing attendance/assignment   -> 404
//   stale expectedVersion / OCC      -> 409
//   validation error                -> 400
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const NOW = new Date();

suite("HR-4.1 attendance concurrency & HTTP status mapping", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let hrUserId = "";
  let workerToken = "";
  let workerId = "";
  let workerBToken = "";
  let scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };
  let assignmentId = "";
  let attendanceId = "";
  const start = new Date(NOW.getTime() - 10 * 60_000); // check-in window open (10 min ago)
  const end = new Date(NOW.getTime() + 8 * 3_600_000);
  const TZ = "America/Toronto";

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  async function seedAttendance() {
    // Fresh pending_start record on the same authoritative assignment so each test races a
    // clean version=1 record. Raw SQL (scalar FKs) — the lifecycle itself is separately owned.
    const id = randomUUID();
    const s = start.toISOString(); const e = end.toISOString(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(`DELETE FROM attendance_records WHERE assignment_id = $1`, assignmentId);
    await prisma.$executeRawUnsafe(
      `INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_start',$10,$11,$12,'confirmed','none',$13,1,$14,$14)`,
      id, assignmentId, jobId, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, TZ, ownerId, n
    );
    return id;
  }

  let jobId = "";
  let ownerId = "";

  beforeAll(async () => {
    // Both workers carry the WORKER role (as the real app derives from a WorkerIdentity); the
    // 403 for worker B must then come from OWNERSHIP enforcement, not a missing role.
    app = buildApi({ env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async (u: string) => (u === hrUserId ? ["HR_ADMINISTRATOR", "PLATFORM_ADMINISTRATOR"] : ["WORKER_ACCESS"]) });
    await app.ready();
    const hr = await register(`c-hr-${randomUUID()}@e2e.local`);
    hrUserId = hr.user.id; ownerId = hr.user.id;
    const w = await register(`c-w-${randomUUID()}@e2e.local`);
    workerToken = w.token;
    workerId = (await prisma.workerIdentity.create({ data: { userId: w.user.id, displayName: "Conflict Worker", status: "active" } })).id;
    const wb = await register(`c-wb-${randomUUID()}@e2e.local`);
    workerBToken = wb.token;
    // Worker B is a fully-onboarded worker (own WorkerIdentity) — so a cross-worker check-in is
    // denied by OWNERSHIP (403), not by a missing identity.
    await prisma.workerIdentity.create({ data: { userId: wb.user.id, displayName: "Other Worker", status: "active" } });

    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-C-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "ConflictCare", status: "active", createdByUserId: ownerId } });
    const res = await prisma.residence.create({ data: { publicId: `RES-C-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: ownerId, province: "QC", city: "Laval" } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-C-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: ownerId } });
    scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-C-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: ownerId, title: "Conflict shift", numberOfWorkers: 1, requestType: "single_day", timezone: TZ, startAt: start, endAt: end, status: "approved_for_dispatch", createdByUserId: ownerId } });
    jobId = job.id;

    const review = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: ownerId } });
    const offer = await prisma.workerOffer.create({ data: { dispatchReviewId: review.id, jobRequestId: job.id, organizationId: org.id, residenceId: res.id, departmentId: dept.id, workerIdentityId: workerId, status: "accepted", expiresAt: new Date(NOW.getTime() + 24 * 3_600_000), approvedAt: NOW, sentAt: NOW, respondedAt: NOW, createdByUserId: ownerId } });
    const terms = await prisma.workerOfferTermsVersion.create({ data: { workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: TZ, startAt: start, endAt: end, workGroupId: wg.id, roleDefinitionId: role.id, createdByUserId: ownerId } });
    await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: workerId, termsVersionId: terms.id, responseType: "accepted" } });
    const result = await createPrismaAssignmentRepository(prisma).createAssignmentFromAcceptedOfferAtomically({ workerOfferId: offer.id, expectedDispatchReviewId: review.id, expectedOfferVersion: 1, actorUserId: ownerId, correlationId: `c-${randomUUID().slice(0, 8)}`, now: NOW });
    const r = result as Record<string, unknown>;
    assignmentId = (r.assignmentId ?? (r.assignment as { id?: string } | undefined)?.id ?? "") as string;
    if (!assignmentId) throw new Error(`no assignmentId in result: ${JSON.stringify(result)}`);
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  const checkIn = (token: string, id: string, version: number) =>
    app.inject({ method: "POST", url: `/worker/attendance/${id}/check-in`, headers: auth(token), payload: { expectedVersion: version } });

  it("(1,2,3,4) two clients race the SAME version: at most one succeeds, the loser gets 409 (not 401), exactly one authoritative timestamp, audit stays coherent", async () => {
    attendanceId = await seedAttendance();
    const [a, b] = await Promise.all([checkIn(workerToken, attendanceId, 1), checkIn(workerToken, attendanceId, 1)]);

    const codes = [a.statusCode, b.statusCode].sort();
    const successes = codes.filter((c) => c === 200);
    // (2) at most one mutation succeeds
    expect(successes.length).toBeLessThanOrEqual(1);
    // (3) the loser is a CONFLICT (409) — never 401 auth, never 403, never a silent success
    const losers = [a, b].filter((r) => r.statusCode !== 200);
    for (const loser of losers) {
      // The loser is a CONCURRENCY CONFLICT (409) — never a 401 auth failure, never a silent
      // success. Whether it surfaces as a version conflict (lost the version guard) or a state
      // conflict (re-read the now-committed record) it is the same 409 class.
      expect(loser.statusCode).toBe(409);
      expect(loser.statusCode).not.toBe(401);
      expect(loser.json().error).toMatch(/^RWOS_ATTENDANCE_(VERSION|STATE)_CONFLICT$/);
    }

    const row = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: attendanceId } });
    if (successes.length === 1) {
      // (4) exactly ONE authoritative check-in timestamp; version advanced exactly once
      expect(row.status).toBe("checked_in");
      expect(row.checkInAt).toBeTruthy();
      expect(row.version).toBe(2);
    }

    // (5-audit) history is coherent: BOTH racers are audited (each records a check-in attempt),
    // yet EXACTLY ONE commit exists — the loser is never silently dropped, never double-committed.
    const events = await prisma.auditEvent.findMany({ where: { entityType: "attendance_record", entityId: attendanceId } });
    const committed = events.filter((e) => e.action === "attendance.checked_in");
    const attempts = events.filter((e) => e.action === "attendance.check_in_attempted");
    expect(committed.length).toBe(successes.length); // 0 or 1 — never a double commit
    expect(attempts.length).toBeGreaterThanOrEqual(2); // both racers left an audit trail
  });

  it("(6) worker A cannot mutate worker B's attendance — 403 (authorization), never 401 or success", async () => {
    attendanceId = await seedAttendance();
    const res = await checkIn(workerBToken, attendanceId, 1);
    expect(res.statusCode).toBe(403);
    expect(res.statusCode).not.toBe(401);
    // and worker B's attempt did not mutate worker A's record
    const row = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: attendanceId } });
    expect(row.status).toBe("pending_start");
    expect(row.checkInAt).toBeNull();
  });

  it("(7) a stale retry then a retry with the NEW authoritative version follows the legal lifecycle", async () => {
    attendanceId = await seedAttendance();
    // check in at v1 -> success, record now at v2
    const first = await checkIn(workerToken, attendanceId, 1);
    expect(first.statusCode).toBe(200);
    expect(first.json().attendanceRecord.version).toBe(2);

    // stale retry at v1 -> 409 conflict (never 401), no second event. The record already
    // advanced past pending_start, so this is a state conflict (a duplicate check-in).
    const stale = await checkIn(workerToken, attendanceId, 1);
    expect(stale.statusCode).toBe(409);
    expect(stale.statusCode).not.toBe(401);
    expect(stale.json().error).toMatch(/^RWOS_ATTENDANCE_(VERSION|STATE)_CONFLICT$/);

    // legal next step: check OUT with the new authoritative version (2) -> success
    const out = await app.inject({ method: "POST", url: `/worker/attendance/${attendanceId}/check-out`, headers: auth(workerToken), payload: { expectedVersion: 2 } });
    expect(out.statusCode).toBe(200);
    expect(out.json().attendanceRecord.status).toBe("checked_out");
    expect(out.json().attendanceRecord.checkOutAt).toBeTruthy();

    // a duplicate check-in on an already-progressed record is a STATE conflict (409), not 401
    const dup = await checkIn(workerToken, attendanceId, 3);
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error).toBe("RWOS_ATTENDANCE_STATE_CONFLICT");
  });

  it("unauthenticated check-in is an AUTHENTICATION failure (401), and a missing record is 404", async () => {
    attendanceId = await seedAttendance();
    const anon = await app.inject({ method: "POST", url: `/worker/attendance/${attendanceId}/check-in`, payload: { expectedVersion: 1 } });
    expect(anon.statusCode).toBe(401);

    const missing = await checkIn(workerToken, randomUUID(), 1);
    expect(missing.statusCode).toBe(404);
  });
});
