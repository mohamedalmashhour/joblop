import { describe, expect, it, vi } from "vitest";
import {
  createStripeTestClient,
  createStripeTestPaymentProvider,
  validateStripeTestEnvironment
} from "./stripeTestProvider";

const testEnvironment = {
  enabled: true,
  secretKey: "sk_test_synthetic_not_a_real_key",
  webhookSecret: "whsec_synthetic_not_a_real_secret",
  accountReference: "acct_test_synthetic"
} as const;

function stripeClient() {
  return {
    customers: { create: vi.fn(async () => ({ id: "cus_test", livemode: false })) },
    setupIntents: {
      create: vi.fn(async () => ({
        id: "seti_test",
        client_secret: "seti_test_secret_synthetic",
        livemode: false
      }))
    },
    paymentIntents: {
      create: vi.fn(async () => ({ id: "pi_test", status: "requires_capture", livemode: false })),
      capture: vi.fn(async () => ({ id: "pi_test", status: "succeeded", livemode: false })),
      cancel: vi.fn(async () => ({ id: "pi_test", status: "canceled", livemode: false })),
      retrieve: vi.fn(async () => ({ id: "pi_test", status: "succeeded", livemode: false }))
    },
    refunds: { create: vi.fn(async () => ({ id: "re_test", livemode: false })) },
    webhooks: {
      constructEvent: vi.fn(() => ({
        id: "evt_test",
        livemode: false,
        type: "payment_intent.succeeded"
      }))
    }
  };
}

function provider(client = stripeClient()) {
  const seen = new Set<string>();
  return {
    client,
    provider: createStripeTestPaymentProvider({
      client: client as never,
      webhookSecret: testEnvironment.webhookSecret,
      replayStore: {
        async recordOnce({ eventId }) {
          if (seen.has(eventId)) return false;
          seen.add(eventId);
          return true;
        }
      }
    })
  };
}

describe("Stripe test-mode provider foundation", () => {
  it("fails closed for disabled, missing, or live credentials", () => {
    expect(validateStripeTestEnvironment({ ...testEnvironment, enabled: false })).toEqual({
      enabled: false
    });
    expect(() =>
      validateStripeTestEnvironment({ ...testEnvironment, secretKey: "sk_live_forbidden" })
    ).toThrow(/test-mode secret/);
    expect(() =>
      validateStripeTestEnvironment({ ...testEnvironment, webhookSecret: undefined })
    ).toThrow(/webhook signing secret/);
  });

  it("creates card and ACSS setup intents without accepting raw details", async () => {
    const { provider: adapter, client } = provider();
    await adapter.createSetupIntent({
      organizationId: "org-a",
      customerReference: "cus_test",
      method: "card",
      idempotencyKey: "setup-card"
    });
    await adapter.createSetupIntent({
      organizationId: "org-a",
      customerReference: "cus_test",
      method: "acss_debit",
      idempotencyKey: "setup-acss"
    });
    expect(client.setupIntents.create).toHaveBeenCalledTimes(2);
  });

  it("uses stable idempotency for authorization and rejects live objects", async () => {
    const { provider: adapter, client } = provider();
    const request = {
      operation: "authorize" as const,
      organizationId: "org-a",
      paymentId: "payment-a",
      amountMinor: 12_345,
      currency: "CAD" as const,
      methodReference: "pm_test",
      authorizationReference: null,
      idempotencyKey: "authorization-1",
      scenario: "success" as const
    };
    await adapter.execute(request);
    await adapter.execute(request);
    const calls = client.paymentIntents.create.mock.calls as unknown[][];
    expect(calls[0]?.[1]).toEqual(calls[1]?.[1]);

    client.paymentIntents.create.mockResolvedValueOnce({
      id: "pi_live",
      status: "succeeded",
      livemode: true
    });
    await expect(
      adapter.execute({ ...request, idempotencyKey: "authorization-2" })
    ).rejects.toThrow(/Live-mode/);
  });

  it("verifies raw webhook signatures and rejects replay", async () => {
    const { provider: adapter } = provider();
    const raw = Buffer.from('{"id":"evt_test"}');
    await expect(adapter.verifyWebhook(raw, "synthetic-signature")).resolves.toMatchObject({
      id: "evt_test"
    });
    await expect(adapter.verifyWebhook(raw, "synthetic-signature")).rejects.toThrow(/replay/);
  });

  it("reconciles (query-only) by PaymentIntent id from the provider source of truth", async () => {
    const { provider: adapter } = provider();
    await expect(
      adapter.reconcile!({
        providerOperationKey: "rwos_op_x",
        paymentId: "00000000-0000-4000-8000-000000000040",
        organizationId: "00000000-0000-4000-8000-00000000000a",
        operation: "authorize",
        amountMinor: 10_500,
        providerOperationReference: "pi_test"
      })
    ).resolves.toMatchObject({ provider: "stripe_test", outcome: "accepted", providerOperationReference: "pi_test" });
  });

  it("reconcile with no PaymentIntent id → not_found (Stripe has no read-only lookup for an indeterminate op)", async () => {
    const { provider: adapter } = provider();
    await expect(
      adapter.reconcile!({
        providerOperationKey: "rwos_op_x",
        paymentId: "00000000-0000-4000-8000-000000000040",
        organizationId: "00000000-0000-4000-8000-00000000000a",
        operation: "authorize",
        amountMinor: 10_500,
        providerOperationReference: null
      })
    ).resolves.toMatchObject({ provider: "stripe_test", outcome: "not_found" });
  });
});

describe("Stripe provider live mode", () => {
  const liveEnvironment = {
    ...testEnvironment,
    mode: "live" as const,
    secretKey: "rk_live_synthetic_not_a_real_key"
  };

  it("requires the key prefix to match the mode in both directions", () => {
    expect(validateStripeTestEnvironment(liveEnvironment)).toEqual({ enabled: true, mode: "live" });
    expect(
      validateStripeTestEnvironment({ ...liveEnvironment, secretKey: "sk_live_synthetic" })
    ).toEqual({ enabled: true, mode: "live" });
    expect(() =>
      validateStripeTestEnvironment({ ...liveEnvironment, secretKey: "sk_test_synthetic" })
    ).toThrow(/live-mode secret/);
    expect(validateStripeTestEnvironment(testEnvironment)).toEqual({ enabled: true, mode: "test" });
  });

  it("never lets the test client run with a live key", () => {
    expect(() => createStripeTestClient(liveEnvironment)).toThrow(/test-mode secret/);
  });

  it("rejects test-mode objects and events when configured for live", async () => {
    const client = stripeClient();
    const seen = new Set<string>();
    const adapter = createStripeTestPaymentProvider({
      client: client as never,
      webhookSecret: testEnvironment.webhookSecret,
      mode: "live",
      replayStore: {
        async recordOnce({ eventId }) {
          if (seen.has(eventId)) return false;
          seen.add(eventId);
          return true;
        }
      }
    });
    await expect(
      adapter.createCustomer({ organizationId: "org-a", email: "a@example.test", idempotencyKey: "c1" })
    ).rejects.toThrow(/Test-mode/);
    await expect(adapter.verifyWebhook(Buffer.from("{}"), "sig")).rejects.toThrow(/Test-mode/);

    client.customers.create.mockResolvedValueOnce({ id: "cus_live", livemode: true });
    await expect(
      adapter.createCustomer({ organizationId: "org-a", email: "a@example.test", idempotencyKey: "c2" })
    ).resolves.toBe("cus_live");
  });
});
