import { describe, expect, it, vi } from "vitest";
import {
  approveReportedHours,
  approvedEvidenceSummary,
  hoursReportAvailability,
  hoursReportDeadline,
  hoursReportStaffAlertEmail,
  localTimeOnDay,
  normalizeReportReason,
  resolveReportedTimes,
  type ApproveReportedHoursDeps,
  type HoursReportShift
} from "./hoursReport";

// Toronto EST (UTC-5) in February.
const et = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00.000-05:00`);
const DAY = "2027-02-18";

const shift = (overrides: Partial<HoursReportShift> = {}): HoursReportShift => ({
  attendanceStatus: "pending_start",
  assignmentCancelled: false,
  jobCancelled: false,
  scheduledStartAt: et(DAY, "08:00"),
  scheduledEndAt: et(DAY, "14:00"),
  checkInAt: null,
  checkOutAt: null,
  latestReportStatus: null,
  ...overrides
});

describe("report my hours: when the worker can report", () => {
  it("is available after the shift ended, with no check-in, until 48 h after the end", () => {
    expect(hoursReportAvailability(shift(), et(DAY, "14:00"))).toEqual({ available: true });
    expect(hoursReportAvailability(shift(), et(DAY, "15:00"))).toEqual({ available: true });
    expect(hoursReportAvailability(shift({ attendanceStatus: "missed" }), et(DAY, "15:00"))).toEqual({ available: true });
    expect(hoursReportDeadline(et(DAY, "14:00")).toISOString()).toBe(et("2027-02-20", "14:00").toISOString());
    expect(hoursReportAvailability(shift(), et("2027-02-20", "14:00"))).toEqual({ available: true });
  });

  it("is refused before the end, after 48 h, with a check-in, cancelled, long-term or already reported", () => {
    const at = et(DAY, "15:00");
    expect(hoursReportAvailability(shift(), et(DAY, "13:59"))).toEqual({ available: false, reason: "not_ended" });
    expect(hoursReportAvailability(shift(), et("2027-02-20", "14:01"))).toEqual({ available: false, reason: "window_closed" });
    expect(hoursReportAvailability(shift({ checkInAt: et(DAY, "08:00") }), at)).toEqual({ available: false, reason: "checked_in" });
    expect(hoursReportAvailability(shift({ checkOutAt: et(DAY, "14:00") }), at)).toEqual({ available: false, reason: "checked_in" });
    expect(hoursReportAvailability(shift({ attendanceStatus: "cancelled" }), at)).toEqual({ available: false, reason: "cancelled" });
    expect(hoursReportAvailability(shift({ assignmentCancelled: true }), at)).toEqual({ available: false, reason: "cancelled" });
    expect(hoursReportAvailability(shift({ jobCancelled: true }), at)).toEqual({ available: false, reason: "cancelled" });
    expect(hoursReportAvailability(shift({ longTerm: true }), at)).toEqual({ available: false, reason: "long_term" });
    expect(hoursReportAvailability(shift({ attendanceStatus: "exception" }), at)).toEqual({ available: false, reason: "not_reportable" });
    expect(hoursReportAvailability(shift({ latestReportStatus: "pending" }), at)).toEqual({ available: false, reason: "already_pending" });
    expect(hoursReportAvailability(shift({ latestReportStatus: "approved" }), at)).toEqual({ available: false, reason: "already_approved" });
  });

  it("a rejected report can be followed by a new one inside the window", () => {
    expect(hoursReportAvailability(shift({ latestReportStatus: "rejected" }), et(DAY, "16:00"))).toEqual({ available: true });
  });
});

describe("report my hours: the times", () => {
  const s = { scheduledStartAt: et(DAY, "08:00"), timezone: "America/Toronto" };

  it("reads HH:MM on the shift day in Toronto time", () => {
    const r = resolveReportedTimes(s, "08:00", "14:00", et(DAY, "15:00"));
    expect(r).toEqual({ ok: true, checkInAt: et(DAY, "08:00"), checkOutAt: et(DAY, "14:00") });
  });

  it("requires the end after the start, real times, and nothing in the future", () => {
    expect(resolveReportedTimes(s, "14:00", "08:00", et(DAY, "15:00"))).toEqual({ ok: false, error: "end_before_start" });
    expect(resolveReportedTimes(s, "08:00", "08:00", et(DAY, "15:00"))).toEqual({ ok: false, error: "end_before_start" });
    expect(resolveReportedTimes(s, "8h", "14:00", et(DAY, "15:00"))).toEqual({ ok: false, error: "invalid_time" });
    expect(resolveReportedTimes(s, "08:00", "24:00", et(DAY, "15:00"))).toEqual({ ok: false, error: "invalid_time" });
    expect(resolveReportedTimes(s, "08:00", "14:30", et(DAY, "14:10"))).toEqual({ ok: false, error: "in_future" });
  });

  it("keeps the shift day for a late-evening start (Toronto day, not the UTC day)", () => {
    const evening = { scheduledStartAt: et(DAY, "20:00"), timezone: "America/Toronto" };
    const r = resolveReportedTimes(evening, "20:00", "23:30", et("2027-02-19", "09:00"));
    expect(r).toEqual({ ok: true, checkInAt: et(DAY, "20:00"), checkOutAt: et(DAY, "23:30") });
  });

  it("converts across a daylight-saving change", () => {
    // 2027-03-14: clocks go forward at 02:00 in Toronto (EDT, UTC-4, afterwards).
    expect(localTimeOnDay("2027-03-14", "08:00", "America/Toronto")?.toISOString()).toBe("2027-03-14T12:00:00.000Z");
    expect(localTimeOnDay("2027-03-13", "08:00", "America/Toronto")?.toISOString()).toBe("2027-03-13T13:00:00.000Z");
  });

  it("needs a short reason", () => {
    expect(normalizeReportReason("  Forgot   my phone  ")).toBe("Forgot my phone");
    expect(normalizeReportReason("ok")).toBeNull();
    expect(normalizeReportReason(42)).toBeNull();
    expect(normalizeReportReason("x".repeat(600))?.length).toBe(500);
  });

  it("the evidence says who approved and when", () => {
    const text = approvedEvidenceSummary({ staffLabel: "staff@joblop.test", approvedAt: new Date("2027-02-18T21:00:00.000Z"), edited: true });
    expect(text).toContain("staff@joblop.test");
    expect(text).toContain("2027-02-18T21:00:00.000Z");
    expect(text).toContain("times edited by staff");
    expect(text.length).toBeLessThanOrEqual(240);
  });
});

describe("report my hours: staff approval", () => {
  const session = { authenticated: true, user: { id: "staff" }, session: null } as unknown as Parameters<typeof approveReportedHours>[1]["session"];
  const input = {
    session,
    roles: ["PLATFORM_ADMINISTRATOR"] as const,
    attendanceRecordId: "att-1",
    checkInAt: et(DAY, "08:00"),
    checkOutAt: et(DAY, "14:00"),
    evidenceSummary: "Reported by the worker; approved by staff."
  };

  function fakes(failRecord = false) {
    const calls: string[] = [];
    const deps = {
      attendanceService: {
        readAttendance: vi.fn(async () => {
          calls.push("read");
          return { version: 3 };
        }),
        recordReportedHours: vi.fn(async (arg: { expectedVersion: number; checkInAt: Date; checkOutAt: Date; evidenceSummary: string }) => {
          calls.push(`record:v${arg.expectedVersion}`);
          if (failRecord) throw new Error("invalid_transition");
          return { version: 4, status: "checked_out", checkInAt: arg.checkInAt, checkOutAt: arg.checkOutAt };
        }),
        markCompleted: vi.fn(async (arg: { expectedVersion: number }) => {
          calls.push(`complete:v${arg.expectedVersion}`);
          return { version: 5, status: "completed" };
        })
      },
      timesheetService: {
        createFromAttendance: vi.fn(async () => {
          calls.push("create");
          return { id: "ts-1", version: 1 };
        }),
        calculate: vi.fn(async (arg: { timesheetId: string; expectedVersion: number }) => {
          calls.push(`calculate:${arg.timesheetId}:v${arg.expectedVersion}`);
          return { id: "ts-1", status: "worker_review", payableMinutes: 360 };
        })
      }
    };
    return { calls, deps: deps as unknown as ApproveReportedHoursDeps, raw: deps };
  }

  it("writes the times onto the attendance record, then prepares the timesheet like staff 'prepare'", async () => {
    const { calls, deps, raw } = fakes();
    const result = await approveReportedHours(deps, input);
    expect(calls).toEqual(["read", "record:v3", "complete:v4", "create", "calculate:ts-1:v1"]);
    expect(raw.attendanceService.recordReportedHours).toHaveBeenCalledWith(
      expect.objectContaining({ attendanceRecordId: "att-1", checkInAt: input.checkInAt, checkOutAt: input.checkOutAt, evidenceSummary: input.evidenceSummary })
    );
    expect(result.timesheet).toMatchObject({ status: "worker_review", payableMinutes: 360 });
  });

  it("when the attendance step is refused, nothing else runs and the report goes back to staff", async () => {
    const { calls, deps } = fakes(true);
    const revert = vi.fn(async () => undefined);
    await expect(approveReportedHours(deps, input, revert)).rejects.toThrow("invalid_transition");
    expect(revert).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["read", "record:v3"]);
  });
});

describe("report my hours: staff alert", () => {
  it("carries English, French and Arabic in one email, with the reported times", () => {
    const mail = hoursReportStaffAlertEmail({
      to: "staff@joblop.test", jobCode: "JR-2026-000007", title: "Farm worker", startAt: et(DAY, "08:00"), timezone: "America/Toronto",
      arrival: "08:00", departure: "14:00", reason: "Phone battery died"
    });
    expect(mail.subject).toContain("JR-2026-000007");
    expect(mail.text.split("— — —")).toHaveLength(3);
    expect(mail.text).toContain("08:00–14:00");
    expect(mail.text).toMatch(/[؀-ۿ]/);
    expect(mail.text).toContain("Un travailleur a déclaré ses heures");
  });
});
