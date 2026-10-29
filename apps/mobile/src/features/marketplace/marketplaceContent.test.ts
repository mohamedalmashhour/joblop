import { describe, expect, it } from "vitest";
import { formatDistance, formatOpenings, formatShiftWindow, formatWorkerRate } from "./marketplaceContent";

describe("marketplace formatters", () => {
  it("formats a shift window from two ISO instants", () => {
    expect(formatShiftWindow("2026-07-01T12:00:00.000Z", "2026-07-01T20:00:00.000Z")).toBe("Wed, Jul 1 · 12:00–20:00");
  });

  it("degrades gracefully on unparseable instants", () => {
    expect(formatShiftWindow("not-a-date", "also-bad")).toBe("Scheduled time to be confirmed");
  });

  it("never invents a rate — null (policy-gated) shows an honest placeholder", () => {
    expect(formatWorkerRate(null, "CAD")).toBe("Rate shared after you're matched");
    expect(formatWorkerRate(2500, "CAD")).toBe("25.00 CAD/h");
  });

  it("formats distance and openings", () => {
    expect(formatDistance(null)).toBe("");
    expect(formatDistance(0.4)).toBe("Less than 1 km away");
    expect(formatDistance(3.24)).toBe("3.2 km away");
    expect(formatDistance(12.9)).toBe("13 km away");
    expect(formatOpenings(1)).toBe("1 opening");
    expect(formatOpenings(4)).toBe("4 openings");
  });
});
