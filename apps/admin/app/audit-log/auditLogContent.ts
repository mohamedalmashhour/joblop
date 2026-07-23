export const page072BoundaryStatements = [
  "Audit display != Audit mutation",
  "Correction != Overwrite",
  "Export request != Unrestricted evidence access",
  "Audit event != Final misconduct finding",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const auditFilters = [
  "Search",
  "Action category",
  "Actor role",
  "Organization scope",
  "Date range",
  "Outcome",
  "Integrity status"
] as const;

export const auditEvents = [
  {
    id: "AUD-9102",
    title: "Settings review opened",
    actor: "Masked administrator actor",
    actorRole: "Administrator",
    timestamp: "Locale-aware timestamp reference",
    category: "Configuration visibility",
    resource: "System setting reference",
    scope: "Organization / Residence",
    outcome: "Viewed",
    sourceReference: "Configuration policy source",
    policyVersion: "Policy version reference",
    integrity: "Integrity verified",
    retention: "Retention active",
    freshness: "Current",
    privacy: "No secrets, credentials, tokens, or protected personal information displayed"
  },
  {
    id: "AUD-9276",
    title: "Compliance export requested",
    actor: "Masked compliance actor",
    actorRole: "Compliance",
    timestamp: "Locale-aware timestamp partial",
    category: "Export request",
    resource: "Masked compliance evidence reference",
    scope: "Residence / Department",
    outcome: "Request pending",
    sourceReference: "Compliance source partial",
    policyVersion: "Policy version pending",
    integrity: "Integrity status partial",
    retention: "Retention summary visible",
    freshness: "Partial",
    privacy: "Investigation details and restricted evidence hidden"
  },
  {
    id: "AUD-9384",
    title: "Restricted source handoff",
    actor: "Masked super administrator actor",
    actorRole: "Super Administrator",
    timestamp: "Timestamp stale",
    category: "Workflow handoff",
    resource: "Restricted source workflow reference",
    scope: "Authorized audit scope",
    outcome: "Restricted",
    sourceReference: "Source unavailable",
    policyVersion: "Policy version stale",
    integrity: "Audit unavailable",
    retention: "Retention expired",
    freshness: "Stale",
    privacy: "Security secrets, banking, tax, health, and internal investigation material hidden"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source boundary",
    value: "Audit event stream and integrity status"
  },
  {
    label: "Human authority",
    value:
      "Protected audit views and exports require explicit permission, reason capture, and handoff"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to source workflow, evidence request, export request, retention policy, or audit access workflow without mutation"
  },
  {
    label: "Audit scope",
    value:
      "Event search, timeline, integrity status, actor snapshots, evidence links, export requests, and audit access history"
  }
] as const;

export const protectedActions = [
  "Request audit review",
  "Open source workflow reference",
  "Request governed evidence export",
  "Open retention policy reference",
  "Add human-reviewed audit note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show audit placeholders only. Do not guess actor, source, integrity, retention, or outcome details."
  },
  {
    title: "Empty state",
    text: "No audit events found in the authorized scope. Hidden audit records are never hinted."
  },
  {
    title: "Stale data",
    text: "This audit summary may be outdated. Open the audit source before relying on it."
  },
  {
    title: "Partial history",
    text: "Some actor, source, evidence, policy, retention, or integrity references are unavailable."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this audit detail. Request access through the approved path."
  },
  {
    title: "Restricted records",
    text: "Sensitive audit detail is hidden by policy, role, or scope."
  },
  {
    title: "Service error",
    text: "Audit source information is unavailable. Retry later or use the governed support path."
  },
  {
    title: "Unavailable source",
    text: "A source workflow is unavailable. The page must not infer source record state."
  },
  {
    title: "Retention expired",
    text: "Retention status is expired. This does not grant deletion, restoration, or unrestricted evidence access."
  },
  {
    title: "Audit unavailable",
    text: "Audit evidence is unavailable. Do not treat the visible summary as complete."
  }
] as const;

export const aiAllowed = [
  "Summarize audit activity",
  "Explain audit categories",
  "Identify missing information",
  "Draft human-reviewed audit summaries",
  "Suggest navigation to owner workflows"
] as const;

export const aiProhibited = [
  "Alter audit history",
  "Delete audit events",
  "Create authoritative events",
  "Approve actions",
  "Infer misconduct",
  "Expose restricted data",
  "Replay actions",
  "Modify authoritative records"
] as const;
