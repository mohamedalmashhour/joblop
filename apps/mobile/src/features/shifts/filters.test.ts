import { describe, expect, it } from "vitest";
import { mockShiftDiscoveryRecords } from "../../data/mock/shifts";
import { countActiveFilters, getTimeOfDay, resetFilters, shiftMatchesFilters } from "./filters";

const openShift = mockShiftDiscoveryRecords[0]!;

describe("shift filters", () => {
  it("counts active filters", () => {
    expect(countActiveFilters({ category: "kitchen", city: "Montreal", keyword: "" })).toBe(2);
  });

  it("resets filters", () => {
    expect(resetFilters()).toEqual({});
  });

  it("matches deterministic filter combinations", () => {
    expect(
      shiftMatchesFilters(openShift, {
        category: "kitchen",
        city: "Montreal",
        date: "2026-07-14",
        keyword: "food",
        minimumHourlyRateMinor: 4500,
        timeOfDay: "morning",
        urgency: "immediate"
      })
    ).toBe(true);
  });

  it("rejects unsupported filter values through validation", () => {
    expect(() => shiftMatchesFilters(openShift, { category: "driver" as never })).toThrow();
  });

  it("classifies time of day from ISO dates", () => {
    expect(getTimeOfDay("2026-07-14T21:00:00.000Z")).toBe("evening");
  });
});
