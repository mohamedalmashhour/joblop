import { describe, expect, it } from "vitest";
import { addMonths, buildMonthWeeks, isoDay, weekdayNames } from "./monthGrid";

describe("month grid", () => {
  it("builds 6 Sunday-started weeks with correct in-month flags", () => {
    // July 2026: July 1 is a Wednesday; the grid starts on Sun Jun 28.
    const weeks = buildMonthWeeks(2026, 6);
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toHaveLength(7);
    expect(weeks[0]![0]!.date.getDay()).toBe(0); // starts on Sunday
    expect(weeks[0]![0]!.iso).toBe("2026-06-28");
    expect(weeks[0]![0]!.inMonth).toBe(false); // June spillover
    const jul1 = weeks[0]!.find((c) => c.iso === "2026-07-01")!;
    expect(jul1.inMonth).toBe(true);
  });

  it("isoDay is local YYYY-MM-DD", () => {
    expect(isoDay(new Date(2026, 6, 5))).toBe("2026-07-05");
  });

  it("addMonths wraps the year", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it("weekdayNames returns 7 Sunday-first names", () => {
    const en = weekdayNames("en");
    expect(en).toHaveLength(7);
    expect(en[0]!.toLowerCase()).toContain("sun");
  });
});
