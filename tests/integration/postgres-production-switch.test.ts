import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { canadaAddressAdapter, canadaQuebecCountryProfile } from "@rwos/country-canada";
import { createPrismaClient } from "@rwos/database";
import { buildApi } from "../../apps/api/src/app";
import type { EmailSender } from "../../apps/api/src/mailer/emailSender";

// The API exactly as it will run after the switch: RWOS_ENV=production, the Canada/Québec profile
// (job flow + public sign-up default ON) and the in-database sign-in limiter. Drives the live journey
// against a real schema: /ready, sign-up, sign-in, claim, check-in, check-out, staff timesheet
// preparation and the worker's timesheet answer. Gated on RWOS_TEST_DATABASE_URL like every
// postgres-* suite. TEST/SYNTHETIC: no money moves, mail is captured.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const HOUR = 3_600_000;

suite("production switch: the live journey with RWOS_ENV=production", () => {
  const prisma = createPrismaClient(databaseUrl!);
  const emailSender: EmailSender = {
    configured: true,
    send: async () => ({ status: "sent" }) as Awaited<ReturnType<EmailSender["send"]>>
  };
  const staffIds = new Set<string>();
  let app: FastifyInstance;
  let staff: { token: string; id: string };
  let scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const password = "Sup3r-Secret-Pass!";

  async function register(prefix: string) {
    const email = `${prefix}-${randomUUID()}@prod-switch.test`;
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password, displayName: "P" } });
    expect(res.statusCode, res.body).toBe(201);
    const body = res.json() as { token: string; user: { id: string } };
    return { token: body.token, id: body.user.id, email };
  }

  beforeAll(async () => {
    app = buildApi({
      countryCurrency: canadaQuebecCountryProfile.currency!,
      countryTimezone: canadaQuebecCountryProfile.timezone!,
      countryAddress: canadaAddressAdapter,
      productionFeatureDefaults: canadaQuebecCountryProfile.productionDefaults,
      emailSender,
      // Only the planned production settings: nothing inherited from the runner's environment.
      env: {
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: databaseUrl,
        INTERNAL_API_ORIGIN: "https://api.prod-switch.test",
        AUTH_RATE_LIMITER_BACKEND: "postgres",
        AUTH_RATE_LIMITER_KEY_SECRET: "prod-switch-limiter-secret-at-least-32-characters",
        AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1"
      },
      resolveAuthorizationRoles: async (userId: string) =>
        staffIds.has(userId) ? ["PLATFORM_ADMINISTRATOR", "PAYROLL_ADMINISTRATOR"] : ["WORKER_ACCESS"]
    });
    await app.ready();
    staff = await register("ps-staff");
    staffIds.add(staff.id);
    const org = await prisma.employerOrganization.create({
      data: { publicId: `ORG-PS-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "SwitchCare", status: "active", createdByUserId: staff.id }
    });
    const residence = await prisma.residence.create({
      data: {
        publicId: `RES-PS-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: staff.id,
        province: "QC", city: "Laval", postalCode: "H7A 0A1", addressLine1: "4521 Test Avenue"
      }
    });
    const workGroup = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: workGroup.id } });
    const department = await prisma.department.create({
      data: { publicId: `DEP-PS-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: residence.id, name: "D", status: "active", createdByUserId: staff.id }
    });
    scope = { organizationId: org.id, residenceId: residence.id, departmentId: department.id, workGroupId: workGroup.id, roleDefinitionId: role.id };
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it("is ready: database and the in-database limiter table both answer", async () => {
    const ready = await app.inject({ method: "GET", url: "/ready" });
    expect(ready.statusCode, ready.body).toBe(200);
  });

  it("signs up, signs in, claims an open job, checks in and out, and staff prepare the timesheet", async () => {
    const worker = await register("ps-worker");
    const identity = await prisma.workerIdentity.create({ data: { userId: worker.id, displayName: "Switch Worker", status: "active" } });
    await prisma.workerClassificationElection.create({
      data: { workerIdentityId: identity.id, classification: "employee", status: "active", effectiveFrom: new Date(Date.now() - 24 * HOUR), electedByUserId: worker.id }
    });

    const signIn = await app.inject({ method: "POST", url: "/auth/sign-in", payload: { email: worker.email, password } });
    expect(signIn.statusCode, signIn.body).toBe(200);

    // An open job that meets openJobWhere: approved, open to claim, priced, not started, active site.
    const startAt = new Date(Date.now() + 20 * 60_000);
    const endAt = new Date(startAt.getTime() + 6 * HOUR);
    const job = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-PS-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: staff.id, title: "Switch shift", numberOfWorkers: 1,
        requestType: "single_day", timezone: "America/Toronto", startAt, endAt, status: "approved_for_dispatch",
        openClaim: true, urgency: "normal", createdByUserId: staff.id
      }
    });
    await prisma.requestPricingSnapshot.create({
      data: {
        jobRequestId: job.id, organizationId: scope.organizationId, contractId: randomUUID(), contractVersion: "v1", currency: "CAD", marginPpm: 200_000,
        employerHourlyRateMinor: 3000, workerHourlyRateMinor: 2500, platformHourlyMarginMinor: 500, capturedByUserId: staff.id
      }
    });
    await prisma.dispatchReview.create({
      data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", urgency: "normal", requiredWorkerCount: 1, preparedOfferCount: 1, createdByUserId: staff.id }
    });

    const claimed = await app.inject({ method: "POST", url: `/marketplace/jobs/${job.id}/claim`, headers: auth(worker.token) });
    expect(claimed.statusCode, claimed.body).toBe(201);

    const schedule = await app.inject({ method: "GET", url: "/worker/attendance", headers: auth(worker.token) });
    expect(schedule.statusCode, schedule.body).toBe(200);
    const items = schedule.json().items as { attendanceRecordId: string; version: number; status: string }[];
    const record = items.find((item) => item.status === "pending_start");
    expect(record, schedule.body).toBeDefined();

    const checkIn = await app.inject({
      method: "POST", url: `/worker/attendance/${record!.attendanceRecordId}/check-in`, headers: auth(worker.token),
      payload: { expectedVersion: record!.version }
    });
    expect(checkIn.statusCode, checkIn.body).toBe(200);
    const checkedIn = checkIn.json().attendanceRecord as { status: string; version: number };
    expect(checkedIn.status).toBe("checked_in");

    const checkOut = await app.inject({
      method: "POST", url: `/worker/attendance/${record!.attendanceRecordId}/check-out`, headers: auth(worker.token),
      payload: { expectedVersion: checkedIn.version }
    });
    expect(checkOut.statusCode, checkOut.body).toBe(200);

    const prepared = await app.inject({
      method: "POST", url: "/platform/timesheets/prepare", headers: auth(staff.token),
      payload: { attendanceRecordId: record!.attendanceRecordId }
    });
    expect(prepared.statusCode, prepared.body).toBe(200);
    const timesheet = prepared.json().timesheet as { id: string; version: number };

    // The worker's timesheet answer reaches the timesheet service (it is no longer 404 in production);
    // whether it is accepted depends on the timesheet's review state, not on the production gate.
    const confirm = await app.inject({
      method: "POST", url: `/worker/timesheets/${timesheet.id}/confirm`, headers: auth(worker.token),
      payload: { expectedVersion: timesheet.version }
    });
    expect(confirm.json().error, confirm.body).not.toBe("RWOS_RESOURCE_UNAVAILABLE");
  });

  it("keeps the reviewed staff-only routes and test-only routes closed in production", async () => {
    for (const url of ["/platform/timesheets", "/platform/worker-payouts/p-1/execute-test-payout"]) {
      const res = await app.inject({ method: "POST", url, headers: auth(staff.token), payload: {} });
      expect(res.statusCode, url).toBe(404);
      expect(res.json().error, url).toBe("RWOS_RESOURCE_UNAVAILABLE");
    }
  });
});
