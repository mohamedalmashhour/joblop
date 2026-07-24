import { describe, expect, it } from "vitest";
import {
  getTimesheetStageTitle,
  workerTimesheetAuditRequirements,
  workerTimesheetBoundaries,
  workerTimesheetRows,
  workerTimesheetStates
} from "./workerTimesheetContent";

describe("worker timesheet content", () => {
  it("separates attendance evidence from proposed and approved hours", () => {
    expect(workerTimesheetRows.map((row) => row.label)).toEqual(
      expect.arrayContaining([
        "Actual check-in",
        "Worker proposed time",
        "Approved hours"
      ])
    );
    expect(workerTimesheetBoundaries).toContain(
      "Worker correction requests do not overwrite clock evidence"
    );
  });

  it("keeps timesheet, payroll and payment independent", () => {
    expect(workerTimesheetStates).toContain("Finance Ready");
    expect(workerTimesheetBoundaries).toEqual(
      expect.arrayContaining(["Timesheet approval != payroll", "Payroll != payment"])
    );
  });

  it("preserves audit fields for corrections", () => {
    expect(workerTimesheetAuditRequirements).toEqual(
      expect.arrayContaining(["Original value", "Actor", "Timestamp", "Reason"])
    );
    expect(getTimesheetStageTitle("correction")).toBe("Request correction");
  });
});

