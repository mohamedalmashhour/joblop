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
import type { EmployerPlanMethod, StaffConfirmInput, StaffOrderView } from "./employerPlanRepository";
import { formatCadMinor, pickFreeShortRef } from "./paymentFormat";
import { issuePaymentReceipt } from "./paymentReceipts";

// LONG-TERM JOB LISTINGS (paid in advance, Indeed model; behind EMPLOYER_PLANS_ENABLED). A long-term
// job request is shown to workers only while its listing's listedUntil is in the future. Mirrors the
// employer plan flow (employerPlanRepository.ts):
//  - trial: 14 days, once per ORGANIZATION (its first long-term listing), no card.
//  - pay: one month per order, C$99 + GST + QST; the org's first paid month ever is 50% off.
//    e_transfer (employer claims, staff confirm) or stripe (TEST hosted Checkout, verified on return).
//  - each paid month extends listedUntil by one month from the later of now and the current end.
//    No auto-renew; the employer presses "Renew 1 month". Expiry is evaluated at READ time.
// Joblop takes no hourly share on these jobs and never invoices hours or runs payroll for them.
//  - half price once: an order gets the 50%-off first month only when the company has no other open
//    or paid half-price order (checked under a lock on the company row, so racing orders cannot all
//    get it), and staff cannot confirm a half-price order once the discount has been used (S5).
//  - paid: a numbered receipt is written with the payment (paymentReceipts.ts) and emailed after.

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
  shortRef?: string | null;
  claimedAt?: Date | null;
  canceledAt?: Date | null;
  cancelReason?: string | null;
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

const ORDER_INCLUDE = { jobListing: { select: { jobRequestId: true } } } as const;

const HALF_PRICE_HOLDING_STATUSES = [...OPEN_ORDER_STATUSES, "paid"];

/**
 * The org's one-time markers. The half-price first month is still available only when it was never
 * used AND no other open or paid order already carries it.
 */
async function orgMarkers(prisma: PrismaClient, organizationId: string, exceptOrderId?: string) {
  const org = await prisma.employerOrganization.findUnique({
    where: { id: organizationId },
    select: { jobListingTrialUsedAt: true, jobListingFirstMonthUsedAt: true }
  });
  const halfHeld = org?.jobListingFirstMonthUsedAt
    ? null
    : await prisma.jobListingOrder.findFirst({
        where: {
          organizationId,
          discountKind: "first_month_half",
          status: { in: HALF_PRICE_HOLDING_STATUSES },
          ...(exceptOrderId ? { id: { not: exceptOrderId } } : {})
        },
        select: { id: true }
      });
  return {
    trialAvailable: !org?.jobListingTrialUsedAt,
    firstMonthHalf: !org?.jobListingFirstMonthUsedAt && !halfHeld
  };
}

/** Row lock on the company, held until the transaction ends: serializes its money decisions. */
async function lockOrganization(tx: Pick<PrismaClient, "$queryRaw">, organizationId: string) {
  await tx.$queryRaw`SELECT id FROM employer_organizations WHERE id = ${organizationId}::uuid FOR UPDATE`;
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
      openOrder: withInstructions(orderViews.find((o) => o.jobRequestId === job.id && OPEN_ORDER_STATUSES.includes(o.status)) ?? null)
    })),
    orders: orderViews
  };
}

function withInstructions(order: JobListingOrderView | null) {
  if (!order) return null;
  return order.method === "e_transfer" ? { ...order, eTransfer: jobListingETransferInstructions(order) } : order;
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

/** E-transfer instructions shown with a pending listing order (total with GST + QST, written like $56.92). */
export function jobListingETransferInstructions(order: JobListingOrderView) {
  const amount = formatCadMinor(order.totalMinor);
  const breakdown = `${formatCadMinor(order.subtotalMinor)} + GST ${formatCadMinor(order.gstMinor)} + QST ${formatCadMinor(order.qstMinor)}`;
  return {
    email: BILLING_EMAIL,
    amount,
    amountMinor: order.totalMinor,
    breakdown,
    reference: order.reference,
    note: `Send an Interac e-transfer to ${BILLING_EMAIL} for ${amount} (${breakdown}). Put this reference in the message: ${order.reference}. Then tap “I've sent it”. Your job is listed for one month once we confirm receipt.`
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
  // Under a lock on the company row: two or three orders created at the same moment cannot all
  // see the half-price month as unused.
  const row = await prisma.$transaction(async (tx) => {
    await lockOrganization(tx, organizationId);
    const existing = await tx.jobListingOrder.findFirst({
      where: { jobListingId: listing.id, method, status: { in: OPEN_ORDER_STATUSES } },
      orderBy: { createdAt: "desc" },
      include: ORDER_INCLUDE
    });
    if (existing) return existing;
    const { firstMonthHalf } = await orgMarkers(tx as unknown as PrismaClient, organizationId);
    const price = jobListingMonthPrice(firstMonthHalf);
    const shortRef = await pickFreeShortRef(async (code) => (await tx.jobListingOrder.findFirst({ where: { shortRef: code }, select: { id: true } })) !== null);
    return tx.jobListingOrder.create({
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
        status: "pending_payment",
        shortRef
      },
      include: ORDER_INCLUDE
    });
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
  | Readonly<{ ok: true; order: JobListingOrderView; receiptId: string | null }>
  | Readonly<{
      ok: false;
      reason:
        | "order_not_found"
        | "not_pending"
        | "wrong_method"
        | "payment_incomplete"
        | "stripe_unconfigured"
        | "discount_already_used"
        | "amount_short";
    }>;

/** Employer marks an e-transfer sent: pending_payment → payment_claimed (awaiting staff). */
export async function claimJobListingETransfer(
  prisma: PrismaClient,
  organizationId: string,
  orderId: string,
  now: Date = new Date()
): Promise<ListingOrderActionResult> {
  const order = await prisma.jobListingOrder.findFirst({ where: { id: orderId, organizationId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.method !== "e_transfer") return { ok: false, reason: "wrong_method" };
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  const updated = await prisma.jobListingOrder.update({
    where: { id: order.id },
    data: { status: "payment_claimed", claimedAt: now },
    include: ORDER_INCLUDE
  });
  return { ok: true, order: toOrderView(updated), receiptId: null };
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
  if (order.status === "paid") return { ok: true, order: toOrderView(order), receiptId: null };
  if (order.status !== "pending_payment") return { ok: false, reason: "not_pending" };
  if (order.method !== "stripe" || !order.paymentRef) return { ok: false, reason: "wrong_method" };
  const { paid, paymentRef } = await verifyJobListingCheckoutPaid(order.paymentRef, order.id);
  if (!paid) return { ok: false, reason: "payment_incomplete" };
  // The card was already charged: honour the price paid (no discount block on this path).
  return finalizePaidListingOrder(
    prisma,
    order.id,
    { paymentRef: paymentRef ?? `stripe-test-${order.id}`, receiptRef: order.shortRef ?? order.id, blockUsedDiscount: false },
    now
  );
}

// ── staff ──────────────────────────────────────────────────────────────────────────────────────

/** Staff queue: open orders, or the done history (paid and canceled). */
export async function listJobListingOrdersForReview(prisma: PrismaClient, view: StaffOrderView = "open") {
  const rows = await prisma.jobListingOrder.findMany({
    where: { status: { in: view === "done" ? ["paid", "canceled"] : OPEN_ORDER_STATUSES } },
    orderBy: view === "done" ? { updatedAt: "desc" } : { createdAt: "asc" },
    take: 100,
    include: {
      organization: { select: { displayName: true } },
      jobListing: { select: { jobRequestId: true, jobRequest: { select: { title: true } } } },
      receipt: { select: { receiptNumber: true } }
    }
  });
  return rows.map((row) => ({
    ...toOrderView(row),
    organizationId: row.organizationId,
    organizationName: row.organization.displayName,
    jobTitle: row.jobListing.jobRequest.title,
    amountReceivedMinor: row.amountReceivedMinor ?? null,
    staffNote: row.staffNote ?? null,
    updatedAt: row.updatedAt.toISOString(),
    receiptNumber: row.receipt?.receiptNumber ?? null
  }));
}

/**
 * Staff confirm a received e-transfer → paid; the job is listed for one more month. A half-price
 * order cannot be confirmed once the company's half-price month was used by another order: the
 * money is already sent at half price, so staff must ask for the difference or reject.
 */
export async function adminConfirmJobListingOrder(
  prisma: PrismaClient,
  orderId: string,
  now: Date = new Date(),
  input: StaffConfirmInput = {}
): Promise<ListingOrderActionResult> {
  const order = await prisma.jobListingOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (!OPEN_ORDER_STATUSES.includes(order.status)) return { ok: false, reason: "not_pending" };
  const received = input.amountReceivedMinor ?? null;
  if (received !== null && received < order.totalMinor) return { ok: false, reason: "amount_short" };
  const interac = input.interacReference ?? null;
  return finalizePaidListingOrder(
    prisma,
    order.id,
    {
      paymentRef: interac ?? `etransfer-confirmed-${order.id}`,
      receiptRef: interac ?? order.shortRef ?? order.id,
      amountReceivedMinor: received,
      staffNote: received !== null ? `Amount received: ${formatCadMinor(received)}` : null,
      blockUsedDiscount: true
    },
    now
  );
}

export async function adminRejectJobListingOrder(prisma: PrismaClient, orderId: string, now: Date = new Date()): Promise<boolean> {
  const res = await prisma.jobListingOrder.updateMany({
    where: { id: orderId, status: { in: OPEN_ORDER_STATUSES } },
    data: { status: "canceled", cancelReason: "staff_rejected", canceledAt: now }
  });
  return res.count === 1;
}

type FinalizeListingInput = Readonly<{
  paymentRef: string;
  receiptRef: string;
  amountReceivedMinor?: number | null;
  staffNote?: string | null;
  /** Refuse a half-price order when the company's half-price month is already used (staff confirm). */
  blockUsedDiscount: boolean;
}>;

/**
 * Mark an order paid, extend the listing by its months and write its receipt. The order flip is a
 * conditional update inside the transaction, so a double confirm / double return cannot add two
 * months or two receipts. A half-price order also consumes the org's one first-month discount.
 */
async function finalizePaidListingOrder(
  prisma: PrismaClient,
  orderId: string,
  input: FinalizeListingInput,
  now: Date
): Promise<ListingOrderActionResult> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.jobListingOrder.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (input.blockUsedDiscount && before.discountKind === "first_month_half" && OPEN_ORDER_STATUSES.includes(before.status)) {
      await lockOrganization(tx, before.organizationId);
      const org = await tx.employerOrganization.findUnique({
        where: { id: before.organizationId },
        select: { jobListingFirstMonthUsedAt: true }
      });
      const otherPaidHalf = await tx.jobListingOrder.findFirst({
        where: { organizationId: before.organizationId, discountKind: "first_month_half", status: "paid", id: { not: before.id } },
        select: { id: true }
      });
      if (org?.jobListingFirstMonthUsedAt || otherPaidHalf) return { ok: false as const, reason: "discount_already_used" as const };
    }
    const flipped = await tx.jobListingOrder.updateMany({
      where: { id: orderId, status: { in: OPEN_ORDER_STATUSES } },
      data: {
        status: "paid",
        paidAt: now,
        paymentRef: input.paymentRef,
        ...(input.amountReceivedMinor !== undefined && input.amountReceivedMinor !== null ? { amountReceivedMinor: input.amountReceivedMinor } : {}),
        ...(input.staffNote ? { staffNote: input.staffNote } : {})
      }
    });
    const order = await tx.jobListingOrder.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (flipped.count !== 1) {
      return order.status === "paid"
        ? { ok: true as const, order: toOrderView(order), receiptId: null }
        : { ok: false as const, reason: "not_pending" as const };
    }
    const listing = await tx.jobListing.findUniqueOrThrow({
      where: { id: order.jobListingId },
      select: { listedUntil: true }
    });
    const periodStart = listing.listedUntil && listing.listedUntil.getTime() > now.getTime() ? listing.listedUntil : now;
    const periodEnd = extendListedUntil(listing.listedUntil, now, order.months);
    await tx.jobListing.update({
      where: { id: order.jobListingId },
      data: { status: "active", listedUntil: periodEnd }
    });
    if (order.discountKind === "first_month_half") {
      await tx.employerOrganization.updateMany({
        where: { id: order.organizationId, jobListingFirstMonthUsedAt: null },
        data: { jobListingFirstMonthUsedAt: now }
      });
    }
    const job = await tx.jobRequest.findFirst({ where: { id: order.jobListing.jobRequestId }, select: { title: true } });
    const receipt = await issuePaymentReceipt(tx, {
      organizationId: order.organizationId,
      kind: "job_listing",
      jobListingOrderId: order.id,
      itemCode: "job_listing",
      itemLabel: job?.title ?? "Long-term job",
      discountKind: order.discountKind,
      periodStart,
      periodEnd,
      subtotalMinor: order.subtotalMinor,
      gstMinor: order.gstMinor,
      qstMinor: order.qstMinor,
      totalMinor: order.totalMinor,
      currency: order.currency,
      paymentMethod: order.method,
      paymentRef: input.receiptRef,
      paidAt: now
    });
    return { ok: true as const, order: toOrderView(order), receiptId: receipt.id };
  });
}
