export type EmployerReportMetric = {
  label: string;
  value: string;
  source: string;
  route: string;
  freshness: "Fixture" | "Stale" | "Partial";
};

export const employerReportMetrics: EmployerReportMetric[] = [
  {
    label: "Total shifts",
    value: "3 fixture",
    source: "Published shift fixtures",
    route: "/employer/shifts/published",
    freshness: "Fixture"
  },
  {
    label: "Published shifts",
    value: "2 fixture",
    source: "Shift publication fixtures",
    route: "/employer/shifts/published",
    freshness: "Fixture"
  },
  {
    label: "Fill rate",
    value: "Partial fixture",
    source: "Applicants and assignment fixtures",
    route: "/employer/assignments/detail",
    freshness: "Partial"
  },
  {
    label: "Urgent-shift volume",
    value: "1 fixture",
    source: "Urgent shift fixture",
    route: "/employer/shifts/urgent",
    freshness: "Fixture"
  },
  {
    label: "Assignment acceptance rate",
    value: "Pending worker response",
    source: "Worker response fixture",
    route: "/employer/assignments/worker-response",
    freshness: "Partial"
  },
  {
    label: "Attendance exceptions",
    value: "1 fixture",
    source: "Attendance exception fixture",
    route: "/employer/attendance/exceptions",
    freshness: "Fixture"
  },
  {
    label: "No-show count",
    value: "0 fixture",
    source: "Attendance fixture",
    route: "/employer/attendance",
    freshness: "Fixture"
  },
  {
    label: "Approved hours",
    value: "8.00 fixture",
    source: "Approved timesheet fixture",
    route: "/employer/timesheets/approved",
    freshness: "Fixture"
  },
  {
    label: "Overtime",
    value: "0.00 fixture",
    source: "Timesheet fixture",
    route: "/employer/timesheets",
    freshness: "Fixture"
  },
  {
    label: "Invoice totals",
    value: "$253.44 fixture",
    source: "Invoice fixture",
    route: "/employer/invoices/detail",
    freshness: "Fixture"
  },
  {
    label: "Payment status",
    value: "Authorization Pending fixture",
    source: "Payment state fixture",
    route: "/employer/payments/authorization",
    freshness: "Fixture"
  },
  {
    label: "Overdue invoices",
    value: "0 fixture",
    source: "Invoice state fixture",
    route: "/employer/invoices",
    freshness: "Fixture"
  },
  {
    label: "Residence usage",
    value: "Maple Residence fixture",
    source: "Residence and shift fixtures",
    route: "/employer/onboarding/residences",
    freshness: "Stale"
  },
  {
    label: "Department usage",
    value: "Kitchen fixture",
    source: "Department and shift fixtures",
    route: "/employer/onboarding/departments",
    freshness: "Stale"
  },
  {
    label: "Role demand",
    value: "Kitchen support fixture",
    source: "Shift role fixtures",
    route: "/employer/shifts/create",
    freshness: "Fixture"
  }
];

export const reportBoundaries = [
  "Report metric != Source of truth",
  "Summary != Operational action",
  "Report filter != Discriminatory decision",
  "Invoice metric != Payment execution",
  "Payment metric != Worker paid",
  "Fixture metric != Live trend"
] as const;

export const reportDataTruth = [
  "Fixture-backed report metrics",
  "No fabricated trends",
  "No analytics automation",
  "No source-record mutation",
  "Partial and stale states visible",
  "Links return to governing records"
] as const;

export function getMetricByLabel(label: string) {
  return employerReportMetrics.find((metric) => metric.label === label);
}

export function getReportReadiness() {
  return {
    metrics: employerReportMetrics.length,
    hasSources: employerReportMetrics.every((metric) => metric.source.length > 0),
    hasGoverningLinks: employerReportMetrics.every((metric) => metric.route.startsWith("/employer/")),
    hasLiveData: false
  };
}
