import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// Persisted worker-payout → Stripe TEST execution (Money-flow Phase 2), against REAL Postgres. It
// proves end-to-end, with no Stripe network (the SYNTHETIC path runs when no test connected account is
// configured):
//   1. a LOCKED payroll calculation whose pay-period ended > the two-week hold ago materializes a
//      worker payout that AUTO-RELEASES on the first /worker/payouts read;
//   2. the gated admin /execute-test-payout flips the RELEASED payout to `paid`, recording a synthetic
//      TEST reference — INDEPENDENT of FINANCE_LIVE_ENABLED (which stays off);
//   3. the worker's /worker/payouts then surfaces it as paid with that reference;
//   4. a second execution is idempotent (already_paid), and
//   5. with PAYOUT_TEST_MODE_ENABLED off the endpoint refuses (423) — nothing moves.
// TEST-mode only; fail-closed; no real money.
//
// Gate: RWOS_TEST_DATABASE_URL (Postgres). No Stripe network is used.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

const STRIPE_TEST_ENV = {
  STRIPE_TEST_MODE_ENABLED: "enabled",
  STRIPE_TEST_SECRET_KEY: "sk_test_synthetic_reference",
  STRIPE_TEST_WEBHOOK_SECRET: "whsec_synthetic_reference",
  STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic"
} as const;

suite("persisted worker-payout Stripe TEST execution", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  const ORIGINAL_ENV = { ...process.env };
  let adminToken = "";
  let workerToken = "";
  let workerIdentityId = "";
  let orgId = "";
  let payoutId = "";
  const netPayMinor = 48_000;
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }

  beforeAll(async () => {
    // The gate + Stripe-configured checks read process.env (as they do in the real server), so drive
    // them here. The SYNTHETIC transfer path runs (no connected account) → no Stripe network.
    Object.assign(process.env, STRIPE_TEST_ENV, { PAYOUT_TEST_MODE_ENABLED: "enabled" });
    delete process.env.STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT;
    delete process.env.FINANCE_LIVE_ENABLED; // proves independence — stays off throughout.
    app = buildApi({
      countryCurrency: "CAD",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        RWOS_ENV: "test",
        NODE_ENV: "test",
        DOCUMENT_LOCAL_UPLOAD_ENABLED: "disabled"
      },
      resolveAuthorizationRoles: async () => ["PLATFORM_ADMINISTRATOR", "FINANCE_REVIEWER"]
    });
    await app.ready();

    const admin = await register(`payout-admin-${randomUUID()}@e2e.local`);
    adminToken = admin.token;
    const adminUserId = admin.user.id;
    const worker = await register(`payout-worker-${randomUUID()}@e2e.local`);
    workerToken = worker.token;

    const org = await prisma.employerOrganization.create({
      data: { publicId: `ORG-PO-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "PayoutCare", status: "active", createdByUserId: admin.user.id }
    });
    orgId = org.id;
    workerIdentityId = (await prisma.workerIdentity.create({ data: { userId: worker.user.id, displayName: "Payout Worker", status: "active" } })).id;

    // A pay period that ended 20 days ago — comfortably past the 14-day hold, so the payout releases.
    const periodEnd = new Date(Date.now() - 20 * 86_400_000);
    const periodStart = new Date(periodEnd.getTime() - 14 * 86_400_000);
    const period = await prisma.payrollPeriod.create({
      data: {
        organizationId: org.id,
        jurisdictionCountry: "CA",
        jurisdictionRegion: "QC",
        periodStart,
        periodEnd,
        timezone: "America/Toronto",
        currency: "CAD",
        ruleProviderKey: "synthetic",
        ruleProviderVersion: "v1",
        status: "locked",
        createdByUserId: admin.user.id
      }
    });
    await prisma.payrollCalculation.create({
      data: {
        payrollPeriodId: period.id,
        organizationId: org.id,
        workerIdentityId,
        revision: 1,
        status: "locked",
        jurisdictionCountry: "CA",
        jurisdictionRegion: "QC",
        ruleProviderKey: "synthetic",
        ruleProviderVersion: "v1",
        calculationPolicyVersion: "v1",
        workerClassification: "employee",
        currency: "CAD",
        grossPayMinor: 60_000,
        totalDeductionsMinor: 12_000,
        netPayMinor,
        totalEmployerCostMinor: 66_000,
        calculatedAt: new Date(),
        createdByUserId: adminUserId
      }
    });
  });

  afterAll(async () => { await app?.close(); await prisma.$disconnect(); process.env = { ...ORIGINAL_ENV }; });

  it("step 1 — /worker/payouts materializes and AUTO-RELEASES the payout (hold elapsed, no dispute)", async () => {
    const res = await app.inject({ method: "GET", url: "/worker/payouts", headers: auth(workerToken) });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { toPay: Array<{ id: string; status: string; amountMinor: number }>; synthetic: boolean };
    expect(body.synthetic).toBe(true);
    const released = body.toPay.find((p) => p.status === "released");
    expect(released).toBeTruthy();
    expect(released!.amountMinor).toBe(netPayMinor);
    payoutId = released!.id;
    // Finance go-live stays off throughout — nothing here depends on it.
    const row = await prisma.workerPayout.findUnique({ where: { id: payoutId }, select: { status: true, paidAt: true, paymentRef: true } });
    expect(row).toMatchObject({ status: "released", paidAt: null, paymentRef: null });
  });

  it("step 2 — the gated admin execute-test-payout flips released → paid with a synthetic TEST reference", async () => {
    const res = await app.inject({ method: "POST", url: `/platform/worker-payouts/${payoutId}/execute-test-payout`, headers: auth(adminToken), payload: {} });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { payout: { status: string; paymentRef: string; mode: string }; synthetic: boolean };
    expect(body.synthetic).toBe(true);
    expect(body.payout.status).toBe("paid");
    expect(body.payout.mode).toBe("synthetic");
    expect(body.payout.paymentRef).toBe(`payout-test-synthetic-${payoutId}`);
    const row = await prisma.workerPayout.findUnique({ where: { id: payoutId }, select: { status: true, paidAt: true, paymentRef: true } });
    expect(row?.status).toBe("paid");
    expect(row?.paidAt).not.toBeNull();
    expect(row?.paymentRef).toBe(`payout-test-synthetic-${payoutId}`);
  });

  it("step 3 — /worker/payouts now surfaces the payout as paid with its reference", async () => {
    const res = await app.inject({ method: "GET", url: "/worker/payouts", headers: auth(workerToken) });
    const body = res.json() as { paid: Array<{ id: string; status: string; paymentRef: string | null }> };
    const paid = body.paid.find((p) => p.id === payoutId);
    expect(paid?.status).toBe("paid");
    expect(paid?.paymentRef).toBe(`payout-test-synthetic-${payoutId}`);
  });

  it("step 4 — a second execution is idempotent (already_paid), no second reference", async () => {
    const res = await app.inject({ method: "POST", url: `/platform/worker-payouts/${payoutId}/execute-test-payout`, headers: auth(adminToken), payload: {} });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { payout: { status: string; mode: string; paymentRef: string } };
    expect(body.payout.status).toBe("paid");
    expect(body.payout.mode).toBe("already_paid");
    expect(body.payout.paymentRef).toBe(`payout-test-synthetic-${payoutId}`);
  });

  it("step 5 — with PAYOUT_TEST_MODE_ENABLED off, the endpoint refuses (423) and nothing moves", async () => {
    // Seed a fresh released payout (the first is already paid) to prove the gate, not the state guard.
    const fresh = await prisma.workerPayout.create({
      data: {
        workerIdentityId,
        payrollCalculationId: randomUUID(),
        organizationId: orgId,
        currency: "CAD",
        amountMinor: 1_000,
        status: "released",
        holdUntil: new Date(Date.now() - 86_400_000),
        releasedAt: new Date()
      }
    });
    // Flip the live gate off (the module reads process.env at request time) and prove the refusal.
    process.env.PAYOUT_TEST_MODE_ENABLED = "disabled";
    try {
      const res = await app.inject({ method: "POST", url: `/platform/worker-payouts/${fresh.id}/execute-test-payout`, headers: auth(adminToken), payload: {} });
      expect(res.statusCode).toBe(423);
      expect(res.json()).toMatchObject({ error: "RWOS_PAYOUT_TEST_DISABLED" });
    } finally {
      process.env.PAYOUT_TEST_MODE_ENABLED = "enabled";
    }
    const row = await prisma.workerPayout.findUnique({ where: { id: fresh.id }, select: { status: true, paymentRef: true } });
    expect(row).toMatchObject({ status: "released", paymentRef: null });
  });
});
