import { describe, expect, it } from "vitest";
import { deriveTierBand, isTierBand } from "./tierBand";

describe("tier band — deterministic tier→band mapping (advisory)", () => {
  it("tier 1 sits below the median (floor multiplier)", () => {
    const b = deriveTierBand({ family: "service", tier: 1, marketMedianMinor: 2000, currency: "CAD" });
    expect(b).toEqual({ currency: "CAD", minMinor: 1530, midMinor: 1700, maxMinor: 1870, multiplier: 0.85 });
  });

  it("the family top tier sits above the median (ceiling multiplier)", () => {
    expect(deriveTierBand({ family: "service", tier: 4, marketMedianMinor: 2000, currency: "CAD" })).toMatchObject({
      midMinor: 2700,
      multiplier: 1.35
    });
    expect(deriveTierBand({ family: "professional", tier: 6, marketMedianMinor: 2000, currency: "CAD" })).toMatchObject({
      midMinor: 2700,
      multiplier: 1.35
    });
  });

  it("interpolates linearly between floor and ceiling by tier within the family", () => {
    // professional tier 3 of 6 → position 0.4 → mult 0.85 + 0.5*0.4 = 1.05 → mid 2100
    expect(deriveTierBand({ family: "professional", tier: 3, marketMedianMinor: 2000, currency: "CAD" })).toMatchObject({
      midMinor: 2100,
      minMinor: 1890,
      maxMinor: 2310,
      multiplier: 1.05
    });
  });

  it("respects custom multipliers and half-width", () => {
    const b = deriveTierBand(
      { family: "service", tier: 1, marketMedianMinor: 1000, currency: "USD" },
      { floorMultiplier: 1, ceilingMultiplier: 2, halfWidthPpm: 0 }
    );
    expect(b).toEqual({ currency: "USD", minMinor: 1000, midMinor: 1000, maxMinor: 1000, multiplier: 1 });
  });

  it("fail-closed on invalid tier / median / currency / options", () => {
    expect(deriveTierBand({ family: "service", tier: 0, marketMedianMinor: 2000, currency: "CAD" })).toMatchObject({ status: "invalid" });
    expect(deriveTierBand({ family: "service", tier: 5, marketMedianMinor: 2000, currency: "CAD" })).toMatchObject({ status: "invalid" }); // ceiling 4
    expect(deriveTierBand({ family: "service", tier: 2, marketMedianMinor: 0, currency: "CAD" })).toMatchObject({ status: "invalid" });
    expect(deriveTierBand({ family: "service", tier: 2, marketMedianMinor: 2000, currency: " " })).toMatchObject({ status: "invalid" });
    expect(
      deriveTierBand({ family: "service", tier: 2, marketMedianMinor: 2000, currency: "CAD" }, { floorMultiplier: -1 })
    ).toMatchObject({ status: "invalid" });
  });

  it("isTierBand narrows the result", () => {
    const ok = deriveTierBand({ family: "service", tier: 2, marketMedianMinor: 2000, currency: "CAD" });
    const bad = deriveTierBand({ family: "service", tier: 99, marketMedianMinor: 2000, currency: "CAD" });
    expect(isTierBand(ok)).toBe(true);
    expect(isTierBand(bad)).toBe(false);
  });
});
