export const page075BoundaryStatements = [
  "Analytics != Source record",
  "Trend != Decision",
  "Forecast != Commitment",
  "Aggregate != Individual performance finding",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const analyticsFilters = [
  "Search",
  "Metric group",
  "Comparison period",
  "Scope",
  "Freshness",
  "Data quality",
  "Risk"
] as const;

export const analyticsRecords = [
  {
    id: "ANL-3001",
    title: "Platform KPI snapshot",
    category: "KPI dashboard",
    scope: "Organization / Residence",
    lifecycle: "Active snapshot",
    metricDefinition: "Metric definition reference",
    kpiSummary: "Aggregate KPI summary only",
    trendSummary: "Trend visibility, not a decision",
    utilizationSummary: "Utilization summary with masked source references",
    staffingTrend: "Staffing trend aggregate only",
    forecastReference: "Forecast reference, not commitment",
    aiInsight: "AI insight reference requires human review",
    comparisonPeriod: "Comparison period reference",
    generatedAt: "Locale-aware generated timestamp reference",
    dataQuality: "Data quality current",
    freshness: "Current",
    boundary: "Analytics != Source record",
    privacy:
      "No protected personal information, raw operational records, banking, tax, health, or credential data displayed"
  },
  {
    id: "ANL-3186",
    title: "Growth and risk trend summary",
    category: "Growth and risk analytics",
    scope: "Authorized platform analytics scope",
    lifecycle: "Under review",
    metricDefinition: "Metric definition under review",
    kpiSummary: "Partial aggregate KPI summary",
    trendSummary: "Trend != Decision",
    utilizationSummary: "Utilization source partially available",
    staffingTrend: "Staffing trend partial",
    forecastReference: "Prediction != Decision",
    aiInsight: "AI insight draft only",
    comparisonPeriod: "Comparison unavailable",
    generatedAt: "Generated timestamp partial",
    dataQuality: "Data quality partial",
    freshness: "Partial",
    boundary: "Metric != Performance judgement",
    privacy: "Investigations, internal fraud indicators, and unrelated personal information hidden"
  },
  {
    id: "ANL-3294",
    title: "Analytics export request reference",
    category: "Analytics export governance",
    scope: "Restricted analytics scope",
    lifecycle: "Restricted",
    metricDefinition: "Metric definition unavailable",
    kpiSummary: "Analytics summary unavailable",
    trendSummary: "Trend stale",
    utilizationSummary: "Utilization unavailable",
    staffingTrend: "Insufficient data",
    forecastReference: "Forecast unavailable",
    aiInsight: "AI insight unavailable",
    comparisonPeriod: "Comparison period stale",
    generatedAt: "Timestamp stale",
    dataQuality: "Data quality restricted",
    freshness: "Stale",
    boundary: "Aggregate != Individual performance finding",
    privacy: "Secrets, protected-class analysis, individual rankings, and raw records hidden"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source boundary",
    value: "Metric definitions, KPI snapshots, report runs, and data-quality notes"
  },
  {
    label: "Human authority",
    value:
      "Protected analytics exports and metric reviews require explicit permission, reason capture, and owner-workflow handoff"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to metric definition review, data-quality note, analytics export request, or source owner workflow without modifying source records"
  },
  {
    label: "Analytics scope",
    value:
      "Platform KPI summary, growth and risk analytics, data quality notes, trend visibility, export requests, metric definition review, and analytics audit history"
  }
] as const;

export const protectedActions = [
  "Open metric definition reference",
  "Request data quality review",
  "Request governed analytics export",
  "Open source owner workflow",
  "Add human-reviewed analytics note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show analytics placeholders only. Do not guess metric, trend, forecast, freshness, comparison, or data-quality details."
  },
  {
    title: "Empty state",
    text: "No analytics records found in the authorized scope. Hidden analytics are never hinted."
  },
  {
    title: "Stale data",
    text: "This analytics summary may be outdated. Open the metric source before relying on it."
  },
  {
    title: "Partial data",
    text: "Some metric, KPI, source, comparison, freshness, or data-quality references are unavailable."
  },
  {
    title: "Unavailable state",
    text: "An analytics source is unavailable. The page must not infer metric or source-record state."
  },
  {
    title: "Restricted state",
    text: "Sensitive analytics detail is hidden by policy, role, or scope."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this analytics detail. Request access through the approved path."
  },
  {
    title: "Service error",
    text: "Analytics information is unavailable. Retry later or use the governed support path."
  },
  {
    title: "Comparison unavailable",
    text: "Comparison period data is unavailable. Do not present trend direction as complete."
  },
  {
    title: "Insufficient data",
    text: "The dataset is too limited for a reliable aggregate summary. Do not create conclusions."
  }
] as const;

export const aiAllowed = [
  "Summarize trends",
  "Explain KPIs",
  "Identify missing data",
  "Compare periods",
  "Draft analytical summaries",
  "Suggest navigation to owner workflows"
] as const;

export const aiProhibited = [
  "Change metrics",
  "Create authoritative conclusions",
  "Assign workers",
  "Modify workflows",
  "Expose restricted information",
  "Execute workflows",
  "Generate reports automatically",
  "Trigger notifications",
  "Change AI policy",
  "Change operational state"
] as const;
