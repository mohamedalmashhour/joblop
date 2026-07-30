import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createStripeTestClient, createStripeTestPaymentProvider } from "./stripeTestProvider";

if (process.env.RWOS_STRIPE_NETWORK_TEST_CONFIRMATION !== "authorized-stripe-test-mode") {
  throw new Error("Stripe network testing requires explicit test-mode authorization.");
}

const client = createStripeTestClient({
  enabled: process.env.STRIPE_TEST_MODE_ENABLED === "enabled",
  secretKey: process.env.STRIPE_TEST_SECRET_KEY,
  webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET,
  accountReference: process.env.STRIPE_TEST_ACCOUNT_REFERENCE
});
const provider = createStripeTestPaymentProvider({
  client,
  webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET!,
  replayStore: {
    async recordOnce() {
      throw new Error("Network webhook replay storage must be supplied by the staging receiver.");
    }
  }
});

describe("authorized Stripe test-mode network boundary", () => {
  it("creates only synthetic test objects and authorizes a Mastercard test method", async () => {
    const runId = randomUUID();
    const customer = await provider.createCustomer({
      organizationId: `synthetic-org-${runId}`,
      email: `synthetic+${runId}@example.invalid`,
      idempotencyKey: `customer-${runId}`
    });
    await expect(
      provider.createSetupIntent({
        organizationId: `synthetic-org-${runId}`,
        customerReference: customer,
        method: "card",
        idempotencyKey: `setup-card-${runId}`
      })
    ).resolves.toMatchObject({ id: expect.stringMatching(/^seti_/) });
    await expect(
      provider.execute({
        operation: "authorize",
        organizationId: `synthetic-org-${runId}`,
        paymentId: `synthetic-payment-${runId}`,
        amountMinor: 100,
        currency: "CAD",
        methodReference: "pm_card_mastercard",
        authorizationReference: null,
        idempotencyKey: `authorize-${runId}`,
        scenario: "success"
      })
    ).resolves.toMatchObject({
      provider: "stripe_test",
      providerOperationReference: expect.stringMatching(/^pi_/)
    });
  });
});
