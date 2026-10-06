import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import type { FastifyInstance } from "fastify";

// PERSISTED END-TO-END CLOSE (TEST / SYNTHETIC — local fake payment provider, no Stripe).
// Drives ONE transaction from a locked timesheet → invoice → payment → capture(succeeded) against
// REAL Postgres, proving a settled transaction PERSISTS (not just a computation). The money
// reconciliation itself is proven separately in tests/finance (real engine); this proves the
// persisted lifecycle reaches a terminal paid/settled state.
//
// Gated: runs only when RWOS_TEST_DATABASE_URL is set (a throwaway DB), like the other postgres-*
// suites. Requires LOCAL_PAYMENT_ENABLED=enabled so buildApi registers the payment routes.
//   RWOS_TEST_DATABASE_URL=postgresql://$USER@localhost:5432/rwos_close_e2e \
//   LOCAL_PAYMENT_ENABLED=enabled pnpm --filter @rwos/api test tests/integration/postgres-close-e2e.test.ts
// (create the DB + migrate first, as the other postgres suites document.)
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl && process.env.LOCAL_PAYMENT_ENABLED === "enabled" ? describe : describe.skip;
const NOW = new Date();
const start = new Date("2026-10-20T13:00:00Z");
const end = new Date("2026-10-20T21:00:00Z"); // 8h = 480 min

suite("persisted end-to-end close (local fake provider)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let ownerId = "";
  let ownerToken = "";
  let workerId = "";
  let orgId = "";
  let scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };
  let assignmentId = "";
  let timesheetId = "";
  let attendanceRecordId = "";
  let invoiceId = "";
  let invoiceTotalMinor = 0;
  let paymentMethodId = "";
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }

  beforeAll(async () => {
    app = buildApi({
      countryCurrency: "CAD",
      env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test", LOCAL_PAYMENT_ENABLED: "enabled", LOCAL_PAYMENT_WEBHOOK_SECRET: "local-fake-webhook-secret-0123456789abcdef" },
      // REQUIRED: payment routes mount only when a webhook secret is present (app.ts). The capture
      // path below does not use it, but its presence is the gate that registers the routes at all.
      localPaymentWebhookSecret: "local-fake-webhook-secret-0123456789abcdef",
      // Give the owner the org-owner + finance roles so the org-scoped invoice/payment routes authorize.
      // ITERATION ITEM A: if invoice/payment authorize needs a different role/permission, adjust here.
      resolveAuthorizationRoles: async () => ["ORGANIZATION_OWNER", "FINANCE_REVIEWER", "PAYROLL_ADMINISTRATOR"]
    });
    await app.ready();

    const owner = await register(`close-owner-${randomUUID()}@e2e.local`); ownerId = owner.user.id; ownerToken = owner.token;
    const w = await register(`close-w-${randomUUID()}@e2e.local`);
    workerId = (await prisma.workerIdentity.create({ data: { userId: w.user.id, displayName: "Close Worker", status: "active" } })).id;

    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-CL-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "CloseCare", status: "active", createdByUserId: ownerId } });
    orgId = org.id;
    const res = await prisma.residence.create({ data: { publicId: `RES-CL-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: ownerId, province: "QC", city: "Laval" } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-CL-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: ownerId } });
    scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
    await prisma.organizationMembership.create({ data: { organizationId: org.id, userId: ownerId, status: "active", acceptedAt: NOW } });

    // Governed accepted offer → authoritative assignment.
    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-CL-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: ownerId, title: "Close shift", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto", startAt: start, endAt: end, status: "approved_for_dispatch", createdByUserId: ownerId } });
    const review = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: ownerId } });
    const offer = await prisma.workerOffer.create({ data: { dispatchReviewId: review.id, jobRequestId: job.id, organizationId: scope.organizationId, residenceId: scope.residenceId, departmentId: scope.departmentId, workerIdentityId: workerId, status: "accepted", expiresAt: new Date(NOW.getTime() + 24 * 3_600_000), approvedAt: NOW, sentAt: NOW, respondedAt: NOW, createdByUserId: ownerId } });
    const terms = await prisma.workerOfferTermsVersion.create({ data: { workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: "America/Toronto", startAt: start, endAt: end, workGroupId: scope.workGroupId, roleDefinitionId: scope.roleDefinitionId, createdByUserId: ownerId } });
    await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: workerId, termsVersionId: terms.id, responseType: "accepted" } });
    const result = await createPrismaAssignmentRepository(prisma).createAssignmentFromAcceptedOfferAtomically({ workerOfferId: offer.id, expectedDispatchReviewId: review.id, expectedOfferVersion: 1, actorUserId: ownerId, correlationId: `cl-${randomUUID().slice(0, 8)}`, now: NOW });
    const r = result as Record<string, unknown>;
    assignmentId = (r.assignmentId ?? (r.assignment as { id?: string } | undefined)?.id ?? "") as string;

    // Approved/locked timesheet (raw SQL — mirrors postgres-payroll.seedApprovedTimesheet).
    const attId = randomUUID(); const tsId = randomUUID();
    const s = start.toISOString(); const e = end.toISOString(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'checked_out',$10,$11,'America/Toronto','confirmed','none',$12,1,$13,$13)`,
      attId, assignmentId, job.id, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, ownerId, n
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',1,1,$11,$12,'America/Toronto',480,480,0,$13,$14,1,$13,$13)`,
      tsId, assignmentId, attId, job.id, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, n, ownerId
    );
    timesheetId = tsId;
    attendanceRecordId = attId;
  });

  afterAll(async () => { await app?.close(); await prisma.$disconnect(); });

  it("step 1 — invoice generated from the locked timesheet (issuer + tax server-side)", async () => {
    const money = (amountMinor: number) => ({ amountMinor, currency: "CAD" });
    const zero = money(0);
    const res = await app.inject({
      method: "POST", url: `/organizations/${orgId}/invoices`, headers: auth(ownerToken),
      payload: {
        idempotencyKey: `inv-${randomUUID()}`,
        calculation: {
          source: { type: "locked_timesheet", organizationId: orgId, timesheetId, timesheetVersion: 1, assignmentId, attendanceRecordId },
          occurredAt: "2026-10-20T21:00:00.000Z",
          regularLabour: money(24000), // 8h × $30.00
          urgentLabour: zero, approvedTravelTime: zero, mileage: zero, adjustments: zero, marketplaceFees: zero,
          lineRuleVersions: { regular_labour: "v1", urgent_labour: "v1", approved_travel_time: "v1", mileage: "v1", adjustment: "v1", marketplace_fee: "v1" },
          paymentMethodKind: "card"
        }
      }
    });
    expect([201, 200]).toContain(res.statusCode);
    const invoice = res.json().invoice as { id: string; total?: { amountMinor: number }; snapshot?: { total?: { amountMinor: number } } };
    invoiceId = invoice.id;
    invoiceTotalMinor = invoice.total?.amountMinor ?? invoice.snapshot?.total?.amountMinor ?? 0;
    expect(invoiceId).toBeTruthy();
    expect(invoiceTotalMinor).toBeGreaterThan(24000); // labour + card surcharge + GST + QST
  });

  it("step 2 — register a local-fake payment method", async () => {
    const res = await app.inject({
      method: "POST", url: `/organizations/${orgId}/payment-methods/local-fake`, headers: auth(ownerToken),
      payload: { methodKind: "mastercard", providerCustomerReference: `cus_${randomUUID().slice(0, 8)}`, providerMethodReference: `pm_${randomUUID().slice(0, 8)}`, displayAlias: "Test Visa", reusable: true }
    });
    expect(res.statusCode).toBe(201);
    paymentMethodId = res.json().paymentMethod.id as string;
    expect(paymentMethodId).toBeTruthy();
  });

  it("step 3 — create the payment attempt against the invoice", async () => {
    const res = await app.inject({
      method: "POST", url: `/organizations/${orgId}/payments`, headers: auth(ownerToken),
      payload: {
        assignmentId, timesheetId, invoiceId, paymentMethodId,
        policyVersion: "v1", policyMode: "collect_after_invoice", // ITERATION ITEM: policyVersion row + mode
        amountMinor: invoiceTotalMinor, idempotencyKey: `pay-${randomUUID()}`
      }
    });
    expect(res.statusCode).toBe(201);
    const payment = res.json().payment as { id: string; version: number };
    expect(payment.id).toBeTruthy();
  });

  it("step 4 — capture settles to 'succeeded' (local fake provider), transaction CLOSED", async () => {
    const list = await app.inject({ method: "GET", url: `/organizations/${orgId}/payments`, headers: auth(ownerToken) });
    const payment = (list.json().payments as Array<{ id: string; version: number }>)[0];
    // Some policy modes require authorize before capture (ITERATION ITEM B); try capture, fall back to authorize→capture.
    let res = await app.inject({
      method: "POST", url: `/organizations/${orgId}/payments/${payment.id}/capture`, headers: auth(ownerToken),
      payload: { expectedVersion: payment.version, amountMinor: invoiceTotalMinor, idempotencyKey: `cap-${randomUUID()}`, scenario: "success" }
    });
    if (res.statusCode !== 200) {
      const authz = await app.inject({ method: "POST", url: `/organizations/${orgId}/payments/${payment.id}/authorize`, headers: auth(ownerToken), payload: { expectedVersion: payment.version, amountMinor: invoiceTotalMinor, idempotencyKey: `auth-${randomUUID()}`, scenario: "success" } });
      const v = (authz.json().payment as { version: number }).version;
      res = await app.inject({ method: "POST", url: `/organizations/${orgId}/payments/${payment.id}/capture`, headers: auth(ownerToken), payload: { expectedVersion: v, amountMinor: invoiceTotalMinor, idempotencyKey: `cap-${randomUUID()}`, scenario: "success" } });
    }
    expect(res.statusCode).toBe(200);
    const settled = res.json().payment as { state: string };
    expect(settled.state).toBe("succeeded");
  });
});
