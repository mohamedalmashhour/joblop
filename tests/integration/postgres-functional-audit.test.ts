import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";
import { buildApi } from "../../apps/api/src/app";
import type { EmailMessage, EmailSender } from "../../apps/api/src/mailer/emailSender";
import { materializeAndListWorkerPayouts } from "../../apps/api/src/workerPayoutRepository";

// End-to-end guards for the worker journey and the money paths it feeds: each case drives the real
// API routes against a real schema. TEST/SYNTHETIC. No money moves. Gated on RWOS_TEST_DATABASE_URL,
// like the other postgres-* suites.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const HOUR = 3_600_000;
const STREET = "4521 Test Avenue";

suite("worker journey and payout guards", () => {
  const prisma = createPrismaClient(databaseUrl!);
  const emails: EmailMessage[] = [];
  const emailSender: EmailSender = {
    configured: true,
    send: async (message) => {
      emails.push(message);
      return { status: "sent" } as Awaited<ReturnType<EmailSender["send"]>>;
    }
  };
  let app: FastifyInstance;
  const staffIds = new Set<string>();
  const employerIds = new Set<string>();
  let staff: { token: string; id: string };
  let scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  async function register(prefix: string) {
    const email = `${prefix}-${randomUUID()}@e2e.local`;
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    const body = res.json() as { token: string; user: { id: string } };
    return { token: body.token, id: body.user.id, email };
  }

  async function makeWorker(prefix = "w") {
    const user = await register(prefix);
    const identity = await prisma.workerIdentity.create({ data: { userId: user.id, displayName: "Audit Worker", status: "active" } });
    await prisma.workerClassificationElection.create({
      data: { workerIdentityId: identity.id, classification: "employee", status: "active", effectiveFrom: new Date(Date.now() - 24 * HOUR), electedByUserId: user.id }
    });
    return { ...user, workerIdentityId: identity.id };
  }

  async function makeJob(input: { startAt: Date; endAt: Date; openClaim: boolean; priced?: boolean }) {
    const job = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-FA-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: staff.id, title: "Audit shift", numberOfWorkers: 1,
        requestType: "single_day", timezone: "America/Toronto", startAt: input.startAt, endAt: input.endAt, status: "approved_for_dispatch",
        openClaim: input.openClaim, urgency: "normal", createdByUserId: staff.id
      }
    });
    if (input.priced !== false) {
      await prisma.requestPricingSnapshot.create({
        data: {
          jobRequestId: job.id, organizationId: scope.organizationId, contractId: randomUUID(), contractVersion: "v1", currency: "CAD", marginPpm: 200_000,
          employerHourlyRateMinor: 3000, workerHourlyRateMinor: 2500, platformHourlyMarginMinor: 500, capturedByUserId: staff.id
        }
      });
    }
    const review = await prisma.dispatchReview.create({
      data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", urgency: "normal", requiredWorkerCount: 1, preparedOfferCount: 1, createdByUserId: staff.id }
    });
    return { job, review };
  }

  async function makeAcceptedOffer(worker: { workerIdentityId: string }, job: { id: string; title: string; startAt: Date; endAt: Date }, reviewId: string) {
    const offer = await prisma.workerOffer.create({
      data: {
        dispatchReviewId: reviewId, jobRequestId: job.id, organizationId: scope.organizationId, residenceId: scope.residenceId, departmentId: scope.departmentId,
        workerIdentityId: worker.workerIdentityId, status: "accepted", expiresAt: new Date(Date.now() + 24 * HOUR), approvedAt: new Date(), sentAt: new Date(),
        respondedAt: new Date(), createdByUserId: staff.id
      }
    });
    const terms = await prisma.workerOfferTermsVersion.create({
      data: {
        workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: "America/Toronto", startAt: job.startAt, endAt: job.endAt,
        workGroupId: scope.workGroupId, roleDefinitionId: scope.roleDefinitionId, createdByUserId: staff.id
      }
    });
    const updated = await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: worker.workerIdentityId, termsVersionId: terms.id, responseType: "accepted" } });
    return updated;
  }

  const soon = () => ({ startAt: new Date(Date.now() - HOUR), endAt: new Date(Date.now() + 7 * HOUR) });

  beforeAll(async () => {
    app = buildApi({
      countryCurrency: "CAD",
      countryTimezone: "America/Toronto",
      emailSender,
      env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" },
      resolveAuthorizationRoles: async (userId: string) =>
        staffIds.has(userId) ? ["PLATFORM_ADMINISTRATOR", "PAYROLL_ADMINISTRATOR"] : employerIds.has(userId) ? ["ORGANIZATION_OWNER"] : ["WORKER_ACCESS"]
    });
    await app.ready();
    staff = await register("fa-staff");
    staffIds.add(staff.id);
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-FA-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "AuditCare", status: "active", createdByUserId: staff.id } });
    const res = await prisma.residence.create({
      data: {
        publicId: `RES-FA-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: staff.id,
        province: "QC", city: "Laval", postalCode: "H7A 0A1", addressLine1: STREET, addressLine2: "Door B"
      }
    });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-FA-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: staff.id } });
    scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  describe("post-lock payroll adjustments", () => {
    const shiftStart = new Date("2026-08-10T13:00:00Z");
    const shiftEnd = new Date("2026-08-10T21:00:00Z");
    let periodSeq = 0;

    // Pay follows the job's pricing snapshot. Changing it is the governed input a correction consumes.
    async function makeContract() {
      const id = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO employer_contracts (id, organization_id, version, status, currency, activated_at, effective_from, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,'active','CAD',now(),'2026-07-01T00:00:00Z',$4,now(),now())`,
        id, scope.organizationId, `v-${randomUUID().slice(0, 8)}`, staff.id
      );
      return id;
    }
    const setWorkerRate = (jobRequestId: string, rateMinor: number) =>
      prisma.$executeRawUnsafe(`UPDATE request_pricing_snapshots SET worker_hourly_rate_minor=$2 WHERE job_request_id=$1`, jobRequestId, rateMinor);

    async function workedShift(worker: { workerIdentityId: string }, rateMinor: number) {
      const { job, review } = await makeJob({ startAt: shiftStart, endAt: shiftEnd, openClaim: false, priced: false });
      await prisma.requestPricingSnapshot.create({
        data: {
          jobRequestId: job.id, organizationId: scope.organizationId, contractId: await makeContract(), contractVersion: "v1", currency: "CAD", marginPpm: 200_000,
          employerHourlyRateMinor: rateMinor + 500, workerHourlyRateMinor: rateMinor, platformHourlyMarginMinor: 500, capturedByUserId: staff.id
        }
      });
      const offer = await makeAcceptedOffer(worker, job, review.id);
      const made = await createPrismaAssignmentRepository(prisma).createAssignmentFromAcceptedOfferAtomically({
        workerOfferId: offer.id, expectedDispatchReviewId: review.id, expectedOfferVersion: offer.version, actorUserId: staff.id, correlationId: `fa-${randomUUID().slice(0, 8)}`, now: new Date()
      });
      if (!made.ok) throw new Error(`assignment failed: ${made.reason}`);
      const attendanceId = randomUUID();
      const timesheetId = randomUUID();
      const [s, e, n] = [shiftStart.toISOString(), shiftEnd.toISOString(), new Date().toISOString()];
      await prisma.$executeRawUnsafe(
        `INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'checked_out',$10,$11,'America/Toronto','confirmed','none',$12,1,$13,$13)`,
        attendanceId, made.assignment.id, job.id, worker.workerIdentityId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, staff.id, n
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',1,1,$11,$12,'America/Toronto',480,480,0,$13,$14,1,$13,$13)`,
        timesheetId, made.assignment.id, attendanceId, job.id, worker.workerIdentityId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, n, staff.id
      );
      return job.id;
    }

    const transition = async (id: string, action: string, expectedVersion: number) => {
      const res = await app.inject({ method: "POST", url: `/platform/payroll/calculations/${id}/transition`, headers: auth(staff.token), payload: { action, expectedVersion } });
      expect(res.statusCode, res.body).toBe(200);
      return res.json().calculation as { id: string; version: number };
    };
    const approveAndLock = async (calc: { id: string; version: number }) => {
      const approved = await transition(calc.id, "approve", calc.version);
      return transition(approved.id, "lock", approved.version);
    };

    // One shift → a locked calculation at `firstRate`, then a locked adjustment at `secondRate`.
    async function lockedThenAdjusted(firstRate: number, secondRate: number) {
      const worker = await makeWorker("adj");
      const jobRequestId = await workedShift(worker, firstRate);
      periodSeq += 1;
      const period = await app.inject({
        method: "POST", url: "/platform/payroll/periods", headers: auth(staff.token),
        payload: { organizationId: scope.organizationId, jurisdictionCountry: "CA", jurisdictionRegion: "QC", periodStart: "2026-08-01T00:00:00Z", periodEnd: `2026-08-14T${String(periodSeq).padStart(2, "0")}:00:00Z`, currency: "CAD", timezone: "America/Toronto" }
      });
      expect(period.statusCode, period.body).toBe(201);
      const calculated = await app.inject({ method: "POST", url: "/platform/payroll/calculations", headers: auth(staff.token), payload: { payrollPeriodId: period.json().period.id, workerIdentityId: worker.workerIdentityId } });
      expect(calculated.statusCode, calculated.body).toBe(201);
      const original = await approveAndLock(calculated.json().calculation);
      await setWorkerRate(jobRequestId, secondRate);
      const corrected = await app.inject({ method: "POST", url: `/platform/payroll/calculations/${original.id}/correct`, headers: auth(staff.token), payload: { expectedVersion: original.version, reason: "rate fix" } });
      expect(corrected.statusCode, corrected.body).toBe(201);
      const adjustment = corrected.json().calculation as { id: string; version: number; adjustment: { netDirection: string; netDeltaMinor: number } };
      await approveAndLock(adjustment);
      const originalRow = await prisma.payrollCalculation.findUniqueOrThrow({ where: { id: original.id } });
      const adjustmentRow = await prisma.payrollCalculation.findUniqueOrThrow({ where: { id: adjustment.id } });
      return { worker, original: originalRow, adjustment: adjustmentRow };
    }

    it("an upward adjustment pays only the difference, never a second full payout", async () => {
      const { worker, original, adjustment } = await lockedThenAdjusted(3000, 3500);
      expect(adjustment.adjustmentNetDirection).toBe("credit");
      const delta = adjustment.adjustmentNetDeltaMinor!;
      expect(delta).toBeGreaterThan(0);

      const { payouts } = await materializeAndListWorkerPayouts(prisma, worker.workerIdentityId, new Date());
      const total = payouts.reduce((sum, p) => sum + p.amountMinor, 0);
      expect(total).toBe(adjustment.netPayMinor);
      expect(payouts.find((p) => p.payrollCalculationId === original.id)?.amountMinor).toBe(original.netPayMinor);

      const top = payouts.find((p) => p.payrollCalculationId === adjustment.id);
      expect(top?.amountMinor).toBe(delta);
      // What the worker is shown for the top-up must also be the difference, not the full recompute.
      expect(top?.workerReceivesMinor).toBe(delta);
      expect(top?.statementLines.find((l) => l.kind === "total")?.amountMinor).toBe(delta);
    });

    it("a downward adjustment creates no payout at all", async () => {
      const { worker, original, adjustment } = await lockedThenAdjusted(3500, 3000);
      expect(adjustment.adjustmentNetDirection).toBe("debit");
      const { payouts } = await materializeAndListWorkerPayouts(prisma, worker.workerIdentityId, new Date());
      expect(payouts.map((p) => p.payrollCalculationId)).toEqual([original.id]);
      expect(payouts[0]?.amountMinor).toBe(original.netPayMinor);
    });

    it("staff can list and resolve a worker dispute, which un-holds the payout", async () => {
      const { worker, original } = await lockedThenAdjusted(3000, 3500);
      await materializeAndListWorkerPayouts(prisma, worker.workerIdentityId, new Date());
      const raised = await app.inject({
        method: "POST", url: "/worker/disputes", headers: auth(worker.token),
        payload: { payrollCalculationId: original.id, category: "hours", reason: "These hours look wrong." }
      });
      expect(raised.statusCode, raised.body).toBe(201);
      const disputeId = raised.json().dispute.id as string;
      const held = () => prisma.workerPayout.findUniqueOrThrow({ where: { payrollCalculationId: original.id }, select: { status: true, heldReason: true } });
      expect((await held()).status).toBe("held");

      // A worker cannot reach either staff route, and cannot settle their own dispute.
      expect((await app.inject({ method: "GET", url: "/platform/worker-disputes", headers: auth(worker.token) })).statusCode).toBe(403);
      expect((await app.inject({ method: "POST", url: `/platform/worker-disputes/${disputeId}/resolve`, headers: auth(worker.token), payload: { resolution: "x" } })).statusCode).toBe(403);
      expect((await app.inject({ method: "POST", url: `/platform/worker-disputes/${disputeId}/resolve` })).statusCode).toBe(401);

      const listed = await app.inject({ method: "GET", url: "/platform/worker-disputes", headers: auth(staff.token) });
      expect(listed.statusCode, listed.body).toBe(200);
      const item = (listed.json().items as { id: string; payout: { status: string; amountMinor: number } | null; workerDisplayName: string }[]).find((d) => d.id === disputeId);
      expect(item?.payout?.status).toBe("held");
      expect(item?.workerDisplayName).toBe("Audit Worker");

      expect((await app.inject({ method: "POST", url: `/platform/worker-disputes/${disputeId}/resolve`, headers: auth(staff.token), payload: { resolution: "   " } })).statusCode).toBe(400);
      expect((await held()).status).toBe("held");

      const resolved = await app.inject({ method: "POST", url: `/platform/worker-disputes/${disputeId}/resolve`, headers: auth(staff.token), payload: { resolution: "Checked the timesheet; hours are right." } });
      expect(resolved.statusCode, resolved.body).toBe(200);
      expect(resolved.json().dispute.status).toBe("resolved");
      expect(await held()).toEqual({ status: "pending", heldReason: null });

      // Settling twice is refused; the settled reason reaches the worker; staff are on the audit trail.
      expect((await app.inject({ method: "POST", url: `/platform/worker-disputes/${disputeId}/resolve`, headers: auth(staff.token), payload: { resolution: "again" } })).statusCode).toBe(409);
      const mine = await app.inject({ method: "GET", url: "/worker/disputes", headers: auth(worker.token) });
      expect(mine.json().items[0].resolution).toBe("Checked the timesheet; hours are right.");
      const trail = await prisma.auditEvent.findMany({ where: { entityId: disputeId, action: "worker_dispute.resolved" }, include: { actorReference: true } });
      expect(trail).toHaveLength(1);
      expect(trail[0]?.actorReference.userId).toBe(staff.id);

      // The normal lifecycle resumes: the amount registers once the review window has passed.
      await materializeAndListWorkerPayouts(prisma, worker.workerIdentityId, new Date());
      expect((await prisma.workerPayout.findUniqueOrThrow({ where: { payrollCalculationId: original.id } })).registeredAt).not.toBeNull();
    });

    it("one open dispute keeps the payout held when another on it is resolved", async () => {
      const { worker, original } = await lockedThenAdjusted(3000, 3600);
      await materializeAndListWorkerPayouts(prisma, worker.workerIdentityId, new Date());
      const first = await app.inject({ method: "POST", url: "/worker/disputes", headers: auth(worker.token), payload: { payrollCalculationId: original.id, category: "hours", reason: "First." } });
      await prisma.workerDispute.create({ data: { workerIdentityId: worker.workerIdentityId, payrollCalculationId: original.id, organizationId: scope.organizationId, status: "open", category: "other", reason: "Second." } });
      const resolved = await app.inject({ method: "POST", url: `/platform/worker-disputes/${first.json().dispute.id}/resolve`, headers: auth(staff.token), payload: { resolution: "Settled." } });
      expect(resolved.statusCode, resolved.body).toBe(200);
      expect((await prisma.workerPayout.findUniqueOrThrow({ where: { payrollCalculationId: original.id } })).status).toBe("held");
    });
  });

  describe("claiming and being assigned a shift", () => {
    it("a claimed shift reaches My schedule and can be checked in to", async () => {
      const worker = await makeWorker("claim");
      const { job } = await makeJob({ ...soon(), openClaim: true });
      const claimed = await app.inject({ method: "POST", url: `/marketplace/jobs/${job.id}/claim`, headers: auth(worker.token) });
      expect(claimed.statusCode, claimed.body).toBe(201);

      const schedule = await app.inject({ method: "GET", url: "/worker/attendance", headers: auth(worker.token) });
      expect(schedule.statusCode, schedule.body).toBe(200);
      const items = schedule.json().items as { attendanceRecordId: string; version: number; status: string }[];
      expect(items).toHaveLength(1);
      expect(items[0]?.status).toBe("pending_start");

      const checkIn = await app.inject({
        method: "POST", url: `/worker/attendance/${items[0]!.attendanceRecordId}/check-in`, headers: auth(worker.token),
        payload: { expectedVersion: items[0]!.version }
      });
      expect(checkIn.statusCode, checkIn.body).toBe(200);
      expect(checkIn.json().attendanceRecord.status).toBe("checked_in");

      const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: claimed.json().assignmentId } });
      expect(assignment.status).toBe("attendance_handoff");
      const trail = await prisma.auditEvent.findMany({ where: { entityId: assignment.id, action: "assignment.attendance_handoff" }, include: { actorReference: true } });
      expect(trail[0]?.actorReference.userId).toBe(worker.id);
    });

    it("the staff assignment route emails the worker, not the staff member", async () => {
      const worker = await makeWorker("assigned");
      const { job, review } = await makeJob({ ...soon(), openClaim: false });
      const offer = await makeAcceptedOffer(worker, job, review.id);
      emails.length = 0;
      const res = await app.inject({
        method: "POST", url: "/platform/assignments", headers: auth(staff.token),
        payload: { workerOfferId: offer.id, dispatchReviewId: review.id, expectedOfferVersion: offer.version }
      });
      expect(res.statusCode, res.body).toBe(201);
      const notices = emails.filter((m) => /got the job|obtenu le travail/.test(m.subject));
      expect(notices.map((m) => m.to)).toEqual([worker.email]);
    });

    it("the exact address reaches an assigned worker by schedule and email, and only them", async () => {
      const worker = await makeWorker("addr");
      const { job, review } = await makeJob({ ...soon(), openClaim: false });
      const offer = await makeAcceptedOffer(worker, job, review.id);
      emails.length = 0;
      const made = await app.inject({
        method: "POST", url: "/platform/assignments", headers: auth(staff.token),
        payload: { workerOfferId: offer.id, dispatchReviewId: review.id, expectedOfferVersion: offer.version }
      });
      expect(made.statusCode, made.body).toBe(201);
      const notice = emails.find((m) => m.to === worker.email);
      expect(notice?.text).toContain(STREET);

      const read = async (token: string) => (await app.inject({ method: "GET", url: "/worker/attendance", headers: auth(token) })).json().items as { attendanceRecordId: string; worksiteAddress: string | null }[];
      expect((await read(worker.token))[0]?.worksiteAddress).toBe(`${STREET}, Door B, Laval, QC, H7A 0A1`);

      const stranger = await makeWorker("stranger");
      expect(await read(stranger.token)).toEqual([]);

      // Once the attendance record is closed, the worker no longer needs the address.
      await prisma.attendanceRecord.updateMany({ where: { workerIdentityId: worker.workerIdentityId }, data: { status: "cancelled" } });
      expect((await read(worker.token))[0]?.worksiteAddress).toBeNull();
    });

    it("an address is never shown before assignment", async () => {
      const { job } = await makeJob({ ...soon(), openClaim: true });
      const worker = await makeWorker("preview");
      const detail = await app.inject({ method: "GET", url: `/marketplace/jobs/${job.id}`, headers: auth(worker.token) });
      expect(detail.body).not.toContain(STREET);
    });
  });
});
