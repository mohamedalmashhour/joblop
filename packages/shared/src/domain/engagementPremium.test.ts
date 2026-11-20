import { describe, expect, it } from "vitest";
import { applyEngagementPremium } from "./engagementPremium";
import { deriveTierBand } from "./tierBand";

const band = () => deriveTierBand({ family: "service", tier: 4, marketMedianMinor: 2000, currency: "CAD" });
// → { minMinor: 2430, midMinor: 2700, maxMinor: 2970 }

describe("engagement premium — applies a short-term uplift to the advisory band", () => {
  it("permanent is the base (no premium)", () => {
    expect(applyEngagementPremium(band(), "permanent")).toMatchObject({
      engagement: "permanent",
      premiumPpm: 0,
      band: { minMinor: 2430, midMinor: 2700, maxMinor: 2970 }
    });
  });

  it("shift adds the biggest uplift (+30% by default)", () => {
    expect(applyEngagementPremium(band(), "shift")).toMatchObject({
      premiumPpm: 300_000,
      band: { minMinor: 3159, midMinor: 3510, maxMinor: 3861 } // ×1.3
    });
  });

  it("contract is in between (+15% by default)", () => {
    expect(applyEngagementPremium(band(), "contract")).toMatchObject({
      band: { midMinor: 3105 } // round(2700*1.15)
    });
  });

  it("honours an explicit premium override", () => {
    expect(applyEngagementPremium(band(), "permanent", 500_000)).toMatchObject({
      band: { midMinor: 4050 } // round(2700*1.5)
    });
  });

  it("fail-closed: invalid upstream band propagates, bad engagement/premium rejected", () => {
    const badBand = deriveTierBand({ family: "service", tier: 99, marketMedianMinor: 2000, currency: "CAD" });
    expect(applyEngagementPremium(badBand, "shift")).toMatchObject({ status: "invalid" });
    expect(applyEngagementPremium(band(), "weekly" as never)).toMatchObject({ status: "invalid" });
    expect(applyEngagementPremium(band(), "shift", -10)).toMatchObject({ status: "invalid" });
  });
});
