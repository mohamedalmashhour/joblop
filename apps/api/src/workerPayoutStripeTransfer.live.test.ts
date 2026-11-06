import { afterEach, describe, expect, it, vi } from "vitest";
import { createWorkerPayoutTransfer } from "./workerPayoutStripeTransfer";

describe("worker payout transfer in Stripe live mode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses to pay out when Stripe live mode is enabled", async () => {
    vi.stubEnv("STRIPE_LIVE_MODE_ENABLED", "enabled");
    await expect(
      createWorkerPayoutTransfer({ payoutId: "p1", workerReference: "w1", amountMinor: 100, currency: "CAD" })
    ).rejects.toThrow(/not available in Stripe live mode/);
  });

  it("still records a synthetic reference in test setups", async () => {
    vi.stubEnv("STRIPE_LIVE_MODE_ENABLED", "disabled");
    vi.stubEnv("STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT", "");
    await expect(
      createWorkerPayoutTransfer({ payoutId: "p1", workerReference: "w1", amountMinor: 100, currency: "CAD" })
    ).resolves.toEqual({ reference: "payout-test-synthetic-p1", mode: "synthetic" });
  });
});
