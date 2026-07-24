import { describe, expect, it } from "vitest";
import {
  attendanceBoundaries,
  attendanceDataTruth,
  attendanceEvidenceRows,
  attendanceStates,
  attendanceWorkflow,
  getAttendanceStateSummary
} from "./attendanceWorkflowContent";

describe("Employer attendance monitoring workflow content", () => {
  it("connects assignment detail to timesheet handoff without dead ends", () => {
    expect(attendanceWorkflow.map((step) => step.route)).toEqual([
      "/employer/attendance",
      "/employer/attendance/arrival",
      "/employer/attendance/clock-in",
      "/employer/attendance/in-progress",
      "/employer/attendance/clock-out",
      "/employer/attendance/exceptions"
    ]);
  });

  it("includes every required attendance state", () => {
    expect(attendanceStates).toEqual([
      "Scheduled",
      "Awaiting Arrival",
      "Arrived",
      "Clocked In",
      "In Progress",
      "On Break",
      "Clocked Out",
      "Completed",
      "Late",
      "No Show",
      "Early Departure",
      "Missing Clock-In",
      "Missing Clock-Out",
      "Manual Review Required"
    ]);
  });

  it("keeps attendance evidence separate from approval and payroll", () => {
    expect(attendanceBoundaries).toContain("Clock-out != Approved timesheet");
    expect(attendanceBoundaries).toContain("Attendance != Payroll");
    expect(attendanceEvidenceRows.map((row) => row.label)).toContain("Scheduled start");
    expect(attendanceEvidenceRows.map((row) => row.label)).toContain("Actual clock-in");
  });

  it("labels fixture data and prohibits live-location fabrication", () => {
    expect(attendanceDataTruth).toContain("Fixture-backed attendance data");
    expect(attendanceDataTruth).toContain("No fabricated live location");
    expect(attendanceDataTruth).toContain("No continuous GPS tracking");
    expect(attendanceDataTruth).toContain("No fabricated clock events");
  });

  it("marks exceptions for review without making payroll ready", () => {
    const summary = getAttendanceStateSummary("Manual Review Required");
    expect(summary.requiresReview).toBe(true);
    expect(summary.canCreateTimesheetDraft).toBe(true);
    expect(summary.isPayrollReady).toBe(false);
  });
});
