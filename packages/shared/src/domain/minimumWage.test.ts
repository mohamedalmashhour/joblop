import { describe, expect, it } from "vitest";
import {
  QUEBEC_MINIMUM_WAGE_RATES,
  MinimumWageError,
  assertWorkerPayMeetsMinimumWage,
  belowMinimumWageMessage,
  isBelowMinimumWage,
  quebecMinimumWageAt
} from "./minimumWage";

describe("Québec minimum wage: one dated table", () => {
  it("rows are in date order, in cents, each with a source", () => {
    const dates = QUEBEC_MINIMUM_WAGE_RATES.map((r) => r.effectiveFrom);
    expect([...dates].sort()).toEqual(dates);
    for (const rate of QUEBEC_MINIMUM_WAGE_RATES) {
      expect(Number.isInteger(rate.hourlyMinor)).toBe(true);
      expect(rate.source.length).toBeGreaterThan(0);
    }
    expect(QUEBEC_MINIMUM_WAGE_RATES[0]).toMatchObject({ effectiveFrom: "2025-05-01", hourlyMinor: 1610 });
  });

  it("picks the rate in force on the day, switching at midnight Québec time", () => {
    expect(quebecMinimumWageAt(new Date("2025-06-01T12:00:00Z")).hourlyMinor).toBe(1610);
    // 2026-04-30 23:30 in Montréal is 2026-05-01 03:30 UTC: still the old rate.
    expect(quebecMinimumWageAt(new Date("2026-05-01T03:30:00Z")).hourlyMinor).toBe(1610);
    expect(quebecMinimumWageAt(new Date("2026-05-01T04:30:00Z")).hourlyMinor).toBe(1660);
    // Before the table starts, the earliest known rate is used.
    expect(quebecMinimumWageAt(new Date("2024-01-01T12:00:00Z")).hourlyMinor).toBe(1610);
  });

  it("a $1.60/h job is below; the minimum itself is fine", () => {
    const at = new Date("2025-09-01T12:00:00Z");
    expect(isBelowMinimumWage({ workerHourlyRateMinor: 160, currency: "CAD", at })).toBe(true);
    expect(isBelowMinimumWage({ workerHourlyRateMinor: 1609, currency: "CAD", at })).toBe(true);
    expect(isBelowMinimumWage({ workerHourlyRateMinor: 1610, currency: "CAD", at })).toBe(false);
    expect(isBelowMinimumWage({ workerHourlyRateMinor: 2200, currency: "CAD", at })).toBe(false);
  });

  it("long-term listings (no hourly pay) and non-CAD jobs are exempt", () => {
    const at = new Date("2025-09-01T12:00:00Z");
    expect(isBelowMinimumWage({ workerHourlyRateMinor: 0, currency: "CAD", isLongTermListing: true, at })).toBe(false);
    expect(isBelowMinimumWage({ workerHourlyRateMinor: 160, currency: "SYP", at })).toBe(false);
  });

  it("the error says the minimum in plain words", () => {
    const at = new Date("2025-09-01T12:00:00Z");
    expect(belowMinimumWageMessage(at)).toBe("Worker pay is below Québec minimum wage ($16.10/h).");
    expect(() => assertWorkerPayMeetsMinimumWage({ workerHourlyRateMinor: 160, currency: "CAD", at })).toThrow(MinimumWageError);
    try {
      assertWorkerPayMeetsMinimumWage({ workerHourlyRateMinor: 160, currency: "CAD", at });
    } catch (error) {
      expect((error as MinimumWageError).code).toBe("RWOS_BELOW_MINIMUM_WAGE");
      expect((error as MinimumWageError).minimumHourlyMinor).toBe(1610);
      expect((error as Error).message).toBe("Worker pay is below Québec minimum wage ($16.10/h).");
    }
    expect(() => assertWorkerPayMeetsMinimumWage({ workerHourlyRateMinor: 1700, currency: "CAD", at })).not.toThrow();
  });
});
