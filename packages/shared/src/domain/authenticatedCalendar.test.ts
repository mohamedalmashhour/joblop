import { describe, expect, it } from "vitest";
import {
  CalendarDtoError,
  calendarFailureState,
  calendarListState,
  calendarLoadingState,
  calendarPartialState,
  parseAdminCalendarDto,
  parseClientCalendarDto,
  parseEmployerAssignmentList,
  parseEmployerAttendanceList,
  parseEmployerTimesheetList,
  parseWorkerCalendarDto
} from "./authenticatedCalendar";

const common = {
  id: "request-1",
  requestNumber: "JR-1",
  organizationId: "org-1",
  title: "PSW",
  numberOfWorkers: 2,
  timezone: "America/Toronto",
  startAt: "2026-08-03T12:00:00.000Z",
  endAt: "2026-08-03T20:00:00.000Z",
  status: "submitted",
  dutiesSummary: null,
  qualifications: ["PSW"],
  addressSummary: null,
  specialInstructions: null,
  verification: { contract: "pending", location: "pending", paymentMethodReadiness: "pending" },
  versionToken: 1
};

describe("authenticated calendar DTO and state boundaries", () => {
  it("whitelists client fields and discards cross-party economics", () => {
    const dto = parseClientCalendarDto({
      ...common,
      audience: "client",
      actionRequired: null,
      actionRequiredReason: null,
      workerPay: 3000,
      platformMargin: 1500,
      internalAdminNotes: "hidden"
    });
    expect(dto).not.toHaveProperty("workerPay");
    expect(dto).not.toHaveProperty("platformMargin");
    expect(dto).not.toHaveProperty("internalAdminNotes");
  });

  it("exposes only an explicit employer information-request reason", () => {
    const dto = parseClientCalendarDto({
      ...common,
      audience: "client",
      status: "under_review",
      actionRequired: "information_required",
      actionRequiredReason: "Clarify overnight supervision.",
      internalAdminNotes: "never-return"
    });
    expect(dto.actionRequired).toBe("information_required");
    expect(dto.actionRequiredReason).toBe("Clarify overnight supervision.");
    expect(dto).not.toHaveProperty("internalAdminNotes");
    expect(() =>
      parseClientCalendarDto({
        ...common,
        audience: "client",
        actionRequired: null,
        actionRequiredReason: "orphaned reason"
      })
    ).toThrow(CalendarDtoError);
  });

  it("keeps admin review fields separated and discards payment secrets", () => {
    const dto = parseAdminCalendarDto({
      ...common,
      audience: "admin",
      authoritativeStatus: "admin_review",
      adminReviewReason: "Needs verification",
      rawPaymentSecret: "hidden"
    });
    expect(dto.authoritativeStatus).toBe("admin_review");
    expect(dto).not.toHaveProperty("rawPaymentSecret");
  });

  it("supports nullable worker terms and discards client economics", () => {
    const dto = parseWorkerCalendarDto({
      workerOfferId: "offer-1",
      jobRequestId: "request-1",
      status: "sent",
      expiresAt: "2026-08-02T12:00:00.000Z",
      title: null,
      summary: null,
      startAt: null,
      endAt: null,
      timezone: null,
      compensationSummary: null,
      policySummary: null,
      versionToken: 1,
      visibility: "worker_authorized_offer_reference",
      clientBillRate: 4500
    });
    expect(dto.title).toBeNull();
    expect(dto).not.toHaveProperty("clientBillRate");
  });

  it("rejects malformed and cross-audience records with a generic error", () => {
    expect(() => parseClientCalendarDto({ ...common, audience: "admin" })).toThrow(
      CalendarDtoError
    );
    expect(() => parseWorkerCalendarDto({ visibility: "client" })).toThrow(
      "Calendar response is unavailable."
    );
  });

  it("models loading outcomes without fixture fallback", () => {
    expect(calendarListState([])).toEqual({ status: "empty" });
    expect(calendarListState(["request"])).toEqual({ status: "ready", data: ["request"] });
    expect(calendarLoadingState()).toEqual({ status: "loading" });
    expect(calendarPartialState(["request"])).toEqual({ status: "partial", data: ["request"] });
    expect(calendarFailureState(401)).toEqual({ status: "denied" });
    expect(calendarFailureState(503)).toEqual({ status: "unavailable" });
    expect(calendarFailureState(409).status).toBe("stale");
    expect(calendarFailureState(500)).toEqual({ status: "error" });
  });

  it("accepts only governed worker offer and admin lifecycle states", () => {
    const workerBase = {
      workerOfferId: "offer-1",
      jobRequestId: "request-1",
      expiresAt: "2026-08-02T12:00:00.000Z",
      title: null,
      summary: null,
      startAt: null,
      endAt: null,
      timezone: null,
      compensationSummary: null,
      policySummary: null,
      versionToken: 1,
      visibility: "worker_authorized_offer_reference"
    };
    for (const status of [
      "draft",
      "approved",
      "sent",
      "delivered",
      "viewed",
      "accepted",
      "declined",
      "expired",
      "withdrawn",
      "cancelled"
    ]) {
      expect(parseWorkerCalendarDto({ ...workerBase, status }).status).toBe(status);
    }
    expect(() => parseWorkerCalendarDto({ ...workerBase, status: "paid" })).toThrow(
      CalendarDtoError
    );
    expect(() =>
      parseAdminCalendarDto({
        ...common,
        audience: "admin",
        authoritativeStatus: "paid",
        adminReviewReason: null
      })
    ).toThrow(CalendarDtoError);
  });

  it("rejects invalid windows, timezone, counts, and versions", () => {
    expect(() =>
      parseClientCalendarDto({
        ...common,
        audience: "client",
        actionRequired: null,
        actionRequiredReason: null,
        endAt: common.startAt
      })
    ).toThrow(CalendarDtoError);
    expect(() =>
      parseClientCalendarDto({
        ...common,
        audience: "client",
        actionRequired: null,
        actionRequiredReason: null,
        timezone: "Not/A_Zone"
      })
    ).toThrow(CalendarDtoError);
    expect(() =>
      parseClientCalendarDto({
        ...common,
        audience: "client",
        actionRequired: null,
        actionRequiredReason: null,
        numberOfWorkers: 0
      })
    ).toThrow(CalendarDtoError);
    expect(() =>
      parseClientCalendarDto({
        ...common,
        audience: "client",
        actionRequired: null,
        actionRequiredReason: null,
        versionToken: -1
      })
    ).toThrow(CalendarDtoError);
  });

  it("parses an org-scoped employer assignment list and preserves the visibility boundary", () => {
    const assignments = parseEmployerAssignmentList({
      assignments: [
        {
          audience: "employer",
          assignmentId: "assignment-1",
          status: "confirmed",
          title: "Overnight cleaning cover",
          roleSummary: "Housekeeping",
          worksiteSummary: "Tower A",
          departmentSummary: null,
          startAt: "2026-08-10T22:00:00.000Z",
          endAt: "2026-08-11T06:00:00.000Z",
          timezone: "America/Toronto",
          attendanceBoundary: null,
          versionToken: 3,
          updatedAt: "2026-08-06T12:00:00.000Z",
          visibility: "employer_authorized_assignment"
        }
      ]
    });
    expect(assignments).toHaveLength(1);
    const [first] = assignments;
    if (!first) throw new Error("expected one assignment");
    expect(first.assignmentId).toBe("assignment-1");
    expect(first.departmentSummary).toBeNull();
    expect(first.versionToken).toBe(3);
    expect(first.visibility).toBe("employer_authorized_assignment");
  });

  it("rejects a non-array assignments envelope and malformed assignment records", () => {
    expect(() => parseEmployerAssignmentList({ requests: [] })).toThrow(CalendarDtoError);
    expect(() =>
      parseEmployerAssignmentList({
        assignments: [{ assignmentId: "assignment-1", status: "confirmed", versionToken: -1 }]
      })
    ).toThrow(CalendarDtoError);
  });

  it("parses org-scoped attendance and whitelists to scheduling + presence only", () => {
    const records = parseEmployerAttendanceList({
      attendanceRecords: [
        {
          id: "attendance-1",
          assignmentId: "assignment-1",
          status: "checked_out",
          scheduledStartAt: "2026-08-10T22:00:00.000Z",
          scheduledEndAt: "2026-08-11T06:00:00.000Z",
          timezone: "America/Toronto",
          verificationMethod: "geofence",
          checkInAt: "2026-08-10T22:03:00.000Z",
          checkOutAt: null,
          exceptionCategory: null,
          completedAt: null,
          cancelledAt: null,
          version: 4,
          updatedAt: "2026-08-06T12:00:00.000Z",
          // sensitive fields the serializer also spreads — must be dropped by the whitelist
          workerIdentityId: "worker-secret",
          checkInEvidenceSummary: "photo-blob",
          supervisorNote: "private note",
          createdByUserId: "user-secret"
        }
      ]
    });
    expect(records).toHaveLength(1);
    const [first] = records;
    if (!first) throw new Error("expected one attendance record");
    expect(first.attendanceRecordId).toBe("attendance-1");
    expect(first.versionToken).toBe(4);
    expect(first.checkOutAt).toBeNull();
    expect(first.visibility).toBe("employer_authorized_attendance");
    const keys = Object.keys(first);
    expect(keys).not.toContain("workerIdentityId");
    expect(keys).not.toContain("supervisorNote");
  });

  it("rejects a non-array attendance envelope and malformed attendance records", () => {
    expect(() => parseEmployerAttendanceList({ attendanceRecords: {} })).toThrow(CalendarDtoError);
    expect(() =>
      parseEmployerAttendanceList({
        attendanceRecords: [{ id: "attendance-1", status: "checked_out", version: -1 }]
      })
    ).toThrow(CalendarDtoError);
  });

  it("parses org-scoped timesheets, allows nullable totals, and drops reviewer identity", () => {
    const timesheets = parseEmployerTimesheetList({
      timesheets: [
        {
          id: "timesheet-1",
          assignmentId: "assignment-1",
          status: "employer_review",
          scheduledStartAt: "2026-08-10T22:00:00.000Z",
          scheduledEndAt: "2026-08-11T06:00:00.000Z",
          actualCheckInAt: "2026-08-10T22:03:00.000Z",
          actualCheckOutAt: "2026-08-11T06:01:00.000Z",
          timezone: "America/Toronto",
          payableMinutes: 480,
          billableMinutes: null,
          breakMinutes: 30,
          excludedMinutes: 0,
          exceptionSummary: null,
          workerReviewStatus: "approved",
          employerReviewStatus: "not_started",
          platformReviewStatus: "not_started",
          employerReviewedAt: null,
          approvedAt: null,
          lockedAt: null,
          rejectedAt: null,
          cancelledAt: null,
          version: 2,
          updatedAt: "2026-08-06T12:00:00.000Z",
          // sensitive fields the serializer also spreads — must be dropped by the whitelist
          workerIdentityId: "worker-secret",
          employerReviewedByUserId: "user-secret",
          correctionReason: "internal note",
          premiumCandidateMinutes: 15
        }
      ]
    });
    expect(timesheets).toHaveLength(1);
    const [first] = timesheets;
    if (!first) throw new Error("expected one timesheet");
    expect(first.timesheetId).toBe("timesheet-1");
    expect(first.payableMinutes).toBe(480);
    expect(first.billableMinutes).toBeNull();
    expect(first.visibility).toBe("employer_authorized_timesheet");
    const keys = Object.keys(first);
    expect(keys).not.toContain("workerIdentityId");
    expect(keys).not.toContain("employerReviewedByUserId");
    expect(keys).not.toContain("correctionReason");
    expect(keys).not.toContain("premiumCandidateMinutes");
  });

  it("rejects a non-array timesheet envelope and malformed timesheet records", () => {
    expect(() => parseEmployerTimesheetList({ timesheets: null })).toThrow(CalendarDtoError);
    expect(() =>
      parseEmployerTimesheetList({
        timesheets: [{ id: "timesheet-1", status: "draft", breakMinutes: -1 }]
      })
    ).toThrow(CalendarDtoError);
  });
});
