export const page069BoundaryStatements = [
  "Compliance flag != Misconduct",
  "Policy warning != Legal conclusion",
  "Verification summary != Source evidence",
  "Exception review != Automatic restriction",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const complianceFilters = [
  "Search",
  "Compliance category",
  "Lifecycle state",
  "Scope",
  "Review state",
  "Freshness",
  "Risk"
] as const;

export const complianceRecords = [
  {
    id: "CMP-6102",
    title: "Credential expiry risk",
    scope: "Organization / Residence",
    lifecycle: "Review pending",
    policy: "Credential renewal policy reference",
    verification: "Verification summary visible, source evidence not displayed",
    expiry: "Upcoming expiry indicator",
    backgroundCheck: "Background-check governance summary current",
    exception: "No compliance exception",
    evidence: "Masked evidence reference",
    freshness: "Current",
    privacy: "No identity documents, health records, or protected personal information displayed"
  },
  {
    id: "CMP-6276",
    title: "Policy status exception",
    scope: "Residence / Department",
    lifecycle: "Under review",
    policy: "Policy status needs human review",
    verification: "Verification summary partial",
    expiry: "Expiry indicator unavailable",
    backgroundCheck: "Background-check source unavailable",
    exception: "Exception review does not restrict automatically",
    evidence: "Masked policy evidence reference",
    freshness: "Partial",
    privacy: "Investigation and confidential legal material hidden"
  },
  {
    id: "CMP-6384",
    title: "Restricted compliance summary",
    scope: "Authorized compliance scope",
    lifecycle: "Restricted",
    policy: "Policy warning summary only",
    verification: "Source evidence restricted",
    expiry: "Credential expiry summary stale",
    backgroundCheck: "Governance summary delayed",
    exception: "Restricted exception summary only",
    evidence: "Masked restricted reference",
    freshness: "Stale",
    privacy: "Internal fraud indicators, authentication secrets, tax, and banking details hidden"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source boundary",
    value: "Compliance records, policy references, verification summaries, and audit evidence"
  },
  {
    label: "Human authority",
    value: "Protected compliance actions require explicit permission, reason capture, and handoff"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to credential, license, certification, background-check, policy, support, or audit owner workflow without mutation"
  },
  {
    label: "Compliance scope",
    value:
      "Compliance queue, policy status, verification summaries, expiry risk, exception review, evidence references, and audit history"
  }
] as const;

export const protectedActions = [
  "Request compliance review",
  "Open credential owner workflow",
  "Open policy reference",
  "Request governed export",
  "Add human-reviewed compliance note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show compliance placeholders only. Do not guess verification, source evidence, eligibility, discipline, or legal state."
  },
  {
    title: "Empty state",
    text: "No compliance records found in the authorized scope. Hidden compliance records are never hinted."
  },
  {
    title: "Stale data",
    text: "This compliance summary may be outdated. Open the authoritative source before relying on it."
  },
  {
    title: "Partial data",
    text: "Some policy, verification, evidence, expiry, background-check, or audit references are unavailable."
  },
  {
    title: "Denied state",
    text: "You do not have permission to view this compliance detail. Request access through the approved path."
  },
  {
    title: "Service error",
    text: "Compliance source information is unavailable. Retry later or use the governed support path."
  },
  {
    title: "Unavailable state",
    text: "A source workflow is unavailable. The page must not infer missing compliance state."
  },
  {
    title: "Delayed state",
    text: "Compliance aggregation is delayed. Labels must show freshness before any decision."
  },
  {
    title: "Restricted state",
    text: "Sensitive compliance detail is hidden by policy, role, or scope. The summary remains minimum necessary."
  },
  {
    title: "Review pending",
    text: "A human review is required. The status does not confirm a violation, restriction, or disciplinary outcome."
  }
] as const;

export const aiAllowed = [
  "Summarize compliance status",
  "Explain compliance categories",
  "Identify missing information",
  "Draft human-reviewed compliance notes",
  "Suggest navigation to owner workflows"
] as const;

export const aiProhibited = [
  "Approve compliance",
  "Reject compliance",
  "Verify credentials",
  "Suspend workers",
  "Determine violations",
  "Initiate investigations",
  "Issue disciplinary actions",
  "Change authoritative records"
] as const;
