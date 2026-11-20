import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { createStripeTestPaymentProvider } from "./stripeTestProvider";

// money-golive-readiness — the hardened, query-only Stripe reconcile MUST classify every provider error
// the same way execute() classifies indeterminacy, so a provider-side failure can never terminalize a
// held payment. These are pure adapter tests (no repository): they assert the ProviderReconcileResult
// outcome the adapter returns for each error shape. The disposition mapping (outcome → stay processing
// / manual) is proven end-to-end through paymentRepository.reconcile in paymentRepository.test.ts.

const webhookSecret = "whsec_synthetic_not_a_real_secret";

function adapter(retrieve: (id: string) => Promise<unknown>) {
  const client = {
    customers: { create: vi.fn() },
    setupIntents: { create: vi.fn() },
    paymentIntents: {
      create: vi.fn(),
      capture: vi.fn(),
      cancel: vi.fn(),
      retrieve: vi.fn(retrieve)
    },
    refunds: { create: vi.fn() },
    webhooks: { constructEvent: vi.fn() }
  };
  return {
    client,
    provider: createStripeTestPaymentProvider({
      client: client as never,
      webhookSecret,
      replayStore: { async recordOnce() { return true; } }
    })
  };
}

const query = (providerOperationReference: string | null) => ({
  providerOperationKey: "rwos_op_reconcile",
  paymentId: "00000000-0000-4000-8000-000000000040",
  organizationId: "00000000-0000-4000-8000-00000000000a",
  operation: "authorize" as const,
  amountMinor: 10_500,
  providerOperationReference
});

describe("hardened Stripe reconcile error classification (money-golive-readiness)", () => {
  it("a succeeded PaymentIntent on a held id → accepted", async () => {
    const { provider } = adapter(async () => ({ id: "pi_held", status: "succeeded", livemode: false }));
    await expect(provider.reconcile!(query("pi_held"))).resolves.toMatchObject({
      provider: "stripe_test",
      outcome: "accepted",
      providerOperationReference: "pi_held"
    });
  });

  it("resource_missing (StripeInvalidRequestError) on an id we hold → not_found, NEVER a throw or decline", async () => {
    const { provider } = adapter(async () => {
      throw new Stripe.errors.StripeInvalidRequestError({
        type: "invalid_request_error",
        code: "resource_missing",
        statusCode: 404,
        message: "No such payment_intent: pi_held"
      });
    });
    await expect(provider.reconcile!(query("pi_held"))).resolves.toMatchObject({
      provider: "stripe_test",
      outcome: "not_found",
      // we still hold the durable reference — the policy keeps this processing, never failed.
      providerOperationReference: "pi_held"
    });
  });

  it("a bare HTTP 404 (no resource_missing code) on a held id → not_found", async () => {
    const { provider } = adapter(async () => {
      throw new Stripe.errors.StripeInvalidRequestError({
        type: "invalid_request_error",
        statusCode: 404,
        message: "Not Found"
      });
    });
    await expect(provider.reconcile!(query("pi_held"))).resolves.toMatchObject({ outcome: "not_found" });
  });

  it("a 5xx StripeAPIError on a held id → unknown (indeterminate, stays processing)", async () => {
    const { provider } = adapter(async () => {
      throw new Stripe.errors.StripeAPIError({ type: "api_error", statusCode: 500, message: "server error" });
    });
    await expect(provider.reconcile!(query("pi_held"))).resolves.toMatchObject({
      provider: "stripe_test",
      outcome: "unknown",
      reason: "unknown_outcome"
    });
  });

  it("a network StripeConnectionError → unknown", async () => {
    const { provider } = adapter(async () => {
      throw new Stripe.errors.StripeConnectionError({ message: "network down" });
    });
    await expect(provider.reconcile!(query("pi_held"))).resolves.toMatchObject({ outcome: "unknown" });
  });

  it("a rate-limit StripeRateLimitError → unknown", async () => {
    const { provider } = adapter(async () => {
      throw new Stripe.errors.StripeRateLimitError({ type: "rate_limit_error", statusCode: 429, message: "slow down" });
    });
    await expect(provider.reconcile!(query("pi_held"))).resolves.toMatchObject({ outcome: "unknown" });
  });

  it("a generic (non-Stripe) network error / timeout → unknown", async () => {
    const { provider } = adapter(async () => {
      throw new Error("ETIMEDOUT");
    });
    await expect(provider.reconcile!(query("pi_held"))).resolves.toMatchObject({ outcome: "unknown" });
  });

  it("a LIVE-mode PaymentIntent still hard-throws (test-only invariant preserved)", async () => {
    const { provider } = adapter(async () => ({ id: "pi_held", status: "succeeded", livemode: true }));
    await expect(provider.reconcile!(query("pi_held"))).rejects.toThrow(/Live-mode/);
  });

  it("no durable reference (no PaymentIntent id was captured) → not_found with null ref, never a Search", async () => {
    const { provider, client } = adapter(async () => ({ id: "pi_x", status: "succeeded", livemode: false }));
    await expect(provider.reconcile!(query(null))).resolves.toMatchObject({
      outcome: "not_found",
      providerOperationReference: null
    });
    // It must NOT touch the provider at all when there is no id to look up (no read, no re-POST).
    expect(client.paymentIntents.retrieve).not.toHaveBeenCalled();
  });
});
