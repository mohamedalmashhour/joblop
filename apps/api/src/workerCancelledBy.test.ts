import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STAFF_ONLY_ATTENDANCE_FIELDS, employerCancelledBy, workerAttendanceView, workerCancelledBy } from "./workerCancelledBy";
import { workerCancelledEmail } from "./notifications/clientNotifications";
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

describe("employers never see staff notes on a cancelled shift or request", () => {
  it("says who cancelled from the company's side", () => {
    expect(employerCancelledBy("employer")).toBe("company");
    expect(employerCancelledBy("worker")).toBe("worker");
    expect(employerCancelledBy("joblop")).toBe("joblop");
    expect(employerCancelledBy(null)).toBeNull();
  });

  const app = readFileSync(new URL("./app.ts", import.meta.url), "utf8");

  it("the employer attendance list sends the trimmed record and who cancelled", () => {
    const route = app.slice(app.indexOf('  app.get("/organizations/:organizationId/attendance", async'), app.indexOf('  app.get("/worker/attendance/:attendanceRecordId", async'));
    expect(route).toContain("...workerAttendanceView(serializeAttendanceRecord(item))");
    expect(route).toContain("cancelledBy: cancelledBy.get(item.id) ?? null");
    expect(route).not.toContain("map((item) => serializeAttendanceRecord(item))");
  });

  it("every employer job-request route keeps a staff note only when it is meant for the company", () => {
    const helper = app.slice(app.indexOf("  async function serializeEmployerJobRequest("), app.indexOf("  // Who cancelled each attendance record, for the employer"));
    expect(helper).toContain('jobRequest.status === "information_required"');
    expect(helper).toContain("userHasOrganizationAccess(writer, jobRequest.organizationId)");
    expect(helper).toContain("adminReviewReason: null");
    // Employer routes use it; the bare serializer is left to the staff (/platform) routes.
    const employerRoutes = app.slice(app.indexOf('  app.post("/organizations/:organizationId/job-requests", async'), app.indexOf('  app.get("/platform/job-requests/intake/:jobRequestIdOrNumber", async'));
    expect([...employerRoutes.matchAll(/jobRequest: (\{ \.\.\.)?serializeJobRequest\(/g)]).toHaveLength(0);
    expect(employerRoutes.match(/serializeEmployerJobRequest\(/g)?.length).toBeGreaterThanOrEqual(6);
  });

  for (const language of ["en", "fr", "ar"] as const) {
    it(`the employer's "worker cancelled" email carries no reason (${language})`, () => {
      const email = workerCancelledEmail({ to: "e@example.test", language, jobCode: "JR-2026-000004", title: "Farm worker" });
      expect(email.text).not.toMatch(/Reason|Raison|Motif|السبب|Owner approved/);
    });
  }
});
