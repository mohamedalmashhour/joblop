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
import { createWithShortRef, formatCadMinor } from "./paymentFormat";
import { issuePaymentReceipt, listOrganizationReceipts } from "./paymentReceipts";

// Employer fixed plans — SHORT-TERM jobs only (long-term jobs are paid listings, see
// jobListingRepository.ts; the retired long_term plan rows are ignored). One row per organization per
// track; only the short_term track is used. Prices are shown and charged with GST + QST. Mirrors Worker Pro
// (cvEntitlementRepository + cvProOrderRepository):
//  - trial: 14 days, once per organization per track, no card. Plan discount applies during it.
//  - e_transfer: employer claims it sent, staff confirms → paid, plan active for one month.
//  - stripe: TEST-mode hosted Checkout only, verified paid on return before activating.
//  - cancel: the plan stays until the end of the trial/period, then is not renewed; open e-transfer
//    orders are withdrawn (claimed-sent ones go to staff as "refund_check").
//  - paid: a numbered receipt is written with the payment (paymentReceipts.ts) and emailed after.
//  - buying the plan you are trialing starts the paid month at the trial end; a renewal of an active
//    plan extends from its paid-until date.
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
  /** What the employer puts in the Interac message: the short code (older orders: the order id). */
  reference: string;
  paymentRef: string | null;
  cancelReason: string | null;
  createdAt: string;
  claimedAt: string | null;
  canceledAt: string | null;
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
  shortRef?: string | null;
  claimedAt?: Date | null;
  canceledAt?: Date | null;
  cancelReason?: string | null;
  amountReceivedMinor?: number | null;
  staffNote?: string | null;
  createdAt: Date;
  updatedAt?: Date;
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
    reference: row.shortRef ?? row.id,
    // A Stripe Checkout Session id is internal; never echo it to the employer.
    paymentRef: row.method === "e_transfer" ? row.paymentRef : null,
    cancelReason: row.cancelReason ?? null,
    createdAt: row.createdAt.toISOString(),
    claimedAt: row.claimedAt ? row.claimedAt.toISOString() : null,
    canceledAt: row.canceledAt ? row.canceledAt.toISOString() : null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null
  };
}

/** When a paid month bought now would start: at the trial end while trialing the same plan, else now. */
export function paidMonthStart(current: EffectiveEmployerPlan, plan: string, now: Date): Date {
  if ((current.status === "active" || current.status === "trialing") && current.plan === plan && current.endsAt) {
    const end = new Date(current.endsAt);
    if (end.getTime() > now.getTime()) return end;
  }
  return now;
}

/** E-transfer instructions shown with a pending e-transfer order. Money is written like the site: $56.34. */
export function employerPlanETransferInstructions(order: EmployerPlanOrderView, startsAtTrialEnd = false, startsAt: Date | null = null) {
  const amount = formatCadMinor(order.totalMinor);
  const breakdown = `${formatCadMinor(order.subtotalMinor)} + GST ${formatCadMinor(order.gstMinor)} + QST ${formatCadMinor(order.qstMinor)}`;
  return {
    email: BILLING_EMAIL,
    amount,
    amountMinor: order.totalMinor,
    breakdown,
    reference: order.reference,
    startsAtTrialEnd,
    /** When the paid month would start if it is later than now (trial end, or the current paid-until). */
    startsAt: startsAt ? startsAt.toISOString() : null,
    note:
      `Send an Interac e-transfer to ${BILLING_EMAIL} for ${amount} (${breakdown}). Put this reference in the message: ${order.reference}. Then tap “I've sent it”. ` +
      (startsAtTrialEnd ? "Your paid month starts when your trial ends." : "Your plan starts once we confirm receipt.")
  };
}

const OPEN_PLAN_CODES = ["shift_pro", "shift_business"];

/** The short-term plan, recent plan orders (open e-transfer ones with their instructions) and receipts. */
export async function getEmployerPlanOverview(prisma: PrismaClient, organizationId: string, now: Date = new Date()) {
  const current = await getEffectiveEmployerPlan(prisma, organizationId, "short_term", now);
  const orders = await prisma.employerPlanOrder.findMany({
    where: { organizationId, plan: { in: OPEN_PLAN_CODES } },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  const receipts = await listOrganizationReceipts(prisma, organizationId);
  return {
    tracks: [current],
    orders: orders.map((row) => {
      const view = toOrderView(row);
      const open = view.method === "e_transfer" && OPEN_ORDER_STATUSES.includes(view.status);
      const start = paidMonthStart(current, view.plan, now);
      const later = start.getTime() > now.getTime();
      return open ? { ...view, eTransfer: employerPlanETransferInstructions(view, current.status === "trialing" && later, later ? start : null) } : view;
    }),
    receipts
  };
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
  | Readonly<{ ok: true; plan: EffectiveEmployerPlan; withdrawn: Readonly<{ canceled: number; refundCheck: number }> }>
  | Readonly<{ ok: false; reason: "no_paid_plan" | "invalid_track" }>;

/**
 * Cancel: the plan stays until its trial/period end, then is not renewed. Open e-transfer orders for
 * the plan are withdrawn so a later staff confirm cannot quietly undo the cancel: an order not yet
 * paid is canceled; an order the employer said was sent becomes "refund_check" — staff can no longer
 * confirm it and must check whether money arrived and send it back.
 */
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
  return prisma.$transaction(async (tx) => {
    await tx.employerPlan.update({
      where: { organizationId_track: { organizationId, track } },
      data: { cancelAtPeriodEnd: true }
    });
    const canceled = await tx.employerPlanOrder.updateMany({
      where: { organizationId, plan: { in: OPEN_PLAN_CODES }, method: "e_transfer", status: "pending_payment" },
      data: { status: "canceled", cancelReason: "employer_canceled", canceledAt: now }
    });
    const refundCheck = await tx.employerPlanOrder.updateMany({
      where: { organizationId, plan: { in: OPEN_PLAN_CODES }, method: "e_transfer", status: "payment_claimed" },
      data: { status: "refund_check", cancelReason: "employer_canceled", canceledAt: now }
    });
    return {
      ok: true as const,
      plan: await getEffectiveEmployerPlan(tx as unknown as PrismaClient, organizationId, track, now),
      withdrawn: { canceled: canceled.count, refundCheck: refundCheck.count }
    };
  });
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
  const row = await createWithShortRef((shortRef) =>
    prisma.employerPlanOrder.create({
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
        status: "pending_payment",
        shortRef
      }
    })
  );
  return toOrderView(row);
}

/** Instructions for a new e-transfer order, telling a trialing employer the paid month waits for the trial end. */
export async function employerPlanETransferFor(
  prisma: PrismaClient,
  organizationId: string,
  order: EmployerPlanOrderView,
  now: Date = new Date()
) {
  const current = await getEffectiveEmployerPlan(prisma, organizationId, "short_term", now);
  const start = paidMonthStart(current, order.plan, now);
  const later = start.getTime() > now.getTime();
  return employerPlanETransferInstructions(order, current.status === "trialing" && later, later ? start : null);
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
  | Readonly<{ ok: true; order: EmployerPlanOrderView; receiptId: string | null }>
  | Readonly<{
      ok: false;
      reason:
        | "order_not_found"
        | "not_pending"
        | "wrong_method"
        | "payment_incomplete"
        | "stripe_unconfigured"
        | "canceled_by_employer"
        | "amount_short";
    }>;

/** Employer marks an e-transfer sent: pending_payment → payment_claimed (awaiting staff). */
export async function claimEmployerPlanETransfer(
  prisma: PrismaClient,
  organizationId: string,
  orderId: string,
  now: Date = new Date()
): Promise<OrderActionResult> {
  const order = await prisma.employerPlanOrder.findFirst({ where: { id: orderId, organizationId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.method !== "e_transfer") return { ok: false, reason: "wrong_method" };
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  const updated = await prisma.employerPlanOrder.update({ where: { id: order.id }, data: { status: "payment_claimed", claimedAt: now } });
  return { ok: true, order: toOrderView(updated), receiptId: null };
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
  if (order.status === "paid") return { ok: true, order: toOrderView(order), receiptId: null };
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  if (order.method !== "stripe" || !order.paymentRef) return { ok: false, reason: "wrong_method" };
  const { paid, paymentRef } = await verifyEmployerPlanCheckoutPaid(order.paymentRef, order.id);
  if (!paid) return { ok: false, reason: "payment_incomplete" };
  return finalizePaidOrder(prisma, order.id, { paymentRef: paymentRef ?? `stripe-test-${order.id}`, receiptRef: order.shortRef ?? order.id }, now);
}

// ── staff ──────────────────────────────────────────────────────────────────────────────────────

const STAFF_OPEN_STATUSES = [...OPEN_ORDER_STATUSES, "refund_check"];
const STAFF_DONE_STATUSES = ["paid", "canceled"];

export type StaffOrderView = "open" | "done";

/** Staff queue: open orders (incl. canceled-by-employer orders that need a refund check), or the done history. */
export async function listEmployerPlanOrdersForReview(prisma: PrismaClient, view: StaffOrderView = "open") {
  const rows = await prisma.employerPlanOrder.findMany({
    where: { status: { in: view === "done" ? STAFF_DONE_STATUSES : STAFF_OPEN_STATUSES } },
    orderBy: view === "done" ? { updatedAt: "desc" } : { createdAt: "asc" },
    take: 100,
    include: { organization: { select: { displayName: true } }, receipt: { select: { receiptNumber: true } } }
  });
  return rows.map((row) => ({
    ...toOrderView(row),
    organizationId: row.organizationId,
    organizationName: row.organization.displayName,
    amountReceivedMinor: row.amountReceivedMinor ?? null,
    staffNote: row.staffNote ?? null,
    updatedAt: row.updatedAt.toISOString(),
    receiptNumber: row.receipt?.receiptNumber ?? null
  }));
}

export type StaffConfirmInput = Readonly<{
  /** The Interac reference staff read in the bank (optional). */
  interacReference?: string | null;
  /** The amount staff saw arrive, in cents (optional). Less than the total is refused. */
  amountReceivedMinor?: number | null;
}>;

/** Staff confirm a received e-transfer → paid; the plan is active for one month. */
export async function adminConfirmEmployerPlanOrder(
  prisma: PrismaClient,
  orderId: string,
  now: Date = new Date(),
  input: StaffConfirmInput = {}
): Promise<OrderActionResult> {
  const order = await prisma.employerPlanOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status === "refund_check") return { ok: false, reason: "canceled_by_employer" };
  if (!OPEN_ORDER_STATUSES.includes(order.status)) return { ok: false, reason: "not_pending" };
  const total = orderTaxes(order).totalMinor;
  const received = input.amountReceivedMinor ?? null;
  if (received !== null && received < total) return { ok: false, reason: "amount_short" };
  const interac = input.interacReference ?? null;
  return finalizePaidOrder(
    prisma,
    order.id,
    {
      paymentRef: interac ?? `etransfer-confirmed-${order.id}`,
      receiptRef: interac ?? order.shortRef ?? order.id,
      amountReceivedMinor: received,
      staffNote: received !== null ? `Amount received: ${formatCadMinor(received)}` : null
    },
    now
  );
}

/** Staff reject an open order, or close a canceled-by-employer order after checking the refund. */
export async function adminRejectEmployerPlanOrder(prisma: PrismaClient, orderId: string, now: Date = new Date()): Promise<boolean> {
  const rejected = await prisma.employerPlanOrder.updateMany({
    where: { id: orderId, status: { in: OPEN_ORDER_STATUSES } },
    data: { status: "canceled", cancelReason: "staff_rejected", canceledAt: now }
  });
  if (rejected.count === 1) return true;
  // Canceled by the employer after saying the money was sent: keep the employer reason, close it.
  const closed = await prisma.employerPlanOrder.updateMany({
    where: { id: orderId, status: "refund_check" },
    data: { status: "canceled", staffNote: "Refund checked by staff" }
  });
  return closed.count === 1;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

type FinalizeInput = Readonly<{
  paymentRef: string;
  /** The reference printed on the receipt (Interac reference, else the order's short code). */
  receiptRef: string;
  amountReceivedMinor?: number | null;
  staffNote?: string | null;
}>;

/**
 * Mark an order paid, activate (or extend) the plan for one period and write its receipt. The order
 * flip is a conditional update inside the transaction, so a double confirm / double return cannot add
 * two periods or two receipts. A renewal of the same plan that is still in force extends from its
 * current end; buying the plan you are trialing starts the paid month when the trial ends (S1).
 */
async function finalizePaidOrder(prisma: PrismaClient, orderId: string, input: FinalizeInput, now: Date): Promise<OrderActionResult> {
  return prisma.$transaction(async (tx) => {
    const flipped = await tx.employerPlanOrder.updateMany({
      where: { id: orderId, status: { in: OPEN_ORDER_STATUSES } },
      data: {
        status: "paid",
        paidAt: now,
        paymentRef: input.paymentRef,
        ...(input.amountReceivedMinor !== undefined && input.amountReceivedMinor !== null ? { amountReceivedMinor: input.amountReceivedMinor } : {}),
        ...(input.staffNote ? { staffNote: input.staffNote } : {})
      }
    });
    const order = await tx.employerPlanOrder.findUniqueOrThrow({ where: { id: orderId } });
    if (flipped.count !== 1) {
      return order.status === "paid"
        ? { ok: true as const, order: toOrderView(order), receiptId: null }
        : { ok: false as const, reason: "not_pending" as const };
    }
    if (!isPaidEmployerPlanCode(order.plan)) throw new Error("RWOS_EMPLOYER_PLAN_ORDER_PLAN_INVALID");
    const track = employerPlanTrack(order.plan);
    const existing = await tx.employerPlan.findUnique({ where: { organizationId_track: { organizationId: order.organizationId, track } } });
    const current = effectivePlanFromRow(track, existing, now);
    const extendFrom = paidMonthStart(current, order.plan, now);
    const periodEnd = addMonths(extendFrom, order.periodMonths);
    const data = {
      plan: order.plan,
      status: "active",
      source: "purchase",
      trialEndsAt: null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false
    };
    await tx.employerPlan.upsert({
      where: { organizationId_track: { organizationId: order.organizationId, track } },
      create: { organizationId: order.organizationId, track, ...data },
      update: data
    });
    const taxes = orderTaxes(order);
    const receipt = await issuePaymentReceipt(tx, {
      organizationId: order.organizationId,
      kind: "employer_plan",
      employerPlanOrderId: order.id,
      itemCode: order.plan,
      itemLabel: PLAN_LABEL[order.plan],
      periodStart: extendFrom,
      periodEnd,
      ...taxes,
      currency: order.currency,
      paymentMethod: order.method,
      paymentRef: input.receiptRef,
      paidAt: now
    });
    return { ok: true as const, order: toOrderView(order), receiptId: receipt.id };
  });
}
