import { afterEach, describe, expect, it, vi } from "vitest";
import { isStripeTestConfigured } from "./cvProStripeCheckout";

function setStripeTestEnv() {
  vi.stubEnv("STRIPE_TEST_MODE_ENABLED", "enabled");
  vi.stubEnv("STRIPE_TEST_SECRET_KEY", "sk_test_synthetic_not_a_real_key");
  vi.stubEnv("STRIPE_TEST_WEBHOOK_SECRET", "whsec_synthetic_not_a_real_secret");
  vi.stubEnv("STRIPE_TEST_ACCOUNT_REFERENCE", "acct_test_synthetic");
}

describe("isStripeTestConfigured (card button gate)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true with complete Stripe TEST keys outside production", () => {
    setStripeTestEnv();
    for (const env of ["local", "test", "staging"]) {
      vi.stubEnv("RWOS_ENV", env);
      expect(isStripeTestConfigured()).toBe(true);
    }
  });

  it("is always false in production, even with complete Stripe TEST keys", () => {
    setStripeTestEnv();
    vi.stubEnv("RWOS_ENV", "production");
    expect(isStripeTestConfigured()).toBe(false);
  });

  it("is false when keys are missing or not test keys", () => {
    vi.stubEnv("RWOS_ENV", "test");
    vi.stubEnv("STRIPE_TEST_MODE_ENABLED", "enabled");
    vi.stubEnv("STRIPE_TEST_SECRET_KEY", "sk_live_x");
    vi.stubEnv("STRIPE_TEST_WEBHOOK_SECRET", "whsec_x");
    vi.stubEnv("STRIPE_TEST_ACCOUNT_REFERENCE", "acct_x");
    expect(isStripeTestConfigured()).toBe(false);
  });
});
