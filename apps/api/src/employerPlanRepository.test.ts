import { afterEach, describe, expect, it } from "vitest";
import {
  adminConfirmEmployerPlanOrder,
  adminRejectEmployerPlanOrder,
  cancelEmployerPlan,
  claimEmployerPlanETransfer,
  createPendingEmployerPlanOrder,
  effectivePlanFromRow,
  employerPlanETransferFor,
  getEmployerPlanOverview,
  isEmployerPlansEnabled,
  listEmployerPlanOrdersForReview,
  startEmployerPlanTrial
} from "./employerPlanRepository";
import { createPaymentTestPrisma } from "./paymentTestPrisma";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function row(overrides: Partial<Parameters<typeof effectivePlanFromRow>[1] & object> = {}) {
  return {
    track: "short_term",
    plan: "shift_pro",
    status: "active",
    source: "purchase",
    trialEndsAt: null,
    currentPeriodEnd: new Date(NOW.getTime() + 10 * DAY),
    cancelAtPeriodEnd: false,
    trialUsedAt: null,
    ...overrides
  };
}

describe("employer plans flag", () => {
  afterEach(() => {
    delete process.env.EMPLOYER_PLANS_ENABLED;
  });
  it("is off unless exactly 'enabled'", () => {
    delete process.env.EMPLOYER_PLANS_ENABLED;
    expect(isEmployerPlansEnabled()).toBe(false);
    process.env.EMPLOYER_PLANS_ENABLED = "true";
    expect(isEmployerPlansEnabled()).toBe(false);
    process.env.EMPLOYER_PLANS_ENABLED = "enabled";
    expect(isEmployerPlansEnabled()).toBe(true);
  });
});

describe("effectivePlanFromRow — expiry evaluated at read time", () => {
  it("no row → the track's free plan, trial available", () => {
    expect(effectivePlanFromRow("short_term", null, NOW)).toMatchObject({ plan: "pay_per_shift", status: "none", trialAvailable: true });
    // Long-term jobs have no plans any more (paid listing); the free short-term plan is reported.
    expect(effectivePlanFromRow("long_term", null, NOW)).toMatchObject({ plan: "pay_per_shift", status: "none" });
  });

  it("an active paid plan inside its period applies", () => {
    expect(effectivePlanFromRow("short_term", row(), NOW)).toMatchObject({ plan: "shift_pro", status: "active" });
  });

  it("a paid plan past its period end falls back to free", () => {
    const past = row({ currentPeriodEnd: new Date(NOW.getTime() - 1) });
    expect(effectivePlanFromRow("short_term", past, NOW)).toMatchObject({ plan: "pay_per_shift", status: "expired" });
  });

  it("a canceled plan stays until its period end", () => {
    const canceled = row({ cancelAtPeriodEnd: true });
    expect(effectivePlanFromRow("short_term", canceled, NOW)).toMatchObject({ plan: "shift_pro", cancelAtPeriodEnd: true });
  });

  it("a trial applies until trialEndsAt, then expires; trial no longer available", () => {
    const trial = row({ status: "trialing", source: "trial", currentPeriodEnd: null, trialEndsAt: new Date(NOW.getTime() + DAY), trialUsedAt: NOW });
    expect(effectivePlanFromRow("short_term", trial, NOW)).toMatchObject({ plan: "shift_pro", status: "trialing", trialAvailable: false });
    expect(effectivePlanFromRow("short_term", trial, new Date(NOW.getTime() + 2 * DAY))).toMatchObject({ plan: "pay_per_shift", status: "expired", trialAvailable: false });
  });

  it("a plan stored under the wrong track never applies", () => {
    expect(effectivePlanFromRow("long_term", row(), NOW)).toMatchObject({ plan: "pay_per_shift", status: "expired" });
  });

  it("a retired long-term plan row (contract_plus) never applies", () => {
    const retired = row({ track: "long_term", plan: "contract_plus" });
    expect(effectivePlanFromRow("long_term", retired, NOW)).toMatchObject({ plan: "pay_per_shift", status: "expired" });
  });
});

type Stored = Record<string, unknown> & { organizationId: string; track: string };

function fakePrisma(initial: Stored[] = []) {
  const { prisma, tables } = createPaymentTestPrisma({
    plans: initial.map((row) => ({ ...row })),
    organizations: [{ id: "11111111-1111-4111-8111-111111111111", displayName: "Acme", legalName: "Acme Care Inc.", createdByUserId: "owner-1" }],
    users: [{ id: "owner-1", emailNormalized: "owner@acme.test", phone: "+15145550000", primaryLanguage: "fr" }]
  });
  return { rows: tables.plans, prisma, tables };
}

const ORG = "11111111-1111-4111-8111-111111111111";

describe("startEmployerPlanTrial — 14 days, once per org per track", () => {
  it("starts a 14-day trial on the plan's track", async () => {
    const { prisma, rows } = fakePrisma();
    const result = await startEmployerPlanTrial(prisma, ORG, "shift_business", NOW);
    expect(result).toMatchObject({ ok: true, plan: { plan: "shift_business", status: "trialing", trialAvailable: false } });
    expect(rows[0]).toMatchObject({ track: "short_term", status: "trialing", source: "trial" });
    expect((rows[0]!.trialEndsAt as Date).getTime() - NOW.getTime()).toBe(14 * DAY);
  });

  it("refuses a second trial on the same track, even after the first expired", async () => {
    const { prisma } = fakePrisma();
    await startEmployerPlanTrial(prisma, ORG, "shift_pro", NOW);
    expect(await startEmployerPlanTrial(prisma, ORG, "shift_business", NOW)).toEqual({ ok: false, reason: "already_active" });
    expect(await startEmployerPlanTrial(prisma, ORG, "shift_pro", new Date(NOW.getTime() + 20 * DAY))).toEqual({ ok: false, reason: "trial_used" });
  });

  it("the retired long-term plan can no longer be trialled", async () => {
    const { prisma } = fakePrisma();
    expect(await startEmployerPlanTrial(prisma, ORG, "contract_plus", NOW)).toEqual({ ok: false, reason: "invalid_plan" });
  });

  it("rejects free or unknown plans", async () => {
    const { prisma } = fakePrisma();
    expect(await startEmployerPlanTrial(prisma, ORG, "pay_per_shift", NOW)).toEqual({ ok: false, reason: "invalid_plan" });
    expect(await startEmployerPlanTrial(prisma, ORG, "gold", NOW)).toEqual({ ok: false, reason: "invalid_plan" });
  });
});

describe("cancelEmployerPlan", () => {
  it("keeps the plan until its end and marks it not to renew", async () => {
    const { prisma } = fakePrisma([{ organizationId: ORG, ...row() }]);
    const result = await cancelEmployerPlan(prisma, ORG, "short_term", NOW);
    expect(result).toMatchObject({ ok: true, plan: { plan: "shift_pro", status: "active", cancelAtPeriodEnd: true } });
  });

  it("refuses when nothing paid is in force or the track is unknown", async () => {
    const { prisma } = fakePrisma();
    expect(await cancelEmployerPlan(prisma, ORG, "short_term", NOW)).toEqual({ ok: false, reason: "no_paid_plan" });
    expect(await cancelEmployerPlan(prisma, ORG, "weekly", NOW)).toEqual({ ok: false, reason: "invalid_track" });
  });
});

function plusMonth(date: Date): Date {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + 1);
  return next;
}

async function trialing(plan: "shift_pro" | "shift_business" = "shift_pro") {
  const env = fakePrisma();
  await startEmployerPlanTrial(env.prisma, ORG, plan, NOW);
  return env;
}

describe("buying the plan you are trialing keeps the free days (S1)", () => {
  it("the paid month starts when the trial ends, and the employer is told so", async () => {
    const { prisma, rows, tables } = await trialing();
    const trialEnd = new Date(NOW.getTime() + 14 * DAY);
    const order = await createPendingEmployerPlanOrder(prisma, ORG, "shift_pro", "e_transfer");
    const instructions = await employerPlanETransferFor(prisma, ORG, order, NOW);
    expect(instructions).toMatchObject({ startsAtTrialEnd: true, amount: "$56.34", breakdown: "$49.00 + GST $2.45 + QST $4.89" });
    expect(instructions.note).toContain("Your paid month starts when your trial ends.");
    expect(instructions.reference).toMatch(/^JL-[2-9A-HJ-NP-Z]{5}$/);
    await claimEmployerPlanETransfer(prisma, ORG, order.id, NOW);
    const confirmed = await adminConfirmEmployerPlanOrder(prisma, order.id, NOW);
    expect(confirmed).toMatchObject({ ok: true, order: { status: "paid" } });
    expect(rows[0]).toMatchObject({ status: "active", plan: "shift_pro" });
    expect(rows[0]!.currentPeriodEnd).toEqual(plusMonth(trialEnd));
    expect(tables.receipts[0]).toMatchObject({ itemLabel: "Shift Pro", subtotalMinor: 4_900, totalMinor: 5_634 });
    expect(tables.receipts[0]!.periodStart).toEqual(trialEnd);
  });

  it("switching to another plan during the trial starts it now", async () => {
    const { prisma, rows } = await trialing("shift_pro");
    const order = await createPendingEmployerPlanOrder(prisma, ORG, "shift_business", "e_transfer");
    expect((await employerPlanETransferFor(prisma, ORG, order, NOW)).startsAtTrialEnd).toBe(false);
    await adminConfirmEmployerPlanOrder(prisma, order.id, NOW);
    expect(rows[0]).toMatchObject({ plan: "shift_business", status: "active" });
    expect(rows[0]!.currentPeriodEnd).toEqual(plusMonth(NOW));
  });
});

describe("canceling withdraws open e-transfer orders (S2)", () => {
  it("an unpaid order is canceled; a later staff confirm cannot undo the cancel", async () => {
    const { prisma, rows, tables } = await trialing();
    const order = await createPendingEmployerPlanOrder(prisma, ORG, "shift_pro", "e_transfer");
    const result = await cancelEmployerPlan(prisma, ORG, "short_term", NOW);
    expect(result).toMatchObject({ ok: true, withdrawn: { canceled: 1, refundCheck: 0 }, plan: { cancelAtPeriodEnd: true } });
    expect(tables.planOrders[0]).toMatchObject({ status: "canceled", cancelReason: "employer_canceled" });
    expect(await adminConfirmEmployerPlanOrder(prisma, order.id, NOW)).toEqual({ ok: false, reason: "not_pending" });
    expect(rows[0]).toMatchObject({ status: "trialing", cancelAtPeriodEnd: true });
    expect(tables.receipts).toHaveLength(0);
  });

  it("an order said to be sent goes to staff as 'canceled by employer — check refund' and cannot be confirmed", async () => {
    const { prisma, rows } = await trialing();
    const order = await createPendingEmployerPlanOrder(prisma, ORG, "shift_pro", "e_transfer");
    await claimEmployerPlanETransfer(prisma, ORG, order.id, NOW);
    expect(await cancelEmployerPlan(prisma, ORG, "short_term", NOW)).toMatchObject({ ok: true, withdrawn: { canceled: 0, refundCheck: 1 } });
    const open = await listEmployerPlanOrdersForReview(prisma, "open");
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ status: "refund_check", cancelReason: "employer_canceled", claimedAt: NOW.toISOString() });
    expect(await adminConfirmEmployerPlanOrder(prisma, order.id, NOW)).toEqual({ ok: false, reason: "canceled_by_employer" });
    expect(rows[0]).toMatchObject({ status: "trialing", cancelAtPeriodEnd: true });
    // Staff close it once the refund is handled; it moves to the done history.
    expect(await adminRejectEmployerPlanOrder(prisma, order.id, NOW)).toBe(true);
    const done = await listEmployerPlanOrdersForReview(prisma, "done");
    expect(done[0]).toMatchObject({ status: "canceled", cancelReason: "employer_canceled" });
  });
});

describe("renewing an active paid plan (S3) and staff confirm details (S9)", () => {
  it("a renewal extends from the current paid-until date and writes a receipt for that month", async () => {
    const paidUntil = new Date(NOW.getTime() + 10 * DAY);
    const { prisma, rows, tables } = fakePrisma([{ organizationId: ORG, ...row({ currentPeriodEnd: paidUntil }) }]);
    const overviewBefore = await getEmployerPlanOverview(prisma, ORG, NOW);
    expect(overviewBefore.tracks[0]).toMatchObject({ status: "active", plan: "shift_pro" });
    const order = await createPendingEmployerPlanOrder(prisma, ORG, "shift_pro", "e_transfer");
    expect(await employerPlanETransferFor(prisma, ORG, order, NOW)).toMatchObject({ startsAtTrialEnd: false, startsAt: paidUntil.toISOString() });
    await adminConfirmEmployerPlanOrder(prisma, order.id, NOW, { interacReference: "C1AbCdEf", amountReceivedMinor: 5_634 });
    expect(rows[0]!.currentPeriodEnd).toEqual(plusMonth(paidUntil));
    expect(tables.receipts[0]).toMatchObject({ receiptNumber: "RCPT-2026-000001", paymentRef: "C1AbCdEf", paymentMethod: "e_transfer" });
    expect(tables.receipts[0]!.periodStart).toEqual(paidUntil);
    expect(tables.planOrders[0]).toMatchObject({ paymentRef: "C1AbCdEf", amountReceivedMinor: 5_634, staffNote: "Amount received: $56.34" });
    const overview = await getEmployerPlanOverview(prisma, ORG, NOW);
    expect(overview.receipts).toHaveLength(1);
    expect(overview.receipts[0]).toMatchObject({ receiptNumber: "RCPT-2026-000001", totalMinor: 5_634 });
  });

  it("refuses a short amount, and a double confirm adds no month and no receipt", async () => {
    const { prisma, rows, tables } = await trialing();
    const order = await createPendingEmployerPlanOrder(prisma, ORG, "shift_business", "e_transfer");
    expect(await adminConfirmEmployerPlanOrder(prisma, order.id, NOW, { amountReceivedMinor: 14_900 })).toEqual({ ok: false, reason: "amount_short" });
    expect(await adminConfirmEmployerPlanOrder(prisma, order.id, NOW, { amountReceivedMinor: 17_131 })).toMatchObject({ ok: true });
    const end = rows[0]!.currentPeriodEnd;
    expect(await adminConfirmEmployerPlanOrder(prisma, order.id, NOW)).toEqual({ ok: false, reason: "not_pending" });
    expect(rows[0]!.currentPeriodEnd).toEqual(end);
    expect(tables.receipts).toHaveLength(1);
  });

  it("open e-transfer orders carry the short reference and the instructions in the overview", async () => {
    const { prisma } = await trialing();
    const order = await createPendingEmployerPlanOrder(prisma, ORG, "shift_pro", "e_transfer");
    const overview = await getEmployerPlanOverview(prisma, ORG, NOW);
    const open = overview.orders[0] as { reference: string; eTransfer?: { reference: string; amount: string; startsAtTrialEnd: boolean } };
    expect(open.reference).toBe(order.reference);
    expect(open.eTransfer).toMatchObject({ reference: order.reference, amount: "$56.34", startsAtTrialEnd: true });
  });
});
