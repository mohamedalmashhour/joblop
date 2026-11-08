import type { PrismaClient } from "@rwos/database";
import {
  EMPLOYER_PLAN_CATALOG,
  EMPLOYER_PLAN_TRIAL_DAYS,
  employerPlanTrack,
  isEmployerPlanCode,
  isPaidEmployerPlanCode,
  type EmployerPlanCode,
  type JobLength,
  type PaidEmployerPlanCode,
  quebecSalesTax
} from "@rwos/shared";
import { isStripeTestConfigured } from "./cvProStripeCheckout";
import { BILLING_EMAIL } from "./cvProOrderRepository";
import { createEmployerPlanCheckoutSession, verifyEmployerPlanCheckoutPaid } from "./employerPlanStripeCheckout";

// Employer fixed plans — SHORT-TERM jobs only (long-term jobs are paid listings, see
// jobListingRepository.ts; the retired long_term plan rows are ignored). One row per organization per
// track; only the short_term track is used. Prices are shown and charged with GST + QST. Mirrors Worker Pro
// (cvEntitlementRepository + cvProOrderRepository):
//  - trial: 14 days, once per organization per track, no card. Plan discount applies during it.
//  - e_transfer: employer claims it sent, staff confirms → paid, plan active for one month.
//  - stripe: TEST-mode hosted Checkout only, verified paid on return before activating.
//  - cancel: the plan stays until the end of the trial/period, then is not renewed.
// Expiry is evaluated at READ time (like CvEntitlement): once trialEndsAt / currentPeriodEnd passes
// the organization is back on the track's free plan, with no background job.
// Everything is OFF unless EMPLOYER_PLANS_ENABLED === "enabled".

export function isEmployerPlansEnabled(): boolean {
  return process.env.EMPLOYER_PLANS_ENABLED === "enabled";
}

export const EMPLOYER_PLAN_PERIOD_MONTHS = 1;
export const EMPLOYER_PLAN_METHODS = ["e_transfer", "stripe"] as const;
export type EmployerPlanMethod = (typeof EMPLOYER_PLAN_METHODS)[number];

export function isEmployerPlanMethod(value: unknown): value is EmployerPlanMethod {
  return value === "e_transfer" || value === "stripe";
}

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_ORDER_STATUSES = ["pending_payment", "payment_claimed"];

type PlanRow = Readonly<{
  track: string;
  plan: string;
  status: string;
  source: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialUsedAt: Date | null;
}>;

export type EffectiveEmployerPlan = Readonly<{
  track: JobLength;
  /** The plan that applies right now (the track's free plan when nothing paid/trialing is in force). */
  plan: EmployerPlanCode;
  /** none = never had a plan on this track; expired = had one, it ended. */
  status: "none" | "active" | "trialing" | "expired";
  source: string | null;
  /** When the current plan stops (trial end or paid period end); null for the free plan. */
  endsAt: string | null;
  cancelAtPeriodEnd: boolean;
  trialAvailable: boolean;
}>;

/** Pure: what a stored row means at `now`. */
export function effectivePlanFromRow(track: JobLength, row: PlanRow | null, now: Date): EffectiveEmployerPlan {
  const free: EmployerPlanCode = "pay_per_shift";
  const trialAvailable = !row?.trialUsedAt;
  if (!row || !isPaidEmployerPlanCode(row.plan) || employerPlanTrack(row.plan) !== track) {
    return { track, plan: free, status: row ? "expired" : "none", source: null, endsAt: null, cancelAtPeriodEnd: false, trialAvailable };
  }
  const end = row.status === "trialing" ? row.trialEndsAt : row.currentPeriodEnd;
  const inForce =
    (row.status === "trialing" || row.status === "active") && end !== null && end.getTime() > now.getTime();
  if (!inForce) {
    return { track, plan: free, status: "expired", source: row.source, endsAt: null, cancelAtPeriodEnd: false, trialAvailable };
  }
  return {
    track,
    plan: row.plan,
    status: row.status === "trialing" ? "trialing" : "active",
    source: row.source,
    endsAt: end.toISOString(),
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    trialAvailable
  };
}

async function findRow(prisma: PrismaClient, organizationId: string, track: JobLength): Promise<PlanRow | null> {
  return prisma.employerPlan.findUnique({
    where: { organizationId_track: { organizationId, track } },
    select: {
      track: true,
      plan: true,
      status: true,
      source: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      trialUsedAt: true
    }
  });
}

/** The plan in force for one track of an organization at `now`. */
export async function getEffectiveEmployerPlan(
  prisma: PrismaClient,
  organizationId: string,
  track: JobLength,
  now: Date = new Date()
): Promise<EffectiveEmployerPlan> {
  return effectivePlanFromRow(track, await findRow(prisma, organizationId, track), now);
}

export type EmployerPlanOrderView = Readonly<{
  id: string;
  plan: string;
  track: JobLength | null;
  /** Price before taxes (the plan's monthly price). */
  priceMinor: number;
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  /** What the employer pays: subtotal + GST + QST. */
  totalMinor: number;
  currency: string;
  periodMonths: number;
  method: string;
  status: string;
  paymentRef: string | null;
  createdAt: string;
  paidAt: string | null;
}>;

type OrderRow = Readonly<{
  id: string;
  organizationId: string;
  plan: string;
  priceMinor: number;
  subtotalMinor?: number | null;
  gstMinor?: number | null;
  qstMinor?: number | null;
  totalMinor?: number | null;
  currency: string;
  periodMonths: number;
  method: string;
  status: string;
  paymentRef: string | null;
  createdAt: Date;
  paidAt: Date | null;
}>;

/** Stored tax breakdown, or (orders created before taxes were stored) computed from the price. */
function orderTaxes(row: OrderRow) {
  if (row.totalMinor !== null && row.totalMinor !== undefined) {
    return {
      subtotalMinor: row.subtotalMinor ?? row.priceMinor,
      gstMinor: row.gstMinor ?? 0,
      qstMinor: row.qstMinor ?? 0,
      totalMinor: row.totalMinor
    };
  }
  return quebecSalesTax(row.priceMinor);
}

function toOrderView(row: OrderRow): EmployerPlanOrderView {
  return {
    id: row.id,
    plan: row.plan,
    track: isEmployerPlanCode(row.plan) ? employerPlanTrack(row.plan) : null,
    priceMinor: row.priceMinor,
    ...orderTaxes(row),
    currency: row.currency,
    periodMonths: row.periodMonths,
    method: row.method,
    status: row.status,
    // A Stripe Checkout Session id is internal; never echo it to the employer.
    paymentRef: row.method === "e_transfer" ? row.paymentRef : null,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null
  };
}

/** The short-term plan + recent plan orders, for the employer /plans page. */
export async function getEmployerPlanOverview(prisma: PrismaClient, organizationId: string, now: Date = new Date()) {
  const tracks = [await getEffectiveEmployerPlan(prisma, organizationId, "short_term", now)];
  const orders = await prisma.employerPlanOrder.findMany({
    where: { organizationId, plan: { in: ["shift_pro", "shift_business"] } },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  return { tracks, orders: orders.map(toOrderView) };
}

export type StartTrialResult =
  | Readonly<{ ok: true; plan: EffectiveEmployerPlan }>
  | Readonly<{ ok: false; reason: "already_active" | "trial_used" | "invalid_plan" }>;

/** Start the one-time 14-day trial of a paid plan on its track. No card, no charge. */
export async function startEmployerPlanTrial(
  prisma: PrismaClient,
  organizationId: string,
  plan: unknown,
  now: Date = new Date()
): Promise<StartTrialResult> {
  if (!isPaidEmployerPlanCode(plan)) return { ok: false, reason: "invalid_plan" };
  const track = employerPlanTrack(plan);
  const row = await findRow(prisma, organizationId, track);
  const current = effectivePlanFromRow(track, row, now);
  if (current.status === "active" || current.status === "trialing") return { ok: false, reason: "already_active" };
  if (row?.trialUsedAt) return { ok: false, reason: "trial_used" };
  const trialEndsAt = new Date(now.getTime() + EMPLOYER_PLAN_TRIAL_DAYS * DAY_MS);
  const data = {
    plan,
    status: "trialing",
    source: "trial",
    trialEndsAt,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialUsedAt: now
  };
  // Conditional write so two racing trial requests cannot both start (or restart) a trial.
  if (row) {
    const updated = await prisma.employerPlan.updateMany({
      where: { organizationId, track, trialUsedAt: null },
      data
    });
    if (updated.count !== 1) return { ok: false, reason: "trial_used" };
  } else {
    try {
      await prisma.employerPlan.create({ data: { organizationId, track, ...data } });
    } catch {
      return { ok: false, reason: "trial_used" };
    }
  }
  return { ok: true, plan: await getEffectiveEmployerPlan(prisma, organizationId, track, now) };
}

export type CancelResult =
  | Readonly<{ ok: true; plan: EffectiveEmployerPlan }>
  | Readonly<{ ok: false; reason: "no_paid_plan" | "invalid_track" }>;

/** Cancel: the plan stays until its trial/period end, then is not renewed. */
export async function cancelEmployerPlan(
  prisma: PrismaClient,
  organizationId: string,
  track: unknown,
  now: Date = new Date()
): Promise<CancelResult> {
  // Plans exist for short-term jobs only; long-term jobs are paid listings.
  if (track !== "short_term") return { ok: false, reason: "invalid_track" };
  const current = await getEffectiveEmployerPlan(prisma, organizationId, track, now);
  if (current.status !== "active" && current.status !== "trialing") return { ok: false, reason: "no_paid_plan" };
  await prisma.employerPlan.update({
    where: { organizationId_track: { organizationId, track } },
    data: { cancelAtPeriodEnd: true }
  });
  return { ok: true, plan: await getEffectiveEmployerPlan(prisma, organizationId, track, now) };
}

/** E-transfer instructions shown with a pending e-transfer order. */
export function employerPlanETransferInstructions(order: EmployerPlanOrderView) {
  const fmt = (minor: number) => `${(minor / 100).toFixed(2)} ${order.currency}`;
  const amount = fmt(order.totalMinor);
  const breakdown = `${fmt(order.subtotalMinor)} + GST ${fmt(order.gstMinor)} + QST ${fmt(order.qstMinor)}`;
  return {
    email: BILLING_EMAIL,
    amount,
    breakdown,
    reference: order.id,
    note: `Send an Interac e-transfer to ${BILLING_EMAIL} for ${amount} (${breakdown}). Put this reference in the message: ${order.id}. Then tap “I've sent it”. Your plan starts once we confirm receipt.`
  };
}

/** Create (or reuse) a pending order for a paid plan with the chosen method. Price from the catalog. */
export async function createPendingEmployerPlanOrder(
  prisma: PrismaClient,
  organizationId: string,
  plan: PaidEmployerPlanCode,
  method: EmployerPlanMethod
): Promise<EmployerPlanOrderView> {
  const existing = await prisma.employerPlanOrder.findFirst({
    where: { organizationId, plan, method, status: { in: OPEN_ORDER_STATUSES } },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return toOrderView(existing);
  const definition = EMPLOYER_PLAN_CATALOG[plan];
  const taxes = quebecSalesTax(definition.monthlyPriceMinor);
  const row = await prisma.employerPlanOrder.create({
    data: {
      organizationId,
      plan,
      priceMinor: definition.monthlyPriceMinor,
      subtotalMinor: taxes.subtotalMinor,
      gstMinor: taxes.gstMinor,
      qstMinor: taxes.qstMinor,
      totalMinor: taxes.totalMinor,
      currency: definition.currency,
      periodMonths: EMPLOYER_PLAN_PERIOD_MONTHS,
      method,
      status: "pending_payment"
    }
  });
  return toOrderView(row);
}

export type StripeStartResult =
  | Readonly<{ ok: true; order: EmployerPlanOrderView; checkoutUrl: string | null }>
  | Readonly<{ ok: false; reason: "stripe_unconfigured" }>;

const PLAN_LABEL: Record<PaidEmployerPlanCode, string> = {
  shift_pro: "Shift Pro",
  shift_business: "Shift Business"
};

/** Begin a Stripe TEST hosted Checkout for one month of a plan. */
export async function startEmployerPlanStripeCheckout(
  prisma: PrismaClient,
  organizationId: string,
  plan: PaidEmployerPlanCode,
  origin: string
): Promise<StripeStartResult> {
  if (!isStripeTestConfigured()) return { ok: false, reason: "stripe_unconfigured" };
  const order = await createPendingEmployerPlanOrder(prisma, organizationId, plan, "stripe");
  const base = origin.replace(/\/+$/, "");
  const session = await createEmployerPlanCheckoutSession({
    orderId: order.id,
    organizationId,
    planLabel: PLAN_LABEL[plan],
    // Charge the total with GST + QST, as shown on the page.
    priceMinor: order.totalMinor,
    currency: order.currency,
    successUrl: `${base}/plans?paid=success&order=${order.id}`,
    cancelUrl: `${base}/plans?paid=cancel`
  });
  const updated = await prisma.employerPlanOrder.update({ where: { id: order.id }, data: { paymentRef: session.id } });
  return { ok: true, order: toOrderView(updated), checkoutUrl: session.url };
}

export type OrderActionResult =
  | Readonly<{ ok: true; order: EmployerPlanOrderView }>
  | Readonly<{
      ok: false;
      reason: "order_not_found" | "not_pending" | "wrong_method" | "payment_incomplete" | "stripe_unconfigured";
    }>;

/** Employer marks an e-transfer sent: pending_payment → payment_claimed (awaiting staff). */
export async function claimEmployerPlanETransfer(
  prisma: PrismaClient,
  organizationId: string,
  orderId: string
): Promise<OrderActionResult> {
  const order = await prisma.employerPlanOrder.findFirst({ where: { id: orderId, organizationId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.method !== "e_transfer") return { ok: false, reason: "wrong_method" };
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  const updated = await prisma.employerPlanOrder.update({ where: { id: order.id }, data: { status: "payment_claimed" } });
  return { ok: true, order: toOrderView(updated) };
}

/** Stripe return: verify the TEST Checkout Session was paid for this order, then activate. Idempotent. */
export async function completeEmployerPlanStripeOrder(
  prisma: PrismaClient,
  organizationId: string,
  orderId: string,
  now: Date = new Date()
): Promise<OrderActionResult> {
  if (!isStripeTestConfigured()) return { ok: false, reason: "stripe_unconfigured" };
  const order = await prisma.employerPlanOrder.findFirst({ where: { id: orderId, organizationId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status === "paid") return { ok: true, order: toOrderView(order) };
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  if (order.method !== "stripe" || !order.paymentRef) return { ok: false, reason: "wrong_method" };
  const { paid, paymentRef } = await verifyEmployerPlanCheckoutPaid(order.paymentRef, order.id);
  if (!paid) return { ok: false, reason: "payment_incomplete" };
  return finalizePaidOrder(prisma, order.id, paymentRef ?? `stripe-test-${order.id}`, now);
}

// ── staff ──────────────────────────────────────────────────────────────────────────────────────

export async function listEmployerPlanOrdersForReview(prisma: PrismaClient) {
  const rows = await prisma.employerPlanOrder.findMany({
    where: { status: { in: OPEN_ORDER_STATUSES } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { organization: { select: { displayName: true } } }
  });
  return rows.map((row) => ({
    ...toOrderView(row),
    organizationId: row.organizationId,
    organizationName: row.organization.displayName
  }));
}

/** Staff confirm a received e-transfer → paid; the plan is active for one month. */
export async function adminConfirmEmployerPlanOrder(
  prisma: PrismaClient,
  orderId: string,
  now: Date = new Date()
): Promise<OrderActionResult> {
  const order = await prisma.employerPlanOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (!OPEN_ORDER_STATUSES.includes(order.status)) return { ok: false, reason: "not_pending" };
  return finalizePaidOrder(prisma, order.id, `etransfer-confirmed-${order.id}`, now);
}

export async function adminRejectEmployerPlanOrder(prisma: PrismaClient, orderId: string): Promise<boolean> {
  const res = await prisma.employerPlanOrder.updateMany({
    where: { id: orderId, status: { in: OPEN_ORDER_STATUSES } },
    data: { status: "canceled" }
  });
  return res.count === 1;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

/**
 * Mark an order paid and activate (or extend) the plan for one period. The order flip is a
 * conditional update inside the transaction, so a double confirm / double return cannot add two
 * periods. A renewal of the same plan that is still in force extends from its current end.
 */
async function finalizePaidOrder(
  prisma: PrismaClient,
  orderId: string,
  paymentRef: string,
  now: Date
): Promise<OrderActionResult> {
  return prisma.$transaction(async (tx) => {
    const flipped = await tx.employerPlanOrder.updateMany({
      where: { id: orderId, status: { in: OPEN_ORDER_STATUSES } },
      data: { status: "paid", paidAt: now, paymentRef }
    });
    const order = await tx.employerPlanOrder.findUniqueOrThrow({ where: { id: orderId } });
    if (flipped.count !== 1) {
      return order.status === "paid" ? { ok: true as const, order: toOrderView(order) } : { ok: false as const, reason: "not_pending" as const };
    }
    if (!isPaidEmployerPlanCode(order.plan)) throw new Error("RWOS_EMPLOYER_PLAN_ORDER_PLAN_INVALID");
    const track = employerPlanTrack(order.plan);
    const existing = await tx.employerPlan.findUnique({ where: { organizationId_track: { organizationId: order.organizationId, track } } });
    const current = effectivePlanFromRow(track, existing, now);
    const extendFrom =
      current.status === "active" && current.plan === order.plan && current.endsAt ? new Date(current.endsAt) : now;
    const data = {
      plan: order.plan,
      status: "active",
      source: "purchase",
      trialEndsAt: null,
      currentPeriodEnd: addMonths(extendFrom, order.periodMonths),
      cancelAtPeriodEnd: false
    };
    await tx.employerPlan.upsert({
      where: { organizationId_track: { organizationId: order.organizationId, track } },
      create: { organizationId: order.organizationId, track, ...data },
      update: data
    });
    return { ok: true as const, order: toOrderView(order) };
  });
}
