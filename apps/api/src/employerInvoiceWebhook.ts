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
    }>;
  };
}>;

export type EmployerInvoiceWebhookResult = Readonly<{
  status: "reconciled" | "already_paid" | "ignored" | "unknown";
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
}) {
  return {
    async resolve(rawBody: Buffer, signature: string): Promise<EmployerInvoiceWebhookResult> {
      const event = await deps.verifyWebhook(rawBody, signature); // signature + test-mode enforced here
      if ((event.livemode === true) !== (deps.expectLivemode ?? false)) throw new EmployerInvoiceWebhookRejection("livemode_rejected");

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
