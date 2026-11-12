import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STAFF_ONLY_ATTENDANCE_FIELDS, workerAttendanceView, workerCancelledBy } from "./workerCancelledBy";
import { shiftCancelledEmail, shiftCancelledSmsText } from "./notifications/workerNotifications";

// Workers never see the free-text cancel reason staff or the employer typed. Live example that
// reached a worker's schedule card before this fix:
const INTERNAL = "JR-2026-000004 was cancelled (below minimum wage); replaced by JR-2026-000006 at the legal rate. Owner approved.";
const WORKER = "11111111-1111-4111-8111-111111111111";

describe("who cancelled a worker's shift", () => {
  it("reads the assignment status first", () => {
    expect(workerCancelledBy({ attendanceStatus: "cancelled", assignmentStatus: "worker_withdrawn" })).toBe("worker");
    expect(workerCancelledBy({ attendanceStatus: "cancelled", assignmentStatus: "employer_cancelled" })).toBe("employer");
    expect(workerCancelledBy({ attendanceStatus: "cancelled", assignmentStatus: "platform_cancelled" })).toBe("joblop");
  });

  it("falls back to who cancelled the record, then to the request", () => {
    expect(workerCancelledBy({ attendanceStatus: "cancelled", assignmentStatus: "confirmed", attendanceCancelledByUserId: WORKER, workerUserId: WORKER })).toBe("worker");
    expect(workerCancelledBy({ attendanceStatus: "cancelled", assignmentStatus: "confirmed", attendanceCancelledByUserId: "staff", workerUserId: WORKER })).toBe("joblop");
    expect(workerCancelledBy({ attendanceStatus: "pending_start", assignmentStatus: "confirmed", jobStatus: "cancelled", jobCancelledByEmployer: true })).toBe("employer");
    expect(workerCancelledBy({ attendanceStatus: "pending_start", assignmentStatus: "confirmed", jobStatus: "cancelled", jobCancelledByEmployer: false })).toBe("joblop");
  });

  it("is null for a shift that is not cancelled", () => {
    expect(workerCancelledBy({ attendanceStatus: "pending_start", assignmentStatus: "confirmed", jobStatus: "approved_for_dispatch" })).toBeNull();
    expect(workerCancelledBy({ attendanceStatus: "missed", assignmentStatus: "confirmed" })).toBeNull();
  });
});

describe("worker attendance responses carry no staff-only text", () => {
  it("drops the reason, the supervisor note, evidence and staff ids", () => {
    const view = workerAttendanceView({
      id: "a", status: "cancelled", exceptionCategory: INTERNAL, supervisorNote: "note", checkInEvidenceSummary: "e",
      checkOutEvidenceSummary: "e", createdByUserId: "u", updatedByUserId: "u", checkedInByUserId: "u", checkedOutByUserId: "u", cancelledByUserId: "u"
    });
    expect(view).toEqual({ id: "a", status: "cancelled" });
    for (const key of STAFF_ONLY_ATTENDANCE_FIELDS) expect(key in view).toBe(false);
  });

  it("every worker attendance route uses the worker view, and the schedule list sends who cancelled, not the reason", () => {
    const app = readFileSync(new URL("./app.ts", import.meta.url), "utf8");
    const routes = app.slice(app.indexOf('  app.get("/worker/attendance/:attendanceRecordId", async'), app.indexOf("  // ── HR-4 payroll boundary"));
    expect(routes).not.toContain("send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) })");
    expect(routes.match(/workerAttendanceView\(serializeAttendanceRecord/g)).toHaveLength(3);
    expect(routes).not.toContain("exceptionCategory");
    expect(routes).toContain("cancelledBy: workerCancelledBy(");
  });
});

describe("the worker's cancellation email and text", () => {
  const shift = { role: "Farm worker", startAt: new Date("2027-02-12T13:00:00Z"), endAt: new Date("2027-02-12T19:00:00Z"), timeZone: "America/Toronto", area: "Laval, QC" };

  for (const language of ["en", "fr", "ar"] as const) {
    it(`say who cancelled and never a reason (${language})`, () => {
      const input = { language, shift, cancelledBy: "staff" as const, workerWebOrigin: null, reasonText: INTERNAL } as unknown as Parameters<typeof shiftCancelledSmsText>[0] & Parameters<typeof shiftCancelledEmail>[0];
      const email = shiftCancelledEmail({ ...input, to: "w@example.test" });
      const sms = shiftCancelledSmsText(input);
      for (const text of [email.subject, email.text, sms]) {
        expect(text).not.toContain("Owner approved");
        expect(text).not.toMatch(/Reason:|Raison :|السبب:/);
      }
      expect(email.text).toContain("Joblop");
    });
  }
});
