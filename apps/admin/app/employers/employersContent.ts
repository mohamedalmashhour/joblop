export const page064BoundaryStatements = [
  "Employer organization != Employer user",
  "Billing relationship != Payment execution",
  "Employer active != Residence approved",
  "Employer approval != Unlimited staffing authority",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const employerFilters = [
  "Search",
  "Lifecycle state",
  "Scope",
  "Organization type",
  "Review state",
  "Freshness",
  "Risk"
] as const;

export const employerRecords = [
  {
    id: "EMP-1048",
    maskedName: "A. Residence Group",
    scope: "Organization / approved residence references",
    lifecycle: "Active",
    billing: "Billing relationship summary current",
    serviceStatus: "Service-status reference active",
    review: "Access review current",
    freshness: "Current",
    privacy: "Authorized contacts and billing summaries only"
  },
  {
    id: "EMP-1632",
    maskedName: "B. Care Network",
    scope: "Organization / limited department references",
    lifecycle: "Under review",
    billing: "Billing relationship summary partial",
    serviceStatus: "Contract reference pending review",
    review: "Support flag requires human routing",
    freshness: "Partial",
    privacy: "Restricted service notes hidden"
  },
  {
    id: "EMP-2091",
    maskedName: "C. Senior Living",
    scope: "Organization / suspended staffing scope",
    lifecycle: "Restricted",
    billing: "Billing relationship summary unavailable",
    serviceStatus: "Service status held",
    review: "Governed review handoff required",
    freshness: "Stale",
    privacy: "Sensitive reason not displayed"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source",
    value: "Employer organization records and billing/status references"
  },
  {
    label: "Human authority",
    value: "Protected actions require permission, confirmation, and reason capture"
  },
  {
    label: "Allowed handoff",
    value: "Route to employer, billing, residence, or support owner workflow without mutation"
  },
  {
    label: "Access review",
    value:
      "Employer access review is visible here, but account authentication remains outside this page"
  }
] as const;

export const protectedActions = [
  "Request employer review",
  "Open source workflow",
  "Request governed export",
  "Add administrative note"
] as const;

export const statusPanels = [
  {
    title: "Empty state",
    text: "No employer records found in the authorized scope. Hidden organizations are never hinted."
  },
  {
    title: "Stale data",
    text: "This employer summary may be outdated. Open the authoritative source before relying on it."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this employer detail. Request access through the approved path."
  },
  {
    title: "Partial data",
    text: "Some billing or service-status references are unavailable. Do not infer approval or payment state."
  }
] as const;

export const aiAllowed = [
  "Summarize visible employer records",
  "Explain policy",
  "Identify missing information",
  "Suggest navigation"
] as const;

export const aiProhibited = [
  "Activate or suspend organizations",
  "Assign roles or permissions",
  "Execute invoices or payments",
  "Approve residences",
  "Write authoritative state",
  "Expose restricted information"
] as const;
