import { describe, expect, it } from "vitest";
import {
  MINIMUM_SHIFT_HOURS,
  MINIMUM_SHIFT_MINUTES,
  meetsMinimumShiftDuration,
  shiftDurationMinutes
} from "./shiftRules";

const start = "2026-08-10T15:00:00.000Z";
const plus = (h: number, m = 0) =>
  new Date(Date.parse(start) + (h * 60 + m) * 60000).toISOString();

describe("minimum shift rule (UI mirror)", () => {
  it("exposes the 6-hour constant", () => {
    expect(MINIMUM_SHIFT_HOURS).toBe(6);
    expect(MINIMUM_SHIFT_MINUTES).toBe(360);
  });

  it("rejects a shift below 6 hours (5h59m)", () => {
    expect(meetsMinimumShiftDuration(start, plus(5, 59))).toBe(false);
  });

  it("accepts exactly 6 hours (the boundary is inclusive)", () => {
    expect(meetsMinimumShiftDuration(start, plus(6))).toBe(true);
  });

  it("accepts more than 6 hours", () => {
    expect(meetsMinimumShiftDuration(start, plus(8))).toBe(true);
  });

  it("treats an invalid/zero/negative range as not meeting the minimum", () => {
    expect(meetsMinimumShiftDuration(start, start)).toBe(false);
    expect(meetsMinimumShiftDuration(start, plus(-1))).toBe(false);
    expect(meetsMinimumShiftDuration("not-a-date", plus(8))).toBe(false);
    expect(shiftDurationMinutes(start, start)).toBe(0);
  });
});
