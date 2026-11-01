import { describe, expect, it } from "vitest";
import { resolveHolidayDate, upcomingHolidays, type Holiday } from "./holidays";

const ymd = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

describe("resolveHolidayDate", () => {
  it("fixed dates", () => {
    expect(ymd(resolveHolidayDate({ kind: "fixed", month: 7, day: 1 }, 2026))).toBe("2026-07-01");
    expect(ymd(resolveHolidayDate({ kind: "fixed", month: 12, day: 25 }, 2026))).toBe("2026-12-25");
  });

  it("nth weekday of month — Labour Day (1st Monday Sep), Thanksgiving CA (2nd Monday Oct)", () => {
    expect(ymd(resolveHolidayDate({ kind: "nthWeekday", month: 9, weekday: 1, nth: 1 }, 2026))).toBe("2026-09-07");
    expect(ymd(resolveHolidayDate({ kind: "nthWeekday", month: 10, weekday: 1, nth: 2 }, 2026))).toBe("2026-10-12");
  });

  it("weekday on or before — Victoria Day (Monday on or before May 24)", () => {
    // 2026: May 24 is a Sunday → Monday on or before is May 18.
    expect(ymd(resolveHolidayDate({ kind: "weekdayOnOrBefore", month: 5, day: 24, weekday: 1 }, 2026))).toBe("2026-05-18");
    // 2027: May 24 is a Monday → itself.
    expect(ymd(resolveHolidayDate({ kind: "weekdayOnOrBefore", month: 5, day: 24, weekday: 1 }, 2027))).toBe("2027-05-24");
  });

  it("Easter-relative — Good Friday 2026 = Apr 3, Easter Monday 2026 = Apr 6", () => {
    expect(ymd(resolveHolidayDate({ kind: "easterOffset", offsetDays: -2 }, 2026))).toBe("2026-04-03");
    expect(ymd(resolveHolidayDate({ kind: "easterOffset", offsetDays: 1 }, 2026))).toBe("2026-04-06");
  });

  it("last weekday of month", () => {
    // Last Monday of May 2026 = May 25.
    expect(ymd(resolveHolidayDate({ kind: "lastWeekday", month: 5, weekday: 1 }, 2026))).toBe("2026-05-25");
  });
});

describe("upcomingHolidays", () => {
  const list: Holiday[] = [
    { key: "canada_day", en: "Canada Day", fr: "Fête du Canada", ar: "", rule: { kind: "fixed", month: 7, day: 1 } },
    { key: "new_year", en: "New Year's Day", fr: "Jour de l'An", ar: "", rule: { kind: "fixed", month: 1, day: 1 } },
    { key: "christmas", en: "Christmas Day", fr: "Noël", ar: "", rule: { kind: "fixed", month: 12, day: 25 } }
  ];

  it("returns soonest first, with daysUntil, and rolls into next year", () => {
    const from = new Date(Date.UTC(2026, 11, 20)); // Dec 20 2026
    const up = upcomingHolidays(list, from);
    expect(up.map((h) => h.key)).toEqual(["christmas", "new_year", "canada_day"]);
    expect(up[0]).toMatchObject({ date: "2026-12-25", daysUntil: 5 });
    expect(up[1]).toMatchObject({ date: "2027-01-01" }); // next year
  });

  it("includes a holiday that falls exactly on `from` (daysUntil 0) and respects the limit", () => {
    const from = new Date(Date.UTC(2026, 6, 1)); // Jul 1 2026 — Canada Day itself
    const up = upcomingHolidays(list, from, 2);
    expect(up).toHaveLength(2);
    expect(up[0]).toMatchObject({ key: "canada_day", daysUntil: 0 });
  });
});
