export const employerWorkflow = [
  {
    page: "012",
    title: "Employer Sign Up",
    route: "/signup/employer",
    status: "Current entry",
    boundary: "Account creation only. It does not approve the employer or guarantee staffing access."
  },
  {
    page: "038",
    title: "Company Profile",
    route: "/employer/onboarding/company",
    status: "Organization setup",
    boundary: "Organization identity is separate from verification, billing, and operational approval."
  },
  {
    page: "039",
    title: "Residences",
    route: "/employer/onboarding/residences",
    status: "Residence setup",
    boundary: "Residence is an operating site. It is not a department or clinical record."
  },
  {
    page: "040",
    title: "Departments",
    route: "/employer/onboarding/departments",
    status: "Department setup",
    boundary: "Department is an operating work area. It is not a shift, worker group, or cost center."
  },
  {
    page: "037",
    title: "Employer Dashboard",
    route: "/employer/dashboard",
    status: "Operational home",
    boundary: "Dashboard summarizes activity and routes to authoritative workflows."
  }
] as const;

export const accountTypeOutcomes = [
  "Verify email.",
  "Complete organization information.",
  "Confirm authorized contact details.",
  "Complete operational or commercial review where applicable.",
  "Access depends on approved status and rules.",
  "Activation does not guarantee worker availability."
] as const;

export const accountBoundaries = [
  "Account created does not equal employer approved.",
  "Email verified does not equal identity verified.",
  "Employer account does not equal residence.",
  "Team access does not equal permission to create or approve every shift."
] as const;

export const companyIdentityLayers = [
  "Public company profile",
  "Legal organization",
  "Operational identity",
  "Verified identity",
  "Employer-facing profile",
  "Worker-facing profile"
] as const;

export const organizationLifecycle = [
  "Draft",
  "Submitted",
  "Verification",
  "Verified",
  "Restricted",
  "Suspended",
  "Active",
  "Deactivation requested",
  "Deactivated",
  "Closure requested",
  "Closed"
] as const;

export const companyBoundaries = [
  "Public profile does not equal legal identity.",
  "Legal identity does not equal verification.",
  "Verification does not equal operational approval.",
  "Dashboard visibility does not equal edit authority."
] as const;

export const residenceLifecycle = [
  "Record lifecycle: Draft / Submitted / Current / Superseded / Archived",
  "Verification lifecycle: Required / Submitted / Under review / Verified / Failed",
  "Operational lifecycle: Planning / Pending activation / Active / Restricted / Suspended",
  "Worker-publication lifecycle: Private / Assignment-visible / Worker-visible / Restricted"
] as const;

export const residenceExamples = [
  {
    name: "Development fixture residence",
    state: "Pending activation",
    visibility: "Employer administration only",
    nextStep: "Confirm address and operational contact"
  },
  {
    name: "Second fixture residence",
    state: "Planning",
    visibility: "Private",
    nextStep: "Add departments before staffing"
  }
] as const;

export const residenceBoundaries = [
  "Organization does not equal residence.",
  "Residence does not equal department.",
  "Residence active does not equal every department active.",
  "Worker-visible does not equal public.",
  "No resident or patient information is shown."
] as const;

export const departmentTypes = [
  "Nursing",
  "Care",
  "Kitchen",
  "Housekeeping",
  "Laundry",
  "Maintenance",
  "Recreation",
  "Reception",
  "Administration",
  "Security"
] as const;

export const departmentBoundaries = [
  "Department created does not equal department operational.",
  "Department does not equal shift.",
  "Department does not equal cost center.",
  "Department manager does not equal payroll or compliance authority.",
  "Create Shift remains the next authoritative workflow."
] as const;

export const dashboardAttention = [
  {
    title: "Open requests",
    state: "7 fixture requests need coverage",
    route: "Next workflow: Create Shift or Applicants"
  },
  {
    title: "Urgent staffing needs",
    state: "2 same-day fixture requests flagged for dispatcher attention",
    route: "Route to Urgent Shift"
  },
  {
    title: "Shifts today",
    state: "12 fixture shifts across 3 residences",
    route: "Route to Attendance Monitoring"
  },
  {
    title: "Workers on-site",
    state: "9 checked-in fixture workers",
    route: "Read-only attendance status"
  },
  {
    title: "Timesheet approvals",
    state: "4 pending employer review",
    route: "Route to Timesheets"
  },
  {
    title: "Outstanding invoices",
    state: "$3,840.00 fixture balance",
    route: "Route to Invoices"
  },
  {
    title: "Monthly staffing cost",
    state: "$18,420.00 illustrative total",
    route: "Estimate only; payment authority separate"
  }
] as const;

export const dashboardSections = [
  "Today's shifts",
  "Open shifts",
  "Urgent unfilled requests",
  "Candidate matches",
  "Worker profiles and qualifications",
  "Filled shifts",
  "Pending applications",
  "Punch-in and punch-out status",
  "Pending timesheet approvals",
  "Outstanding invoices",
  "Payment method management",
  "Residence locations",
  "Team members and permissions",
  "Active conversations",
  "Unread notifications",
  "Operational reports",
  "Settings",
  "Open support requests",
  "High-level billing summary"
] as const;

export const dashboardBoundaries = [
  "Open shift does not equal filled shift.",
  "Worker suggested does not equal worker approved.",
  "Candidate reviewed does not equal assignment confirmed.",
  "Urgent request does not equal guaranteed coverage.",
  "Billing summary does not equal final invoice.",
  "AI suggestions are advisory and never approve, assign, reject, edit, bill, or modify compliance."
] as const;

export const dashboardAvailableOrdersCalendar = [
  {
    day: "Today",
    value: "4",
    detail: "Open staffing requests",
    state: "Requested",
    route: "/employer/shifts/published"
  },
  {
    day: "Urgent",
    value: "1",
    detail: "Priority review, not guaranteed coverage",
    state: "In review",
    route: "/employer/shifts/urgent"
  },
  {
    day: "Tomorrow",
    value: "3",
    detail: "Published fixture shifts",
    state: "Open",
    route: "/employer/shifts/published"
  },
  {
    day: "This week",
    value: "8",
    detail: "Needs employer review",
    state: "Pending",
    route: "/employer/applicants"
  }
] as const;

export const dashboardOrderCalendar = [
  {
    day: "Past",
    value: "18",
    detail: "Completed fixture orders",
    state: "Completed",
    route: "/employer/reports"
  },
  {
    day: "Today",
    value: "5",
    detail: "Confirmed or active",
    state: "Scheduled",
    route: "/employer/assignments/detail"
  },
  {
    day: "Future",
    value: "11",
    detail: "Upcoming approved requests",
    state: "Planned",
    route: "/employer/shifts/published"
  },
  {
    day: "Review",
    value: "2",
    detail: "Requires human decision",
    state: "Action needed",
    route: "/employer/assignments/review"
  }
] as const;

export const dashboardRevenueCalendar = [
  {
    day: "Estimated",
    value: "$3.4k",
    detail: "Before final attendance review",
    state: "Estimate",
    route: "/employer/invoices"
  },
  {
    day: "Invoice",
    value: "$2.1k",
    detail: "Generated from approved timesheets",
    state: "Draft",
    route: "/employer/invoices"
  },
  {
    day: "Due",
    value: "$1.8k",
    detail: "Employer payment workflow",
    state: "Pending",
    route: "/employer/payments"
  },
  {
    day: "Paid",
    value: "$6.2k",
    detail: "Settled fixture history",
    state: "Settled",
    route: "/employer/payments"
  }
] as const;
