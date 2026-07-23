export const page065BoundaryStatements = [
  "Residence != Employer",
  "Residence active != Staffing request approved",
  "Residence location != Worker tracking",
  "Residence requirements != Worker eligibility decision",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const residenceFilters = [
  "Search",
  "Lifecycle state",
  "Scope",
  "Service area",
  "Review state",
  "Freshness",
  "Risk"
] as const;

export const residenceRecords = [
  {
    id: "RES-1184",
    maskedName: "Northview Residence",
    employerLinkage: "Linked employer summary current",
    scope: "Organization / residence / department references",
    lifecycle: "Active",
    serviceArea: "Senior living operations",
    staffingSummary: "Kitchen, helper, and care coverage references",
    compliance: "Compliance-note summary current",
    freshness: "Current",
    privacy: "Operational contact summary only"
  },
  {
    id: "RES-1460",
    maskedName: "East Garden Residence",
    employerLinkage: "Employer linkage under review",
    scope: "Organization / residence references",
    lifecycle: "Under review",
    serviceArea: "Assisted living support",
    staffingSummary: "Staffing requirement summary partial",
    compliance: "Policy reference requires review",
    freshness: "Partial",
    privacy: "Restricted location detail hidden"
  },
  {
    id: "RES-2035",
    maskedName: "Central Care Site",
    employerLinkage: "Employer relationship reference stale",
    scope: "Restricted residence scope",
    lifecycle: "Restricted",
    serviceArea: "Service area unavailable",
    staffingSummary: "No staffing authority implied",
    compliance: "Residence compliance notes unavailable",
    freshness: "Stale",
    privacy: "Sensitive operational reason not displayed"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source",
    value: "Residence records and employer relationship references"
  },
  {
    label: "Human authority",
    value: "Protected actions require permission, confirmation, and reason capture"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to employer, department, shift, compliance, or audit owner workflow without mutation"
  },
  {
    label: "Residence scope",
    value:
      "Residence profile, status, contacts, service area, staffing summaries, compliance notes, and audit history"
  }
] as const;

export const protectedActions = [
  "Request residence review",
  "Open source workflow",
  "Request governed export",
  "Add administrative note"
] as const;

export const statusPanels = [
  {
    title: "Empty state",
    text: "No residence records found in the authorized scope. Hidden residences are never hinted."
  },
  {
    title: "Stale data",
    text: "This residence summary may be outdated. Open the authoritative source before relying on it."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this residence detail. Request access through the approved path."
  },
  {
    title: "Partial data",
    text: "Some employer, department, staffing, or compliance references are unavailable. Do not infer approval."
  },
  {
    title: "Service error",
    text: "Residence source information is unavailable. Retry later or use the governed support path."
  }
] as const;

export const aiAllowed = [
  "Summarize visible residence information",
  "Identify missing information",
  "Explain policy references",
  "Draft human-reviewed notes",
  "Suggest navigation"
] as const;

export const aiProhibited = [
  "Create or activate residences",
  "Modify residence status",
  "Assign workers",
  "Change permissions",
  "Verify compliance",
  "Alter staffing requirements",
  "Send communications",
  "Write authoritative state"
] as const;
