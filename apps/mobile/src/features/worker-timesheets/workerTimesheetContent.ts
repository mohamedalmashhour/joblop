export type WorkerTimesheetStage = "review" | "correction" | "final";

export const workerTimesheetStates = [
  "Draft",
  "Worker Review",
  "Correction Requested",
  "Employer Review",
  "Partially Approved",
  "Approved",
  "Disputed",
  "Locked",
  "Finance Ready"
] as const;

export const workerTimesheetRows = [
  {
    label: "Scheduled time",
    source: "Shift schedule",
    value: "9:00 AM - 1:00 PM"
  },
  {
    label: "Actual check-in",
    source: "Attendance evidence",
    value: "9:04 AM"
  },
  {
    label: "Actual check-out",
    source: "Attendance evidence",
    value: "1:02 PM"
  },
  {
    label: "Worker proposed time",
    source: "Worker review",
    value: "3h 58m"
  },
  {
    label: "Approved hours",
    source: "Employer review pending",
    value: "Pending"
  }
] as const;

export const workerTimesheetBoundaries = [
  "Attendance evidence remains authoritative",
  "Worker correction requests do not overwrite clock evidence",
  "Partial approval keeps disputed time visible",
  "Timesheet approval != payroll",
  "Payroll != payment"
] as const;

export const workerTimesheetAuditRequirements = [
  "Original value",
  "Requested value",
  "Actor",
  "Timestamp",
  "Reason",
  "Review outcome"
] as const;

export function getTimesheetStageTitle(stage: WorkerTimesheetStage) {
  if (stage === "correction") return "Request correction";
  if (stage === "final") return "Timesheet ready for finance";
  return "Review timesheet";
}

