import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { canadaAddressAdapter } from "@rwos/country-canada";
import { createPrismaClient } from "@rwos/database";
import { buildApi, remainingOpenings } from "../../apps/api/src/app";
import { createMemoryBrainStore } from "@rwos/brain";
import { createJoblopBrain } from "../../apps/api/src/brain/joblopBrain";
import { createPrismaJoblopBrainData } from "../../apps/api/src/brain/joblopData";
import { createJoblopBrainEffects } from "../../apps/api/src/brain/joblopEffects";
import {
  hoursNotPreparedRule,
  jobUnfilledSoonRule,
  requestWaitingReviewRule,
  timesheetReadyForApproval,
  timesheetReadyRule,
  timesheetUnconfirmedRule,
  workerNotCheckedInRule,
  type JoblopBrainContext
} from "../../apps/api/src/brain/joblopRules";
import type { EmailMessage, EmailSender } from "../../apps/api/src/mailer/emailSender";
import type { SmsMessage, SmsSender } from "../../apps/api/src/mailer/smsSender";
import { executeTestWorkerPayout } from "../../apps/api/src/workerPayoutExecution";
import { materializeAndListWorkerPayouts } from "../../apps/api/src/workerPayoutRepository";

// Real-life scenarios on a SAFE COPY: one Laval farm employer, Farm worker at the legal rate (employer
// $20.75/h, worker $16.60/h after Joblop's 20% share), driven through the real API routes, services
// and Brain rules against a real schema. The clock is controlled: only `Date` is faked (timers stay
// real so Prisma and Fastify work), so every "now" in the API — check-in time, check-in window,
// cancellation cut-offs, Brain thresholds — follows the scenario. Shifts are in February 2027 (EST,
// UTC-5) so they never meet the real-time jobs other suites create. TEST/SYNTHETIC: no money moves,
// mail and texts are captured. Gated on RWOS_TEST_DATABASE_URL like every postgres-* suite.
//
// Where behaviour looks wrong for real life, write the CORRECT behaviour and mark it `it.fails(...)`
// with a "BUG:" comment until the fix lands. The cancellation bugs found here were fixed by the one
// cancel-a-booked-shift path (fix/cancel-booked-shift), so their tests now pass as plain `it`.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

const HOUR = 3_600_000;
const STREET = "3200 Rang Saint-Elzéar";
// The legal Farm worker rate (Québec minimum wage $16.60 from 2026-05-01).
const EMPLOYER_RATE = 2075;
const WORKER_RATE = 1660;
const PLATFORM_SHARE = 415;

/** A Toronto (EST, UTC-5 in February) wall-clock time on a day, as an instant. */
const et = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00.000-05:00`);
const setNow = (instant: Date) => vi.setSystemTime(instant);

/** Every number anywhere in a JSON value (to prove a rate never reaches the wrong party). */
function numbersIn(value: unknown, out: number[] = []): number[] {
  if (typeof value === "number") out.push(value);
  else if (Array.isArray(value)) for (const item of value) numbersIn(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) numbersIn(item, out);
  return out;
}
/** Every object key anywhere in a JSON value. */
function keysIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const item of value) keysIn(item, out);
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      out.push(key);
      keysIn(item, out);
    }
  }
  return out;
}
const EMPLOYER_SIDE_KEYS = /employerHourly|employerRate|platformHourly|platformMargin|marginPpm|platformShare|fundedBy/i;
const WORKER_PAY_KEYS = /workerHourly|workerRate|workerPay|netPay|grossPay|workerReceives|workerCompensation/i;

suite("real-life scenarios (Laval Farm worker, legal rate, controlled clock)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  const emails: EmailMessage[] = [];
  const emailSender: EmailSender = {
    configured: true,
    send: async (message) => {
      emails.push(message);
      return { status: "sent" } as Awaited<ReturnType<EmailSender["send"]>>;
    }
  };
  const texts: SmsMessage[] = [];
  const smsSender: SmsSender = {
    configured: true,
    enabled: true,
    send: async (message) => {
      texts.push(message);
      return { status: "sent", id: `sms-${texts.length}` };
    }
  };

  let app: FastifyInstance;
  const staffIds = new Set<string>();
  const employerIds = new Set<string>();
  const createdMembershipIds: string[] = [];
  // A signed-in person. Sessions last 8 hours, and the scenarios move the clock by days, so a token
  // older than 7 hours (on the scenario clock) is replaced by signing in again.
  type Actor = { id: string; email: string; token: string; issuedAt: number };
  const PASSWORD = "Sup3r-Secret-Pass!";
  let staff: Actor;
  let employer: Actor;
  let scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };
  const savedPayoutFlag = process.env.PAYOUT_TEST_MODE_ENABLED;
  async function h(actor: Actor) {
    if (Date.now() - actor.issuedAt > 7 * HOUR) {
      const res = await app.inject({ method: "POST", url: "/auth/sign-in", payload: { email: actor.email, password: PASSWORD } });
      expect(res.statusCode, res.body).toBe(200);
      actor.token = (res.json() as { token: string }).token;
      actor.issuedAt = Date.now();
    }
    return { authorization: `Bearer ${actor.token}` };
  }

  // The Brain exactly as the sweep builds it: real data adapter, real effects (texts captured).
  const brain = (): JoblopBrainContext => ({
    data: createPrismaJoblopBrainData(prisma, (jobs) => remainingOpenings(prisma, jobs)),
    effects: createJoblopBrainEffects({
      prisma,
      emailSender,
      smsSender,
      rawEmailSender: emailSender,
      rawSmsSender: smsSender,
      actorUserId: staff.id,
      domain: null,
      now: () => new Date()
    })
  });

  async function register(prefix: string): Promise<Actor> {
    const email = `${prefix}-${randomUUID()}@real-life.test`;
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: PASSWORD, displayName: "Real Life" } });
    expect(res.statusCode, res.body).toBe(201);
    const body = res.json() as { token: string; user: { id: string } };
    return { token: body.token, id: body.user.id, email, issuedAt: Date.now() };
  }

  async function makeWorker(prefix = "w") {
    const user = await register(prefix);
    const identity = await prisma.workerIdentity.create({ data: { userId: user.id, displayName: "Laval Worker", status: "active" } });
    await prisma.workerClassificationElection.create({
      data: { workerIdentityId: identity.id, classification: "employee", status: "active", effectiveFrom: new Date(Date.now() - 24 * HOUR), electedByUserId: user.id }
    });
    return { ...user, workerIdentityId: identity.id };
  }

  /** The real employer → staff path: draft, submit, admin review, approve onto the job board. */
  async function publishJob(input: { startAt: Date; endAt: Date; workers?: number; title?: string }) {
    const created = await app.inject({
      method: "POST", url: `/organizations/${scope.organizationId}/job-requests`, headers: await h(employer),
      payload: {
        residenceId: scope.residenceId, departmentId: scope.departmentId, workGroup: "farming-agriculture", roleDefinition: "farm_worker",
        title: input.title ?? "Farm worker, Laval", description: "Harvest and pack vegetables in the greenhouse.",
        numberOfWorkers: input.workers ?? 1, urgency: "normal", requestType: "single_day", timezone: "America/Toronto",
        startAt: input.startAt.toISOString(), endAt: input.endAt.toISOString()
      }
    });
    expect(created.statusCode, created.body).toBe(201);
    const draft = created.json().jobRequest as { id: string; versionToken: number; jobRequestNumber: string };
    const submitted = await app.inject({
      method: "POST", url: `/organizations/${scope.organizationId}/job-requests/${draft.id}/submit`, headers: await h(employer),
      payload: { expectedVersion: draft.versionToken }
    });
    expect(submitted.statusCode, submitted.body).toBe(200);
    const reviewed = await app.inject({
      method: "POST", url: `/platform/job-requests/intake/${draft.id}/admin-review`, headers: await h(staff),
      payload: { expectedVersion: submitted.json().jobRequest.versionToken }
    });
    expect(reviewed.statusCode, reviewed.body).toBe(200);
    const approved = await app.inject({
      method: "POST", url: `/platform/job-requests/intake/${draft.id}/approve-for-dispatch`, headers: await h(staff),
      payload: { expectedVersion: reviewed.json().jobRequest.versionToken, openClaim: true }
    });
    expect(approved.statusCode, approved.body).toBe(200);
    expect(approved.json().openClaim.openClaim).toBe(true);
    return { id: draft.id, jobRequestNumber: draft.jobRequestNumber };
  }

  async function claim(worker: Actor, jobId: string) {
    const res = await app.inject({ method: "POST", url: `/marketplace/jobs/${jobId}/claim`, headers: await h(worker) });
    expect(res.statusCode, res.body).toBe(201);
    return res.json().assignmentId as string;
  }

  async function scheduleItem(worker: Actor, assignmentId: string) {
    const res = await app.inject({ method: "GET", url: "/worker/attendance", headers: await h(worker) });
    expect(res.statusCode, res.body).toBe(200);
    const item = (res.json().items as { attendanceRecordId: string; assignmentId: string; version: number; status: string }[]).find(
      (i) => i.assignmentId === assignmentId
    );
    expect(item, res.body).toBeDefined();
    return item!;
  }

  /** Check in at `inAt`, check out at `outAt`, through the worker's own routes. */
  async function workShift(worker: Actor, assignmentId: string, inAt: Date, outAt: Date) {
    setNow(inAt);
    const item = await scheduleItem(worker, assignmentId);
    const checkIn = await app.inject({
      method: "POST", url: `/worker/attendance/${item.attendanceRecordId}/check-in`, headers: await h(worker),
      payload: { expectedVersion: item.version }
    });
    expect(checkIn.statusCode, checkIn.body).toBe(200);
    setNow(outAt);
    const checkOut = await app.inject({
      method: "POST", url: `/worker/attendance/${item.attendanceRecordId}/check-out`, headers: await h(worker),
      payload: { expectedVersion: (checkIn.json().attendanceRecord as { version: number }).version }
    });
    expect(checkOut.statusCode, checkOut.body).toBe(200);
    return item.attendanceRecordId;
  }

  type Timesheet = {
    id: string; version: number; status: string; exceptionSummary: string | null; rawElapsedMinutes: number;
    payableMinutes: number; billableMinutes: number; workerReviewStatus: string; employerReviewStatus: string;
  };

  async function prepare(attendanceRecordId: string) {
    const res = await app.inject({ method: "POST", url: "/platform/timesheets/prepare", headers: await h(staff), payload: { attendanceRecordId } });
    expect(res.statusCode, res.body).toBe(200);
    return res.json().timesheet as Timesheet;
  }

  async function workerConfirm(worker: Actor, ts: Timesheet) {
    const res = await app.inject({ method: "POST", url: `/worker/timesheets/${ts.id}/confirm`, headers: await h(worker), payload: { expectedVersion: ts.version } });
    expect(res.statusCode, res.body).toBe(200);
    return res.json().timesheet as Timesheet;
  }

  async function employerConfirm(ts: Timesheet) {
    const res = await app.inject({
      method: "POST", url: `/organizations/${scope.organizationId}/timesheets/${ts.id}/confirm`, headers: await h(employer),
      payload: { expectedVersion: ts.version }
    });
    expect(res.statusCode, res.body).toBe(200);
    return res.json().timesheet as Timesheet;
  }

  async function overrideExceptions(ts: Timesheet) {
    const res = await app.inject({
      method: "POST", url: `/platform/timesheets/${ts.id}/override-exceptions`, headers: await h(staff),
      payload: { expectedVersion: ts.version, reason: "Checked with the farm manager." }
    });
    expect(res.statusCode, res.body).toBe(200);
    return res.json().timesheet as Timesheet;
  }

  async function approveAndLock(ts: Timesheet) {
    const approved = await app.inject({ method: "POST", url: `/platform/timesheets/${ts.id}/approve`, headers: await h(staff), payload: { expectedVersion: ts.version } });
    expect(approved.statusCode, approved.body).toBe(200);
    const locked = await app.inject({
      method: "POST", url: `/platform/timesheets/${ts.id}/lock`, headers: await h(staff),
      payload: { expectedVersion: (approved.json().timesheet as Timesheet).version }
    });
    expect(locked.statusCode, locked.body).toBe(200);
    return locked.json() as { timesheet: Timesheet; invoice: { ok: boolean; invoiceId?: string; subtotalMinor?: number; taxMinor?: number; totalMinor?: number; reason?: string } };
  }

  /** One pay period for one worker, calculated, approved and locked by staff. */
  async function lockedPayroll(workerIdentityId: string, periodStart: string, periodEnd: string) {
    const period = await app.inject({
      method: "POST", url: "/platform/payroll/periods", headers: await h(staff),
      payload: { organizationId: scope.organizationId, jurisdictionCountry: "CA", jurisdictionRegion: "QC", periodStart, periodEnd, currency: "CAD", timezone: "America/Toronto" }
    });
    expect(period.statusCode, period.body).toBe(201);
    const calculated = await app.inject({
      method: "POST", url: "/platform/payroll/calculations", headers: await h(staff),
      payload: { payrollPeriodId: period.json().period.id, workerIdentityId }
    });
    expect(calculated.statusCode, calculated.body).toBe(201);
    let calc = calculated.json().calculation as { id: string; version: number };
    for (const action of ["approve", "lock"]) {
      const res = await app.inject({
        method: "POST", url: `/platform/payroll/calculations/${calc.id}/transition`, headers: await h(staff),
        payload: { action, expectedVersion: calc.version }
      });
      expect(res.statusCode, res.body).toBe(200);
      calc = res.json().calculation as { id: string; version: number };
    }
    const row = await prisma.payrollCalculation.findUniqueOrThrow({ where: { id: calc.id } });
    const earnings = await prisma.payrollEarningLine.findMany({ where: { payrollCalculationId: calc.id } });
    return { row, earnings };
  }

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    setNow(et("2027-02-01", "09:00"));
    process.env.RWOS_LOCAL_E2E = "enabled";
    delete process.env.PAYOUT_TEST_MODE_ENABLED;
    app = buildApi({
      countryCurrency: "CAD",
      countryTimezone: "America/Toronto",
      countryAddress: canadaAddressAdapter,
      emailSender,
      smsSender,
      env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" },
      resolveAuthorizationRoles: async (userId: string) =>
        staffIds.has(userId) ? ["PLATFORM_ADMINISTRATOR", "PAYROLL_ADMINISTRATOR"] : employerIds.has(userId) ? ["ORGANIZATION_OWNER"] : ["WORKER_ACCESS"]
    });
    await app.ready();

    staff = await register("rl-staff");
    staffIds.add(staff.id);
    const org = await prisma.employerOrganization.create({
      data: { publicId: `ORG-RL-${randomUUID().slice(0, 8)}`, legalName: "Ferme Laval Inc.", displayName: "Ferme Laval", status: "active", createdByUserId: staff.id }
    });
    const residence = await prisma.residence.create({
      data: {
        publicId: `RES-RL-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "Serres", status: "active", createdByUserId: staff.id,
        province: "QC", city: "Laval", postalCode: "H7E 4P2", addressLine1: STREET
      }
    });
    const department = await prisma.department.create({
      data: { publicId: `DEP-RL-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: residence.id, name: "Greenhouse", status: "active", createdByUserId: staff.id }
    });
    // Seeded by migration 20261106000000_worker_job_categories.
    const workGroup = await prisma.workGroup.findUniqueOrThrow({ where: { key: "farming_agriculture" } });
    const role = await prisma.roleDefinition.findUniqueOrThrow({ where: { key: "farm_worker" } });
    scope = { organizationId: org.id, residenceId: residence.id, departmentId: department.id, workGroupId: workGroup.id, roleDefinitionId: role.id };

    employer = await register("rl-employer");
    employerIds.add(employer.id);
    const membership = await prisma.organizationMembership.create({ data: { organizationId: org.id, userId: employer.id, status: "active", acceptedAt: new Date() } });
    const owner = await prisma.accessRoleDefinition.findUniqueOrThrow({ where: { key: "ORGANIZATION_OWNER" } });
    await prisma.membershipAccessRole.create({ data: { membershipId: membership.id, accessRoleDefinitionId: owner.id } });
    createdMembershipIds.push(membership.id);

    // Staff publish the governed rate card: Farm worker at $20.75/h (worker gets $16.60/h).
    const contract = await app.inject({
      method: "POST", url: `/organizations/${org.id}/contract`, headers: await h(staff),
      payload: { version: `farm-${randomUUID().slice(0, 8)}`, currency: "CAD", roleRates: [{ workGroupId: workGroup.id, roleDefinitionId: role.id, hourlyRateMinor: EMPLOYER_RATE }] }
    });
    expect(contract.statusCode, contract.body).toBe(201);
  });

  afterAll(async () => {
    if (createdMembershipIds.length > 0) {
      await prisma.membershipAccessRole.deleteMany({ where: { membershipId: { in: createdMembershipIds } } });
      await prisma.organizationMembership.deleteMany({ where: { id: { in: createdMembershipIds } } });
    }
    if (savedPayoutFlag === undefined) delete process.env.PAYOUT_TEST_MODE_ENABLED;
    else process.env.PAYOUT_TEST_MODE_ENABLED = savedPayoutFlag;
    vi.useRealTimers();
    await app?.close();
    await prisma.$disconnect();
  });

  // ── 1. A normal day ──────────────────────────────────────────────────────────────────────────────
  describe("1. normal day: 08:00–14:00, in 07:55, out 14:05", () => {
    const DAY = "2027-02-10";

    it("goes employer → staff → worker → timesheet → invoice → payroll → payout with the right numbers and no rate leak", async () => {
      // The day before, 09:00: the employer asks for one Farm worker.
      setNow(et("2027-02-09", "09:00"));
      const created = await app.inject({
        method: "POST", url: `/organizations/${scope.organizationId}/job-requests`, headers: await h(employer),
        payload: {
          residenceId: scope.residenceId, departmentId: scope.departmentId, workGroup: "farming-agriculture", roleDefinition: "farm_worker",
          title: "Farm worker, Laval", description: "Harvest and pack vegetables in the greenhouse.", numberOfWorkers: 1, urgency: "normal",
          requestType: "single_day", timezone: "America/Toronto", startAt: et(DAY, "08:00").toISOString(), endAt: et(DAY, "14:00").toISOString()
        }
      });
      expect(created.statusCode, created.body).toBe(201);
      const draft = created.json().jobRequest as { id: string; versionToken: number };
      const submitted = await app.inject({
        method: "POST", url: `/organizations/${scope.organizationId}/job-requests/${draft.id}/submit`, headers: await h(employer),
        payload: { expectedVersion: draft.versionToken }
      });
      expect(submitted.statusCode, submitted.body).toBe(200);
      expect(submitted.json().jobRequest.status).toBe("submitted");

      // Brain: the request passes every check, so it is recommended for approval straight away.
      const review = (await requestWaitingReviewRule.detect(brain(), new Date())).find((i) => i.subjectId === draft.id);
      expect(review?.recommendedAction).toBe("auto_approve_request");

      // Staff approve it onto the job board (open claim); the price is captured at the legal rate.
      const reviewed = await app.inject({
        method: "POST", url: `/platform/job-requests/intake/${draft.id}/admin-review`, headers: await h(staff),
        payload: { expectedVersion: submitted.json().jobRequest.versionToken }
      });
      expect(reviewed.statusCode, reviewed.body).toBe(200);
      const approved = await app.inject({
        method: "POST", url: `/platform/job-requests/intake/${draft.id}/approve-for-dispatch`, headers: await h(staff),
        payload: { expectedVersion: reviewed.json().jobRequest.versionToken, openClaim: true }
      });
      expect(approved.statusCode, approved.body).toBe(200);
      expect(approved.json().jobRequest.status).toBe("approved_for_dispatch");
      const pricing = await app.inject({ method: "GET", url: `/platform/job-requests/${draft.id}/pricing-snapshot`, headers: await h(staff) });
      expect(pricing.json().pricingSnapshot).toMatchObject({
        employerHourlyRateMinor: EMPLOYER_RATE, workerHourlyRateMinor: WORKER_RATE, platformHourlyMarginMinor: PLATFORM_SHARE, marginPpm: 200_000
      });

      // Worker: sees the job with their own pay only, then claims it.
      const worker = await makeWorker("normal");
      const board = await app.inject({ method: "GET", url: "/marketplace/open-jobs", headers: await h(worker) });
      expect(board.statusCode, board.body).toBe(200);
      const listing = (board.json().jobs as { jobRequestId: string; workerRateMinor: number | null }[]).find((j) => j.jobRequestId === draft.id);
      expect(listing?.workerRateMinor).toBe(WORKER_RATE);
      expect(numbersIn(listing)).not.toContain(EMPLOYER_RATE);
      expect(numbersIn(listing)).not.toContain(PLATFORM_SHARE);
      expect(keysIn(board.json()).filter((k) => EMPLOYER_SIDE_KEYS.test(k))).toEqual([]);
      const assignmentId = await claim(worker, draft.id);

      // Shift day: in at 07:55, out at 14:05 (both inside the 15-minute margin).
      const attendanceId = await workShift(worker, assignmentId, et(DAY, "07:55"), et(DAY, "14:05"));

      // Brain: a checked-in worker is never chased.
      const chased = (await workerNotCheckedInRule.detect(brain(), et(DAY, "08:10"))).filter((i) => i.subjectId === assignmentId);
      expect(chased).toEqual([]);

      // Staff prepare the timesheet: 6.0 h, no review flag.
      setNow(et(DAY, "14:30"));
      const prepared = await prepare(attendanceId);
      expect(prepared).toMatchObject({ status: "worker_review", exceptionSummary: null, payableMinutes: 360, billableMinutes: 360 });
      expect(prepared.rawElapsedMinutes).toBe(370);

      const byWorker = await workerConfirm(worker, prepared);
      expect(byWorker.status).toBe("employer_review");
      const byEmployer = await employerConfirm(byWorker);
      expect(byEmployer.status).toBe("platform_review");

      // Employer's timesheet view: hours only, never the worker's pay.
      const employerTimesheets = await app.inject({ method: "GET", url: `/organizations/${scope.organizationId}/timesheets`, headers: await h(employer) });
      expect(employerTimesheets.statusCode, employerTimesheets.body).toBe(200);
      expect(numbersIn(employerTimesheets.json())).not.toContain(WORKER_RATE);
      expect(keysIn(employerTimesheets.json()).filter((k) => WORKER_PAY_KEYS.test(k))).toEqual([]);

      // Brain: both sides confirmed with no exception → eligible for auto-approval of hours.
      setNow(et(DAY, "15:00"));
      const ready = (await timesheetReadyRule.detect(brain(), new Date())).find((i) => i.subjectId === prepared.id);
      expect(ready?.recommendedAction).toBe("auto_approve_timesheet");

      // Staff approve and lock → the invoice: 6 h x $20.75 = $124.50 + GST 5% $6.23 + QST 9.975% $12.42.
      const { invoice } = await approveAndLock(byEmployer);
      expect(invoice).toMatchObject({ ok: true, subtotalMinor: 12_450, taxMinor: 623 + 1_242, totalMinor: 14_315 });

      // Payroll, run after the pay week closes: 6 h x $16.60 = $99.60 + 6% vacation pay (synthetic rule) = $105.57 gross.
      setNow(et("2027-02-14", "10:00"));
      const { row, earnings } = await lockedPayroll(worker.workerIdentityId, "2027-02-07T05:00:00.000Z", "2027-02-14T05:00:00.000Z");
      expect(earnings.find((e) => e.classification === "regular")?.amountMinor).toBe(9_960);
      expect(row.grossPayMinor).toBe(9_960 + Math.floor((9_960 * 600) / 10_000));
      expect(row.netPayMinor).toBe(row.grossPayMinor - row.totalDeductionsMinor);

      // Payout = net, registered after the 48 h window, never paid by real money.
      const { payouts } = await materializeAndListWorkerPayouts(prisma, worker.workerIdentityId, et("2027-02-14", "10:00"));
      const payout = payouts.find((p) => p.payrollCalculationId === row.id);
      expect(payout?.amountMinor).toBe(row.netPayMinor);
      expect(payout?.status).not.toBe("paid");
      const stored = await prisma.workerPayout.findUniqueOrThrow({ where: { payrollCalculationId: row.id } });
      expect(stored.paymentRef).toBeNull();
      expect(await executeTestWorkerPayout(prisma, { payoutId: stored.id })).toEqual({ ok: false, reason: "execution_disabled" });

      // Worker's pay view: never the employer's rate, total or Joblop's share.
      const myPay = await app.inject({ method: "GET", url: "/worker/payouts", headers: await h(worker) });
      expect(myPay.statusCode, myPay.body).toBe(200);
      for (const hidden of [EMPLOYER_RATE, PLATFORM_SHARE, 12_450, 14_315]) expect(numbersIn(myPay.json())).not.toContain(hidden);
      expect(keysIn(myPay.json()).filter((k) => EMPLOYER_SIDE_KEYS.test(k))).toEqual([]);
    });
  });

  // ── 2. Problems on the day ───────────────────────────────────────────────────────────────────────
  describe("2. problems on the day", () => {
    const DAY = "2027-02-11";
    const shift = () => ({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00") });

    it("(a) in at 08:25: late flag, timesheet goes to review; staff can release it; still 6 h billed", async () => {
      setNow(et("2027-02-10", "09:00"));
      const job = await publishJob(shift());
      const worker = await makeWorker("late");
      const assignmentId = await claim(worker, job.id);
      const attendanceId = await workShift(worker, assignmentId, et(DAY, "08:25"), et(DAY, "14:00"));
      const ts = await prepare(attendanceId);
      expect(ts.status).toBe("review_required");
      expect(ts.exceptionSummary).toContain("late_arrival");
      expect(ts.rawElapsedMinutes).toBe(335);
      expect(ts.billableMinutes).toBe(360); // the 6-hour minimum
      const released = await overrideExceptions(ts);
      expect(released.status).toBe("worker_review");
    });

    it("(b) no check-in: the Brain fires at 08:10, not before, and texts the worker", async () => {
      setNow(et("2027-02-10", "09:30"));
      const job = await publishJob(shift());
      const worker = await makeWorker("noshow");
      const phone = `+1450${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}`;
      await prisma.user.update({ where: { id: worker.id }, data: { phone } });
      const assignmentId = await claim(worker, job.id);

      const at0809 = (await workerNotCheckedInRule.detect(brain(), et(DAY, "08:09"))).filter((i) => i.subjectId === assignmentId);
      expect(at0809).toEqual([]);
      setNow(et(DAY, "08:10"));
      const [issue] = (await workerNotCheckedInRule.detect(brain(), new Date())).filter((i) => i.subjectId === assignmentId);
      expect(issue).toMatchObject({ ruleKey: "worker_not_checked_in", severity: "urgent", recommendedAction: "remind_worker_check_in" });
      expect(issue?.inputs).toMatchObject({ minutesLate: 10 });

      texts.length = 0;
      const outcome = await brain().effects.remindWorkerToCheckIn(assignmentId);
      expect(outcome.status).toBe("done");
      expect(texts.map((t) => t.to)).toEqual([phone]);
    });

    it("(c) out at 12:30: early-departure flag, actual 4.5 h recorded, 6-hour minimum billed and paid", async () => {
      setNow(et("2027-02-10", "10:00"));
      const job = await publishJob(shift());
      const worker = await makeWorker("early-out");
      const assignmentId = await claim(worker, job.id);
      const attendanceId = await workShift(worker, assignmentId, et(DAY, "08:00"), et(DAY, "12:30"));
      const ts = await prepare(attendanceId);
      expect(ts.status).toBe("review_required");
      expect(ts.exceptionSummary).toBe("early_departure, minimum_shift_floor_applied");
      expect(ts.rawElapsedMinutes).toBe(270);
      expect(ts.payableMinutes).toBe(360);
      expect(ts.billableMinutes).toBe(360);

      const released = await overrideExceptions(ts);
      const confirmed = await employerConfirm(await workerConfirm(worker, released));
      const { invoice } = await approveAndLock(confirmed);
      expect(invoice).toMatchObject({ ok: true, subtotalMinor: 12_450, totalMinor: 14_315 });
    });

    it("(d) employer disputes: correction_required, shown to staff, the Brain neither chases nor auto-approves", async () => {
      setNow(et("2027-02-10", "10:30"));
      const job = await publishJob(shift());
      const worker = await makeWorker("disputed");
      const assignmentId = await claim(worker, job.id);
      const attendanceId = await workShift(worker, assignmentId, et(DAY, "08:00"), et(DAY, "14:00"));
      const ts = await workerConfirm(worker, await prepare(attendanceId));

      const disputed = await app.inject({
        method: "POST", url: `/organizations/${scope.organizationId}/timesheets/${ts.id}/dispute`, headers: await h(employer),
        payload: { expectedVersion: ts.version, reason: "The worker left the field at 13:00." }
      });
      expect(disputed.statusCode, disputed.body).toBe(200);
      expect(disputed.json().timesheet).toMatchObject({ status: "correction_required", employerReviewStatus: "disputed" });

      const queue = await app.inject({ method: "GET", url: "/platform/timesheets/queue", headers: await h(staff) });
      expect(queue.statusCode, queue.body).toBe(200);
      const row = (queue.json().timesheets as { id: string; status: string }[]).find((t) => t.id === ts.id);
      expect(row?.status).toBe("correction_required");

      const later = et("2027-02-12", "15:00");
      expect((await timesheetUnconfirmedRule.detect(brain(), later)).filter((i) => i.subjectId === ts.id)).toEqual([]);
      expect((await timesheetReadyRule.detect(brain(), later)).filter((i) => i.subjectId === ts.id)).toEqual([]);

      // Staff recalculate after checking: it goes back through both confirmations.
      const recalculated = await app.inject({
        method: "POST", url: `/platform/timesheets/${ts.id}/calculate`, headers: await h(staff),
        payload: { expectedVersion: (disputed.json().timesheet as Timesheet).version }
      });
      expect(recalculated.statusCode, recalculated.body).toBe(200);
      expect(recalculated.json().timesheet.status).toBe("worker_review");
    });
  });

  // ── 3. Cancellations ─────────────────────────────────────────────────────────────────────────────
  // One cancel-a-booked-shift path for all three actors (apps/api/src/cancelBookedShift.ts): the
  // assignment and the attendance record are cancelled together, so the shift leaves the worker's
  // schedule, the place reopens, and nothing can be worked, timed or chased on it any more.
  describe("3. cancellations", () => {
    const DAY = "2027-02-12";
    const shift = () => ({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00") });
    const evening = et("2027-02-11", "14:00"); // 18 h before the start

    const assignmentStatus = async (id: string) => (await prisma.assignment.findUniqueOrThrow({ where: { id } })).status;
    const attendanceStatus = async (assignmentId: string) => (await prisma.attendanceRecord.findUniqueOrThrow({ where: { assignmentId } })).status;
    const workerCancel = async (worker: Actor, attendanceRecordId: string) =>
      app.inject({ method: "POST", url: `/worker/attendance/${attendanceRecordId}/cancel`, headers: await h(worker), payload: {} });

    // (a) The worker cancels.
    it("(a) the worker cancels more than 24 h ahead: free, the shift leaves their schedule and reopens; employer told", async () => {
      setNow(et("2027-02-10", "11:00"));
      const job = await publishJob(shift());
      const worker = await makeWorker("w-cancel-free");
      const assignmentId = await claim(worker, job.id);
      const item = await scheduleItem(worker, assignmentId);
      emails.length = 0;
      const res = await workerCancel(worker, item.attendanceRecordId);
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json()).toMatchObject({ status: "cancelled", lateCancellation: false, recommendedPenalty: "none", suspension: null });
      expect(numbersIn(res.json())).not.toContain(WORKER_RATE);
      expect(await assignmentStatus(assignmentId)).toBe("worker_withdrawn");
      expect(await attendanceStatus(assignmentId)).toBe("cancelled");
      expect((await prisma.user.findUniqueOrThrow({ where: { id: worker.id } })).status).toBe("active");
      expect(emails.some((m) => /a worker cancelled|un travailleur a annulé/.test(m.subject))).toBe(true);
      await claim(await makeWorker("w-cancel-free-next"), job.id);
    });

    it("(a) the worker cancels under 24 h: allowed, the 7-day suspension is applied automatically, the shift reopens", async () => {
      setNow(et("2027-02-10", "11:10"));
      const job = await publishJob(shift());
      const worker = await makeWorker("w-cancel-late");
      const assignmentId = await claim(worker, job.id);
      setNow(evening);
      const item = await scheduleItem(worker, assignmentId);
      emails.length = 0;
      const res = await workerCancel(worker, item.attendanceRecordId);
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json()).toMatchObject({ status: "cancelled", lateCancellation: true, recommendedPenalty: "suspend", suspension: { suspensionDays: 7 } });
      const user = await prisma.user.findUniqueOrThrow({ where: { id: worker.id } });
      expect(user.status).toBe("disabled");
      expect(user.suspendedUntil?.toISOString()).toBe(new Date(evening.getTime() + 7 * 24 * HOUR).toISOString());
      expect(emails.some((m) => m.to === worker.email)).toBe(true); // the existing penalty notice
      expect(await assignmentStatus(assignmentId)).toBe("worker_withdrawn");
      expect(await attendanceStatus(assignmentId)).toBe("cancelled");
      await claim(await makeWorker("w-cancel-late-next"), job.id);
    });

    it("(a) the older withdraw route takes the same path for a scheduled shift", async () => {
      setNow(et("2027-02-10", "11:15"));
      const job = await publishJob(shift());
      const worker = await makeWorker("w-withdraw");
      const assignmentId = await claim(worker, job.id);
      const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
      const res = await app.inject({
        method: "POST", url: `/worker/assignments/${assignmentId}/withdraw`, headers: await h(worker),
        payload: { expectedVersion: assignment.version, reason: "Sick child." }
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json()).toMatchObject({ status: "cancelled", lateCancellation: false });
      expect(await attendanceStatus(assignmentId)).toBe("cancelled");
    });

    it("(a) a worker cannot cancel after checking in, nor cancel someone else's shift", async () => {
      setNow(et("2027-02-10", "11:20"));
      const job = await publishJob(shift());
      const worker = await makeWorker("w-started");
      const assignmentId = await claim(worker, job.id);
      setNow(et(DAY, "07:55"));
      const item = await scheduleItem(worker, assignmentId);
      const stranger = await makeWorker("w-stranger");
      expect((await workerCancel(stranger, item.attendanceRecordId)).statusCode).toBe(404);
      const checkIn = await app.inject({
        method: "POST", url: `/worker/attendance/${item.attendanceRecordId}/check-in`, headers: await h(worker),
        payload: { expectedVersion: item.version }
      });
      expect(checkIn.statusCode, checkIn.body).toBe(200);
      const res = await workerCancel(worker, item.attendanceRecordId);
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toBe("RWOS_SHIFT_ALREADY_STARTED");
      expect(await assignmentStatus(assignmentId)).toBe("attendance_handoff");
    });

    it("(a) staff path for a worker who calls in: staff cancel the attendance, the place frees, and the suspension applies", async () => {
      setNow(et("2027-02-10", "11:30"));
      const job = await publishJob(shift());
      const worker = await makeWorker("w-callin");
      const assignmentId = await claim(worker, job.id);
      setNow(evening);
      const item = await scheduleItem(worker, assignmentId);
      const cancelled = await app.inject({
        method: "POST", url: `/platform/attendance/${item.attendanceRecordId}/cancel`, headers: await h(staff),
        payload: { expectedVersion: item.version, reason: "worker_cancelled_by_phone" }
      });
      expect(cancelled.statusCode, cancelled.body).toBe(200);
      expect(await assignmentStatus(assignmentId)).toBe("platform_cancelled");
      const penalty = await app.inject({
        method: "POST", url: `/platform/workers/${worker.workerIdentityId}/apply-cancellation-penalty`, headers: await h(staff),
        payload: { action: "suspend" }
      });
      expect(penalty.statusCode, penalty.body).toBe(200);
      expect(penalty.json()).toMatchObject({ applied: "suspend", suspensionDays: 7 });
      await claim(await makeWorker("w-callin-other"), job.id);
    });

    // (b) The employer cancels with a worker booked.
    it("(b) an employer cancel under 24 h with a booked worker charges 6 h and releases the worker", async () => {
      setNow(et("2027-02-10", "11:40"));
      const job = await publishJob(shift());
      const worker = await makeWorker("e-cancel");
      const assignmentId = await claim(worker, job.id);
      setNow(evening);
      emails.length = 0;
      const res = await app.inject({
        method: "POST", url: `/organizations/${scope.organizationId}/job-requests/${job.id}/cancel/confirm`, headers: await h(employer),
        payload: { idempotencyKey: `rl-${randomUUID()}` }
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().preview).toMatchObject({ affectedConfirmedWorkers: 1, obligationApplies: true, obligationAmountMinor: 6 * EMPLOYER_RATE });
      expect(res.json().cancellation.status).toBe("completed");
      expect(numbersIn(res.json())).not.toContain(WORKER_RATE);
      const charges = await prisma.lateCancellationCharge.findMany({ where: { jobRequestId: job.id } });
      expect(charges).toHaveLength(1);
      expect(charges[0]?.assignmentId).toBe(assignmentId);
      expect((await prisma.jobRequest.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("cancelled");
      expect(await assignmentStatus(assignmentId)).toBe("employer_cancelled");
      expect((await scheduleItem(worker, assignmentId)).status).toBe("cancelled");
      expect(emails.filter((m) => /cancelled|annulé/.test(m.subject)).map((m) => m.to)).toContain(worker.email);
    });

    it("(b) the worker cannot check in to a job the employer cancelled, and no timesheet can be made", async () => {
      setNow(et("2027-02-10", "11:50"));
      const job = await publishJob(shift());
      const worker = await makeWorker("e-cancel-checkin");
      const assignmentId = await claim(worker, job.id);
      setNow(evening);
      const res = await app.inject({
        method: "POST", url: `/organizations/${scope.organizationId}/job-requests/${job.id}/cancel/confirm`, headers: await h(employer),
        payload: { idempotencyKey: `rl-${randomUUID()}` }
      });
      expect(res.statusCode, res.body).toBe(200);
      setNow(et(DAY, "07:55"));
      const item = await scheduleItem(worker, assignmentId);
      const checkIn = await app.inject({
        method: "POST", url: `/worker/attendance/${item.attendanceRecordId}/check-in`, headers: await h(worker),
        payload: { expectedVersion: item.version }
      });
      expect(checkIn.statusCode).toBe(409);
      const prepared = await app.inject({ method: "POST", url: "/platform/timesheets/prepare", headers: await h(staff), payload: { attendanceRecordId: item.attendanceRecordId } });
      expect(prepared.statusCode).toBe(409);
      expect(prepared.json().error).toBe("RWOS_SHIFT_CANCELLED");
    });

    // (c) Staff cancel.
    it("(c) staff cancel a booked shift through its attendance record: worker told, place freed, no charge", async () => {
      setNow(et("2027-02-10", "12:00"));
      const job = await publishJob(shift());
      const worker = await makeWorker("s-cancel");
      const assignmentId = await claim(worker, job.id);
      setNow(evening);
      const item = await scheduleItem(worker, assignmentId);
      emails.length = 0;
      const res = await app.inject({
        method: "POST", url: `/platform/attendance/${item.attendanceRecordId}/cancel`, headers: await h(staff),
        payload: { expectedVersion: item.version, reason: "staff_cancelled" }
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().attendanceRecord.status).toBe("cancelled");
      expect(emails.filter((m) => /cancelled|annulé/.test(m.subject)).map((m) => m.to)).toEqual([worker.email]);
      expect(await prisma.lateCancellationCharge.count({ where: { jobRequestId: job.id } })).toBe(0);
      expect(await assignmentStatus(assignmentId)).toBe("platform_cancelled");
      await claim(await makeWorker("s-cancel-replacement"), job.id);
    });

    it("(c) staff cancel through the assignment: the attendance record goes too; refused once the worker checked in", async () => {
      setNow(et("2027-02-10", "12:10"));
      const job = await publishJob(shift());
      const worker = await makeWorker("s-cancel-assignment");
      const assignmentId = await claim(worker, job.id);
      setNow(evening);
      const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
      const res = await app.inject({
        method: "POST", url: `/platform/assignments/${assignmentId}/cancel`, headers: await h(staff),
        payload: { expectedVersion: assignment.version, reason: "staff_cancelled" }
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(await assignmentStatus(assignmentId)).toBe("platform_cancelled");
      expect(await attendanceStatus(assignmentId)).toBe("cancelled");
      expect(await prisma.lateCancellationCharge.count({ where: { jobRequestId: job.id } })).toBe(0);

      // A second worker on another job checks in; staff can no longer cancel that booking here.
      setNow(et("2027-02-10", "12:15"));
      const other = await publishJob(shift());
      const late = await makeWorker("s-cancel-started");
      const lateAssignmentId = await claim(late, other.id);
      setNow(et(DAY, "07:55"));
      const item = await scheduleItem(late, lateAssignmentId);
      const checkIn = await app.inject({ method: "POST", url: `/worker/attendance/${item.attendanceRecordId}/check-in`, headers: await h(late), payload: { expectedVersion: item.version } });
      expect(checkIn.statusCode, checkIn.body).toBe(200);
      const lateAssignment = await prisma.assignment.findUniqueOrThrow({ where: { id: lateAssignmentId } });
      const refused = await app.inject({
        method: "POST", url: `/platform/assignments/${lateAssignmentId}/cancel`, headers: await h(staff),
        payload: { expectedVersion: lateAssignment.version, reason: "staff_cancelled" }
      });
      expect(refused.statusCode).toBe(409);
      expect(refused.json().error).toBe("RWOS_SHIFT_ALREADY_STARTED");
    });

    it("(c) the Brain does not chase a worker whose shift staff cancelled", async () => {
      setNow(et("2027-02-10", "12:20"));
      const job = await publishJob(shift());
      const worker = await makeWorker("s-cancel-brain");
      const assignmentId = await claim(worker, job.id);
      setNow(evening);
      const item = await scheduleItem(worker, assignmentId);
      const res = await app.inject({
        method: "POST", url: `/platform/attendance/${item.attendanceRecordId}/cancel`, headers: await h(staff),
        payload: { expectedVersion: item.version, reason: "staff_cancelled" }
      });
      expect(res.statusCode, res.body).toBe(200);
      const issues = (await workerNotCheckedInRule.detect(brain(), et(DAY, "08:10"))).filter((i) => i.subjectId === assignmentId);
      expect(issues).toEqual([]);
      expect((await brain().effects.remindWorkerToCheckIn(assignmentId)).status).toBe("skipped");
    });
  });

  // ── 4. Unfilled job, bonus, partial cover ────────────────────────────────────────────────────────
  describe("4. unfilled job: Brain bonus offer, employer accepts, worker claims; and a 3-place job", () => {
    const DAY = "2027-02-17";

    it("the Brain offers the employer a bonus; accepted; the worker sees it; payroll pays it and the invoice bills it", async () => {
      // 22:00 the evening before: the 08:00 shift starts in 10 h and nobody has claimed it.
      setNow(et("2027-02-16", "21:00"));
      const job = await publishJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00") });
      setNow(et("2027-02-16", "22:00"));
      const [unfilled] = (await jobUnfilledSoonRule.detect(brain(), new Date())).filter((i) => i.subjectId === job.id);
      expect(unfilled).toMatchObject({ ruleKey: "job_unfilled_soon", recommendedAction: "offer_employer_bonus" });
      expect(unfilled?.inputs).toMatchObject({ openings: 1, filled: 0, thresholdHours: 24, priced: true, hasBonus: false });

      // Policy: offer the employer first. Within 12 h the suggestion is 15% of $16.60 → $2.50/h.
      emails.length = 0;
      const offered = await brain().effects.offerEmployerBonus(job.id, unfilled!.summary);
      expect(offered.status).toBe("done");
      const bonus = await prisma.jobBonus.findFirstOrThrow({ where: { jobRequestId: job.id } });
      expect(bonus).toMatchObject({ kind: "hourly", amountMinor: 250, fundedBy: "employer", status: "offered_to_employer" });
      expect(emails.some((m) => /prime|bonus/i.test(m.subject))).toBe(true);

      // The employer sees the offer (never the worker's pay) and accepts.
      const pending = await app.inject({ method: "GET", url: `/employer/job-requests/${job.id}/bonus-offer`, headers: await h(employer) });
      expect(pending.statusCode, pending.body).toBe(200);
      expect(pending.json().offer).toMatchObject({ bonusId: bonus.id, kind: "hourly", amountMinor: 250 });
      expect(numbersIn(pending.json())).not.toContain(WORKER_RATE);
      const accepted = await app.inject({ method: "POST", url: `/employer/bonuses/${bonus.id}/accept`, headers: await h(employer) });
      expect(accepted.statusCode, accepted.body).toBe(200);

      // The Brain no longer recommends another bonus for this job.
      const again = (await jobUnfilledSoonRule.detect(brain(), new Date())).find((i) => i.subjectId === job.id);
      expect(again?.recommendedAction).toBeNull();

      // The worker sees the bonus (kind + amount only, never who pays) and claims.
      const worker = await makeWorker("bonus");
      const board = await app.inject({ method: "GET", url: "/marketplace/open-jobs", headers: await h(worker) });
      const listing = (board.json().jobs as { jobRequestId: string; workerRateMinor: number; bonus: unknown }[]).find((j) => j.jobRequestId === job.id);
      expect(listing).toMatchObject({ workerRateMinor: WORKER_RATE, bonus: { kind: "hourly", amountMinor: 250 } });
      expect(keysIn(listing).filter((k) => EMPLOYER_SIDE_KEYS.test(k))).toEqual([]);
      const assignmentId = await claim(worker, job.id);

      const attendanceId = await workShift(worker, assignmentId, et(DAY, "08:00"), et(DAY, "14:00"));
      const ts = await employerConfirm(await workerConfirm(worker, await prepare(attendanceId)));
      const { invoice } = await approveAndLock(ts);
      // $124.50 labour + $15.00 bonus (6 h x $2.50, employer-funded) = $139.50; GST $6.98; QST $13.92.
      expect(invoice).toMatchObject({ ok: true, subtotalMinor: 13_950, taxMinor: 698 + 1_392, totalMinor: 16_040 });

      setNow(et("2027-02-21", "10:00"));
      const { row, earnings } = await lockedPayroll(worker.workerIdentityId, "2027-02-14T05:00:00.000Z", "2027-02-21T05:00:00.000Z");
      expect(earnings.find((e) => e.classification === "regular")?.amountMinor).toBe(9_960);
      expect(earnings.find((e) => e.classification === "bonus")?.amountMinor).toBe(1_500);
      expect(row.grossPayMinor).toBe(11_460 + Math.floor((11_460 * 600) / 10_000));
      const { payouts } = await materializeAndListWorkerPayouts(prisma, worker.workerIdentityId, et("2027-02-21", "10:00"));
      expect(payouts.find((p) => p.payrollCalculationId === row.id)?.amountMinor).toBe(row.netPayMinor);
    });

    it("a 3-place job with 2 claims shows 2/3 covered and the Brain still flags it", async () => {
      setNow(et("2027-02-16", "09:00"));
      const job = await publishJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), workers: 3, title: "Farm workers, Laval (3)" });
      await claim(await makeWorker("three-a"), job.id);
      await claim(await makeWorker("three-b"), job.id);

      const coverage = await app.inject({ method: "GET", url: "/platform/calendar/coverage", headers: await h(staff) });
      expect(coverage.statusCode, coverage.body).toBe(200);
      const row = (coverage.json().jobs as { jobRequestId: string; coverage: string; placesLeft: number; workers: unknown[] }[]).find((j) => j.jobRequestId === job.id);
      expect(row).toMatchObject({ coverage: "partly_filled", placesLeft: 1 });
      expect(row?.workers).toHaveLength(2);

      const [issue] = (await jobUnfilledSoonRule.detect(brain(), new Date())).filter((i) => i.subjectId === job.id);
      expect(issue?.inputs).toMatchObject({ openings: 3, filled: 2 });
      expect(issue?.summary).toContain("1 of 3 places open");
    });
  });

  // ── 5. Report my hours ───────────────────────────────────────────────────────────────────────────
  // The live gap (JR-2026-000007): a worker worked 08:00–14:00 but never checked in. They report the
  // hours after the shift; staff approve; the normal timesheet engine, invoice and payroll follow.
  describe("5. report my hours (worked, never checked in)", () => {
    const DAY = "2027-02-24";
    const OTHER_DAY = "2027-02-25";
    const REASON = "My phone died, so I could not check in.";
    type HoursReportRow = { id: string; attendanceRecordId: string; status: string; reportedArrival: string; reportedDeparture: string; reason: string };
    type ScheduleRow = { attendanceRecordId: string; assignmentId: string; status: string; canReportHours: boolean; hoursReport: { status: string } | null };

    const report = async (worker: Actor, attendanceRecordId: string, body: Record<string, string> = { arrivalTime: "08:00", departureTime: "14:00", reason: REASON }) =>
      app.inject({ method: "POST", url: `/worker/attendance/${attendanceRecordId}/report-hours`, headers: await h(worker), payload: body });
    const staffReports = async () => {
      const res = await app.inject({ method: "GET", url: "/platform/attendance/hours-reports", headers: await h(staff) });
      expect(res.statusCode, res.body).toBe(200);
      return res.json().reports as HoursReportRow[];
    };
    const decide = async (reportId: string, action: "approve" | "reject", payload: Record<string, string> = {}) =>
      app.inject({ method: "POST", url: `/platform/attendance/hours-reports/${reportId}/${action}`, headers: await h(staff), payload });
    const schedule = async (worker: Actor, assignmentId: string) => (await scheduleItem(worker, assignmentId)) as unknown as ScheduleRow;

    it("worker reports 08:00–14:00 → pending → staff approve → the normal timesheet, invoice and payroll", async () => {
      setNow(et("2027-02-22", "09:00"));
      const job = await publishJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00") });
      const worker = await makeWorker("report-hours");
      const assignmentId = await claim(worker, job.id);
      const { attendanceRecordId } = await scheduleItem(worker, assignmentId);

      // During the shift with no check-in, the Brain's no-check-in issue exists.
      expect((await workerNotCheckedInRule.detect(brain(), et(DAY, "08:10"))).filter((i) => i.subjectId === assignmentId)).toHaveLength(1);

      // Not before the shift has ended; never someone else's shift.
      setNow(et(DAY, "12:00"));
      const early = await report(worker, attendanceRecordId);
      expect(early.statusCode, early.body).toBe(409);
      expect(early.json()).toMatchObject({ error: "RWOS_HOURS_REPORT_NOT_AVAILABLE", reason: "not_ended" });
      setNow(et(DAY, "16:00")); // +2 h after the end: inside the 12-hour window
      const stranger = await makeWorker("report-stranger");
      expect((await report(stranger, attendanceRecordId)).statusCode).toBe(404);
      expect(await schedule(worker, assignmentId)).toMatchObject({ canReportHours: true, hoursReport: null });

      // The worker reports: the report is pending, and only one can wait at a time.
      const sent = await report(worker, attendanceRecordId);
      expect(sent.statusCode, sent.body).toBe(201);
      expect(sent.json().hoursReport).toMatchObject({ status: "pending", reportedCheckInAt: et(DAY, "08:00").toISOString(), reportedCheckOutAt: et(DAY, "14:00").toISOString() });
      expect(numbersIn(sent.json())).not.toContain(WORKER_RATE);
      const again = await report(worker, attendanceRecordId);
      expect(again.statusCode).toBe(409);
      expect(again.json().reason).toBe("already_pending");
      expect(await schedule(worker, assignmentId)).toMatchObject({ canReportHours: false, hoursReport: { status: "pending" } });

      // Brain: "hours not prepared" does not chase while the report is with staff.
      expect((await hoursNotPreparedRule.detect(brain(), et(DAY, "17:00"))).filter((i) => i.subjectId === attendanceRecordId)).toEqual([]);

      // Staff see it, with the worker's times and reason, and no money.
      const listed = (await staffReports()).find((r) => r.attendanceRecordId === attendanceRecordId);
      expect(listed).toMatchObject({ status: "pending", reportedArrival: "08:00", reportedDeparture: "14:00", reason: REASON });
      for (const hidden of [EMPLOYER_RATE, WORKER_RATE, PLATFORM_SHARE]) expect(numbersIn(listed)).not.toContain(hidden);

      // Staff approve: times on the attendance record (marked as reported), timesheet prepared normally.
      setNow(et(DAY, "17:30"));
      const approved = await decide(listed!.id, "approve");
      expect(approved.statusCode, approved.body).toBe(200);
      expect(approved.json().hoursReport.status).toBe("approved");
      const prepared = approved.json().timesheet as Timesheet;
      expect(prepared).toMatchObject({ status: "worker_review", exceptionSummary: null, payableMinutes: 360, billableMinutes: 360 });
      const attendance = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: attendanceRecordId } });
      expect(attendance.status).toBe("completed");
      expect(attendance.checkInAt?.toISOString()).toBe(et(DAY, "08:00").toISOString());
      expect(attendance.checkOutAt?.toISOString()).toBe(et(DAY, "14:00").toISOString());
      expect(attendance.checkInMethod).toBe("reported_by_worker_approved_by_staff");
      expect(attendance.checkOutMethod).toBe("reported_by_worker_approved_by_staff");
      expect(attendance.checkInEvidenceSummary).toContain("approved by staff");
      expect(attendance.checkedInByUserId).toBe(staff.id);
      expect((await decide(listed!.id, "approve")).statusCode).toBe(409);
      const audit = await prisma.auditEvent.findMany({ where: { entityType: "attendance_hours_report", entityId: listed!.id } });
      expect(audit.map((a) => a.action).sort()).toEqual(["attendance_hours_report.approved", "attendance_hours_report.submitted"]);

      // Brain: no longer a no-check-in shift, and nothing left to prepare.
      expect((await workerNotCheckedInRule.detect(brain(), et(DAY, "08:10"))).filter((i) => i.subjectId === assignmentId)).toEqual([]);
      expect((await hoursNotPreparedRule.detect(brain(), new Date())).filter((i) => i.subjectId === attendanceRecordId)).toEqual([]);

      // Then everything runs as usual: both confirm, staff approve and lock → the 6 h invoice.
      const confirmed = await employerConfirm(await workerConfirm(worker, prepared));
      expect(confirmed.status).toBe("platform_review");
      const { invoice } = await approveAndLock(confirmed);
      expect(invoice).toMatchObject({ ok: true, subtotalMinor: 12_450, taxMinor: 623 + 1_242, totalMinor: 14_315 });

      // Payroll for that week (a period no other scenario uses): 6 h x $16.60.
      setNow(et("2027-02-28", "10:00"));
      const { earnings } = await lockedPayroll(worker.workerIdentityId, "2027-02-21T05:00:00.000Z", "2027-02-28T05:00:00.000Z");
      expect(earnings.find((e) => e.classification === "regular")?.amountMinor).toBe(9_960);
    });

    it("staff reject with a reason: the worker is told, the attendance record is unchanged", async () => {
      setNow(et("2027-02-23", "09:00"));
      const job = await publishJob({ startAt: et(OTHER_DAY, "08:00"), endAt: et(OTHER_DAY, "14:00") });
      const worker = await makeWorker("report-rejected");
      const assignmentId = await claim(worker, job.id);
      const { attendanceRecordId } = await scheduleItem(worker, assignmentId);
      setNow(et(OTHER_DAY, "15:00"));
      expect((await report(worker, attendanceRecordId)).statusCode).toBe(201);
      const listed = (await staffReports()).find((r) => r.attendanceRecordId === attendanceRecordId);
      expect(listed).toBeDefined();

      setNow(et(OTHER_DAY, "16:00"));
      expect((await decide(listed!.id, "reject", { reason: "" })).statusCode).toBe(400);
      emails.length = 0;
      const rejected = await decide(listed!.id, "reject", { reason: "The farm has no record of you on site that day." });
      expect(rejected.statusCode, rejected.body).toBe(200);
      expect(rejected.json().hoursReport.status).toBe("rejected");
      const told = emails.filter((m) => m.to === worker.email);
      expect(told).toHaveLength(1);
      expect(told[0]?.subject).toMatch(/not accepted|pas été acceptées|لم تُقبل/);
      expect(told[0]?.text).toContain("The farm has no record of you on site that day.");
      expect((await decide(listed!.id, "reject", { reason: "Again." })).statusCode).toBe(409);

      const attendance = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: attendanceRecordId } });
      expect(attendance).toMatchObject({ status: "pending_start", checkInAt: null, checkOutAt: null });
      expect(await prisma.timesheet.count({ where: { attendanceRecordId } })).toBe(0);
      // Inside the 12 h the worker can send a corrected report.
      expect(await schedule(worker, assignmentId)).toMatchObject({ canReportHours: true, hoursReport: { status: "rejected" } });
      const audit = await prisma.auditEvent.findMany({ where: { entityType: "attendance_hours_report", entityId: listed!.id } });
      expect(audit.map((a) => a.action).sort()).toEqual(["attendance_hours_report.rejected", "attendance_hours_report.submitted"]);
    });

    it("is refused for a shift with a check-in, and 13 h after the end; staff can still enter the hours (override)", async () => {
      setNow(et("2027-02-23", "10:00"));
      const worked = await publishJob({ startAt: et(OTHER_DAY, "08:00"), endAt: et(OTHER_DAY, "14:00") });
      const late = await publishJob({ startAt: et(OTHER_DAY, "08:00"), endAt: et(OTHER_DAY, "14:00") });
      const checkedIn = await makeWorker("report-checked-in");
      const forgot = await makeWorker("report-too-late");
      const checkedInAssignment = await claim(checkedIn, worked.id);
      const forgotAssignment = await claim(forgot, late.id);
      const checkedInRecord = await workShift(checkedIn, checkedInAssignment, et(OTHER_DAY, "08:00"), et(OTHER_DAY, "14:00"));

      setNow(et(OTHER_DAY, "15:00"));
      const withCheckIn = await report(checkedIn, checkedInRecord);
      expect(withCheckIn.statusCode).toBe(409);
      expect(withCheckIn.json().reason).toBe("checked_in");

      // +13 h after the 14:00 end (the window closed at 02:00): the worker can no longer report.
      setNow(et("2027-02-26", "03:00"));
      const { attendanceRecordId } = await scheduleItem(forgot, forgotAssignment);
      const tooLate = await report(forgot, attendanceRecordId);
      expect(tooLate.statusCode).toBe(409);
      expect(tooLate.json().reason).toBe("window_closed");
      expect(await schedule(forgot, forgotAssignment)).toMatchObject({ canReportHours: false, hoursReport: null });

      // Staff override: the shift is listed for staff with the worker window closed; a reason is required.
      setNow(et("2027-02-26", "09:00"));
      const list = await app.inject({ method: "GET", url: "/platform/attendance/hours-reports/no-check-in", headers: await h(staff) });
      expect(list.statusCode, list.body).toBe(200);
      const row = (list.json().shifts as { attendanceRecordId: string; workerWindowOpen: boolean; reportDeadline: string }[]).find((s) => s.attendanceRecordId === attendanceRecordId);
      expect(row).toMatchObject({ workerWindowOpen: false, reportDeadline: et("2027-02-26", "02:00").toISOString() });
      const entry = async (payload: Record<string, string>) =>
        app.inject({ method: "POST", url: "/platform/attendance/hours-reports/staff-entry", headers: await h(staff), payload: { attendanceRecordId, arrivalTime: "08:00", departureTime: "14:00", ...payload } });
      expect((await entry({ reason: "" })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: "/platform/attendance/hours-reports/staff-entry", headers: await h(forgot), payload: { attendanceRecordId, arrivalTime: "08:00", departureTime: "14:00", reason: "self" } })).statusCode).toBe(403);
      const entered = await entry({ reason: "Confirmed with the farm manager by phone." });
      expect(entered.statusCode, entered.body).toBe(201);
      expect(entered.json().timesheet).toMatchObject({ status: "worker_review", payableMinutes: 360, billableMinutes: 360 });
      const attendance = await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: attendanceRecordId } });
      expect(attendance).toMatchObject({ status: "completed", checkInMethod: "reported_by_worker_approved_by_staff" });
      expect(attendance.checkInEvidenceSummary).toContain("staff override");
      const audit = await prisma.auditEvent.findMany({ where: { entityType: "attendance_hours_report", entityId: entered.json().hoursReport.id } });
      expect(audit.map((a) => a.action)).toEqual(["attendance_hours_report.staff_entered"]);
      expect((await entry({ reason: "Twice." })).statusCode).toBe(409);
    });

    it("Brain (switches on): one notice right after the end, then 'not recorded' + employer email after 12 h", async () => {
      const DAY27 = "2027-02-27";
      setNow(et("2027-02-25", "09:00"));
      const job = await publishJob({ startAt: et(DAY27, "08:00"), endAt: et(DAY27, "14:00") });
      const worker = await makeWorker("report-brain");
      const phone = `+1438${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}`;
      await prisma.user.update({ where: { id: worker.id }, data: { phone } });
      const assignmentId = await claim(worker, job.id);
      const { attendanceRecordId } = await scheduleItem(worker, assignmentId);
      const store = createMemoryBrainStore({ mode: "live", switches: { notify_worker_report_hours: true, close_unreported_shift: true } });
      const engine = createJoblopBrain({ store, data: brain().data, effects: brain().effects, now: () => new Date() });

      // 14:05, right after the end with no check-in: one email and one text, never twice.
      setNow(et(DAY27, "14:05"));
      emails.length = 0;
      texts.length = 0;
      await engine.sweep();
      await engine.sweep();
      expect(emails.filter((m) => m.to === worker.email)).toHaveLength(1);
      expect(texts.filter((t) => t.to === phone)).toHaveLength(1);
      expect(texts.find((t) => t.to === phone)?.text).toMatch(/^Joblop: /);
      expect(store.issues.find((i) => i.ruleKey === "hours_not_reported" && i.subjectId === attendanceRecordId)?.inputs).toMatchObject({
        stage: "notice",
        deadline: et("2027-02-28", "02:00").toISOString()
      });

      // 02:01 the next day: the window closed with no report → not recorded, the employer is told once.
      setNow(et("2027-02-28", "02:01"));
      emails.length = 0;
      await engine.sweep();
      await engine.sweep();
      const closed = store.issues.find((i) => i.ruleKey === "shift_not_recorded" && i.subjectId === attendanceRecordId);
      expect(closed?.summary).toContain("Not recorded: no hours reported in time");
      const toEmployer = emails.filter((m) => m.to === employer.email);
      expect(toEmployer).toHaveLength(1);
      expect(toEmployer[0]?.subject).toMatch(/not recorded|non enregistré|غير مسجّلة/);
      expect(await prisma.timesheet.count({ where: { attendanceRecordId } })).toBe(0);
      expect((await report(worker, attendanceRecordId)).json().reason).toBe("window_closed");
    });

    it("rejects times that are not on the shift day or end before they start", async () => {
      setNow(et("2027-02-23", "11:00"));
      const job = await publishJob({ startAt: et(OTHER_DAY, "08:00"), endAt: et(OTHER_DAY, "14:00") });
      const worker = await makeWorker("report-bad-times");
      const assignmentId = await claim(worker, job.id);
      const { attendanceRecordId } = await scheduleItem(worker, assignmentId);
      setNow(et(OTHER_DAY, "14:10"));
      const backwards = await report(worker, attendanceRecordId, { arrivalTime: "14:00", departureTime: "08:00", reason: REASON });
      expect(backwards.statusCode).toBe(400);
      expect(backwards.json().reason).toBe("end_before_start");
      const future = await report(worker, attendanceRecordId, { arrivalTime: "08:00", departureTime: "15:00", reason: REASON });
      expect(future.json().reason).toBe("in_future");
      const noReason = await report(worker, attendanceRecordId, { arrivalTime: "08:00", departureTime: "14:00", reason: "" });
      expect(noReason.json().reason).toBe("reason_required");
      expect(await prisma.attendanceHoursReport.count({ where: { attendanceRecordId } })).toBe(0);
    });
  });

  // Sanity: the pure auto-approve rule agrees with the 15-minute margin used above.
  it("the Brain's auto-approve check accepts a 07:55–14:05 timesheet without flags", () => {
    expect(
      timesheetReadyForApproval({
        timesheetId: "t", jobRequestNumber: "JR", title: "Farm worker", status: "platform_review",
        scheduledStartAt: et("2027-02-10", "08:00"), scheduledEndAt: et("2027-02-10", "14:00"),
        workerReviewStatus: "confirmed", employerReviewStatus: "confirmed",
        actualCheckInAt: et("2027-02-10", "07:55"), actualCheckOutAt: et("2027-02-10", "14:05"),
        exceptionSummary: null, attendanceException: null
      })
    ).toBe(true);
  });
});
