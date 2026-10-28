import { createStripeTestClient } from "./stripeTestProvider";
import { stripeTestEnvFromProcess } from "./cvProStripeCheckout";

// Money-flow Phase 1 — employer invoice card payment via Stripe hosted Checkout, TEST MODE ONLY.
// Mirrors the proven Worker Pro pattern (cvProStripeCheckout): reuse the shared Stripe test provider,
// which refuses any non-`sk_test_` secret, so no live charge can ever be created here. The employer is
// redirected to Stripe's hosted test page (card 4242 4242 4242 4242), then returns to JobLop where we
// RETRIEVE the session and verify it was paid for THIS invoice before flipping anything. No card data
// touches JobLop. The correlation key on the Stripe object is our opaque invoice id + organization id.

export type InvoiceCheckout = Readonly<{ id: string; url: string | null }>;

/** Create a hosted Checkout Session for an issued invoice. Idempotent per invoice. */
export async function createInvoiceCheckoutSession(input: {
  invoiceId: string;
  organizationId: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<InvoiceCheckout> {
  const client = createStripeTestClient(stripeTestEnvFromProcess());
  // OUR correlation metadata only — never a client-supplied identifier. Mirrored onto the PaymentIntent
  // so the webhook can correlate the terminal event back to this invoice.
  const metadata = { employerInvoiceId: input.invoiceId, organizationReference: input.organizationId };
  const session = await client.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountMinor,
            product_data: { name: `JobLop invoice ${input.invoiceNumber} (test)` }
          }
        }
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl
    },
    { idempotencyKey: `employer-invoice-checkout-${input.invoiceId}` }
  );
  return { id: session.id, url: session.url };
}

/** Retrieve a Checkout Session and confirm it was PAID for exactly this invoice. Returns the
 *  PaymentIntent id. Never trusts the client — the paid flag comes from Stripe, not the browser. */
export async function verifyInvoiceCheckoutPaid(
  sessionId: string,
  expectedInvoiceId: string
): Promise<Readonly<{ paid: boolean; paymentRef: string | null }>> {
  const client = createStripeTestClient(stripeTestEnvFromProcess());
  const session = await client.checkout.sessions.retrieve(sessionId);
  const paid =
    session.payment_status === "paid" && session.metadata?.employerInvoiceId === expectedInvoiceId;
  const paymentRef =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  return { paid, paymentRef };
}
