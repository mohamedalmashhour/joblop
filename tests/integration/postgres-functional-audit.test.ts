import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";
import { PUBLIC_CALENDAR_JOB_FIELDS } from "@rwos/shared";
import { buildApi } from "../../apps/api/src/app";
import type { EmailMessage, EmailSender } from "../../apps/api/src/mailer/emailSender";
import type { SmsMessage, SmsSender } from "../../apps/api/src/mailer/smsSender";
import { materializeAndListWorkerPayouts } from "../../apps/api/src/workerPayoutRepository";
import type { PushFetch } from "../../apps/api/src/notifications/pushSender";

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
  // Texts are captured, never sent. Only users given a phone number receive one.
  const texts: SmsMessage[] = [];
  const smsSender: SmsSender = {
    configured: true,
    enabled: true,
    send: async (message) => {
      texts.push(message);
      return { status: "sent", id: `sms-${texts.length}` };
    }
  };
  // Push notifications are captured, never sent to Expo.
  const pushes: { to: string; title: string; data: Record<string, unknown> }[] = [];
  const pushFetch: PushFetch = async (_url, init) => {
    const batch = JSON.parse(init.body) as { to: string; title: string; data: Record<string, unknown> }[];
    pushes.push(...batch);
    return { ok: true, status: 200, json: async () => ({ data: batch.map(() => ({ status: "ok" })) }) };
  };
  const SWEEP_TOKEN = `fa-alert-sweep-${randomUUID()}`;
  const WORKER_ORIGIN = "https://worker.fa.test";
  // Alert and push rows these tests make are removed again in afterAll.
  const createdAlertEmails: string[] = [];
  const createdPushTokens: string[] = [];
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
      smsSender,
      pushFetch,
      env: {
        ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test",
        JOB_ALERT_SWEEP_TOKEN: SWEEP_TOKEN, WORKER_WEB_ORIGIN: WORKER_ORIGIN
      },
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

  // Memberships made by these tests are removed again: suites share one database, and others
  // (e.g. the QA-reset reconcile test) expect no leftover organization roles.
  const createdMembershipIds: string[] = [];

  afterAll(async () => {
    if (createdAlertEmails.length > 0) await prisma.jobAlertSubscription.deleteMany({ where: { email: { in: createdAlertEmails } } });
    if (createdPushTokens.length > 0) await prisma.pushToken.deleteMany({ where: { token: { in: createdPushTokens } } });
    if (createdMembershipIds.length > 0) {
      await prisma.membershipAccessRole.deleteMany({ where: { membershipId: { in: createdMembershipIds } } });
      await prisma.organizationMembership.deleteMany({ where: { id: { in: createdMembershipIds } } });
    }
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

    it("remittances count an adjusted calculation once, at its latest figures", async () => {
      const { original, adjustment } = await lockedThenAdjusted(3000, 3500);
      const res = await app.inject({ method: "GET", url: `/platform/finance/remittances?payrollPeriodId=${original.payrollPeriodId}`, headers: auth(staff.token) });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().lockedCalculations).toBe(1);
      expect(res.json().remittances.grandTotalMinor).toBe(adjustment.totalDeductionsMinor + adjustment.totalEmployerCostMinor);
    });

    it("a tax slip counts an adjusted calculation once, at its latest figures", async () => {
      const { worker, adjustment } = await lockedThenAdjusted(3000, 3500);
      const res = await app.inject({ method: "GET", url: "/worker/tax-slips?year=2026", headers: auth(worker.token) });
      expect(res.statusCode, res.body).toBe(200);
      const slips = res.json().slips as Record<string, unknown>[];
      expect(slips).toHaveLength(1);
      expect(JSON.stringify(slips)).toContain(String(adjustment.grossPayMinor));
    });

    it("the worker's to-date totals count an adjusted calculation once", async () => {
      const { worker, adjustment } = await lockedThenAdjusted(3000, 3500);
      const res = await app.inject({ method: "GET", url: "/worker/payroll/statement", headers: auth(worker.token) });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().summary).toMatchObject({ statementCount: 1, totalGrossMinor: adjustment.grossPayMinor, totalNetMinor: adjustment.netPayMinor });
      // Both revisions stay listed as history.
      expect(res.json().items).toHaveLength(2);
    });

    it("a second adjustment chains from the first: totals and payouts both land on the latest figure", async () => {
      const { worker, original, adjustment } = await lockedThenAdjusted(3000, 3500);
      const job = await prisma.timesheet.findFirstOrThrow({ where: { workerIdentityId: worker.workerIdentityId } });
      await setWorkerRate(job.jobRequestId, 4000);
      const corrected = await app.inject({ method: "POST", url: `/platform/payroll/calculations/${adjustment.id}/correct`, headers: auth(staff.token), payload: { expectedVersion: adjustment.version, reason: "second fix" } });
      expect(corrected.statusCode, corrected.body).toBe(201);
      await approveAndLock(corrected.json().calculation);
      const latest = await prisma.payrollCalculation.findUniqueOrThrow({ where: { id: corrected.json().calculation.id } });

      const { payouts } = await materializeAndListWorkerPayouts(prisma, worker.workerIdentityId, new Date());
      expect(payouts).toHaveLength(3);
      expect(payouts.reduce((sum, p) => sum + p.amountMinor, 0)).toBe(latest.netPayMinor);

      const remittance = await app.inject({ method: "GET", url: `/platform/finance/remittances?payrollPeriodId=${original.payrollPeriodId}`, headers: auth(staff.token) });
      expect(remittance.json().lockedCalculations).toBe(1);
      expect(remittance.json().remittances.grandTotalMinor).toBe(latest.totalDeductionsMinor + latest.totalEmployerCostMinor);
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

    it("the shared jobs calendar lists an open job until its last place is taken, and staff see who took it", async () => {
      const first = await makeWorker("cal-a");
      const second = await makeWorker("cal-b");
      // The calendar lists upcoming shifts, so this one starts later today.
      const { job } = await makeJob({ startAt: new Date(Date.now() + 2 * HOUR), endAt: new Date(Date.now() + 8 * HOUR), openClaim: true });
      const listFor = async (token: string) => {
        const res = await app.inject({ method: "GET", url: "/marketplace/open-jobs", headers: auth(token) });
        expect(res.statusCode, res.body).toBe(200);
        return (res.json().jobs as { jobRequestId: string; placesLeft: number; workerRateMinor: number | null }[]).filter((j) => j.jobRequestId === job.id);
      };
      const before = await listFor(second.token);
      expect(before).toHaveLength(1);
      expect(before[0]?.placesLeft).toBe(1);
      expect(before[0]?.workerRateMinor).toBe(2500); // worker pay only, never the employer rate

      const claimed = await app.inject({ method: "POST", url: `/marketplace/jobs/${job.id}/claim`, headers: auth(first.token) });
      expect(claimed.statusCode, claimed.body).toBe(201);
      expect(await listFor(second.token)).toHaveLength(0); // gone for everyone once full

      const coverage = await app.inject({ method: "GET", url: "/platform/calendar/coverage", headers: auth(staff.token) });
      expect(coverage.statusCode, coverage.body).toBe(200);
      const row = (coverage.json().jobs as { jobRequestId: string; coverage: string; placesLeft: number; workers: { name: string }[] }[]).find(
        (j) => j.jobRequestId === job.id
      );
      expect(row?.coverage).toBe("full");
      expect(row?.placesLeft).toBe(0);
      expect(row?.workers.map((w) => w.name)).toEqual(["Audit Worker"]);

      const denied = await app.inject({ method: "GET", url: "/platform/calendar/coverage", headers: auth(second.token) });
      expect(denied.statusCode).toBe(403);
      const signedOut = await app.inject({ method: "GET", url: "/marketplace/open-jobs" });
      expect(signedOut.statusCode).toBe(401);
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

    it("the site address entered on the job comes before the residence address", async () => {
      const worker = await makeWorker("site");
      const { job, review } = await makeJob({ ...soon(), openClaim: false });
      await prisma.staffingRequestCalendarProfile.create({
        data: { jobRequestId: job.id, organizationId: scope.organizationId, residenceId: scope.residenceId, qualifications: [], addressSummary: "77 Field Road, Rural Site", createdByUserId: staff.id, updatedByUserId: staff.id }
      });
      const offer = await makeAcceptedOffer(worker, job, review.id);
      emails.length = 0;
      const made = await app.inject({
        method: "POST", url: "/platform/assignments", headers: auth(staff.token),
        payload: { workerOfferId: offer.id, dispatchReviewId: review.id, expectedOfferVersion: offer.version }
      });
      expect(made.statusCode, made.body).toBe(201);
      expect(emails.find((m) => m.to === worker.email)?.text).toContain("77 Field Road, Rural Site");
      const schedule = await app.inject({ method: "GET", url: "/worker/attendance", headers: auth(worker.token) });
      expect(schedule.json().items[0].worksiteAddress).toBe("77 Field Road, Rural Site");
    });

    it("a worker whose claimed shift staff cancel is told by email and text, and no one else is", async () => {
      const worker = await makeWorker("cancelled");
      const phone = `+1514${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}`;
      await prisma.user.update({ where: { id: worker.id }, data: { phone } });
      const bystander = await makeWorker("bystander");
      const { job } = await makeJob({ startAt: new Date(Date.now() + 3 * HOUR), endAt: new Date(Date.now() + 9 * HOUR), openClaim: true });
      const claimed = await app.inject({ method: "POST", url: `/marketplace/jobs/${job.id}/claim`, headers: auth(worker.token) });
      expect(claimed.statusCode, claimed.body).toBe(201);
      // A claimed shift goes straight onto the schedule, so staff cancel it through its attendance record.
      const record = await prisma.attendanceRecord.findUniqueOrThrow({ where: { assignmentId: claimed.json().assignmentId } });

      emails.length = 0;
      texts.length = 0;
      const cancelled = await app.inject({
        method: "POST", url: `/platform/attendance/${record.id}/cancel`, headers: auth(staff.token),
        payload: { expectedVersion: record.version, reason: "staff_cancelled" }
      });
      expect(cancelled.statusCode, cancelled.body).toBe(200);
      expect(cancelled.json().attendanceRecord.status).toBe("cancelled");

      const notices = emails.filter((m) => /cancelled|annulé/.test(m.subject));
      expect(notices.map((m) => m.to)).toEqual([worker.email]);
      expect(notices[0]?.text).toMatch(/calendar|calendrier/);
      expect(notices[0]?.text).toMatch(/Laval/);
      expect(notices[0]?.text).not.toMatch(/owed|dues/); // a staff cancel computes no late-cancellation pay
      expect(emails.some((m) => m.to === bystander.email)).toBe(false);
      expect(texts.map((t) => t.to)).toEqual([phone]);
      expect(texts[0]?.text).toMatch(/cancelled|annulé/);

      // A second cancel is refused and tells no one again.
      emails.length = 0;
      texts.length = 0;
      const again = await app.inject({
        method: "POST", url: `/platform/attendance/${record.id}/cancel`, headers: auth(staff.token),
        payload: { expectedVersion: record.version + 1, reason: "staff_cancelled" }
      });
      expect(again.statusCode).not.toBe(200);
      expect(emails).toHaveLength(0);
      expect(texts).toHaveLength(0);
    });

    it("an address is never shown before assignment", async () => {
      const { job } = await makeJob({ ...soon(), openClaim: true });
      const worker = await makeWorker("preview");
      const detail = await app.inject({ method: "GET", url: `/marketplace/jobs/${job.id}`, headers: auth(worker.token) });
      expect(detail.body).not.toContain(STREET);
    });
  });

  describe("public job page and overlapping shifts", () => {
    it("a visitor sees a public job's role, city, times and the worker's own pay, never the address or other rates", async () => {
      const { job } = await makeJob({ startAt: new Date(Date.now() + 30 * HOUR), endAt: new Date(Date.now() + 38 * HOUR), openClaim: true });
      const res = await app.inject({ method: "GET", url: `/public/jobs/${job.jobRequestNumber}` });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().job).toMatchObject({
        jobCode: job.jobRequestNumber,
        city: "Laval",
        province: "QC",
        areaLabel: "Laval, QC",
        startAt: job.startAt.toISOString(),
        endAt: job.endAt.toISOString(),
        openings: 1,
        workerRateMinor: 2500
      });
      for (const hidden of [STREET, "Door B", "H7A", "AuditCare", "employerHourlyRate", "platformHourlyMargin", "marginPpm", job.id]) {
        expect(res.body).not.toContain(hidden);
      }
      expect((await app.inject({ method: "GET", url: "/public/jobs/JR-0000-000000" })).statusCode).toBe(404);
      expect((await app.inject({ method: "GET", url: "/public/jobs/..%2F..%2Fetc" })).statusCode).toBe(404);

      // After signing up, the worker is taken from the public code to the real job page.
      const worker = await makeWorker("public-job");
      const resolved = await app.inject({ method: "GET", url: `/marketplace/job-codes/${job.jobRequestNumber}`, headers: auth(worker.token) });
      expect(resolved.statusCode, resolved.body).toBe(200);
      expect(resolved.json()).toEqual({ jobRequestId: job.id });
      expect((await app.inject({ method: "GET", url: `/marketplace/job-codes/${job.jobRequestNumber}` })).statusCode).toBe(401);
    });

    it("the public jobs calendar lists open jobs with the worker's pay only, never the address, employer or other rates", async () => {
      // Seeded to meet openJobWhere: approved, open on the calendar, priced, upcoming, active site.
      const { job } = await makeJob({ startAt: new Date(Date.now() + 50 * HOUR), endAt: new Date(Date.now() + 58 * HOUR), openClaim: true });
      // Not open (openClaim off) and unpriced jobs never show.
      const { job: closed } = await makeJob({ startAt: new Date(Date.now() + 51 * HOUR), endAt: new Date(Date.now() + 59 * HOUR), openClaim: false });
      const { job: unpriced } = await makeJob({ startAt: new Date(Date.now() + 52 * HOUR), endAt: new Date(Date.now() + 60 * HOUR), openClaim: true, priced: false });
      const from = new Date(Date.now()).toISOString();
      const to = new Date(Date.now() + 10 * 24 * HOUR).toISOString();
      const res = await app.inject({ method: "GET", url: `/public/jobs/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` });
      expect(res.statusCode, res.body).toBe(200);
      const jobs = res.json().jobs as Record<string, unknown>[];
      const mine = jobs.find((j) => j.jobCode === job.jobRequestNumber);
      expect(mine).toMatchObject({
        jobCode: job.jobRequestNumber,
        role: expect.any(String),
        city: "Laval",
        province: "QC",
        areaLabel: "Laval, QC",
        startAt: job.startAt.toISOString(),
        endAt: job.endAt.toISOString(),
        timezone: "America/Toronto",
        placesLeft: 1,
        workerRateMinor: 2500
      });
      // Only the public calendar fields, nothing else.
      for (const key of Object.keys(mine ?? {})) expect(PUBLIC_CALENDAR_JOB_FIELDS as readonly string[]).toContain(key);
      expect(jobs.some((j) => j.jobCode === closed.jobRequestNumber)).toBe(false);
      expect(jobs.some((j) => j.jobCode === unpriced.jobRequestNumber)).toBe(false);
      for (const hidden of [STREET, "Door B", "H7A", "AuditCare", "employerHourlyRate", "platformHourlyMargin", "marginPpm", job.id]) {
        expect(res.body).not.toContain(hidden);
      }

      // A full job drops off the calendar.
      const worker = await makeWorker("public-calendar");
      const claimed = await app.inject({ method: "POST", url: `/marketplace/jobs/${job.id}/claim`, headers: auth(worker.token) });
      expect(claimed.statusCode, claimed.body).toBe(201);
      const after = await app.inject({ method: "GET", url: `/public/jobs/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` });
      expect((after.json().jobs as Record<string, unknown>[]).some((j) => j.jobCode === job.jobRequestNumber)).toBe(false);
    });

    it("a worker cannot claim two shifts at the same time, but can take back-to-back shifts", async () => {
      const worker = await makeWorker("overlap");
      const base = Date.now() + 50 * HOUR;
      const day = await makeJob({ startAt: new Date(base), endAt: new Date(base + 8 * HOUR), openClaim: true });
      const overlapping = await makeJob({ startAt: new Date(base + 4 * HOUR), endAt: new Date(base + 10 * HOUR), openClaim: true });
      const evening = await makeJob({ startAt: new Date(base + 8 * HOUR), endAt: new Date(base + 12 * HOUR), openClaim: true });
      const claim = (jobId: string, language = "en") =>
        app.inject({ method: "POST", url: `/marketplace/jobs/${jobId}/claim`, headers: { ...auth(worker.token), "accept-language": language } });

      expect((await claim(day.job.id)).statusCode).toBe(201);
      const refused = await claim(overlapping.job.id, "fr-CA");
      expect(refused.statusCode, refused.body).toBe(409);
      expect(refused.json()).toMatchObject({
        error: "RWOS_SHIFT_OVERLAP",
        status: "shift_overlap",
        message: expect.stringMatching(/^Vous avez déjà un quart de travail à cette heure-là \(/),
        messages: { en: expect.stringMatching(/^You already have a shift at that time \(/), ar: expect.any(String) },
        heldShift: { startAt: day.job.startAt.toISOString(), endAt: day.job.endAt.toISOString(), timezone: "America/Toronto" }
      });
      expect((await claim(evening.job.id)).statusCode).toBe(201);
    });

    it("staff cannot assign a worker to a shift that overlaps one they already hold", async () => {
      const worker = await makeWorker("overlap-staff");
      const base = Date.now() + 80 * HOUR;
      const held = await makeJob({ startAt: new Date(base), endAt: new Date(base + 8 * HOUR), openClaim: true });
      expect((await app.inject({ method: "POST", url: `/marketplace/jobs/${held.job.id}/claim`, headers: auth(worker.token) })).statusCode).toBe(201);

      const { job, review } = await makeJob({ startAt: new Date(base + 2 * HOUR), endAt: new Date(base + 6 * HOUR), openClaim: false });
      const offer = await makeAcceptedOffer(worker, job, review.id);
      const res = await app.inject({
        method: "POST", url: "/platform/assignments", headers: auth(staff.token),
        payload: { workerOfferId: offer.id, dispatchReviewId: review.id, expectedOfferVersion: offer.version }
      });
      expect(res.statusCode, res.body).toBe(409);
      expect(res.json()).toMatchObject({ error: "RWOS_SHIFT_OVERLAP", heldShift: { startAt: held.job.startAt.toISOString() } });
      expect(await prisma.assignment.count({ where: { jobRequestId: job.id } })).toBe(0);
    });
  });

  describe("job bonus", () => {
    async function makeEmployer() {
      const user = await register("fa-employer");
      employerIds.add(user.id);
      const membership = await prisma.organizationMembership.create({ data: { organizationId: scope.organizationId, userId: user.id, status: "active", acceptedAt: new Date() } });
      const owner = await prisma.accessRoleDefinition.findUniqueOrThrow({ where: { key: "ORGANIZATION_OWNER" } });
      await prisma.membershipAccessRole.create({ data: { membershipId: membership.id, accessRoleDefinitionId: owner.id } });
      createdMembershipIds.push(membership.id);
      return user;
    }
    const openJobBonus = async (token: string, jobRequestId: string) => {
      const res = await app.inject({ method: "GET", url: "/marketplace/open-jobs", headers: auth(token) });
      expect(res.statusCode, res.body).toBe(200);
      return (res.json().jobs as { jobRequestId: string; bonus: Record<string, unknown> | null }[]).find((j) => j.jobRequestId === jobRequestId)?.bonus;
    };

    it("staff offer → employer accepts → workers see it; platform cap, urgent override and cancel are governed", async () => {
      const employer = await makeEmployer();
      const worker = await makeWorker("bonus-w");
      // 6-hour shift starting in 2 hours: worker $25/h, platform share $5/h ($30 per shift).
      const { job } = await makeJob({ startAt: new Date(Date.now() + 2 * HOUR), endAt: new Date(Date.now() + 8 * HOUR), openClaim: true });
      const base = `/platform/job-requests/${job.id}`;

      const suggested = await app.inject({ method: "GET", url: `${base}/bonus-suggestion`, headers: auth(staff.token) });
      expect(suggested.statusCode, suggested.body).toBe(200);
      // Within 12 hours → 15% of $25.00 = $3.75; one-time equivalent $3.75 x 6 h.
      expect(suggested.json().suggestion).toMatchObject({ kind: "hourly", amountMinor: 375, oneTimeEquivalentMinor: 2250, platformCapHourlyMinor: 500, platformCapShiftMinor: 3000 });

      // Only staff may create bonuses; amounts are validated.
      expect((await app.inject({ method: "POST", url: `${base}/bonuses`, headers: auth(employer.token), payload: { kind: "hourly", amountMinor: 375, fundedBy: "employer" } })).statusCode).toBe(403);
      expect((await app.inject({ method: "POST", url: `${base}/bonuses`, headers: auth(staff.token), payload: { kind: "hourly", amountMinor: 10, fundedBy: "employer" } })).statusCode).toBe(400);

      emails.length = 0;
      const offered = await app.inject({ method: "POST", url: `${base}/bonuses`, headers: auth(staff.token), payload: { kind: "hourly", amountMinor: 375, fundedBy: "employer", reason: "Short notice" } });
      expect(offered.statusCode, offered.body).toBe(201);
      const offer = offered.json().bonus as { id: string; status: string; suggestedBySystem: boolean };
      expect(offer.status).toBe("offered_to_employer");
      expect(offer.suggestedBySystem).toBe(true);
      expect(emails.some((m) => /prime|bonus/i.test(m.subject))).toBe(true);
      expect(await openJobBonus(worker.token, job.id)).toBeNull(); // not active until accepted

      const pending = await app.inject({ method: "GET", url: `/employer/job-requests/${job.id}/bonus-offer`, headers: auth(employer.token) });
      expect(pending.statusCode, pending.body).toBe(200);
      expect(pending.json().offer).toMatchObject({ bonusId: offer.id, kind: "hourly", amountMinor: 375, currency: "CAD", reason: "Short notice" });
      // Someone outside the company sees nothing and cannot answer.
      expect((await app.inject({ method: "GET", url: `/employer/job-requests/${job.id}/bonus-offer`, headers: auth(worker.token) })).statusCode).toBe(404);
      expect((await app.inject({ method: "POST", url: `/employer/bonuses/${offer.id}/accept`, headers: auth(worker.token) })).statusCode).toBe(404);

      const accepted = await app.inject({ method: "POST", url: `/employer/bonuses/${offer.id}/accept`, headers: auth(employer.token) });
      expect(accepted.statusCode, accepted.body).toBe(200);
      expect(accepted.json().bonus.status).toBe("employer_accepted");
      expect((await app.inject({ method: "POST", url: `/employer/bonuses/${offer.id}/decline`, headers: auth(employer.token) })).statusCode).toBe(409);
      // Workers see kind + amount only, never who pays.
      expect(await openJobBonus(worker.token, job.id)).toEqual({ kind: "hourly", amountMinor: 375 });

      // One active bonus per job.
      const second = await app.inject({ method: "POST", url: `${base}/bonuses`, headers: auth(staff.token), payload: { kind: "hourly", amountMinor: 100, fundedBy: "platform" } });
      expect(second.statusCode, second.body).toBe(409);
      expect(second.json().error).toBe("RWOS_BONUS_ACTIVE_EXISTS");

      const cancelled = await app.inject({ method: "POST", url: `/platform/bonuses/${offer.id}/cancel`, headers: auth(staff.token) });
      expect(cancelled.statusCode, cancelled.body).toBe(200);
      expect(cancelled.json().bonus.status).toBe("cancelled");
      expect(await openJobBonus(worker.token, job.id)).toBeNull();
      expect((await app.inject({ method: "POST", url: `/platform/bonuses/${offer.id}/cancel`, headers: auth(staff.token) })).statusCode).toBe(409);

      // Platform-funded: over Joblop's $5/h share is refused, unless staff record an urgent override.
      const over = await app.inject({ method: "POST", url: `${base}/bonuses`, headers: auth(staff.token), payload: { kind: "hourly", amountMinor: 600, fundedBy: "platform" } });
      expect(over.statusCode, over.body).toBe(422);
      expect(over.json().error).toBe("RWOS_BONUS_OVER_PLATFORM_SHARE");
      const urgent = await app.inject({ method: "POST", url: `${base}/bonuses`, headers: auth(staff.token), payload: { kind: "hourly", amountMinor: 600, fundedBy: "platform", urgentOverride: true } });
      expect(urgent.statusCode, urgent.body).toBe(201);
      expect(urgent.json().bonus).toMatchObject({ status: "approved", fundedBy: "platform", urgentOverride: true });
      expect(await openJobBonus(worker.token, job.id)).toEqual({ kind: "hourly", amountMinor: 600 });

      const coverage = await app.inject({ method: "GET", url: "/platform/calendar/coverage", headers: auth(staff.token) });
      expect(coverage.statusCode, coverage.body).toBe(200);
      const row = (coverage.json().jobs as { jobRequestId: string; bonus: unknown; bonusSuggestion: unknown }[]).find((j) => j.jobRequestId === job.id);
      expect(row?.bonus).toEqual({ id: urgent.json().bonus.id, kind: "hourly", amountMinor: 600, fundedBy: "platform", status: "approved" });
      expect(row?.bonusSuggestion).toMatchObject({ kind: "hourly", amountMinor: 375 });

      const listed = await app.inject({ method: "GET", url: `${base}/bonuses`, headers: auth(staff.token) });
      expect(listed.statusCode, listed.body).toBe(200);
      expect((listed.json().bonuses as { status: string }[]).map((b) => b.status).sort()).toEqual(["approved", "cancelled"]);

      const trail = await prisma.auditEvent.findMany({ where: { entityType: "job_bonus", entityPublicReference: job.id }, include: { actorReference: true }, orderBy: { createdAt: "asc" } });
      expect(trail.map((e) => e.action)).toEqual(["bonus.offered", "bonus.employer_accepted", "bonus.cancelled", "bonus.approved"]);
      expect(trail.find((e) => e.action === "bonus.employer_accepted")?.actorReference.userId).toBe(employer.id);
      expect(trail.find((e) => e.action === "bonus.approved")?.actorReference.userId).toBe(staff.id);
    });

    it("an employer can decline an offer, and it never becomes active", async () => {
      const employer = await makeEmployer();
      const { job } = await makeJob({ startAt: new Date(Date.now() + 30 * HOUR), endAt: new Date(Date.now() + 38 * HOUR), openClaim: true });
      const offered = await app.inject({ method: "POST", url: `/platform/job-requests/${job.id}/bonuses`, headers: auth(staff.token), payload: { kind: "transport", amountMinor: 1500, fundedBy: "employer" } });
      expect(offered.statusCode, offered.body).toBe(201);
      const declined = await app.inject({ method: "POST", url: `/employer/bonuses/${offered.json().bonus.id}/decline`, headers: auth(employer.token) });
      expect(declined.statusCode, declined.body).toBe(200);
      expect(declined.json().bonus.status).toBe("employer_declined");
      const pending = await app.inject({ method: "GET", url: `/employer/job-requests/${job.id}/bonus-offer`, headers: auth(employer.token) });
      expect(pending.json().offer).toBeNull();
      expect(await openJobBonus(employer.token, job.id)).toBeNull();
    });

    it("calendar hub: the worker sees an available job then their shift; staff and the employer see the job", async () => {
      const employer = await makeEmployer();
      const worker = await makeWorker("hub-w");
      const { job } = await makeJob({ startAt: new Date(Date.now() + 3 * HOUR), endAt: new Date(Date.now() + 9 * HOUR), openClaim: true });
      const window = `from=${encodeURIComponent(new Date(Date.now() - HOUR).toISOString())}&to=${encodeURIComponent(new Date(Date.now() + 24 * HOUR).toISOString())}`;
      type Item = { id: string; type: string; status: string | null; subtitle: string | null; amountMinor: number | null; placesLeft: number | null; jobRequestId: string | null; refId: string | null };
      const hub = async (path: string, token: string) => {
        const res = await app.inject({ method: "GET", url: `${path}?${window}`, headers: auth(token) });
        expect(res.statusCode, res.body).toBe(200);
        const body = res.json() as { items: Item[]; today: { type: string; jobRequestId: string | null }[]; from: string; to: string };
        return { ...body, mine: body.items.filter((i) => i.jobRequestId === job.id) };
      };

      const before = await hub("/worker/calendar-hub", worker.token);
      expect(before.mine).toHaveLength(1);
      expect(before.mine[0]).toMatchObject({ type: "available_job", amountMinor: 2500, placesLeft: 1 }); // worker pay only

      const claimed = await app.inject({ method: "POST", url: `/marketplace/jobs/${job.id}/claim`, headers: auth(worker.token) });
      expect(claimed.statusCode, claimed.body).toBe(201);
      const after = await hub("/worker/calendar-hub", worker.token);
      expect(after.mine.map((i) => i.type)).toEqual(["my_shift"]);
      expect(after.mine[0]?.refId).toBe(claimed.json().assignmentId);
      expect(after.today.some((t) => t.type === "my_shift" && t.jobRequestId === job.id)).toBe(true);

      const staffView = await hub("/platform/calendar-hub", staff.token);
      const staffJob = staffView.mine.find((i) => i.type === "job");
      expect(staffJob).toMatchObject({ status: "full", placesLeft: 0 });
      expect(staffJob?.subtitle).toContain("AuditCare");
      expect(staffJob?.subtitle).toContain("Audit Worker");

      const employerView = await hub("/employer/calendar-hub", employer.token);
      const employerJob = employerView.mine.find((i) => i.type === "job");
      expect(employerJob).toMatchObject({ status: "full", subtitle: "Audit" }); // first name only
      expect(employerJob?.amountMinor).not.toBe(2500); // never worker pay

      for (const path of ["/worker/calendar-hub", "/employer/calendar-hub", "/platform/calendar-hub"]) {
        expect((await app.inject({ method: "GET", url: path })).statusCode).toBe(401);
      }
      expect((await app.inject({ method: "GET", url: "/platform/calendar-hub", headers: auth(worker.token) })).statusCode).toBe(403);
      expect((await app.inject({ method: "GET", url: "/employer/calendar-hub", headers: auth(worker.token) })).statusCode).toBe(403);
    });
  });
  describe("job alerts and push notifications", () => {
    const sweep = (token: string = SWEEP_TOKEN) =>
      app.inject({ method: "POST", url: "/internal/job-alerts/sweep", headers: { "x-sweep-token": token } });

    it("a worker's alert: subscribe → staff-approved open job → one digest with the job and an unsubscribe link → nothing more", async () => {
      expect((await sweep("wrong-token-wrong-token")).statusCode).toBe(401);
      expect((await app.inject({ method: "GET", url: "/worker/job-alerts" })).statusCode).toBe(401);

      const worker = await makeWorker("alert");
      createdAlertEmails.push(worker.email, "someone-else@fa.test");
      const keyword = `zq${randomUUID().replace(/-/g, "").slice(0, 10)}`;
      // The email always comes from the account; one in the body is ignored.
      const subscribed = await app.inject({
        method: "POST", url: "/worker/job-alerts", headers: auth(worker.token),
        payload: { roleKeywords: keyword, province: "qc", email: "someone-else@fa.test" }
      });
      expect(subscribed.statusCode, subscribed.body).toBe(200);
      expect(subscribed.json()).toEqual({ subscription: { roleKeywords: keyword, province: "QC", active: true } });
      expect(await prisma.jobAlertSubscription.count({ where: { email: "someone-else@fa.test" } })).toBe(0);
      const row = await prisma.jobAlertSubscription.findUniqueOrThrow({ where: { email: worker.email } });
      expect(row.userId).toBe(worker.id);
      expect(row.unsubscribeToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const read = await app.inject({ method: "GET", url: "/worker/job-alerts", headers: auth(worker.token) });
      expect(read.json()).toEqual({ subscription: { roleKeywords: keyword, province: "QC", active: true } });

      // A staff-approved job, open to claim, with places left, whose title carries the keyword.
      const { job } = await makeJob({ startAt: new Date(Date.now() + 30 * HOUR), endAt: new Date(Date.now() + 38 * HOUR), openClaim: true });
      await prisma.jobRequest.update({ where: { id: job.id }, data: { title: `${keyword} night shift` } });

      emails.length = 0;
      const first = await sweep();
      expect(first.statusCode, first.body).toBe(200);
      expect(first.json().sent).toBeGreaterThanOrEqual(1);
      const digests = emails.filter((m) => m.to === worker.email);
      expect(digests).toHaveLength(1);
      expect(digests[0]?.subject).toMatch(/1 (nouvel emploi|new job)/);
      expect(digests[0]?.text).toContain("Laval, QC");
      expect(digests[0]?.text).toContain(`${WORKER_ORIGIN}/jobs-calendar`);
      expect(digests[0]?.text).toContain(`${WORKER_ORIGIN}/job-alerts/unsubscribe?token=${row.unsubscribeToken}`);
      expect(digests[0]?.text).toMatch(/Envoyé par Joblop|Sent by Joblop/);

      // Within 20 hours: nothing.
      emails.length = 0;
      expect((await sweep()).statusCode).toBe(200);
      expect(emails.filter((m) => m.to === worker.email)).toHaveLength(0);

      // Unsubscribe (idempotent), then even a due row with a fresh job gets nothing.
      expect((await app.inject({ method: "GET", url: "/public/job-alerts/unsubscribe?token=bad" })).statusCode).toBe(400);
      for (let i = 0; i < 2; i += 1) {
        const out = await app.inject({ method: "GET", url: `/public/job-alerts/unsubscribe?token=${row.unsubscribeToken}` });
        expect(out.statusCode, out.body).toBe(200);
        expect(out.json()).toEqual({ ok: true });
      }
      await prisma.jobAlertSubscription.update({ where: { id: row.id }, data: { lastSentAt: new Date(Date.now() - 21 * HOUR) } });
      await prisma.jobRequest.update({ where: { id: job.id }, data: { title: `${keyword} day shift` } });
      emails.length = 0;
      expect((await sweep()).statusCode).toBe(200);
      expect(emails.filter((m) => m.to === worker.email)).toHaveLength(0);
      const after = await app.inject({ method: "GET", url: "/worker/job-alerts", headers: auth(worker.token) });
      expect(after.json().subscription.active).toBe(false);

      // Turning it back on, then off from the account.
      expect((await app.inject({ method: "POST", url: "/worker/job-alerts", headers: auth(worker.token), payload: { roleKeywords: keyword } })).json().subscription.active).toBe(true);
      expect((await app.inject({ method: "DELETE", url: "/worker/job-alerts", headers: auth(worker.token) })).json()).toEqual({ ok: true });
      expect((await prisma.jobAlertSubscription.findUniqueOrThrow({ where: { id: row.id } })).unsubscribedAt).not.toBeNull();
    });

    it("a public sign-up gets one confirmation with who we are and an unsubscribe link", async () => {
      const email = `alert-public-${randomUUID()}@fa.test`;
      createdAlertEmails.push(email);
      emails.length = 0;
      const signUp = () => app.inject({ method: "POST", url: "/public/jobscanner/alerts", payload: { email, roleKeywords: "cuisinier", locale: "en" } });
      expect((await signUp()).statusCode).toBe(200);
      const row = await prisma.jobAlertSubscription.findUniqueOrThrow({ where: { email } });
      const confirmations = emails.filter((m) => m.to === email);
      expect(confirmations).toHaveLength(1);
      expect(confirmations[0]?.text).toContain("Sent by Joblop");
      expect(confirmations[0]?.text).toContain(`${WORKER_ORIGIN}/job-alerts/unsubscribe?token=${row.unsubscribeToken}`);
      // Re-submitting only refreshes the alert; no second email.
      expect((await signUp()).statusCode).toBe(200);
      expect(emails.filter((m) => m.to === email)).toHaveLength(1);
    });

    it("push tokens: register, validate, move between accounts, delete; a confirmed shift pushes to the worker", async () => {
      const worker = await makeWorker("push");
      const other = await makeWorker("push-other");
      const token = `ExponentPushToken[fa${randomUUID().replace(/-/g, "").slice(0, 20)}]`;
      createdPushTokens.push(token);
      const register = (t: string, body: Record<string, unknown>) => app.inject({ method: "POST", url: "/worker/push-tokens", headers: auth(t), payload: body });

      expect((await app.inject({ method: "POST", url: "/worker/push-tokens", payload: { token, platform: "ios" } })).statusCode).toBe(401);
      expect((await register(worker.token, { token: "not-a-token", platform: "ios" })).statusCode).toBe(400);
      expect((await register(worker.token, { token, platform: "blackberry" })).statusCode).toBe(400);
      const ok = await register(worker.token, { token, platform: "ios" });
      expect(ok.statusCode, ok.body).toBe(200);
      expect(ok.json()).toEqual({ ok: true });
      expect((await register(worker.token, { token, platform: "ios" })).statusCode).toBe(200); // upsert
      expect(await prisma.pushToken.count({ where: { token } })).toBe(1);

      // A confirmed shift sends "You got the job" to the worker's phone, opening the calendar.
      const { job, review } = await makeJob({ ...soon(), openClaim: false });
      const offer = await makeAcceptedOffer(worker, job, review.id);
      pushes.length = 0;
      const assigned = await app.inject({
        method: "POST", url: "/platform/assignments", headers: auth(staff.token),
        payload: { workerOfferId: offer.id, dispatchReviewId: review.id, expectedOfferVersion: offer.version }
      });
      expect(assigned.statusCode, assigned.body).toBe(201);
      const pushed = pushes.filter((p) => p.to === token);
      expect(pushed).toHaveLength(1);
      expect(pushed[0]?.title).toMatch(/obtenu le travail|got the job/);
      expect(pushed[0]?.data).toMatchObject({ screen: "calendar", jobRequestId: job.id });

      // Someone else cannot remove it; the same phone signing in to another account moves it there.
      expect((await app.inject({ method: "DELETE", url: "/worker/push-tokens", headers: auth(other.token), payload: { token } })).statusCode).toBe(200);
      expect((await prisma.pushToken.findUniqueOrThrow({ where: { token } })).revokedAt).toBeNull();
      expect((await register(other.token, { token, platform: "android" })).statusCode).toBe(200);
      expect(await prisma.pushToken.findUniqueOrThrow({ where: { token } })).toMatchObject({ userId: other.id, platform: "android", revokedAt: null });
      const removed = await app.inject({ method: "DELETE", url: "/worker/push-tokens", headers: auth(other.token), payload: { token } });
      expect(removed.statusCode, removed.body).toBe(200);
      expect((await prisma.pushToken.findUniqueOrThrow({ where: { token } })).revokedAt).not.toBeNull();
    });
  });
});
