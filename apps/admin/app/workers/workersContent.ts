export const page063BoundaryStatements = [
  "User != Worker",
  "Worker profile != User account",
  "Worker active != Available",
  "Available != Eligible",
  "Eligible != Assigned",
  "Document submitted != Verified",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const workerFilters = [
  "Search",
  "Lifecycle state",
  "Scope",
  "Role / category",
  "Review state",
  "Freshness",
  "Risk"
] as const;

export const workerRecords = [
  {
    id: "WKR-1842",
    maskedName: "M. A.",
    scope: "North Residence / Kitchen",
    lifecycle: "Active",
    availability: "Available summary current",
    eligibility: "Eligible for reviewed kitchen roles",
    review: "Credential reference current",
    freshness: "Current",
    privacy: "Employer-visible summary only"
  },
  {
    id: "WKR-2197",
    maskedName: "S. L.",
    scope: "East Residence / Care",
    lifecycle: "Under review",
    availability: "Availability source partial",
    eligibility: "Eligibility pending credential review",
    review: "Background-check reference pending",
    freshness: "Partial",
    privacy: "Restricted compliance details hidden"
  },
  {
    id: "WKR-2604",
    maskedName: "J. D.",
    scope: "Central Residence / Helper",
    lifecycle: "Restricted",
    availability: "Unavailable",
    eligibility: "Not eligible for new assignments",
    review: "Review handoff required",
    freshness: "Stale",
    privacy: "Sensitive reason not displayed"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source",
    value: "Worker record and compliance-summary references"
  },
  {
    label: "Human authority",
    value: "Protected actions require permission, confirmation, and reason capture"
  },
  {
    label: "Allowed handoff",
    value: "Route to authoritative owner workflow without silently mutating other domains"
  },
  {
    label: "Export behavior",
    value: "Governed export request only, permission-scoped and auditable"
  }
] as const;

export const protectedActions = [
  "Request compliance review",
  "Open source workflow",
  "Request governed export",
  "Add administrative note"
] as const;

export const statusPanels = [
  {
    title: "Empty state",
    text: "No worker records found in the authorized scope. Hidden records are never hinted."
  },
  {
    title: "Stale data",
    text: "This summary may be outdated. Open the source workflow before relying on it."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this worker detail. Request access through the approved path."
  },
  {
    title: "Partial data",
    text: "Some source references are unavailable. Do not infer eligibility or approval."
  }
] as const;

export const aiAllowed = [
  "Summarize visible records",
  "Explain policy",
  "Identify missing information",
  "Suggest navigation"
] as const;

export const aiProhibited = [
  "Activate or suspend workers",
  "Verify credentials",
  "Assign workers",
  "Write authoritative state",
  "Expose restricted information"
] as const;
