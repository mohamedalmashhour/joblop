import { describe, expect, it } from "vitest";
import {
  canApproveTimesheet,
  getTimesheetStateSummary,
  timesheetBoundaries,
  timesheetDataTruth,
  timesheetStates,
  timesheetVersionHistory,
  timesheetWorkflow
} from "./timesheetWorkflowContent";

describe("Employer timesheet review workflow content", () => {
  it("connects attendance completion to invoice handoff", () => {
    expect(timesheetWorkflow.map((step) => step.route)).toEqual([
      "/employer/timesheets",
      "/employer/timesheets/review",
      "/employer/timesheets/clarification",
      "/employer/timesheets/corrected",
      "/employer/timesheets/approved",
      "/employer/invoices"
    ]);
  });

  it("includes required timesheet states", () => {
    expect(timesheetStates).toEqual([
      "Draft",
      "Awaiting Review",
      "Clarification Requested",
      "Corrected",
      "Approved",
      "Disputed",
      "Locked",
      "Finance Ready"
    ]);
  });

  it("requires adjustment reasons and preserves version history", () => {
    expect(canApproveTimesheet("")).toBe(false);
    expect(canApproveTimesheet("Reviewed attendance evidence")).toBe(true);
    expect(timesheetVersionHistory.map((entry) => entry.version)).toContain("v1 Draft");
    expect(timesheetVersionHistory.map((entry) => entry.version)).toContain("v2 Corrected");
  });

  it("keeps timesheet approval separate from payroll and payment", () => {
    expect(timesheetBoundaries).toContain("Approved timesheet != Payroll calculation");
    expect(timesheetBoundaries).toContain("Payroll calculation != Worker payment");
    expect(timesheetDataTruth).toContain("No payroll calculation");
    expect(timesheetDataTruth).toContain("No worker payment execution");
  });

  it("marks finance-ready without payroll calculation", () => {
    const summary = getTimesheetStateSummary("Finance Ready");
    expect(summary.isFinanceReady).toBe(true);
    expect(summary.isPayrollCalculated).toBe(false);
  });
});
