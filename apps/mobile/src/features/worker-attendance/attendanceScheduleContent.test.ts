import { describe, expect, it } from "vitest";
import {
  attendanceAction,
  attendanceCopyFor,
  attendanceStatusLabel,
  attendanceStatusTone,
  canCancelShift,
  isLateCancellation
} from "./attendanceScheduleContent";

describe("cancel this shift", () => {
  it("offers cancel only for a booked shift that has not started (never for a long-term listing)", () => {
    expect(canCancelShift({ status: "pending_start" })).toBe(true);
    expect(canCancelShift({ status: "checked_in" })).toBe(false);
    expect(canCancelShift({ status: "cancelled" })).toBe(false);
    expect(canCancelShift({ status: "pending_start", clockInAllowed: false })).toBe(false);
  });

  it("is a late cancellation under 24 h before the start", () => {
    const start = "2027-02-12T13:00:00.000Z";
    expect(isLateCancellation(start, Date.parse("2027-02-11T12:59:00.000Z"))).toBe(false);
    expect(isLateCancellation(start, Date.parse("2027-02-11T13:01:00.000Z"))).toBe(true);
  });

  it("says plainly in every language that a late cancel suspends the account for 7 days, and names no rate", () => {
    for (const locale of ["en", "fr", "ar"] as const) {
      const copy = attendanceCopyFor(locale);
      expect(copy.cancelLateBody).toMatch(/7/);
      expect(copy.cancelFreeBody).not.toMatch(/7/);
      for (const text of [copy.cancelLateBody, copy.cancelFreeBody, copy.cancelledNotice, copy.cancelledSuspendedNotice]) {
        expect(text).not.toMatch(/\$|\d+[.,]\d{2}/);
      }
      expect(copy.cancelCta.length).toBeGreaterThan(0);
      expect(copy.cancelKeep.length).toBeGreaterThan(0);
    }
  });
});

describe("attendance schedule content", () => {
  it("labels + tones statuses (pass-through unknowns)", () => {
    expect(attendanceStatusLabel("checked_in")).toBe("Checked in");
    expect(attendanceStatusTone("checked_in")).toBe("success");
    expect(attendanceStatusLabel("missed")).toBe("Missed");
    expect(attendanceStatusTone("missed")).toBe("danger");
    expect(attendanceStatusLabel("weird")).toBe("weird");
  });

  it("gates the action from timestamps", () => {
    expect(attendanceAction({ status: "pending_start", checkInAt: null, checkOutAt: null })).toBe("check_in");
    expect(attendanceAction({ status: "checked_in", checkInAt: "2026-07-10T12:00:00Z", checkOutAt: null })).toBe("check_out");
    expect(attendanceAction({ status: "checked_out", checkInAt: "x", checkOutAt: "y" })).toBe("none");
    expect(attendanceAction({ status: "cancelled", checkInAt: null, checkOutAt: null })).toBe("none");
    expect(attendanceAction({ status: "completed", checkInAt: "x", checkOutAt: "y" })).toBe("none");
  });

  it("localizes labels + screen copy (FR/AR)", () => {
    expect(attendanceStatusLabel("checked_in", "fr")).toBe("Arrivée enregistrée");
    expect(attendanceStatusLabel("checked_in", "ar")).toBe("تم تسجيل الوصول");
    expect(attendanceCopyFor("en").title).toBe("My schedule");
    expect(attendanceCopyFor("fr").title).toBe("Mon horaire");
    expect(attendanceCopyFor("ar").title).toBe("جدولي");
  });
});

describe("long-term jobs (employer plans flag): no clock-in", () => {
  it("offers no check-in or check-out when the API says clockInAllowed: false", () => {
    expect(attendanceAction({ status: "pending_start", checkInAt: null, checkOutAt: null, clockInAllowed: false })).toBe("none");
    expect(attendanceAction({ status: "checked_in", checkInAt: "2026-07-10T12:00:00.000Z", checkOutAt: null, clockInAllowed: false })).toBe("none");
    // absent flag (short-term, or flag off): today's behaviour
    expect(attendanceAction({ status: "pending_start", checkInAt: null, checkOutAt: null })).toBe("check_in");
    for (const locale of ["en", "fr", "ar"] as const) expect(attendanceCopyFor(locale).longTermNoClockIn.length).toBeGreaterThan(10);
  });
});
