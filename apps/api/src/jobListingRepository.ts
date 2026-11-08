import type { PrismaClient } from "@rwos/database";
import {
  JOB_LISTING_PERIOD_MONTHS,
  JOB_LISTING_TRIAL_DAYS,
  extendListedUntil,
  isJobListedAt,
  jobListingMonthPrice,
  jobListingStatusAt,
  type JobListingStatus
} from "@rwos/shared";
import { isStripeTestConfigured } from "./cvProStripeCheckout";
import { BILLING_EMAIL } from "./cvProOrderRepository";
import { createJobListingCheckoutSession, verifyJobListingCheckoutPaid } from "./employerPlanStripeCheckout";
import type { EmployerPlanMethod } from "./employerPlanRepository";

// LONG-TERM JOB LISTINGS (paid in advance, Indeed model; behind EMPLOYER_PLANS_ENABLED). A long-term
// job request is shown to workers only while its listing's listedUntil is in the future. Mirrors the
// employer plan flow (employerPlanRepository.ts):
//  - trial: 14 days, once per ORGANIZATION (its first long-term listing), no card.
//  - pay: one month per order, C$99 + GST + QST; the org's first paid month ever is 50% off.
//    e_transfer (employer claims, staff confirm) or stripe (TEST hosted Checkout, verified on return).
//  - each paid month extends listedUntil by one month from the later of now and the current end.
//    No auto-renew; the employer presses "Renew 1 month". Expiry is evaluated at READ time.
// Joblop takes no hourly share on these jobs and never invoices hours or runs payroll for them.

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_ORDER_STATUSES = ["pending_payment", "payment_claimed"];
const CLOSED_JOB_STATUSES = ["cancelled", "expired", "archived"] as const;

type ListingRow = Readonly<{ id: string; listedUntil: Date | null; trialEndsAt: Date | null }>;

export type JobListingView = Readonly<{
  status: JobListingStatus;
  listedUntil: string | null;
  trialEndsAt: string | null;
}>;

function toListingView(row: ListingRow | null, now: Date): JobListingView {
  return {
    status: jobListingStatusAt(row, now),
    listedUntil: row?.listedUntil ? row.listedUntil.toISOString() : null,
    trialEndsAt: row?.trialEndsAt ? row.trialEndsAt.toISOString() : null
  };
}

export type JobListingOrderView = Readonly<{
  id: string;
  jobRequestId: string;
  months: number;
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  totalMinor: number;
  currency: string;
  discountKind: string;
  method: string;
  status: string;
  paymentRef: string | null;
  createdAt: string;
  paidAt: string | null;
}>;

type OrderRow = Readonly<{
  id: string;
  months: number;
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  totalMinor: number;
  currency: string;
  discountKind: string;
  method: string;
  status: string;
  paymentRef: string | null;
  createdAt: Date;
  paidAt: Date | null;
  jobListing: Readonly<{ jobRequestId: string }>;
}>;

function toOrderView(row: OrderRow): JobListingOrderView {
  return {
    id: row.id,
    jobRequestId: row.jobListing.jobRequestId,
    months: row.months,
    subtotalMinor: row.subtotalMinor,
    gstMinor: row.gstMinor,
    qstMinor: row.qstMinor,
    totalMinor: row.totalMinor,
    currency: row.currency,
    discountKind: row.discountKind,
    method: row.method,
    status: row.status,
    // A Stripe Checkout Session id is internal; never echo it to the employer.
    paymentRef: row.method === "e_transfer" ? row.paymentRef : null,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null
  };
}

const ORDER_INCLUDE = { jobListing: { select: { jobRequestId: true } } } as const;

async function orgMarkers(prisma: PrismaClient, organizationId: string) {
  const org = await prisma.employerOrganization.findUnique({
    where: { id: organizationId },
    select: { jobListingTrialUsedAt: true, jobListingFirstMonthUsedAt: true }
  });
  return {
    trialAvailable: !org?.jobListingTrialUsedAt,
    firstMonthHalf: !org?.jobListingFirstMonthUsedAt
  };
}

/** The org's long-term jobs with their listing status, the next month's price and recent orders. */
export async function getJobListingOverview(prisma: PrismaClient, organizationId: string, now: Date = new Date()) {
  const markers = await orgMarkers(prisma, organizationId);
  const jobs = await prisma.jobRequest.findMany({
    where: { organizationId, jobLength: "long_term", status: { notIn: [...CLOSED_JOB_STATUSES] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      status: true,
      startAt: true,
      jobListing: { select: { id: true, listedUntil: true, trialEndsAt: true } }
    }
  });
  const orders = await prisma.jobListingOrder.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: ORDER_INCLUDE
  });
  const orderViews = orders.map(toOrderView);
  return {
    trialDays: JOB_LISTING_TRIAL_DAYS,
    trialAvailable: markers.trialAvailable,
    firstMonthHalf: markers.firstMonthHalf,
    nextMonthPrice: jobListingMonthPrice(markers.firstMonthHalf),
    fullMonthPrice: jobListingMonthPrice(false),
    halfMonthPrice: jobListingMonthPrice(true),
    listings: jobs.map((job) => ({
      jobRequestId: job.id,
      title: job.title,
      jobStatus: job.status,
      startAt: job.startAt.toISOString(),
      ...toListingView(job.jobListing, now),
      openOrder:
        orderViews.find((o) => o.jobRequestId === job.id && OPEN_ORDER_STATUSES.includes(o.status)) ?? null
    })),
    orders: orderViews
  };
}

type JobCheck =
  | Readonly<{ ok: true; job: Readonly<{ id: string; title: string }>; listing: ListingRow | null }>
  | Readonly<{ ok: false; reason: "job_not_found" | "not_long_term" }>;

/** The org's own open long-term job (and its listing row, if any). */
async function ownLongTermJob(prisma: PrismaClient, organizationId: string, jobRequestId: string): Promise<JobCheck> {
  const job = await prisma.jobRequest.findFirst({
    where: { id: jobRequestId, organizationId, status: { notIn: [...CLOSED_JOB_STATUSES] } },
    select: { id: true, title: true, jobLength: true, jobListing: { select: { id: true, listedUntil: true, trialEndsAt: true } } }
  });
  if (!job) return { ok: false, reason: "job_not_found" };
  if (job.jobLength !== "long_term") return { ok: false, reason: "not_long_term" };
  return { ok: true, job: { id: job.id, title: job.title }, listing: job.jobListing };
}

export type ListingTrialResult =
  | Readonly<{ ok: true; listing: JobListingView }>
  | Readonly<{ ok: false; reason: "job_not_found" | "not_long_term" | "already_listed" | "trial_used" }>;

/** Start the org's one 14-day free trial on this long-term job. No card, no charge. */
export async function startJobListingTrial(
  prisma: PrismaClient,
  organizationId: string,
  jobRequestId: string,
  now: Date = new Date()
): Promise<ListingTrialResult> {
  const check = await ownLongTermJob(prisma, organizationId, jobRequestId);
  if (!check.ok) return check;
  if (isJobListedAt(check.listing, now)) return { ok: false, reason: "already_listed" };
  const trialEndsAt = new Date(now.getTime() + JOB_LISTING_TRIAL_DAYS * DAY_MS);
  return prisma.$transaction(async (tx) => {
    // Conditional write: two racing trial requests cannot both use the org's one trial.
    const marked = await tx.employerOrganization.updateMany({
      where: { id: organizationId, jobListingTrialUsedAt: null },
      data: { jobListingTrialUsedAt: now }
    });
    if (marked.count !== 1) return { ok: false as const, reason: "trial_used" as const };
    const data = { status: "trialing", trialEndsAt, listedUntil: trialEndsAt };
    const row = await tx.jobListing.upsert({
      where: { jobRequestId },
      create: { jobRequestId, organizationId, ...data },
      update: data,
      select: { id: true, listedUntil: true, trialEndsAt: true }
    });
    return { ok: true as const, listing: toListingView(row, now) };
  });
}

/** E-transfer instructions shown with a pending listing order (total with GST + QST). */
export function jobListingETransferInstructions(order: JobListingOrderView) {
  const fmt = (minor: number) => `${(minor / 100).toFixed(2)} ${order.currency}`;
  const amount = fmt(order.totalMinor);
  const breakdown = `${fmt(order.subtotalMinor)} + GST ${fmt(order.gstMinor)} + QST ${fmt(order.qstMinor)}`;
  return {
    email: BILLING_EMAIL,
    amount,
    breakdown,
    reference: order.id,
    note: `Send an Interac e-transfer to ${BILLING_EMAIL} for ${amount} (${breakdown}). Put this reference in the message: ${order.id}. Then tap “I've sent it”. Your job is listed for one month once we confirm receipt.`
  };
}

export type CreateListingOrderResult =
  | Readonly<{ ok: true; order: JobListingOrderView; jobTitle: string }>
  | Readonly<{ ok: false; reason: "job_not_found" | "not_long_term" }>;

/** Create (or reuse) a pending one-month order for this job's listing. Price from the shared domain. */
export async function createPendingJobListingOrder(
  prisma: PrismaClient,
  organizationId: string,
  jobRequestId: string,
  method: EmployerPlanMethod
): Promise<CreateListingOrderResult> {
  const check = await ownLongTermJob(prisma, organizationId, jobRequestId);
  if (!check.ok) return check;
  const listing =
    check.listing ??
    (await prisma.jobListing.upsert({
      where: { jobRequestId },
      create: { jobRequestId, organizationId, status: "unlisted" },
      update: {},
      select: { id: true, listedUntil: true, trialEndsAt: true }
    }));
  const existing = await prisma.jobListingOrder.findFirst({
    where: { jobListingId: listing.id, method, status: { in: OPEN_ORDER_STATUSES } },
    orderBy: { createdAt: "desc" },
    include: ORDER_INCLUDE
  });
  if (existing) return { ok: true, order: toOrderView(existing), jobTitle: check.job.title };
  const { firstMonthHalf } = await orgMarkers(prisma, organizationId);
  const price = jobListingMonthPrice(firstMonthHalf);
  const row = await prisma.jobListingOrder.create({
    data: {
      jobListingId: listing.id,
      organizationId,
      months: JOB_LISTING_PERIOD_MONTHS,
      subtotalMinor: price.subtotalMinor,
      gstMinor: price.gstMinor,
      qstMinor: price.qstMinor,
      totalMinor: price.totalMinor,
      currency: price.currency,
      discountKind: price.discountKind,
      method,
      status: "pending_payment"
    },
    include: ORDER_INCLUDE
  });
  return { ok: true, order: toOrderView(row), jobTitle: check.job.title };
}

export type ListingStripeStartResult =
  | Readonly<{ ok: true; order: JobListingOrderView; checkoutUrl: string | null }>
  | Readonly<{ ok: false; reason: "stripe_unconfigured" | "job_not_found" | "not_long_term" }>;

/** Begin a Stripe TEST hosted Checkout for one month of this job's listing (total with taxes). */
export async function startJobListingStripeCheckout(
  prisma: PrismaClient,
  organizationId: string,
  jobRequestId: string,
  origin: string
): Promise<ListingStripeStartResult> {
  if (!isStripeTestConfigured()) return { ok: false, reason: "stripe_unconfigured" };
  const created = await createPendingJobListingOrder(prisma, organizationId, jobRequestId, "stripe");
  if (!created.ok) return created;
  const { order } = created;
  const base = origin.replace(/\/+$/, "");
  const session = await createJobListingCheckoutSession({
    orderId: order.id,
    organizationId,
    jobTitle: created.jobTitle,
    totalMinor: order.totalMinor,
    currency: order.currency,
    successUrl: `${base}/employer/calendar?listing=paid&order=${order.id}`,
    cancelUrl: `${base}/employer/calendar?listing=cancel`
  });
  const updated = await prisma.jobListingOrder.update({
    where: { id: order.id },
    data: { paymentRef: session.id },
    include: ORDER_INCLUDE
  });
  return { ok: true, order: toOrderView(updated), checkoutUrl: session.url };
}

export type ListingOrderActionResult =
  | Readonly<{ ok: true; order: JobListingOrderView }>
  | Readonly<{
      ok: false;
      reason: "order_not_found" | "not_pending" | "wrong_method" | "payment_incomplete" | "stripe_unconfigured";
    }>;

/** Employer marks an e-transfer sent: pending_payment → payment_claimed (awaiting staff). */
export async function claimJobListingETransfer(
  prisma: PrismaClient,
  organizationId: string,
  orderId: string
): Promise<ListingOrderActionResult> {
  const order = await prisma.jobListingOrder.findFirst({ where: { id: orderId, organizationId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.method !== "e_transfer") return { ok: false, reason: "wrong_method" };
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  const updated = await prisma.jobListingOrder.update({
    where: { id: order.id },
    data: { status: "payment_claimed" },
    include: ORDER_INCLUDE
  });
  return { ok: true, order: toOrderView(updated) };
}

/** Stripe return: verify the TEST Checkout Session was paid for this order, then list. Idempotent. */
export async function completeJobListingStripeOrder(
  prisma: PrismaClient,
  organizationId: string,
  orderId: string,
  now: Date = new Date()
): Promise<ListingOrderActionResult> {
  if (!isStripeTestConfigured()) return { ok: false, reason: "stripe_unconfigured" };
  const order = await prisma.jobListingOrder.findFirst({ where: { id: orderId, organizationId }, include: ORDER_INCLUDE });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status === "paid") return { ok: true, order: toOrderView(order) };
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  if (order.method !== "stripe" || !order.paymentRef) return { ok: false, reason: "wrong_method" };
  const { paid, paymentRef } = await verifyJobListingCheckoutPaid(order.paymentRef, order.id);
  if (!paid) return { ok: false, reason: "payment_incomplete" };
  return finalizePaidListingOrder(prisma, order.id, paymentRef ?? `stripe-test-${order.id}`, now);
}

// ── staff ──────────────────────────────────────────────────────────────────────────────────────

export async function listJobListingOrdersForReview(prisma: PrismaClient) {
  const rows = await prisma.jobListingOrder.findMany({
    where: { status: { in: OPEN_ORDER_STATUSES } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      organization: { select: { displayName: true } },
      jobListing: { select: { jobRequestId: true, jobRequest: { select: { title: true } } } }
    }
  });
  return rows.map((row) => ({
    ...toOrderView(row),
    organizationId: row.organizationId,
    organizationName: row.organization.displayName,
    jobTitle: row.jobListing.jobRequest.title
  }));
}

/** Staff confirm a received e-transfer → paid; the job is listed for one more month. */
export async function adminConfirmJobListingOrder(
  prisma: PrismaClient,
  orderId: string,
  now: Date = new Date()
): Promise<ListingOrderActionResult> {
  const order = await prisma.jobListingOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (!OPEN_ORDER_STATUSES.includes(order.status)) return { ok: false, reason: "not_pending" };
  return finalizePaidListingOrder(prisma, order.id, `etransfer-confirmed-${order.id}`, now);
}

export async function adminRejectJobListingOrder(prisma: PrismaClient, orderId: string): Promise<boolean> {
  const res = await prisma.jobListingOrder.updateMany({
    where: { id: orderId, status: { in: OPEN_ORDER_STATUSES } },
    data: { status: "canceled" }
  });
  return res.count === 1;
}

/**
 * Mark an order paid and extend the listing by its months. The order flip is a conditional update
 * inside the transaction, so a double confirm / double return cannot add two months. A half-price
 * order also consumes the org's one first-month discount.
 */
async function finalizePaidListingOrder(
  prisma: PrismaClient,
  orderId: string,
  paymentRef: string,
  now: Date
): Promise<ListingOrderActionResult> {
  return prisma.$transaction(async (tx) => {
    const flipped = await tx.jobListingOrder.updateMany({
      where: { id: orderId, status: { in: OPEN_ORDER_STATUSES } },
      data: { status: "paid", paidAt: now, paymentRef }
    });
    const order = await tx.jobListingOrder.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (flipped.count !== 1) {
      return order.status === "paid"
        ? { ok: true as const, order: toOrderView(order) }
        : { ok: false as const, reason: "not_pending" as const };
    }
    const listing = await tx.jobListing.findUniqueOrThrow({
      where: { id: order.jobListingId },
      select: { listedUntil: true }
    });
    await tx.jobListing.update({
      where: { id: order.jobListingId },
      data: { status: "active", listedUntil: extendListedUntil(listing.listedUntil, now, order.months) }
    });
    if (order.discountKind === "first_month_half") {
      await tx.employerOrganization.updateMany({
        where: { id: order.organizationId, jobListingFirstMonthUsedAt: null },
        data: { jobListingFirstMonthUsedAt: now }
      });
    }
    return { ok: true as const, order: toOrderView(order) };
  });
}
