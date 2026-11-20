import { createStripeTestClient, type StripeTestEnvironment } from "./stripeTestProvider";

// Worker Pro card payment via Stripe hosted Checkout — TEST MODE ONLY. Reuses the shared Stripe test
// provider, which refuses any non-`sk_test_` secret, so no live charge can ever be created here. The
// worker is redirected to Stripe's hosted test page (enter card 4242 4242 4242 4242), then returns to
// Joblop where we verify the session was paid before granting Pro. No card data touches Joblop.

/** Read the Stripe TEST environment from process env (same shape the shared provider validates). */
export function stripeTestEnvFromProcess(): StripeTestEnvironment {
  return {
    enabled: process.env.STRIPE_TEST_MODE_ENABLED === "enabled",
    secretKey: process.env.STRIPE_TEST_SECRET_KEY,
    webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET,
    accountReference: process.env.STRIPE_TEST_ACCOUNT_REFERENCE
  };
}

/**
 * True when the Stripe TEST keys are present and enabled, so a checkout can actually be created.
 * Always false when the API runs in production (RWOS_ENV="production") or on Render (RENDER=true): a TEST-mode checkout there
 * would let anyone "pay" with the public test card and get a plan, listing, Pro month or invoice for
 * free. Every "Pay by card" button (cardEnabled) and every test checkout/payout reads this one gate.
 */
export function isStripeTestConfigured(): boolean {
  if (process.env.RWOS_ENV === "production") return false;
  // The live Render services run as RWOS_ENV="test" during the soft launch, but they serve real
  // people. Render sets RENDER=true on every service, so a TEST checkout is never offered there.
  if (process.env.RENDER === "true") return false;
  const env = stripeTestEnvFromProcess();
  return (
    env.enabled === true &&
    (env.secretKey?.startsWith("sk_test_") ?? false) &&
    (env.webhookSecret?.startsWith("whsec_") ?? false) &&
    Boolean(env.accountReference)
  );
}

export type CvProCheckout = Readonly<{ id: string; url: string | null }>;

/** Create a hosted Checkout Session for a Worker Pro order. Idempotent per order. */
export async function createCvProCheckoutSession(input: {
  orderId: string;
  workerRef: string;
  priceMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CvProCheckout> {
  const client = createStripeTestClient(stripeTestEnvFromProcess());
  const metadata = { cvProOrderId: input.orderId, workerRef: input.workerRef };
  const session = await client.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.priceMinor,
            product_data: { name: "Joblop Worker Pro — 1 month (test)" }
          }
        }
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl
    },
    { idempotencyKey: `cvpro-checkout-${input.orderId}` }
  );
  return { id: session.id, url: session.url };
}

/** Retrieve a Checkout Session and confirm it was PAID for exactly this order. Returns the PaymentIntent id. */
export async function verifyCvProCheckoutPaid(
  sessionId: string,
  expectedOrderId: string
): Promise<Readonly<{ paid: boolean; paymentRef: string | null }>> {
  const client = createStripeTestClient(stripeTestEnvFromProcess());
  const session = await client.checkout.sessions.retrieve(sessionId);
  const paid = session.payment_status === "paid" && session.metadata?.cvProOrderId === expectedOrderId;
  const paymentRef = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  return { paid, paymentRef };
}
