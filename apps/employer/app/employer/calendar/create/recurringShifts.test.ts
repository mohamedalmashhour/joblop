import { describe, expect, it } from "vitest";
import { MAX_RECURRING_SHIFTS, recurringShifts } from "./recurringShifts";

// 2026-11-09 is a Monday.
const base = { startAt: "2026-11-09T09:00", endAt: "2026-11-09T15:00" };

describe("recurringShifts", () => {
  it("creates one shift for each chosen weekday through the end date", () => {
    expect(recurringShifts({ ...base, weekdays: [1, 3, 5], until: "2026-11-16" }).map((s) => s.startAt)).toEqual([
      "2026-11-09T09:00",
      "2026-11-11T09:00",
      "2026-11-13T09:00",
      "2026-11-16T09:00"
    ]);
  });

  it("skips the first date when its weekday was not chosen", () => {
    expect(recurringShifts({ ...base, weekdays: [3], until: "2026-11-12" }).map((s) => s.startAt)).toEqual([
      "2026-11-11T09:00"
    ]);
  });

  it("keeps a shift that ends the next morning", () => {
    const [shift] = recurringShifts({
      startAt: "2026-11-09T22:00",
      endAt: "2026-11-10T06:00",
      weekdays: [1],
      until: "2026-11-09"
    });
    expect(shift).toEqual({ startAt: "2026-11-09T22:00", endAt: "2026-11-10T06:00" });
  });

  it("keeps the clock time across the end of the month and a clock change", () => {
    const shifts = recurringShifts({
      startAt: "2026-10-30T09:00",
      endAt: "2026-10-30T15:00",
      weekdays: [1],
      until: "2026-11-03"
    });
    expect(shifts).toEqual([{ startAt: "2026-11-02T09:00", endAt: "2026-11-02T15:00" }]);
  });

  it("returns nothing for missing or backwards dates", () => {
    expect(recurringShifts({ ...base, weekdays: [1], until: "" })).toEqual([]);
    expect(recurringShifts({ ...base, weekdays: [1], until: "2026-11-01" })).toEqual([]);
    expect(recurringShifts({ ...base, weekdays: [], until: "2026-11-16" })).toEqual([]);
  });

  it("stops just over the limit so the form can refuse an oversized repeat", () => {
    const shifts = recurringShifts({ ...base, weekdays: [0, 1, 2, 3, 4, 5, 6], until: "2027-11-09" });
    expect(shifts).toHaveLength(MAX_RECURRING_SHIFTS + 1);
  });
});
