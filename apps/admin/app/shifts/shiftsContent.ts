export const page066BoundaryStatements = [
  "Shift record != Assignment",
  "Scheduled shift != Worked shift",
  "Shift state != Payroll state",
  "Shift exception != Fault finding",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const shiftFilters = [
  "Search",
  "Lifecycle state",
  "Scope",
  "Role / category",
  "Date range",
  "Freshness",
  "Exception"
] as const;

export const shiftRecords = [
  {
    id: "SFT-3021",
    title: "Kitchen aide coverage",
    residence: "Northview Residence",
    employer: "A. Residence Group",
    department: "Kitchen",
    lifecycle: "Published",
    timing: "Scheduled time summary current",
    requirement: "Food service role requirement summary",
    assignment: "Assignment reference visible",
    attendance: "Attendance reference pending",
    exception: "No active exception",
    freshness: "Current",
    privacy: "No protected worker details displayed"
  },
  {
    id: "SFT-3174",
    title: "Care support evening shift",
    residence: "East Garden Residence",
    employer: "B. Care Network",
    department: "Care",
    lifecycle: "Under review",
    timing: "Scheduled time source partial",
    requirement: "Credential requirement summary only",
    assignment: "No worker assigned by this page",
    attendance: "Attendance not confirmed",
    exception: "Requirement conflict needs review",
    freshness: "Partial",
    privacy: "Credential details hidden"
  },
  {
    id: "SFT-3308",
    title: "Maintenance urgent support",
    residence: "Central Care Site",
    employer: "C. Senior Living",
    department: "Facilities",
    lifecycle: "Restricted",
    timing: "Scheduled time stale",
    requirement: "Operational requirement summary stale",
    assignment: "Assignment reference unavailable",
    attendance: "Attendance source unavailable",
    exception: "Restricted exception summary only",
    freshness: "Stale",
    privacy: "Sensitive exception reason not displayed"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source",
    value: "Shift records and state-transition history"
  },
  {
    label: "Human authority",
    value: "Protected actions require permission, confirmation, and reason capture"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to assignment, attendance, timesheet, residence, or finance owner workflow without mutation"
  },
  {
    label: "Shift scope",
    value:
      "Lifecycle visibility, scheduled time, requirements, references, exceptions, and audit history"
  }
] as const;

export const protectedActions = [
  "Request shift review",
  "Open source workflow",
  "Request governed export",
  "Add administrative note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show shift summary placeholders only. Do not guess timing, assignment, or attendance state."
  },
  {
    title: "Empty state",
    text: "No shift records found in the authorized scope. Hidden shifts are never hinted."
  },
  {
    title: "Stale data",
    text: "This shift summary may be outdated. Open the authoritative source before relying on it."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this shift detail. Request access through the approved path."
  },
  {
    title: "Partial data",
    text: "Some assignment, attendance, residence, or requirement references are unavailable. Do not infer state."
  },
  {
    title: "Service error",
    text: "Shift source information is unavailable. Retry later or use the governed support path."
  }
] as const;

export const aiAllowed = [
  "Summarize shift information",
  "Explain shift policy",
  "Identify missing information",
  "Suggest navigation"
] as const;

export const aiProhibited = [
  "Assign workers",
  "Publish shifts",
  "Modify shifts",
  "Approve staffing",
  "Change authoritative state",
  "Approve attendance",
  "Calculate payroll"
] as const;
