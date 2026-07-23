export const page073BoundaryStatements = [
  "AI enabled != Autonomous authority",
  "Simulation != Live recommendation",
  "Recommendation != Decision",
  "Guardrail warning != Workflow action",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const aiControlFilters = [
  "Search",
  "AI feature",
  "Capability state",
  "Policy version",
  "Guardrail status",
  "Freshness",
  "Risk"
] as const;

export const aiGovernanceRecords = [
  {
    id: "AIC-1012",
    title: "Shift recommendation policy",
    category: "Worker matching guidance",
    scope: "Organization / Residence",
    lifecycle: "Enabled reference",
    modelStatus: "Model status healthy reference",
    policyVersion: "Policy version reference",
    capability: "Enabled capability summary only",
    boundary: "Recommendation remains human-reviewed",
    confidence: "Confidence guidance, not approval",
    evidence: "Masked evidence source list",
    guardrail: "Guardrails current",
    simulation: "Simulation mode reference only",
    usage: "Usage summary masked",
    audit: "AI audit summary current",
    freshness: "Current",
    privacy:
      "No prompts, API keys, tokens, hidden system prompts, or protected personal information displayed"
  },
  {
    id: "AIC-1140",
    title: "Staffing summary assistant",
    category: "Operational summarization",
    scope: "Residence / Department",
    lifecycle: "Simulation mode",
    modelStatus: "Model status partial",
    policyVersion: "Policy under review",
    capability: "Disabled live action capability",
    boundary: "Summary only, no operational action",
    confidence: "Confidence unavailable",
    evidence: "Masked source references",
    guardrail: "Guardrail warning requires human review",
    simulation: "Simulation != Live recommendation",
    usage: "Partial usage summary",
    audit: "AI audit summary partial",
    freshness: "Partial",
    privacy: "Sensitive prompts, internal security material, and restricted source detail hidden"
  },
  {
    id: "AIC-1284",
    title: "External communication guardrail",
    category: "Communication protection",
    scope: "Authorized AI governance scope",
    lifecycle: "Restricted",
    modelStatus: "AI unavailable",
    policyVersion: "Policy unavailable",
    capability: "Hidden feature disabled",
    boundary: "No unreviewed external communication",
    confidence: "Restricted confidence guidance",
    evidence: "Evidence source unavailable",
    guardrail: "Restricted guardrail status",
    simulation: "Simulation unavailable",
    usage: "Usage unavailable",
    audit: "Audit unavailable",
    freshness: "Stale",
    privacy: "Model secrets, API keys, tokens, hidden prompts, and protected information hidden"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source boundary",
    value: "AI policies, feature flags, evidence-source references, and guardrail records"
  },
  {
    label: "Human authority",
    value:
      "Protected AI policy actions require explicit permission, reason capture, and owner-workflow handoff"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to AI policy, guardrail, simulation, audit, evidence, or approval owner workflow without execution"
  },
  {
    label: "AI governance scope",
    value:
      "Feature governance, permission boundaries, evidence sources, guardrail status, approval policy, simulation mode, and AI audit history"
  }
] as const;

export const protectedActions = [
  "Request AI policy review",
  "Open guardrail owner workflow",
  "Open evidence source reference",
  "Request simulation review",
  "Add human-reviewed AI note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show AI governance placeholders only. Do not guess model, policy, evidence, confidence, guardrail, or audit details."
  },
  {
    title: "Empty state",
    text: "No AI governance records found in the authorized scope. Hidden records are never hinted."
  },
  {
    title: "Stale data",
    text: "This AI governance summary may be outdated. Open the owner workflow before relying on it."
  },
  {
    title: "Partial data",
    text: "Some model, policy, evidence, usage, audit, confidence, or guardrail references are unavailable."
  },
  {
    title: "Unavailable state",
    text: "An AI governance source is unavailable. The page must not infer policy or capability state."
  },
  {
    title: "Restricted state",
    text: "Sensitive AI governance detail is hidden by policy, role, or scope."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this AI governance detail. Request access through the approved path."
  },
  {
    title: "Service error",
    text: "AI governance information is unavailable. Retry later or use the governed support path."
  },
  {
    title: "Policy unavailable",
    text: "Policy detail is unavailable. Do not treat visible capability status as permission to act."
  },
  {
    title: "AI unavailable",
    text: "AI status is unavailable. The page must not execute fallback AI actions or fabricate metrics."
  }
] as const;

export const aiAllowed = [
  "Summarize visible AI governance records",
  "Explain AI policy summaries",
  "Identify missing governance information",
  "Draft human-reviewed AI notes",
  "Suggest navigation to owner workflows",
  "Compare governed AI options"
] as const;

export const aiProhibited = [
  "Execute AI actions",
  "Change AI models",
  "Alter prompts",
  "Enable hidden AI features",
  "Approve operational decisions",
  "Assign workers",
  "Resolve conflicts",
  "Change financial state",
  "Modify source records",
  "Expose restricted prompts or secrets"
] as const;
