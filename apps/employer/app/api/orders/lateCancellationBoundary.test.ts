import { describe, expect, it } from "vitest";
import { parseOrderLateCancellation } from "./lateCancellationBoundary";

describe("order late-cancellation boundary", () => {
  it("keeps only the warning fields and drops anything else", () => {
    const parsed = parseOrderLateCancellation({
      lateCancellation: {
        applies: true,
        cutoffHours: 24,
        chargeHours: 6,
        confirmedWorkers: 2,
        estimatedSubtotalMinor: 36000,
        currency: "CAD",
        employerHourlyRateMinor: 3000,
        platformMarginMinor: 600
      }
    });
    expect(parsed).toEqual({ applies: true, cutoffHours: 24, chargeHours: 6, confirmedWorkers: 2, estimatedSubtotalMinor: 36000, currency: "CAD" });
  });

  it("rejects a malformed answer", () => {
    expect(parseOrderLateCancellation({ lateCancellation: { applies: "yes" } })).toBeNull();
    expect(parseOrderLateCancellation(null)).toBeNull();
  });
});
