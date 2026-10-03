import { describe, expect, it } from "vitest";
import { workerAllowances } from "./workerAllowances";

const profile = {
  transportProvision: "allowance",
  transportAmountMinor: 1000, // EMPLOYER-funded amount — must never reach the worker view
  transportNote: "gas",
  mealProvision: "provided",
  mealAmountMinor: null,
  mealNote: "on site",
  lodgingProvision: "none",
  lodgingAmountMinor: null,
  lodgingNote: null
};

describe("worker allowances view (slice 4F leakage guard)", () => {
  it("shows the worker-side amount from the snapshot, never the employer-funded amount", () => {
    const view = workerAllowances(profile, {
      transportWorkerMinor: 800, // employer 1000 − 20% margin
      mealWorkerMinor: 0,
      lodgingWorkerMinor: 0
    });
    expect(view.transport).toEqual({ provision: "allowance", amountMinor: 800, note: "gas" });
    // the raw employer amount (1000) must not appear anywhere
    expect(JSON.stringify(view)).not.toContain("1000");
    // "provided" is in-kind: no amount
    expect(view.meal).toEqual({ provision: "provided", amountMinor: null, note: "on site" });
    // "none" is omitted entirely
    expect(view.lodging).toBeNull();
  });

  it("reports a null amount (not the employer amount) before approval when no snapshot exists", () => {
    const view = workerAllowances(profile, null);
    expect(view.transport).toEqual({ provision: "allowance", amountMinor: null, note: "gas" });
    expect(JSON.stringify(view)).not.toContain("1000");
  });
});
