import { describe, expect, it } from "vitest";
import {
  getAttendanceStage,
  workerAttendanceBoundaries,
  workerAttendancePrivacyRules,
  workerAttendanceStateModel
} from "./workerAttendanceContent";

describe("worker attendance content", () => {
  it("keeps assignment, attendance, timesheet and payroll separate", () => {
    expect(workerAttendanceBoundaries).toEqual(
      expect.arrayContaining([
        "Assignment accepted != attendance",
        "Clock-out != timesheet approval",
        "Attendance review != payroll"
      ])
    );
  });

  it("models worker attendance states without punitive assumptions", () => {
    expect(workerAttendanceStateModel).toContain("Exception Review");
    expect(workerAttendanceStateModel).toContain("Missed Clock-In");
    expect(workerAttendanceStateModel).toContain("Replacement Required");
    expect(workerAttendancePrivacyRules).toContain("No continuous location tracking is represented");
  });

  it("returns the requested stage details", () => {
    expect(getAttendanceStage("clockIn")).toMatchObject({
      status: "Ready to Clock In",
      title: "Clock In"
    });
  });
});

