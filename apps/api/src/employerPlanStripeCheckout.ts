import { createStripeTestClient } from "./stripeTestProvider";
import { stripeTestEnvFromProcess } from "./cvProStripeCheckout";

// Employer plan card payment via Stripe hosted Checkout — TEST MODE ONLY, mirroring Worker Pro
// (cvProStripeCheckout.ts). The shared Stripe test provider refuses any non-`sk_test_` secret, so no
// live charge can be created here. One month per order; the API verifies the session was PAID for
// exactly this order before the plan is activated. No card data touches Joblop.

export type EmployerPlanCheckout = Readonly<{ id: string; url: string | null }>;

/** Create a hosted Checkout Session for an employer plan order. Idempotent per order. */
export async function createEmployerPlanCheckoutSession(input: {
  orderId: string;
  organizationId: string;
  planLabel: string;
  priceMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<EmployerPlanCheckout> {
  const client = createStripeTestClient(stripeTestEnvFromProcess());
  const metadata = { employerPlanOrderId: input.orderId, organizationId: input.organizationId };
  const session = await client.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.priceMinor,
            product_data: { name: `Joblop ${input.planLabel} — 1 month (test)` }
          }
        }
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl
    },
    { idempotencyKey: `employer-plan-checkout-${input.orderId}` }
  );
  return { id: session.id, url: session.url };
}

/** Retrieve a Checkout Session and confirm it was PAID for exactly this order. */
export async function verifyEmployerPlanCheckoutPaid(
  sessionId: string,
  expectedOrderId: string
): Promise<Readonly<{ paid: boolean; paymentRef: string | null }>> {
  const client = createStripeTestClient(stripeTestEnvFromProcess());
  const session = await client.checkout.sessions.retrieve(sessionId);
  const paid = session.payment_status === "paid" && session.metadata?.employerPlanOrderId === expectedOrderId;
  const paymentRef =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  return { paid, paymentRef };
}
