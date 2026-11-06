// Money-flow Phase 1 — employer-invoice Stripe TEST webhook reconcile. This is the "finance verifies
// with Stripe" step: Stripe's own `checkout.session.completed` (and the delayed-settlement
// `checkout.session.async_payment_succeeded`) event is the authoritative confirmation that the hosted
// checkout was PAID. We ingest ONE verified test-mode event, correlate it to an invoice via OUR metadata
// (never client input), require payment_status === "paid", and drive the invoice to `paid` through the
// SAME idempotent, version-guarded reconcile path the /complete route uses. It NEVER moves money, never
// calls any charge/capture/refund API, and duplicate or out-of-order deliveries can never reopen a
// settled invoice (the reconcile is idempotent on the invoice + checkout state).

export type CheckoutSessionEventLike = Readonly<{
  id: string;
  type: string;
  created: number;
  livemode?: boolean;
  data: {
    object: Readonly<{
      id?: string;
      payment_status?: string;
      amount_total?: number | null;
      currency?: string | null;
      payment_intent?: string | { id?: string } | null;
      metadata?: Record<string, string> | null;
      // Charge / dispute fields (refund and dispute events).
      amount?: number;
      amount_refunded?: number;
      status?: string;
    }>;
  };
}>;

export type EmployerInvoiceWebhookResult = Readonly<{
  status: "reconciled" | "already_paid" | "adjusted" | "ignored" | "unknown";
  eventType: string;
  invoiceId?: string;
  invoiceStatus?: string;
}>;

// Safe, non-sensitive rejection — a stable code only, never the raw provider payload.
export class EmployerInvoiceWebhookRejection extends Error {
  constructor(
    readonly code: "uncorrelated_metadata" | "payment_not_paid" | "livemode_rejected"
  ) {
    super(`employer_invoice_webhook_rejected:${code}`);
    this.name = "EmployerInvoiceWebhookRejection";
  }
}

export type InvoiceCheckoutAdjustment =
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "dispute_won"
  | "dispute_lost";

// Refund / dispute events are correlated by the PaymentIntent id we stored on the paid checkout row.
// They only RECORD the outcome; they never reopen the invoice or move money. Finance handles any credit
// note or re-billing from the recorded status.
function adjustmentFor(event: CheckoutSessionEventLike): InvoiceCheckoutAdjustment | null {
  const object = event.data.object;
  switch (event.type) {
    case "charge.refunded": {
      const amount = object.amount ?? 0;
      const refunded = object.amount_refunded ?? 0;
      if (refunded <= 0) return null;
      return refunded >= amount ? "refunded" : "partially_refunded";
    }
    case "charge.dispute.created":
      return "disputed";
    case "charge.dispute.closed":
      if (object.status === "won") return "dispute_won";
      if (object.status === "lost") return "dispute_lost";
      return null;
    default:
      return null;
  }
}

const PAID_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded"
]);

function paymentIntentId(value: CheckoutSessionEventLike["data"]["object"]["payment_intent"]): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : (value.id ?? null);
}

export function createEmployerInvoiceWebhook(deps: {
  // Verifies the Stripe signature and enforces test-mode (livemode=false), returning the parsed event
  // or throwing. Reuse the Stripe test provider's constructEvent — this handler adds no signature logic.
  // Defaults to false (test mode). Live deployments pass true; any mismatch is rejected.
  expectLivemode?: boolean;
  verifyWebhook(rawBody: Buffer, signature: string): Promise<CheckoutSessionEventLike>;
  reconcile(input: {
    organizationId: string;
    invoiceId: string;
    paymentRef: string | null;
  }): Promise<Readonly<{ status: "reconciled" | "already_paid" | "unknown"; invoiceStatus?: string }>>;
  // Records a refund/dispute outcome against the checkout paid with this PaymentIntent. Optional so
  // existing wiring keeps ignoring these events until it opts in.
  adjust?(input: {
    paymentRef: string;
    adjustment: InvoiceCheckoutAdjustment;
  }): Promise<Readonly<{ status: "adjusted" | "unknown"; invoiceId?: string }>>;
}) {
  return {
    async resolve(rawBody: Buffer, signature: string): Promise<EmployerInvoiceWebhookResult> {
      const event = await deps.verifyWebhook(rawBody, signature); // signature + test-mode enforced here
      if ((event.livemode === true) !== (deps.expectLivemode ?? false)) throw new EmployerInvoiceWebhookRejection("livemode_rejected");

      const adjustment = adjustmentFor(event);
      if (adjustment) {
        const paymentRef = paymentIntentId(event.data.object.payment_intent);
        if (!deps.adjust || !paymentRef) return { status: "ignored", eventType: event.type };
        const result = await deps.adjust({ paymentRef, adjustment });
        return {
          status: result.status,
          eventType: event.type,
          ...(result.invoiceId ? { invoiceId: result.invoiceId } : {})
        };
      }

      if (!PAID_EVENTS.has(event.type)) return { status: "ignored", eventType: event.type };

      const session = event.data.object;
      // Correlate using OUR metadata only (set at Checkout Session create), never client input.
      const invoiceId = session.metadata?.employerInvoiceId;
      const organizationId = session.metadata?.organizationReference;
      if (!invoiceId || !organizationId) {
        throw new EmployerInvoiceWebhookRejection("uncorrelated_metadata");
      }
      if (session.payment_status !== "paid") {
        throw new EmployerInvoiceWebhookRejection("payment_not_paid");
      }

      const result = await deps.reconcile({
        organizationId,
        invoiceId,
        paymentRef: paymentIntentId(session.payment_intent)
      });
      return {
        status: result.status,
        eventType: event.type,
        invoiceId,
        ...(result.invoiceStatus ? { invoiceStatus: result.invoiceStatus } : {})
      };
    }
  };
}
