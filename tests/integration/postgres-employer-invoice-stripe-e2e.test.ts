import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// REAL-PROVIDER persisted employer-invoice → Stripe TEST collection (Money-flow Phase 1). Mirrors
// postgres-close-stripe-e2e's gating. It proves, against the REAL Stripe test sandbox + REAL Postgres:
//   1. an issued invoice opens a real hosted Checkout Session (Stripe returns a checkout URL), and
//   2. /complete RETRIEVES that session from Stripe and REFUSES it while it is unpaid — i.e. the
//      "never trust the client" verify step genuinely queries Stripe, not the browser.
// A fully-paid transition requires paying on Stripe's hosted page (browser) or the signed webhook; those
// are covered by the unit + real-crypto route tests. TEST-mode only; fail-closed; no money moves.
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

suite("persisted employer-invoice Stripe TEST collection (REAL Stripe test)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let ownerId = "";
  let ownerToken = "";
  let orgId = "";
  let invoiceId = "";
  let invoiceTotalMinor = 0;
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }

  beforeAll(async () => {
    app = buildApi({
      countryCurrency: "CAD",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        RWOS_ENV: "test",
        NODE_ENV: "test",
        DOCUMENT_LOCAL_UPLOAD_ENABLED: "disabled",
        STRIPE_TEST_MODE_ENABLED: "enabled",
        INVOICE_TEST_MODE_ENABLED: "enabled"
      },
      resolveAuthorizationRoles: async () => ["PLATFORM_ADMINISTRATOR", "ORGANIZATION_OWNER", "FINANCE_REVIEWER"]
    });
    await app.ready();

    const owner = await register(`inv-owner-${randomUUID()}@e2e.local`);
    ownerId = owner.user.id;
    ownerToken = owner.token;

    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-IV-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "InvoiceCare", status: "active", createdByUserId: ownerId } });
    orgId = org.id;
    const res = await prisma.residence.create({ data: { publicId: `RES-IV-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: ownerId, province: "QC", city: "Laval" } });
    const ord = 100000 + Math.floor(Math.random() * 800000);
    const wg = await prisma.workGroup.create({ data: { key: `wg-${randomUUID().slice(0, 8)}`, displayLabel: "Care", displayOrder: ord } });
    const role = await prisma.roleDefinition.create({ data: { workGroupId: wg.id, key: `role-${randomUUID().slice(0, 8)}`, displayLabel: "PSW", displayOrder: ord + 1 } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-IV-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: ownerId } });
    const scope = { organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id };
    await prisma.organizationMembership.create({ data: { organizationId: org.id, userId: ownerId, status: "active", acceptedAt: NOW } });

    // Minimal locked timesheet so the invoice route accepts the source.
    const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-IV-${randomUUID().slice(0, 10)}`, ...scope, creatorUserId: ownerId, title: "Invoice shift", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto", startAt: start, endAt: end, status: "approved_for_dispatch", createdByUserId: ownerId } });
    const attId = randomUUID();
    const tsId = randomUUID();
    const s = start.toISOString();
    const e = end.toISOString();
    const n = NOW.toISOString();
    const workerUser = await register(`inv-w-${randomUUID()}@e2e.local`);
    const workerId = (await prisma.workerIdentity.create({ data: { userId: workerUser.user.id, displayName: "Invoice Worker", status: "active" } })).id;
    const assignmentId = randomUUID();
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

    const money = (amountMinor: number) => ({ amountMinor, currency: "CAD" });
    const zero = money(0);
    const invRes = await app.inject({
      method: "POST", url: `/organizations/${orgId}/invoices`, headers: auth(ownerToken),
      payload: {
        idempotencyKey: `inv-${randomUUID()}`,
        calculation: {
          source: { type: "locked_timesheet", organizationId: orgId, timesheetId: tsId, timesheetVersion: 1, assignmentId, attendanceRecordId: attId },
          rules: { employerTermsVersion: "v1", calculationPolicyVersion: "v1", taxPolicyVersion: "v1", travelPolicyVersion: "v1", adjustmentPolicyVersion: "v1", paymentTermsVersion: "v1" },
          occurredAt: "2026-10-20T21:00:00.000Z",
          regularLabour: money(24000),
          urgentLabour: zero, approvedTravelTime: zero, mileage: zero, adjustments: zero, marketplaceFees: zero, credits: zero,
          lineRuleVersions: { regular_labour: "v1", urgent_labour: "v1", approved_travel_time: "v1", mileage: "v1", adjustment: "v1", marketplace_fee: "v1", credit: "v1" }
        }
      }
    });
    const invoice = invRes.json().invoice as { id: string; totalMinor?: number };
    invoiceId = invoice.id;
    invoiceTotalMinor = invoice.totalMinor ?? 0;
    // Issue the invoice so it is collectible.
    await prisma.$executeRawUnsafe(`UPDATE invoices SET status = 'issued', invoice_number = $3, issued_at = now() WHERE id = $1 AND organization_id = $2`, invoiceId, orgId, `INV-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => { await app?.close(); await prisma.$disconnect(); });

  it("step 1 — opens a REAL Stripe test hosted Checkout Session for the issued invoice", async () => {
    const res = await app.inject({ method: "POST", url: `/organizations/${orgId}/invoices/${invoiceId}/checkout`, headers: auth(ownerToken), payload: {} });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { checkoutUrl: string; checkout: { status: string; amountMinor: number } };
    expect(body.checkoutUrl).toContain("https://");
    expect(body.checkout.status).toBe("pending_payment");
    expect(body.checkout.amountMinor).toBe(invoiceTotalMinor);
    const row = await prisma.employerInvoiceCheckout.findUnique({ where: { organizationId_invoiceId: { organizationId: orgId, invoiceId } } });
    expect(row?.checkoutSessionId).toMatch(/^cs_test_/);
  });

  it("step 2 — /complete queries Stripe and REFUSES the still-unpaid session (never trusts the client)", async () => {
    const res = await app.inject({ method: "POST", url: `/organizations/${orgId}/invoices/${invoiceId}/checkout/complete`, headers: auth(ownerToken), payload: {} });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ reason: "payment_incomplete" });
    // The invoice stays issued — no money moved, nothing flipped on an unpaid session.
    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: orgId }, select: { status: true } });
    expect(invoice?.status).toBe("issued");
  });
});
