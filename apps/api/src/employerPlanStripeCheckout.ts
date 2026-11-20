import { createStripeTestClient } from "./stripeTestProvider";
import { stripeTestEnvFromProcess } from "./cvProStripeCheckout";

// Employer fee card payments (employer plans + long-term job listings) via Stripe hosted Checkout —
// TEST MODE ONLY, mirroring Worker Pro (cvProStripeCheckout.ts). The shared Stripe test provider
// refuses any non-`sk_test_` secret, so no live charge can be created here. One month per order; the
// amount charged is the order TOTAL (fee + GST + QST). The API verifies the session was PAID for
// exactly this order before anything is activated. No card data touches Joblop.

export type EmployerPlanCheckout = Readonly<{ id: string; url: string | null }>;

type FeeCheckoutInput = Readonly<{
  orderId: string;
  organizationId: string;
  /** Metadata key that carries the order id (verified on return). */
  metadataKey: "employerPlanOrderId" | "jobListingOrderId";
  productName: string;
  amountMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyPrefix: string;
}>;

async function createFeeCheckoutSession(input: FeeCheckoutInput): Promise<EmployerPlanCheckout> {
  const client = createStripeTestClient(stripeTestEnvFromProcess());
  const metadata = { [input.metadataKey]: input.orderId, organizationId: input.organizationId };
  const session = await client.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountMinor,
            product_data: { name: input.productName }
          }
        }
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl
    },
    { idempotencyKey: `${input.idempotencyPrefix}-${input.orderId}` }
  );
  return { id: session.id, url: session.url };
}

async function verifyFeeCheckoutPaid(
  sessionId: string,
  metadataKey: FeeCheckoutInput["metadataKey"],
  expectedOrderId: string
): Promise<Readonly<{ paid: boolean; paymentRef: string | null }>> {
  const client = createStripeTestClient(stripeTestEnvFromProcess());
  const session = await client.checkout.sessions.retrieve(sessionId);
  const paid = session.payment_status === "paid" && session.metadata?.[metadataKey] === expectedOrderId;
  const paymentRef =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  return { paid, paymentRef };
}

/** Create a hosted Checkout Session for an employer plan order (amount = total with taxes). */
export async function createEmployerPlanCheckoutSession(input: {
  orderId: string;
  organizationId: string;
  planLabel: string;
  priceMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<EmployerPlanCheckout> {
  return createFeeCheckoutSession({
    orderId: input.orderId,
    organizationId: input.organizationId,
    metadataKey: "employerPlanOrderId",
    productName: `Joblop ${input.planLabel} — 1 month, GST/QST included (test)`,
    amountMinor: input.priceMinor,
    currency: input.currency,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    idempotencyPrefix: "employer-plan-checkout-v2"
  });
}

/** Retrieve a Checkout Session and confirm it was PAID for exactly this plan order. */
export async function verifyEmployerPlanCheckoutPaid(sessionId: string, expectedOrderId: string) {
  return verifyFeeCheckoutPaid(sessionId, "employerPlanOrderId", expectedOrderId);
}

/** Create a hosted Checkout Session for one month of a long-term job listing (total with taxes). */
export async function createJobListingCheckoutSession(input: {
  orderId: string;
  organizationId: string;
  jobTitle: string;
  totalMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<EmployerPlanCheckout> {
  return createFeeCheckoutSession({
    orderId: input.orderId,
    organizationId: input.organizationId,
    metadataKey: "jobListingOrderId",
    productName: `Joblop long-term job listing — 1 month, GST/QST included (test): ${input.jobTitle}`.slice(0, 250),
    amountMinor: input.totalMinor,
    currency: input.currency,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    idempotencyPrefix: "job-listing-checkout"
  });
}

/** Retrieve a Checkout Session and confirm it was PAID for exactly this listing order. */
export async function verifyJobListingCheckoutPaid(sessionId: string, expectedOrderId: string) {
  return verifyFeeCheckoutPaid(sessionId, "jobListingOrderId", expectedOrderId);
}
