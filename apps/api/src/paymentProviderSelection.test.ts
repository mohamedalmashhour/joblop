import type { PaymentProviderPort } from "@rwos/shared";
import { describe, expect, it, vi } from "vitest";
import {
  isStripeProviderConfigured,
  selectPaymentProvider
} from "./paymentProviderSelection";

const fake = { id: "local_fake" } as unknown as PaymentProviderPort;
const stripe = { id: "stripe_test" } as unknown as PaymentProviderPort;

const stripeCreds = {
  stripeTestModeEnabled: true,
  stripeTestSecretKey: "sk_test_synthetic",
  stripeTestWebhookSecret: "whsec_synthetic",
  stripeTestAccountReference: "acct_test_synthetic"
};

describe("payment provider selection (money-golive-readiness)", () => {
  it("gate OFF → local fake, and the Stripe factory is NEVER invoked", () => {
    const createStripe = vi.fn(() => stripe);
    const createLocalFake = vi.fn(() => fake);
    const result = selectPaymentProvider({
      financeLive: false,
      stripeConfigured: true,
      createLocalFake,
      createStripe
    });
    expect(result).toEqual({ provider: fake, kind: "local_fake" });
    expect(createStripe).not.toHaveBeenCalled();
    expect(createLocalFake).toHaveBeenCalledTimes(1);
  });

  it("gate ON + Stripe configured → real Stripe provider", () => {
    const result = selectPaymentProvider({
      financeLive: true,
      stripeConfigured: true,
      createLocalFake: () => fake,
      createStripe: () => stripe
    });
    expect(result).toEqual({ provider: stripe, kind: "stripe_test" });
  });

  it("gate ON but Stripe NOT configured → local fake (fail closed), Stripe factory never invoked", () => {
    const createStripe = vi.fn(() => stripe);
    const result = selectPaymentProvider({
      financeLive: true,
      stripeConfigured: false,
      createLocalFake: () => fake,
      createStripe
    });
    expect(result).toEqual({ provider: fake, kind: "local_fake" });
    expect(createStripe).not.toHaveBeenCalled();
  });

  it("Stripe configured but gate OFF → local fake (the default committed path)", () => {
    const result = selectPaymentProvider({
      financeLive: false,
      stripeConfigured: false,
      createLocalFake: () => fake,
      createStripe: () => stripe
    });
    expect(result.kind).toBe("local_fake");
  });
});

describe("isStripeProviderConfigured", () => {
  it("true only when test mode is on AND all credentials are well-formed", () => {
    expect(isStripeProviderConfigured(stripeCreds)).toBe(true);
  });

  it("false when test mode is off", () => {
    expect(isStripeProviderConfigured({ ...stripeCreds, stripeTestModeEnabled: false })).toBe(false);
  });

  it("false when the secret is missing or not a test secret", () => {
    expect(isStripeProviderConfigured({ ...stripeCreds, stripeTestSecretKey: undefined })).toBe(false);
    expect(isStripeProviderConfigured({ ...stripeCreds, stripeTestSecretKey: "sk_live_forbidden" })).toBe(false);
  });

  it("false when the webhook secret is missing or malformed", () => {
    expect(isStripeProviderConfigured({ ...stripeCreds, stripeTestWebhookSecret: undefined })).toBe(false);
    expect(isStripeProviderConfigured({ ...stripeCreds, stripeTestWebhookSecret: "nope" })).toBe(false);
  });

  it("false when the account reference is missing or empty", () => {
    expect(isStripeProviderConfigured({ ...stripeCreds, stripeTestAccountReference: undefined })).toBe(false);
    expect(isStripeProviderConfigured({ ...stripeCreds, stripeTestAccountReference: "" })).toBe(false);
  });
});
