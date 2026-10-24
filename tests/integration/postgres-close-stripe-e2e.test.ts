import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import { createPrismaPaymentRepository } from "../../apps/api/src/paymentRepository";
import { createStripeTestClient, createStripeTestPaymentProvider } from "../../apps/api/src/stripeTestProvider";
import type { FastifyInstance } from "fastify";

// REAL-PROVIDER persisted end-to-end close — Stripe TEST MODE (item #2 of the launch runbook).
// Mirrors postgres-close-e2e but swaps the local-fake provider for the real Stripe test provider:
// locked timesheet → invoice → payment → authorize (manual-capture PaymentIntent) → capture(succeeded)
// → full refund, persisted against REAL Postgres (the Neon joblop-staging DB), tied to the issued
// invoice. Test-mode only; fail-closed (validateStripeTestEnvironment rejects any non-sk_test_ key).
//
// Gate: RWOS_TEST_DATABASE_URL + STRIPE_TEST_MODE_ENABLED=enabled +
//       RWOS_STRIPE_NETWORK_TEST_CONFIRMATION=authorized-stripe-test-mode.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const stripeReady =
  process.env.STRIPE_TEST_MODE_ENABLED === "enabled" &&
  process.env.RWOS_STRIPE_NETWORK_TEST_CONFIRMATION === "authorized-stripe-test-mode" &&
  !!process.env.STRIPE_TEST_SECRET_KEY &&
  !!process.env.STRIPE_TEST_WEBHOOK_SECRET;
const suite = databaseUrl && stripeReady ? describe : describe.skip;
const NOW = new Date();
const start = new Date("2026-10-20T13:00:00Z");
const end = new Date("2026-10-20T21:00:00Z"); // 8h

suite("persisted end-to-end close (REAL Stripe test provider)", () => {
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
    const webhookSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET!;
    const stripeClient = createStripeTestClient({
      enabled: true,
      secretKey: process.env.STRIPE_TEST_SECRET_KEY,
      webhookSecret,
      accountReference: process.env.STRIPE_TEST_ACCOUNT_REFERENCE
    });
    const replayStore = { recordOnce: async () => true }; // sync capture path; webhook not exercised here
    const stripeProvider = createStripeTestPaymentProvider({ client: stripeClient, webhookSecret, replayStore });
    app = buildApi({
      countryCurrency: "CAD",
      env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "test", NODE_ENV: "test", DOCUMENT_LOCAL_UPLOAD_ENABLED: "disabled" },
      localPaymentWebhookSecret: "stripe-close-route-mount-secret-0123456789abcdef",
      paymentRepository: createPrismaPaymentRepository(prisma, stripeProvider),
      resolveAuthorizationRoles: async () => ["PLATFORM_ADMINISTRATOR", "ORGANIZATION_OWNER", "FINANCE_REVIEWER", "PAYROLL_ADMINISTRATOR"]
    });
    await app.ready();

    const owner = await register(`stripe-owner-${randomUUID()}@e2e.local`); ownerId = owner.user.id; ownerToken = owner.token;
    const w = await register(`stripe-w-${randomUUID()}@e2e.local`);
    workerId = (await prisma.workerIdentity.create({ data: { userId: w.user.id, displayName: "Stripe Worker", status: "active" } })).id;

    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-ST-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "StripeCare", status: "active", createdByUserId: ownerId } });
    orgId = org.id;
    const res = await prisma.residence.create({ data: { publicId: `RES-ST-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: ownerId, province: "QC", city: "Laval" } });
    // Unique high display orders — this DB already has the seeded catalogue (display_order 1..n taken).
    const ord = 100000 + Math.floor(Math.random() * 800000);
    const wg = await prisma.workGroup.create({ data: { key: `wg-${randomUUID().slice(0, 8)}`, displayLabel: "Care", displayOrder: ord } });
    const role = await prisma.roleDefinition.create({ data: { workGroupId: wg.id, key: `role-${randomUUID().slice(0, 8)}`, displayLabel: "PSW", displayOrder: ord + 1 } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-ST-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: ownerId } });
    scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
    await prisma.organizationMembership.create({ data: { organizationId: org.id, userId: ownerId, status: "active", acceptedAt: NOW } });

    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-ST-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: ownerId, title: "Stripe shift", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto", startAt: start, endAt: end, status: "approved_for_dispatch", createdByUserId: ownerId } });
    const review = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, ...scope, state: "offer_preparation", priority: "normal", requiredWorkerCount: 1, createdByUserId: ownerId } });
    const offer = await prisma.workerOffer.create({ data: { dispatchReviewId: review.id, jobRequestId: job.id, organizationId: scope.organizationId, residenceId: scope.residenceId, departmentId: scope.departmentId, workerIdentityId: workerId, status: "accepted", expiresAt: new Date(NOW.getTime() + 24 * 3_600_000), approvedAt: NOW, sentAt: NOW, respondedAt: NOW, createdByUserId: ownerId } });
    const terms = await prisma.workerOfferTermsVersion.create({ data: { workerOfferId: offer.id, versionNumber: 1, workerVisibleTitle: job.title, timezone: "America/Toronto", startAt: start, endAt: end, workGroupId: scope.workGroupId, roleDefinitionId: scope.roleDefinitionId, createdByUserId: ownerId } });
    await prisma.workerOffer.update({ where: { id: offer.id }, data: { currentTermsVersionId: terms.id } });
    await prisma.workerOfferResponse.create({ data: { workerOfferId: offer.id, workerIdentityId: workerId, termsVersionId: terms.id, responseType: "accepted" } });
    const result = await createPrismaAssignmentRepository(prisma).createAssignmentFromAcceptedOfferAtomically({ workerOfferId: offer.id, expectedDispatchReviewId: review.id, expectedOfferVersion: 1, actorUserId: ownerId, correlationId: `st-${randomUUID().slice(0, 8)}`, now: NOW });
    const r = result as Record<string, unknown>;
    assignmentId = (r.assignmentId ?? (r.assignment as { id?: string } | undefined)?.id ?? "") as string;

    const attId = randomUUID(); const tsId = randomUUID();
    const s = start.toISOString(); const e = end.toISOString(); const n = NOW.toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'checked_out',$10,$11,'America/Toronto','confirmed','none',$12,1,$13,$13)`,
      attId, assignmentId, job.id, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, ownerId, n
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'locked',1,1,$11,$12,'America/Toronto',480,480,0,$13,$14,1,$13,$13)`,
      tsId, assignmentId, attId, job.id, workerId, scope.organizationId, scope.residenceId, scope.departmentId, scope.workGroupId, scope.roleDefinitionId, s, e, n, ownerId
    );
    timesheetId = tsId;
    attendanceRecordId = attId;

    // Stripe test payment method — a reusable, off-session card test PM (no local-fake route exists).
    paymentMethodId = (await prisma.employerPaymentMethod.create({
      data: {
        organizationId: orgId, provider: "stripe_test", methodKind: "mastercard",
        providerCustomerReference: `cus_joblop_${randomUUID().slice(0, 8)}`,
        providerMethodReference: "pm_card_visa", displayAlias: "Stripe test Visa", reusable: true, status: "active"
      }
    })).id;
  });

  afterAll(async () => { await app?.close(); await prisma.$disconnect(); });

  it("step 1 — invoice generated from the locked timesheet", async () => {
    const money = (amountMinor: number) => ({ amountMinor, currency: "CAD" });
    const zero = money(0);
    const res = await app.inject({
      method: "POST", url: `/organizations/${orgId}/invoices`, headers: auth(ownerToken),
      payload: {
        idempotencyKey: `inv-${randomUUID()}`,
        calculation: {
          source: { type: "locked_timesheet", organizationId: orgId, timesheetId, timesheetVersion: 1, assignmentId, attendanceRecordId },
          rules: { employerTermsVersion: "v1", calculationPolicyVersion: "v1", taxPolicyVersion: "v1", travelPolicyVersion: "v1", adjustmentPolicyVersion: "v1", paymentTermsVersion: "v1" },
          occurredAt: "2026-10-20T21:00:00.000Z",
          regularLabour: money(24000),
          urgentLabour: zero, approvedTravelTime: zero, mileage: zero, adjustments: zero, marketplaceFees: zero, credits: zero,
          lineRuleVersions: { regular_labour: "v1", urgent_labour: "v1", approved_travel_time: "v1", mileage: "v1", adjustment: "v1", marketplace_fee: "v1", credit: "v1" },
          paymentMethodKind: "card"
        }
      }
    });
    expect([201, 200]).toContain(res.statusCode);
    const invoice = res.json().invoice as { id: string; totalMinor?: number };
    invoiceId = invoice.id;
    invoiceTotalMinor = invoice.totalMinor ?? 0;
    expect(invoiceId).toBeTruthy();
    expect(invoiceTotalMinor).toBeGreaterThan(24000);
  });

  it("step 2 — create the payment attempt against the invoice", async () => {
    await prisma.$executeRawUnsafe(`UPDATE invoices SET status = 'issued', invoice_number = $3, issued_at = now() WHERE id = $1 AND organization_id = $2`, invoiceId, orgId, `INV-${randomUUID().slice(0, 8)}`);
    const res = await app.inject({
      method: "POST", url: `/organizations/${orgId}/payments`, headers: auth(ownerToken),
      payload: {
        assignmentId, timesheetId, invoiceId, paymentMethodId,
        policyVersion: "v1", policyMode: "collect_after_invoice",
        amountMinor: invoiceTotalMinor, idempotencyKey: `pay-${randomUUID()}`
      }
    });
    expect(res.statusCode).toBe(201);
    expect((res.json().payment as { id: string }).id).toBeTruthy();
  });

  it("step 3 — authorize + capture settles to 'succeeded' via REAL Stripe test (manual capture), CLOSED", async () => {
    const list = await app.inject({ method: "GET", url: `/organizations/${orgId}/payments`, headers: auth(ownerToken) });
    const payment = (list.json().payments as Array<{ id: string; version: number }>)[0];
    // Stripe uses manual capture: authorize (PaymentIntent requires_capture) → capture.
    // Stripe uses manual capture: authorize (PaymentIntent requires_capture) → capture.
    const authz = await app.inject({ method: "POST", url: `/organizations/${orgId}/payments/${payment.id}/authorize`, headers: auth(ownerToken), payload: { expectedVersion: payment.version, amountMinor: invoiceTotalMinor, idempotencyKey: `auth-${randomUUID()}`, scenario: "success" } });
    expect(authz.statusCode).toBe(200);
    const after = (authz.json().payment as { version: number; state: string });
    expect(after.state).toBe("authorized");
    const res = await app.inject({ method: "POST", url: `/organizations/${orgId}/payments/${payment.id}/capture`, headers: auth(ownerToken), payload: { expectedVersion: after.version, amountMinor: invoiceTotalMinor, idempotencyKey: `cap-${randomUUID()}`, scenario: "success" } });
    expect(res.statusCode).toBe(200);
    const settled = res.json().payment as { state: string; amountMinor: number; allocatedMinor: number };
    expect(settled.state).toBe("succeeded");
    expect(Number(settled.amountMinor)).toBe(invoiceTotalMinor);
    expect(Number(settled.allocatedMinor)).toBe(invoiceTotalMinor);
  });

  it("step 4 — full refund reverses the settlement via real Stripe test (persisted re-close)", async () => {
    const list = await app.inject({ method: "GET", url: `/organizations/${orgId}/payments`, headers: auth(ownerToken) });
    const p = (list.json().payments as Array<{ id: string; version: number; state: string }>)[0];
    expect(p.state).toBe("succeeded");
    const res = await app.inject({ method: "POST", url: `/organizations/${orgId}/payments/${p.id}/refund`, headers: auth(ownerToken), payload: { expectedVersion: p.version, amountMinor: invoiceTotalMinor, idempotencyKey: `ref-${randomUUID()}`, scenario: "success" } });
    expect(res.statusCode).toBe(200);
    const refunded = res.json().payment as { state: string; refundedMinor: number };
    expect(refunded.state).toBe("refunded");
    expect(Number(refunded.refundedMinor)).toBe(invoiceTotalMinor);
  });
});
