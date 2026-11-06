import { afterEach, describe, expect, it, vi } from "vitest";
import { isStripeCollectionConfigured, stripeCollectionEnvFromProcess } from "./stripeEnvironment";
import { isInvoiceCollectionEnabled } from "./employerInvoiceCollection";

const testKeys = {
  STRIPE_TEST_MODE_ENABLED: "enabled",
  STRIPE_TEST_SECRET_KEY: "sk_test_synthetic",
  STRIPE_TEST_WEBHOOK_SECRET: "whsec_test_synthetic",
  STRIPE_TEST_ACCOUNT_REFERENCE: "acct_test_synthetic"
};
const liveKeys = {
  STRIPE_LIVE_MODE_ENABLED: "enabled",
  STRIPE_LIVE_SECRET_KEY: "rk_live_synthetic",
  STRIPE_LIVE_WEBHOOK_SECRET: "whsec_live_synthetic",
  STRIPE_LIVE_ACCOUNT_REFERENCE: "acct_live_synthetic"
};
const stub = (env: Record<string, string>) =>
  Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value));

describe("Stripe collection environment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the test environment unless live mode is enabled", () => {
    stub({ ...testKeys, STRIPE_LIVE_MODE_ENABLED: "disabled" });
    expect(stripeCollectionEnvFromProcess()).toMatchObject({ secretKey: "sk_test_synthetic" });
    expect(isStripeCollectionConfigured()).toBe(true);
  });

  it("switches to the live environment when live mode is enabled", () => {
    stub(liveKeys);
    expect(stripeCollectionEnvFromProcess()).toMatchObject({ mode: "live", secretKey: "rk_live_synthetic" });
    expect(isStripeCollectionConfigured()).toBe(true);
  });

  it("is not configured when live mode has a test key", () => {
    stub({ ...liveKeys, STRIPE_LIVE_SECRET_KEY: "sk_test_synthetic" });
    expect(isStripeCollectionConfigured()).toBe(false);
  });

  it("requires INVOICE_LIVE_ENABLED for invoice collection in live mode, ignoring the test gate", () => {
    stub({ ...liveKeys, INVOICE_TEST_MODE_ENABLED: "enabled" });
    expect(isInvoiceCollectionEnabled()).toBe(false);
    vi.stubEnv("INVOICE_LIVE_ENABLED", "enabled");
    expect(isInvoiceCollectionEnabled()).toBe(true);
  });

  it("keeps the test invoice gate unchanged when live mode is off", () => {
    stub({ INVOICE_TEST_MODE_ENABLED: "enabled", STRIPE_LIVE_MODE_ENABLED: "disabled" });
    expect(isInvoiceCollectionEnabled()).toBe(true);
  });
});
