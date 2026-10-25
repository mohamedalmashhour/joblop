import type { PrismaClient } from "@rwos/database";
import { grantEntitlement, PRO_PLAN } from "./cvEntitlementRepository";
import { createCvProCheckoutSession, verifyCvProCheckoutPaid, isStripeTestConfigured } from "./cvProStripeCheckout";

// Worker Pro purchase orders. Two payment methods:
//  - "e_transfer": the worker sends an Interac e-transfer to BILLING_EMAIL with the order reference, marks
//    it sent (payment_claimed), and an ADMIN confirms receipt (real admin mechanism) → paid + entitlement.
//    This is manual, off-platform money — it does not route a card through the platform.
//  - "stripe": card checkout — TEST-ONLY and GATED OFF (CV_PRO_PURCHASE_ENABLED, default disabled). No
//    live charge is wired; the self-serve complete() path stays closed while payments are frozen.
// Design-for-real; nothing auto-charges.

export const PRO_PLAN_PRICE_MINOR = 1299; // C$12.99
export const PRO_CURRENCY = "CAD";
export const PRO_PERIOD_MONTHS = 1;
export const BILLING_EMAIL = "billing@joblop.com";
export const PRO_METHODS = ["e_transfer", "stripe"] as const;
export type ProMethod = (typeof PRO_METHODS)[number];

export const PRO_PRICE = Object.freeze({
  priceMinor: PRO_PLAN_PRICE_MINOR,
  currency: PRO_CURRENCY,
  periodMonths: PRO_PERIOD_MONTHS,
  methods: PRO_METHODS,
  eTransferEmail: BILLING_EMAIL
});

/** Whether the self-serve Stripe (card) charge step is enabled. Default OFF — platform payments frozen. */
export function isPurchaseEnabled(): boolean {
  return process.env.CV_PRO_PURCHASE_ENABLED === "enabled";
}

export type OrderView = Readonly<{
  id: string;
  plan: string;
  priceMinor: number;
  currency: string;
  periodMonths: number;
  method: string;
  status: string;
  paymentRef: string | null;
  createdAt: string;
  paidAt: string | null;
}>;

function toView(row: {
  id: string; plan: string; priceMinor: number; currency: string; periodMonths: number; method: string; status: string; paymentRef: string | null; createdAt: Date; paidAt: Date | null;
}): OrderView {
  return { id: row.id, plan: row.plan, priceMinor: row.priceMinor, currency: row.currency, periodMonths: row.periodMonths, method: row.method, status: row.status, paymentRef: row.paymentRef, createdAt: row.createdAt.toISOString(), paidAt: row.paidAt ? row.paidAt.toISOString() : null };
}

/** E-transfer instructions a worker follows to pay (shown with a pending e-transfer order). */
export function eTransferInstructions(order: OrderView): Readonly<{ email: string; amount: string; reference: string; note: string }> {
  return {
    email: BILLING_EMAIL,
    amount: `${(order.priceMinor / 100).toFixed(2)} ${order.currency}`,
    reference: order.id,
    note: `Send an Interac e-transfer to ${BILLING_EMAIL} for ${(order.priceMinor / 100).toFixed(2)} ${order.currency}. Put this reference in the message: ${order.id}. Then tap “I've sent it”. Worker Pro activates once we confirm receipt.`
  };
}

/** Create (or reuse) a pending Pro order for the worker with the chosen method. */
export async function createPendingOrder(prisma: PrismaClient, workerRef: string, method: ProMethod): Promise<OrderView> {
  const existing = await prisma.cvProOrder.findFirst({
    where: { workerRef, status: { in: ["pending_payment", "payment_claimed"] }, method },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return toView(existing);
  const row = await prisma.cvProOrder.create({
    data: { workerRef, plan: PRO_PLAN, priceMinor: PRO_PLAN_PRICE_MINOR, currency: PRO_CURRENCY, periodMonths: PRO_PERIOD_MONTHS, method, status: "pending_payment" }
  });
  return toView(row);
}

export async function listOrders(prisma: PrismaClient, workerRef: string): Promise<OrderView[]> {
  const rows = await prisma.cvProOrder.findMany({ where: { workerRef }, orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map(toView);
}

export type OrderActionResult =
  | { ok: true; order: OrderView }
  | { ok: false; reason: "payments_disabled" | "order_not_found" | "not_pending" | "wrong_method" | "payment_incomplete" | "stripe_unconfigured" };

export type StripeCheckoutResult =
  | { ok: true; order: OrderView; checkoutUrl: string | null }
  | { ok: false; reason: "payments_disabled" | "stripe_unconfigured" };

/** Begin a Stripe TEST card checkout for Worker Pro: creates/reuses a pending order, opens a hosted
 *  Checkout Session, stores its id on the order, and returns the redirect URL. No card touches JobLop. */
export async function startStripeCheckout(
  prisma: PrismaClient,
  workerRef: string,
  origin: string
): Promise<StripeCheckoutResult> {
  if (!isPurchaseEnabled()) return { ok: false, reason: "payments_disabled" };
  if (!isStripeTestConfigured()) return { ok: false, reason: "stripe_unconfigured" };
  const order = await createPendingOrder(prisma, workerRef, "stripe");
  const base = origin.replace(/\/+$/, "");
  const session = await createCvProCheckoutSession({
    orderId: order.id,
    workerRef,
    priceMinor: order.priceMinor,
    currency: order.currency,
    successUrl: `${base}/cv-builder?pro=success&order=${order.id}`,
    cancelUrl: `${base}/cv-builder?pro=cancel`
  });
  const updated = await prisma.cvProOrder.update({ where: { id: order.id }, data: { paymentRef: session.id } });
  return { ok: true, order: toView(updated), checkoutUrl: session.url };
}

/** Worker marks an e-transfer as sent: pending_payment → payment_claimed (awaiting admin confirmation). */
export async function claimETransfer(prisma: PrismaClient, workerRef: string, orderId: string): Promise<OrderActionResult> {
  const order = await prisma.cvProOrder.findFirst({ where: { id: orderId, workerRef } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.method !== "e_transfer") return { ok: false, reason: "wrong_method" };
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  const updated = await prisma.cvProOrder.update({ where: { id: order.id }, data: { status: "payment_claimed" } });
  return { ok: true, order: toView(updated) };
}

/** Self-serve Stripe (card) completion — GATED. Verifies the hosted Checkout Session was actually PAID
 *  (test mode) before granting Pro; never trusts the client. Idempotent if already paid. */
export async function completeStripeOrder(prisma: PrismaClient, workerRef: string, orderId: string): Promise<OrderActionResult> {
  if (!isPurchaseEnabled()) return { ok: false, reason: "payments_disabled" };
  if (!isStripeTestConfigured()) return { ok: false, reason: "stripe_unconfigured" };
  const order = await prisma.cvProOrder.findFirst({ where: { id: orderId, workerRef } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status === "paid") return { ok: true, order: toView(order) }; // already granted — idempotent
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  if (order.method !== "stripe" || !order.paymentRef) return { ok: false, reason: "wrong_method" };
  const { paid, paymentRef } = await verifyCvProCheckoutPaid(order.paymentRef, order.id);
  if (!paid) return { ok: false, reason: "payment_incomplete" };
  return finalizePaid(prisma, order.id, workerRef, order.periodMonths, "purchase", paymentRef ?? `stripe-test-${order.id}`);
}

// ── admin ──────────────────────────────────────────────────────────────────────────────────────
export async function listOrdersForReview(prisma: PrismaClient): Promise<(OrderView & { workerRef: string })[]> {
  const rows = await prisma.cvProOrder.findMany({ where: { status: { in: ["pending_payment", "payment_claimed"] } }, orderBy: { createdAt: "asc" }, take: 100 });
  return rows.map((r) => ({ ...toView(r), workerRef: r.workerRef }));
}

/** Admin confirms a received e-transfer → paid + grant. The real admin mechanism; manual money receipt. */
export async function adminConfirmOrder(prisma: PrismaClient, orderId: string, grantedByUserId: string): Promise<OrderActionResult> {
  const order = await prisma.cvProOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status !== "payment_claimed" && order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  return finalizePaid(prisma, order.id, order.workerRef, order.periodMonths, "purchase", `etransfer-confirmed-${order.id}`, grantedByUserId);
}

export async function adminRejectOrder(prisma: PrismaClient, orderId: string): Promise<boolean> {
  const res = await prisma.cvProOrder.updateMany({ where: { id: orderId, status: { in: ["pending_payment", "payment_claimed"] } }, data: { status: "canceled" } });
  return res.count === 1;
}

async function finalizePaid(
  prisma: PrismaClient,
  orderId: string,
  workerRef: string,
  periodMonths: number,
  source: "purchase",
  paymentRef: string,
  grantedByUserId?: string
): Promise<{ ok: true; order: OrderView }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime());
  expiresAt.setMonth(expiresAt.getMonth() + periodMonths);
  const paid = await prisma.cvProOrder.update({ where: { id: orderId }, data: { status: "paid", paidAt: now, paymentRef } });
  await grantEntitlement(prisma, { workerRef, plan: PRO_PLAN, source, expiresAt, grantedByUserId: grantedByUserId ?? null });
  return { ok: true, order: toView(paid) };
}
