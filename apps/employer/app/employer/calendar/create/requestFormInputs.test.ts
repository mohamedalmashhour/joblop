import { describe, expect, it } from "vitest";
import {
  TIME_OPTIONS,
  addHoursLocal,
  allowanceAmountMissing,
  combineDateTime,
  defaultStart,
  dollarsToMinor,
  estimateTaxLines,
  isLongShift,
  localDateTimeToIso,
  minorToDollars,
  snapToQuarterHour,
  splitDateTime,
  timeOptionLabel
} from "./requestFormInputs";

describe("time select", () => {
  it("offers every 15 minutes of the day", () => {
    expect(TIME_OPTIONS).toHaveLength(96);
    expect(TIME_OPTIONS[0]).toBe("00:00");
    expect(TIME_OPTIONS[25]).toBe("06:15");
    expect(TIME_OPTIONS.at(-1)).toBe("23:45");
  });

  it("labels times for each language", () => {
    expect(timeOptionLabel("06:00", "en-CA")).toBe("6:00 AM");
    expect(timeOptionLabel("00:15", "en-CA")).toBe("12:15 AM");
    expect(timeOptionLabel("23:45", "en-CA")).toBe("11:45 PM");
    expect(timeOptionLabel("14:30", "fr-CA")).toBe("14 h 30");
    expect(timeOptionLabel("14:30", "ar")).toBe("14:30");
  });

  it("joins a date and a time, and converts to ISO", () => {
    expect(combineDateTime("2026-11-12", "08:00")).toBe("2026-11-12T08:00");
    expect(combineDateTime("", "08:00")).toBe("");
    expect(combineDateTime("2026-11-12", "")).toBe("");
    const local = combineDateTime("2026-11-12", "08:00");
    expect(localDateTimeToIso(local)).toBe(new Date(2026, 10, 12, 8, 0).toISOString());
    expect(localDateTimeToIso("")).toBeNull();
    expect(localDateTimeToIso("not a date")).toBeNull();
  });

  it("splits a local date-time back into its parts", () => {
    expect(splitDateTime("2026-11-12T14:30")).toEqual({ date: "2026-11-12", time: "14:30" });
    expect(splitDateTime("")).toEqual({ date: "", time: "" });
  });

  it("defaults the end to start + 6 hours, crossing midnight", () => {
    expect(addHoursLocal("2026-11-12T08:00", 6)).toBe("2026-11-12T14:00");
    expect(addHoursLocal("2026-11-12T20:00", 6)).toBe("2026-11-13T02:00");
    expect(addHoursLocal("", 6)).toBe("");
  });

  it("defaults the start to a round time (tomorrow 8:00 AM)", () => {
    expect(defaultStart(new Date(2026, 10, 9, 22, 11))).toBe("2026-11-10T08:00");
    expect(defaultStart(new Date(2026, 11, 31, 9, 0))).toBe("2027-01-01T08:00");
  });

  it("snaps an odd stored time onto the 15-minute list", () => {
    expect(snapToQuarterHour("22:11")).toBe("22:00");
    expect(snapToQuarterHour("07:59")).toBe("07:45");
    expect(snapToQuarterHour("bad")).toBe("");
  });

  it("warns about a single shift over 16 hours", () => {
    expect(isLongShift(16)).toBe(false);
    expect(isLongShift(16.25)).toBe(true);
    expect(isLongShift(60)).toBe(true);
  });
});

describe("dollar amounts", () => {
  it("converts typed dollars to minor units", () => {
    expect(dollarsToMinor("20")).toBe(2000);
    expect(dollarsToMinor("20.00")).toBe(2000);
    expect(dollarsToMinor("20.5")).toBe(2050);
    expect(dollarsToMinor("$1.25")).toBe(125);
    expect(dollarsToMinor("20,75")).toBe(2075);
    expect(dollarsToMinor("0")).toBe(0);
    expect(dollarsToMinor(" 100 ")).toBe(10000);
  });

  it("returns null when empty and NaN when not a valid amount", () => {
    expect(dollarsToMinor("")).toBeNull();
    expect(dollarsToMinor("   ")).toBeNull();
    expect(dollarsToMinor("-5")).toBeNaN();
    expect(dollarsToMinor("1.234")).toBeNaN();
    expect(dollarsToMinor("abc")).toBeNaN();
  });

  it("shows stored minor units as dollars", () => {
    expect(minorToDollars(2000)).toBe("20.00");
    expect(minorToDollars(125)).toBe("1.25");
    expect(minorToDollars(null)).toBe("");
  });

  it("requires an amount for a cash allowance only", () => {
    expect(allowanceAmountMissing("allowance", "")).toBe(true);
    expect(allowanceAmountMissing("allowance", "abc")).toBe(true);
    expect(allowanceAmountMissing("allowance", "20")).toBe(false);
    expect(allowanceAmountMissing("provided", "")).toBe(false);
    expect(allowanceAmountMissing("none", "")).toBe(false);
  });
});

describe("price box taxes", () => {
  it("adds GST 5% and QST 9.975% to the subtotal", () => {
    expect(estimateTaxLines(36000)).toEqual({ subtotalMinor: 36000, gstMinor: 1800, qstMinor: 3591, totalMinor: 41391 });
    expect(estimateTaxLines(0)).toEqual({ subtotalMinor: 0, gstMinor: 0, qstMinor: 0, totalMinor: 0 });
  });
});
