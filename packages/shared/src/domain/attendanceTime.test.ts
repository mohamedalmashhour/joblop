import { describe, expect, it } from "vitest";
import { ATTENDANCE_TIME_MARGIN_MINUTES, attendanceDeviationFlags, countedAttendanceMinutes } from "./attendanceTime";

// Laval, Nov 12 2026 (EST, UTC-5): an 08:00–14:00 shift is 13:00Z–19:00Z.
const T = (hhmmss: string) => new Date(`2026-11-12T${hhmmss}.000Z`);
const shift = (checkIn: string, checkOut: string) => ({
  checkInAt: T(checkIn),
  checkOutAt: T(checkOut),
  scheduledStartAt: T("13:00:00"),
  scheduledEndAt: T("19:00:00")
});

describe("attendance time rule (15-minute margin, counted from the scheduled start)", () => {
  it("is one 15-minute constant", () => {
    expect(ATTENDANCE_TIME_MARGIN_MINUTES).toBe(15);
  });

  it("07:30 in for an 08:00 start (30 min early): no flag, counted from 08:00", () => {
    expect(attendanceDeviationFlags(shift("12:30:00", "19:00:00"))).toEqual([]);
    expect(countedAttendanceMinutes(shift("12:30:00", "19:00:00"))).toBe(360);
  });

  it("within 15 minutes either way is normal (no flag)", () => {
    expect(attendanceDeviationFlags(shift("12:45:00", "19:15:00"))).toEqual([]);
    expect(attendanceDeviationFlags(shift("13:15:00", "18:45:00"))).toEqual([]);
    expect(attendanceDeviationFlags(shift("12:59:40", "19:00:20"))).toEqual([]);
  });

  it("more than 15 minutes flags as before (except early arrival, which is simply not counted)", () => {
    expect(attendanceDeviationFlags(shift("12:44:59", "19:15:01"))).toEqual(["late_departure"]);
    expect(attendanceDeviationFlags(shift("13:15:01", "18:44:59"))).toEqual(["late_arrival", "early_departure"]);
  });

  it("caps at the scheduled end; late arrival / early departure count the actual time", () => {
    expect(countedAttendanceMinutes(shift("13:00:00", "19:40:00"))).toBe(360);
    expect(countedAttendanceMinutes(shift("13:10:00", "19:00:00"))).toBe(350);
    expect(countedAttendanceMinutes(shift("13:00:00", "17:00:00"))).toBe(240);
    // Left before the shift even started: nothing counted (the 6-hour minimum is applied later).
    expect(countedAttendanceMinutes(shift("12:00:00", "12:30:00"))).toBe(0);
  });
});
