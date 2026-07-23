export const page071BoundaryStatements = [
  "Setting proposed != Setting active",
  "Feature flag != Product approval",
  "Configuration visibility != Authority to modify",
  "System setting != Legal policy",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const settingFilters = [
  "Search",
  "Configuration category",
  "Lifecycle state",
  "Scope",
  "Approval state",
  "Freshness",
  "Risk"
] as const;

export const settingRecords = [
  {
    id: "CFG-8102",
    title: "Notification policy setting",
    category: "Notification policy",
    scope: "Organization / Residence",
    lifecycle: "Active reference",
    settingState: "Active setting reference visible",
    proposalState: "No pending proposal",
    approvalRequirement: "Human approval required for protected changes",
    featureFlag: "Feature flag reference only",
    securityReference: "Security setting reference visible, not editable",
    localization: "Locale and timezone configuration reference",
    audit: "Configuration audit history reference",
    freshness: "Current",
    privacy: "No secrets, tokens, credentials, or runtime values displayed"
  },
  {
    id: "CFG-8276",
    title: "Feature flag proposal",
    category: "Feature flags",
    scope: "Authorized platform scope",
    lifecycle: "Under review",
    settingState: "Setting proposed, not active",
    proposalState: "Proposal awaiting change-control review",
    approvalRequirement: "Product approval not implied by flag visibility",
    featureFlag: "Feature flag proposal summary",
    securityReference: "Security impact reference partial",
    localization: "Localization impact unavailable",
    audit: "Audit handoff required before activation",
    freshness: "Partial",
    privacy: "Internal implementation details and source code changes hidden"
  },
  {
    id: "CFG-8384",
    title: "Restricted security setting reference",
    category: "Security settings",
    scope: "Super administrator scope",
    lifecycle: "Restricted",
    settingState: "Configuration visibility only",
    proposalState: "Protected proposal detail restricted",
    approvalRequirement: "Separate governance required",
    featureFlag: "No feature flag authority",
    securityReference: "Masked security setting reference",
    localization: "No localization change",
    audit: "Audit source stale",
    freshness: "Stale",
    privacy: "Runtime secrets, payment processor configuration, and database details hidden"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source boundary",
    value: "Configuration policies and change-control records"
  },
  {
    label: "Human authority",
    value: "Protected setting actions require explicit permission, reason capture, and handoff"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to change-control, feature-flag, policy, security, localization, notification, or audit owner workflow without mutation"
  },
  {
    label: "System settings scope",
    value:
      "Configuration categories, policy settings, feature flags, security and notification references, localization, approval requirements, and audit history"
  }
] as const;

export const protectedActions = [
  "Request setting review",
  "Open change-control workflow",
  "Open feature flag reference",
  "Request governed export",
  "Add human-reviewed settings note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show configuration placeholders only. Do not guess active settings, approval state, secrets, or runtime behavior."
  },
  {
    title: "Empty state",
    text: "No system settings found in the authorized scope. Hidden settings are never hinted."
  },
  {
    title: "Stale data",
    text: "This setting summary may be outdated. Open the authoritative change-control source before relying on it."
  },
  {
    title: "Partial data",
    text: "Some policy, feature flag, security, notification, localization, or audit references are unavailable."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this setting detail. Request access through the approved path."
  },
  {
    title: "Service error",
    text: "Configuration source information is unavailable. Retry later or use the governed support path."
  },
  {
    title: "Unavailable source",
    text: "A source workflow is unavailable. The page must not infer missing configuration state."
  },
  {
    title: "Conflicting state",
    text: "Setting references disagree. Escalate to change-control rather than choosing a value here."
  },
  {
    title: "Workflow handoff unavailable",
    text: "The owner workflow cannot be opened. No setting change is performed from this page."
  },
  {
    title: "Export unavailable",
    text: "Export permission, purpose, or scope requirements are not satisfied."
  },
  {
    title: "Audit unavailable",
    text: "Audit references are unavailable. Do not treat the setting summary as complete."
  },
  {
    title: "Restricted record",
    text: "Sensitive setting detail is hidden by policy, role, or scope. Runtime secrets are never displayed."
  }
] as const;

export const aiAllowed = [
  "Summarize visible settings",
  "Explain configuration policies",
  "Identify missing information",
  "Draft human-reviewed settings notes",
  "Suggest navigation to owner workflows",
  "Compare governed configuration options"
] as const;

export const aiProhibited = [
  "Activate settings",
  "Modify configuration",
  "Grant permissions",
  "Self-permission AI",
  "Reveal runtime secrets",
  "Change source code",
  "Run database migrations",
  "Execute workflows",
  "Configure payment processors",
  "Write authoritative state"
] as const;
