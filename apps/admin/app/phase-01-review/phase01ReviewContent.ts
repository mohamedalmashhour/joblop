export const phase01Routes = [
  {
    page: "063",
    title: "Workers",
    route: "/workers",
    ownership: "Worker Management",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "064",
    title: "Employers",
    route: "/employers",
    ownership: "Employer Management",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "065",
    title: "Residences",
    route: "/residences",
    ownership: "Residence Management",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "066",
    title: "Shifts",
    route: "/shifts",
    ownership: "Shift Management",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "067",
    title: "Finance",
    route: "/finance",
    ownership: "Finance Administration",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "068",
    title: "Payroll",
    route: "/payroll",
    ownership: "Payroll Administration",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "069",
    title: "Compliance",
    route: "/compliance",
    ownership: "Compliance Administration",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "070",
    title: "Reports",
    route: "/reports",
    ownership: "Governed Reports",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "071",
    title: "System Settings",
    route: "/system-settings",
    ownership: "System Settings Visibility",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "072",
    title: "Audit Log",
    route: "/audit-log",
    ownership: "Audit Log Visibility",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "073",
    title: "AI Control Center",
    route: "/ai-control-center",
    ownership: "AI Governance Visibility",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "074",
    title: "Notification Center",
    route: "/notification-center",
    ownership: "Notification Visibility",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  },
  {
    page: "075",
    title: "Platform Analytics",
    route: "/platform-analytics",
    ownership: "Platform Analytics Summary",
    status: "Implemented",
    buildStatus: "Build verified",
    navigationStatus: "Linked from owner review index"
  }
] as const;

export const reviewNotices = [
  "Phase 01 owner review",
  "Development/demo fixtures may be shown.",
  "No live backend integration is claimed.",
  "Pages are governed administrative surfaces.",
  "No authoritative operational actions execute from these pages.",
  "AI remains advisory and human-reviewed.",
  "Sensitive values are masked or excluded."
] as const;

export const reviewChecks = [
  "Open every implemented route.",
  "Inspect desktop and mobile layout.",
  "Confirm fixture labels and demo data truthfulness.",
  "Confirm empty, stale, partial, denied, restricted, unavailable, and error states.",
  "Confirm governed handoffs do not execute workflows.",
  "Confirm AI may explain or summarize only.",
  "Confirm privacy and security language remains visible."
] as const;
