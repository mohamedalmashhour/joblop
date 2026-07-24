export const shiftWorkflow = [
  {
    page: "041",
    title: "Create Shift",
    route: "/employer/shifts/create",
    status: "Single shift terms",
    boundary: "Creates planned shift terms only; it does not assign, publish automatically, or calculate finance."
  },
  {
    page: "042",
    title: "Recurring Shift",
    route: "/employer/shifts/recurring",
    status: "Template governance",
    boundary: "Recurring template is separate from generated occurrences, assignments, attendance, and payroll."
  },
  {
    page: "043",
    title: "Urgent Shift",
    route: "/employer/shifts/urgent",
    status: "Priority request",
    boundary: "Urgency prioritizes review but never guarantees coverage or bypasses qualifications."
  },
  {
    page: "041",
    title: "Shift Review",
    route: "/employer/shifts/review",
    status: "Draft review",
    boundary: "Review validates planned terms only; it does not publish, assign, or notify workers."
  },
  {
    page: "041",
    title: "Publish Shift",
    route: "/employer/shifts/publish",
    status: "Publication request",
    boundary: "Publication opens staffing activity but does not fill, assign, or start attendance."
  },
  {
    page: "041",
    title: "Shift Detail",
    route: "/employer/shifts/detail",
    status: "Published detail",
    boundary: "Shift detail summarizes terms and hands off to applicants without approving anyone."
  },
  {
    page: "041",
    title: "Published Shift",
    route: "/employer/shifts/published",
    status: "Published state view",
    boundary: "Published shift view is separate from filled, assigned, active, completed, and paid states."
  },
  {
    page: "044",
    title: "AI Worker Suggestions",
    route: "/employer/shifts/ai-suggestions",
    status: "Advisory matching",
    boundary: "AI suggestions are advisory; humans review and assignment workflows remain authoritative."
  },
  {
    page: "045",
    title: "Applicants",
    route: "/employer/applicants",
    status: "Next workflow boundary",
    boundary: "Applicant review is a separate workflow; this milestone exposes the handoff only."
  }
] as const;

export const shiftLifecycle = [
  "Draft",
  "Validated Draft",
  "Approved Draft",
  "Publication Requested",
  "Published Shift",
  "Staffing Activity",
  "Staffed Shift",
  "Active Shift",
  "Completed Shift",
  "Downstream Attendance / Timesheet / Payroll Workflows"
] as const;

export const shiftStatusAreas = [
  "Draft status",
  "Validation status",
  "Approval status",
  "Publication status",
  "Staffing status"
] as const;

export const shiftBoundaries = [
  "Draft != Published",
  "Published != Filled",
  "Filled != Started",
  "Started != Completed",
  "Completed != Payroll Approved",
  "Configured rate != Payroll",
  "Employer estimate != Invoice"
] as const;

export const scheduleWarnings = [
  "Scheduled time describes the planned shift.",
  "Actual worked time is recorded later through attendance workflows.",
  "Approved payable time is determined outside this page."
] as const;

export const qualificationTypes = [
  "Licence",
  "Certification",
  "Background check",
  "Training",
  "Experience"
] as const;

export const conflictWarnings = [
  "Possible duplicate shift",
  "Overlapping time window",
  "Inactive residence",
  "Inactive department",
  "Invalid schedule",
  "Excessive staffing",
  "Missing qualification",
  "Publication conflict"
] as const;

export const recurringLifecycles = [
  {
    title: "Template lifecycle",
    states: ["Draft", "Saved", "Active", "Paused", "Archived", "Cancelled"]
  },
  {
    title: "Occurrence lifecycle",
    states: ["Generated", "Scheduled", "Published", "Filled", "Active", "Completed", "Cancelled"]
  },
  {
    title: "Exception lifecycle",
    states: ["Pending", "Applied", "Reverted", "Archived"]
  }
] as const;

export const recurrenceBoundaries = [
  "Template != Occurrence",
  "Occurrence != Published",
  "Published != Assigned",
  "Assigned != Worked",
  "Worked != Payroll Approved",
  "Applied exception != Template changed"
] as const;

export const urgentLevels = [
  "Standard",
  "Short Notice",
  "Same Day",
  "Critical Operational Need"
] as const;

export const urgentBoundaries = [
  "Urgent != Emergency",
  "Critical != Guaranteed fulfillment",
  "Urgency != Permission to bypass governance",
  "Urgent request != Worker assigned",
  "Priority review != Coverage confirmed"
] as const;

export const publishedShiftRows = [
  {
    title: "Kitchen evening support",
    state: "Published",
    staffing: "Applications open",
    boundary: "Published != Filled"
  },
  {
    title: "Maintenance short notice",
    state: "Publication requested",
    staffing: "Review pending",
    boundary: "Publish requested != Publish success"
  },
  {
    title: "Care aide morning",
    state: "Partially filled",
    staffing: "One of two roles filled",
    boundary: "Partially filled != Attendance confirmed"
  }
] as const;

export const aiSuggestionBoundaries = [
  "AI recommendation != Human decision",
  "Recommended != Selected",
  "Selected != Assigned",
  "Eligibility summary != Final eligibility decision",
  "Ratings cannot be the sole eligibility or recommendation factor",
  "Protected characteristics and retaliation signals are excluded"
] as const;

export const aiSuggestionInputs = [
  "role compatibility",
  "verified qualifications",
  "current availability",
  "schedule conflicts",
  "authorized work area",
  "travel feasibility",
  "experience",
  "worker preferences"
] as const;
