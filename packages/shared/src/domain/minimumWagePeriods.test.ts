import { describe, expect, it } from "vitest";
import { QUEBEC_MINIMUM_WAGE_RATES, minimumWagePeriods, quebecMidnight, quebecMinimumWageAt } from "./minimumWage";

// Round 7: the minimum-wage table as time windows, so a job is held to the rate in force on its date.
describe("minimum wage periods", () => {
  it("starts each rate at Québec midnight (summer and winter time)", () => {
    expect(quebecMidnight("2026-05-01").toISOString()).toBe("2026-05-01T04:00:00.000Z");
    expect(quebecMidnight("2026-12-01").toISOString()).toBe("2026-12-01T05:00:00.000Z");
  });

  it("covers all time with no gaps, one window per rate", () => {
    const periods = minimumWagePeriods();
    expect(periods).toHaveLength(QUEBEC_MINIMUM_WAGE_RATES.length);
    expect(periods[0]!.from).toBeNull();
    expect(periods[periods.length - 1]!.to).toBeNull();
    for (let i = 1; i < periods.length; i += 1) expect(periods[i]!.from).toEqual(periods[i - 1]!.to);
  });

  it("agrees with quebecMinimumWageAt at every boundary", () => {
    for (const period of minimumWagePeriods()) {
      if (period.from) {
        expect(quebecMinimumWageAt(period.from).hourlyMinor).toBe(period.hourlyMinor);
        expect(quebecMinimumWageAt(new Date(period.from.getTime() - 1)).hourlyMinor).not.toBe(period.hourlyMinor);
      }
    }
  });
});
