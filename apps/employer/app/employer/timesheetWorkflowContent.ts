export type TimesheetState =
  | "Draft"
  | "Awaiting Review"
  | "Clarification Requested"
  | "Corrected"
  | "Approved"
  | "Disputed"
  | "Locked"
  | "Finance Ready";

export const timesheetWorkflow = [
  {
    page: "049",
    title: "Timesheets",
    route: "/employer/timesheets",
    status: "Draft review",
    boundary: "Timesheet review starts from attendance evidence but does not change that evidence."
  },
  {
    page: "049",
    title: "Timesheet Review",
    route: "/employer/timesheets/review",
    status: "Employer review",
    boundary: "Employer approval is deliberate and fixture-backed until backend integration exists."
  },
  {
    page: "049",
    title: "Clarification",
    route: "/employer/timesheets/clarification",
    status: "Question raised",
    boundary: "Clarification request does not silently alter worked hours."
  },
  {
    page: "049",
    title: "Corrected Timesheet",
    route: "/employer/timesheets/corrected",
    status: "Corrected version",
    boundary: "Corrections preserve original values, adjusted values, actor, timestamp, and reason."
  },
  {
    page: "049",
    title: "Approved Timesheet",
    route: "/employer/timesheets/approved",
    status: "Approved fixture",
    boundary: "Approved timesheet is not payroll calculation or worker payment execution."
  },
  {
    page: "050",
    title: "Invoice Handoff",
    route: "/employer/invoices",
    status: "Next milestone boundary",
    boundary: "Invoice review is separate from timesheet approval."
  }
] as const;

export const timesheetStates: TimesheetState[] = [
  "Draft",
  "Awaiting Review",
  "Clarification Requested",
  "Corrected",
  "Approved",
  "Disputed",
  "Locked",
  "Finance Ready"
];

export const timesheetFixture = {
  shift: "Kitchen evening support",
  assignment: "Assigned worker fixture",
  scheduledStart: "2026-07-24 15:00",
  scheduledEnd: "2026-07-24 23:00",
  actualClockIn: "2026-07-24 15:03 fixture",
  actualClockOut: "2026-07-24 23:04 fixture",
  scheduledHours: "8.0",
  workedHoursOriginal: "8.02",
  workedHoursAdjusted: "8.00",
  breakDuration: "30 minutes",
  overtime: "0.00",
  adjustment: "-0.02 hours",
  adjustmentReason: "Rounded to approved policy interval after employer review.",
  workerNote: "Clock-out completed after kitchen close checklist.",
  employerNote: "Approved after checking fixture attendance evidence.",
  approvalState: "Awaiting Review" as TimesheetState,
  actor: "Employer manager fixture",
  timestamp: "Pending local action",
  source: "Attendance fixture; no server timesheet persistence"
};

export const timesheetVersionHistory = [
  {
    version: "v1 Draft",
    actor: "System fixture",
    timestamp: "2026-07-24 23:10 fixture",
    change: "Draft created from attendance evidence"
  },
  {
    version: "v2 Corrected",
    actor: "Employer manager fixture",
    timestamp: "Pending local action",
    change: "Adjustment reason required before approval"
  }
] as const;

export const timesheetBoundaries = [
  "Attendance evidence != Timesheet approval",
  "Original worked hours != Adjusted hours",
  "Adjustment != Silent overwrite",
  "Approved timesheet != Payroll calculation",
  "Payroll calculation != Worker payment",
  "Finance ready != Invoice paid"
] as const;

export const timesheetDataTruth = [
  "Fixture-backed timesheet data",
  "No server timesheet persistence",
  "No payroll calculation",
  "No worker payment execution",
  "No invoice generation yet",
  "Every adjustment requires a reason"
] as const;

export function canApproveTimesheet(reason: string) {
  return reason.trim().length > 0;
}

export function getTimesheetStateSummary(state: TimesheetState) {
  return {
    state,
    requiresEmployerAction: ["Awaiting Review", "Clarification Requested", "Corrected", "Disputed"].includes(state),
    isFinanceReady: state === "Finance Ready",
    isPayrollCalculated: false
  };
}
