import { describe, expect, it } from "vitest";
import { reliabilityFrom } from "./offerMatchingRepository";

describe("worker reliability from the offer log", () => {
  it("cold-starts at 0.5 with no history", () => {
    expect(reliabilityFrom(0, 0)).toBe(0.5);
  });
  it("rises toward the realized accept rate as accepts accumulate", () => {
    expect(reliabilityFrom(8, 0)).toBeGreaterThan(0.8);
    expect(reliabilityFrom(8, 2)).toBeGreaterThan(reliabilityFrom(2, 8));
  });
  it("falls when the worker keeps declining", () => {
    expect(reliabilityFrom(0, 8)).toBeLessThan(0.2);
  });
});
