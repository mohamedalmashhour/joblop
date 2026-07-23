export const page070BoundaryStatements = [
  "Report != Source record",
  "Report export != Unlimited retention",
  "Metric != Decision",
  "Freshness warning != Source correction",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const reportFilters = [
  "Organization",
  "Residence",
  "Department",
  "Report type",
  "Date range",
  "Timezone",
  "Source freshness"
] as const;

export const reportRecords = [
  {
    id: "RPT-7102",
    title: "Operational staffing summary",
    category: "Operations",
    scope: "Organization / Residence",
    lifecycle: "Generated",
    reportDefinition: "Staffing report definition visible",
    sourceFreshness: "Current source aggregation",
    generationState: "Generated, review not implied",
    exportState: "Export available only by permission and expiry",
    metricDefinition: "Metric definition visible, not a decision",
    summary: "Minimum necessary staffing summary",
    freshness: "Current",
    privacy: "No raw protected datasets, private support cases, or identity documents displayed"
  },
  {
    id: "RPT-7276",
    title: "Attendance exception reference",
    category: "Attendance",
    scope: "Residence / Department",
    lifecycle: "Delayed generation",
    reportDefinition: "Attendance report definition visible",
    sourceFreshness: "Partial source aggregation",
    generationState: "Report requested, not generated",
    exportState: "Export unavailable while generation is delayed",
    metricDefinition: "Exception metric requires source review",
    summary: "Partial attendance summary only",
    freshness: "Partial",
    privacy: "Investigation content and unrestricted personal information excluded"
  },
  {
    id: "RPT-7384",
    title: "Restricted finance and compliance report",
    category: "Finance / Compliance",
    scope: "Authorized report scope",
    lifecycle: "Restricted",
    reportDefinition: "Permission-scoped report definition",
    sourceFreshness: "Stale source warning",
    generationState: "Generation failed",
    exportState: "Export expired",
    metricDefinition: "Metric stale, no formal conclusion",
    summary: "Masked financial and compliance summary",
    freshness: "Stale",
    privacy: "Banking, tax, health, fraud, and authentication secrets hidden"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source boundary",
    value: "Report definitions and governed source-record aggregations"
  },
  {
    label: "Human authority",
    value: "Protected report and export actions require explicit permission, purpose, and reason"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to report-generation, export, source-record owner, metric-definition, or audit workflow without mutation"
  },
  {
    label: "Reports scope",
    value:
      "Report catalogue, run history, freshness, export governance, metric definitions, permission-scoped reports, and audit history"
  }
] as const;

export const protectedActions = [
  "Request report generation",
  "Open source owner workflow",
  "Request governed export",
  "Open metric definition",
  "Add human-reviewed report note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show report placeholders only. Do not guess source records, generation status, export permission, or metric conclusions."
  },
  {
    title: "Empty state",
    text: "No reports found in the authorized scope. Hidden reports are never hinted."
  },
  {
    title: "Stale data",
    text: "This report summary may be outdated. Open the authoritative source before relying on it."
  },
  {
    title: "Partial data",
    text: "Some source aggregation, metric definition, run history, or export references are unavailable."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this report. Request access through the approved path."
  },
  {
    title: "Service error",
    text: "Report source information is unavailable. Retry later or use the governed support path."
  },
  {
    title: "Unavailable source",
    text: "A source workflow is unavailable. The page must not infer missing report state."
  },
  {
    title: "Delayed generation",
    text: "Report generation is delayed. Requested does not mean generated."
  },
  {
    title: "Generation failed",
    text: "The report did not generate. Keep source records authoritative and route through support."
  },
  {
    title: "Restricted report",
    text: "Sensitive report detail is hidden by policy, role, or scope."
  },
  {
    title: "Export unavailable",
    text: "Export permission, source freshness, or purpose requirements are not satisfied."
  },
  {
    title: "Export expired",
    text: "The export is no longer retained. Create a governed request if access is still required."
  },
  {
    title: "No matching results",
    text: "No reports match the active filters. Restricted records remain undisclosed."
  }
] as const;

export const aiAllowed = [
  "Summarize visible reports",
  "Explain report definitions",
  "Identify missing or stale data",
  "Compare governed report periods",
  "Draft human-reviewed report notes",
  "Suggest navigation"
] as const;

export const aiProhibited = [
  "Alter report data",
  "Modify source records",
  "Approve findings",
  "Determine misconduct",
  "Generate authoritative conclusions",
  "Distribute reports",
  "Expose restricted information",
  "Write authoritative state"
] as const;
