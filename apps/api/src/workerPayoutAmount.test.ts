import { describe, expect, it } from "vitest";
import { workerPayoutAmountMinor } from "./workerPayoutRepository";

const calc = { netPayMinor: 19_293, correctionType: null, adjustmentNetDirection: null, adjustmentNetDeltaMinor: null };

describe("worker payout amount", () => {
  it("pays an ordinary locked calculation in full", () => {
    expect(workerPayoutAmountMinor(calc)).toBe(19_293);
    expect(workerPayoutAmountMinor({ ...calc, correctionType: "pre_lock_revision" })).toBe(19_293);
  });

  it("pays only the difference on an upward adjustment", () => {
    expect(workerPayoutAmountMinor({ ...calc, correctionType: "post_lock_adjustment", adjustmentNetDirection: "credit", adjustmentNetDeltaMinor: 2_756 })).toBe(2_756);
  });

  it("creates no payout for a downward or no-change adjustment", () => {
    const adjustment = { ...calc, correctionType: "post_lock_adjustment" };
    expect(workerPayoutAmountMinor({ ...adjustment, adjustmentNetDirection: "debit", adjustmentNetDeltaMinor: 2_756 })).toBeNull();
    expect(workerPayoutAmountMinor({ ...adjustment, adjustmentNetDirection: "credit", adjustmentNetDeltaMinor: 0 })).toBeNull();
    expect(workerPayoutAmountMinor(adjustment)).toBeNull();
  });
});
