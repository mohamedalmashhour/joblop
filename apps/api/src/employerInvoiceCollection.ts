import type { PrismaClient } from "@rwos/database";
import type { InvoiceActorRole, InvoiceStatus } from "@rwos/shared";
import type { DurableInvoice, InvoiceRepository } from "./invoiceRepository";
import { createInvoiceCheckoutSession, verifyInvoiceCheckoutPaid } from "./employerInvoiceStripeCheckout";
import { isStripeCollectionConfigured } from "./stripeEnvironment";

// Money-flow Phase 1 — employer invoice → Stripe TEST collection orchestration. Mirrors the Worker Pro
// order repository, but the "order" is an already-issued platform invoice and the terminal effect is the
// invoice transitioning to `paid` through the SAME governed, version-guarded invoice state machine.
//
// Design-for-real, TEST ONLY: everything here is gated behind INVOICE_TEST_MODE_ENABLED *and* the Stripe
// TEST keys. FINANCE_LIVE_ENABLED is never consulted or touched. No card data touches JobLop; the paid
// decision always comes from Stripe (retrieve on /complete, or the verified webhook), never the client.

/** An invoice can be collected only once it is issued and before it is settled/closed. */
const COLLECTIBLE_STATUSES: readonly InvoiceStatus[] = ["issued", "sent", "viewed", "overdue"];

/** Whether employer-invoice Stripe collection is enabled (test, or live behind both live gates). Default OFF. */
export function isInvoiceCollectionEnabled(): boolean {
  if (process.env.STRIPE_LIVE_MODE_ENABLED === "enabled") {
    return process.env.INVOICE_LIVE_ENABLED === "enabled";
  }
  return process.env.INVOICE_TEST_MODE_ENABLED === "enabled";
}

export type CheckoutView = Readonly<{
  id: string;
  invoiceId: string;
  organizationId: string;
  amountMinor: number;
  currency: string;
  method: string;
  status: string;
  paymentRef: string | null;
  createdAt: string;
  paidAt: string | null;
}>;

type CheckoutRow = {
  id: string;
  organizationId: string;
  invoiceId: string;
  amountMinor: bigint;
  currency: string;
  method: string;
  status: string;
  checkoutSessionId: string | null;
  paymentRef: string | null;
  createdAt: Date;
  paidAt: Date | null;
};

function toView(row: CheckoutRow): CheckoutView {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    organizationId: row.organizationId,
    amountMinor: Number(row.amountMinor),
    currency: row.currency,
    method: row.method,
    status: row.status,
    paymentRef: row.paymentRef,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null
  };
}

export type StartCheckoutResult =
  | { ok: true; checkout: CheckoutView; checkoutUrl: string | null }
  | {
      ok: false;
      reason:
        | "collection_disabled"
        | "stripe_unconfigured"
        | "invoice_not_found"
        | "invoice_not_collectible"
        | "already_paid";
    };

export type CompleteResult =
  | { ok: true; invoice: DurableInvoice; checkout: CheckoutView }
  | {
      ok: false;
      reason:
        | "collection_disabled"
        | "stripe_unconfigured"
        | "invoice_not_found"
        | "checkout_not_found"
        | "payment_incomplete";
    };

const actor = (role: InvoiceActorRole, reference: string) => ({ role, reference });

/** Begin a Stripe TEST card checkout for an issued invoice: creates/reuses a pending checkout row,
 *  opens a hosted Checkout Session for the invoice total, stores its id, and returns the redirect URL. */
export async function startInvoiceCheckout(
  prisma: PrismaClient,
  invoiceRepository: InvoiceRepository,
  input: { organizationId: string; invoiceId: string; origin: string }
): Promise<StartCheckoutResult> {
  if (!isInvoiceCollectionEnabled()) return { ok: false, reason: "collection_disabled" };
  if (!isStripeCollectionConfigured()) return { ok: false, reason: "stripe_unconfigured" };

  const invoice = await invoiceRepository.get(input.invoiceId, input.organizationId);
  if (!invoice || !invoice.invoiceNumber) return { ok: false, reason: "invoice_not_found" };
  if (invoice.status === "paid") return { ok: false, reason: "already_paid" };
  if (!COLLECTIBLE_STATUSES.includes(invoice.status)) {
    return { ok: false, reason: "invoice_not_collectible" };
  }

  const row = await ensurePendingCheckout(prisma, invoice);
  const base = input.origin.replace(/\/+$/, "");
  const session = await createInvoiceCheckoutSession({
    invoiceId: invoice.id,
    organizationId: invoice.organizationId,
    invoiceNumber: invoice.invoiceNumber,
    amountMinor: Number(invoice.totalMinor),
    currency: invoice.currency,
    successUrl: `${base}/employer/invoices?pay=success&invoice=${invoice.id}`,
    cancelUrl: `${base}/employer/invoices?pay=cancel&invoice=${invoice.id}`
  });
  const updated = (await prisma.employerInvoiceCheckout.update({
    where: { id: row.id },
    data: { checkoutSessionId: session.id }
  })) as unknown as CheckoutRow;
  return { ok: true, checkout: toView(updated), checkoutUrl: session.url };
}

/** Self-serve completion after the hosted Checkout returns: RETRIEVE the session from Stripe and verify
 *  it was actually PAID for this invoice before flipping the invoice to `paid`. Never trusts the client.
 *  Idempotent — a second call once paid simply returns the paid invoice + checkout. */
export async function completeInvoiceCheckout(
  prisma: PrismaClient,
  invoiceRepository: InvoiceRepository,
  input: { organizationId: string; invoiceId: string; actorReference: string; actorRole: InvoiceActorRole }
): Promise<CompleteResult> {
  if (!isInvoiceCollectionEnabled()) return { ok: false, reason: "collection_disabled" };
  if (!isStripeCollectionConfigured()) return { ok: false, reason: "stripe_unconfigured" };

  const row = (await prisma.employerInvoiceCheckout.findUnique({
    where: {
      organizationId_invoiceId: { organizationId: input.organizationId, invoiceId: input.invoiceId }
    }
  })) as unknown as CheckoutRow | null;
  if (!row || !row.checkoutSessionId) return { ok: false, reason: "checkout_not_found" };

  const invoice = await invoiceRepository.get(input.invoiceId, input.organizationId);
  if (!invoice) return { ok: false, reason: "invoice_not_found" };

  // Already settled (webhook or a prior complete got there first) → idempotent success.
  if (row.status === "paid" && invoice.status === "paid") {
    return { ok: true, invoice, checkout: toView(row) };
  }

  const verification = await verifyInvoiceCheckoutPaid(row.checkoutSessionId, invoice.id);
  if (!verification.paid) return { ok: false, reason: "payment_incomplete" };

  return finalizePaid(prisma, invoiceRepository, {
    row,
    invoice,
    paymentRef: verification.paymentRef ?? `stripe-test-${invoice.id}`,
    actor: actor(input.actorRole, input.actorReference)
  });
}

/** Webhook reconcile — given a verified, Stripe-correlated PAID checkout session, flip the invoice to
 *  `paid` idempotently. Used by the employer-invoice webhook handler. Finance "verifies with Stripe". */
export async function reconcileInvoiceCheckoutPaid(
  prisma: PrismaClient,
  invoiceRepository: InvoiceRepository,
  input: { organizationId: string; invoiceId: string; paymentRef: string | null }
): Promise<Readonly<{ status: "reconciled" | "already_paid" | "unknown"; invoiceStatus?: string }>> {
  const row = (await prisma.employerInvoiceCheckout.findUnique({
    where: {
      organizationId_invoiceId: { organizationId: input.organizationId, invoiceId: input.invoiceId }
    }
  })) as unknown as CheckoutRow | null;
  if (!row) return { status: "unknown" };

  const invoice = await invoiceRepository.get(input.invoiceId, input.organizationId);
  if (!invoice) return { status: "unknown" };
  if (row.status === "paid" && invoice.status === "paid") {
    return { status: "already_paid", invoiceStatus: invoice.status };
  }

  const result = await finalizePaid(prisma, invoiceRepository, {
    row,
    invoice,
    paymentRef: input.paymentRef ?? row.paymentRef ?? `stripe-test-${invoice.id}`,
    actor: actor("platform_admin", "stripe-webhook")
  });
  if (!result.ok) return { status: "unknown" };
  return { status: "reconciled", invoiceStatus: result.invoice.status };
}

// ── internals ────────────────────────────────────────────────────────────────────────────────────
async function ensurePendingCheckout(prisma: PrismaClient, invoice: DurableInvoice): Promise<CheckoutRow> {
  const existing = (await prisma.employerInvoiceCheckout.findUnique({
    where: {
      organizationId_invoiceId: { organizationId: invoice.organizationId, invoiceId: invoice.id }
    }
  })) as unknown as CheckoutRow | null;
  if (existing) return existing;
  return (await prisma.employerInvoiceCheckout.create({
    data: {
      organizationId: invoice.organizationId,
      invoiceId: invoice.id,
      amountMinor: BigInt(Number(invoice.totalMinor)),
      currency: invoice.currency,
      method: "stripe",
      status: "pending_payment"
    }
  })) as unknown as CheckoutRow;
}

async function finalizePaid(
  prisma: PrismaClient,
  invoiceRepository: InvoiceRepository,
  input: {
    row: CheckoutRow;
    invoice: DurableInvoice;
    paymentRef: string;
    actor: { role: InvoiceActorRole; reference: string };
  }
): Promise<{ ok: true; invoice: DurableInvoice; checkout: CheckoutView }> {
  let settled = input.invoice;
  if (settled.status !== "paid") {
    try {
      settled = await invoiceRepository.transition({
        invoiceId: input.invoice.id,
        organizationId: input.invoice.organizationId,
        expectedVersion: input.invoice.version,
        toStatus: "paid",
        actorReference: input.actor.reference,
        actorRole: input.actor.role,
        reason: `stripe-test:${input.paymentRef}`
      });
    } catch {
      // A concurrent completer/webhook may have won the version-guarded race. Re-read: if it is now
      // paid, treat as success (idempotent); otherwise surface the paid checkout row without reopening.
      const reread = await invoiceRepository.get(input.invoice.id, input.invoice.organizationId);
      if (reread) settled = reread;
    }
  }
  const paidRow = (await prisma.employerInvoiceCheckout.update({
    where: { id: input.row.id },
    data: { status: "paid", paymentRef: input.paymentRef, paidAt: input.row.paidAt ?? new Date() }
  })) as unknown as CheckoutRow;
  return { ok: true, invoice: settled, checkout: toView(paidRow) };
}
