import { describe, expect, it } from "vitest";
import {
  attendanceAction,
  attendanceCopyFor,
  attendanceStatusLabel,
  attendanceStatusTone,
  canCancelShift,
  formatReportDeadline,
  isLateCancellation,
  normalizeClock,
  reportHoursView,
  reportInputError,
  reportRefusalKey,
  shiftClock
} from "./attendanceScheduleContent";

describe("report my hours", () => {
  const NOW = Date.parse("2027-02-18T20:00:00.000Z"); // 15:00 in Toronto
  const until = "2027-02-20T19:00:00.000Z";

  it("offers the form while the API allows it, then shows the waiting / rejected state", () => {
    expect(reportHoursView({ canReportHours: true, reportHoursUntil: until, hoursReport: null }, NOW)).toBe("form");
    expect(reportHoursView({ canReportHours: true, reportHoursUntil: until, hoursReport: null }, Date.parse("2027-02-20T19:01:00.000Z"))).toBeNull();
    expect(reportHoursView({ canReportHours: false, reportHoursUntil: until, hoursReport: { status: "pending" } }, NOW)).toBe("waiting");
    expect(reportHoursView({ canReportHours: false, reportHoursUntil: until, hoursReport: { status: "rejected" } }, NOW)).toBe("rejected");
    expect(reportHoursView({ canReportHours: true, reportHoursUntil: until, hoursReport: { status: "rejected" } }, NOW)).toBe("form");
    expect(reportHoursView({ canReportHours: false, reportHoursUntil: until, hoursReport: { status: "approved" } }, NOW)).toBeNull();
    expect(reportHoursView({ canReportHours: true, reportHoursUntil: until, hoursReport: null, clockInAllowed: false }, NOW)).toBeNull();
  });

  it("starts the time fields on the scheduled times, on Québec time", () => {
    expect(shiftClock("2027-02-18T13:00:00.000Z", "America/Toronto")).toBe("08:00");
    expect(shiftClock("2027-02-18T19:00:00.000Z", "America/Toronto")).toBe("14:00");
    expect(shiftClock("2027-07-18T12:00:00.000Z", "America/Toronto")).toBe("08:00");
    expect(formatReportDeadline(until, "en")).toContain("2:00");
  });

  it("checks the form before sending (the API checks again)", () => {
    expect(normalizeClock("8:05")).toBe("08:05");
    expect(normalizeClock("25:00")).toBeNull();
    expect(reportInputError("08:00", "14:00", "Phone died")).toBeNull();
    expect(reportInputError("", "14:00", "Phone died")).toBe("reportErrTimes");
    expect(reportInputError("14:00", "08:00", "Phone died")).toBe("reportErrEndBeforeStart");
    expect(reportInputError("08:00", "14:00", "no")).toBe("reportErrReason");
    expect(reportRefusalKey("in_future")).toBe("reportErrFuture");
    expect(reportRefusalKey("window_closed")).toBe("reportErrClosed");
  });

  it("has every line in English, French and Arabic, with the deadline placeholder", () => {
    for (const locale of ["en", "fr", "ar"] as const) {
      const copy = attendanceCopyFor(locale);
      expect(copy.reportIntro).toContain("{deadline}");
      for (const key of ["reportCta", "reportWaiting", "reportSubmit", "reportRejected", "reportErrClosed"] as const) expect(copy[key].length).toBeGreaterThan(3);
    }
    expect(attendanceCopyFor("en").reportCta).toBe("Report my hours");
    expect(attendanceCopyFor("fr").reportCta).toBe("Déclarer mes heures");
    expect(attendanceCopyFor("ar").reportWaiting).toMatch(/[؀-ۿ]/);
    expect(attendanceCopyFor("en").reportWaiting).toBe("Waiting for Joblop to approve");
  });
});

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
