export const page067BoundaryStatements = [
  "Finance summary != Accounting ledger",
  "Adjustment request != Approved adjustment",
  "Invoice reference != Invoice editing",
  "Payment status != Bank settlement truth",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const financeFilters = [
  "Search",
  "Lifecycle state",
  "Scope",
  "Finance type",
  "Period",
  "Freshness",
  "Exception"
] as const;

export const financeRecords = [
  {
    id: "FIN-4102",
    title: "Employer billing review",
    employer: "Test Employer Organization A",
    scope: "Organization / Work site",
    lifecycle: "Under review",
    billing: "Client billing summary only",
    invoice: "Invoice reference visible, not editable",
    payment: "Payment recorded, settlement not confirmed here",
    payable: "Worker payable summary referenced only",
    reconciliation: "Reconciliation status current",
    amount: "Masked amount summary",
    freshness: "Current",
    privacy: "No bank, card, tax, payroll, or worker identity details displayed"
  },
  {
    id: "FIN-4276",
    title: "Adjustment request queue",
    employer: "Test Employer Organization B",
    scope: "Organization / Department",
    lifecycle: "Pending approval",
    billing: "Adjustment request awaiting human review",
    invoice: "Related invoice owner workflow required",
    payment: "No payment action available on this page",
    payable: "Payroll impact unknown until owner workflows confirm",
    reconciliation: "Partial source data",
    amount: "Masked adjustment range",
    freshness: "Partial",
    privacy: "Sensitive reason and dispute detail restricted"
  },
  {
    id: "FIN-4384",
    title: "Refund governance reference",
    employer: "Test Employer Organization A",
    scope: "Authorized finance scope",
    lifecycle: "Restricted",
    billing: "Credit and refund governance summary",
    invoice: "Invoice source unavailable",
    payment: "Payment processor state unavailable",
    payable: "Worker payment execution out of scope",
    reconciliation: "Delayed aggregation",
    amount: "Masked refund reference",
    freshness: "Stale",
    privacy: "Provider identifiers and internal fraud signals hidden"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source boundary",
    value: "Financial records, invoice references, payment references, and adjustment references"
  },
  {
    label: "Human authority",
    value: "Protected finance actions require explicit permission, reason capture, and handoff"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to invoice, payment, payroll, reconciliation, export, or audit owner workflow without mutation"
  },
  {
    label: "Finance scope",
    value:
      "Queue visibility, billing summaries, adjustment review, credits and refunds governance, reconciliation status, export requests, and audit history"
  }
] as const;

export const protectedActions = [
  "Request finance review",
  "Open invoice owner workflow",
  "Open payment owner workflow",
  "Request governed export",
  "Add human-reviewed finance note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show finance placeholders only. Do not guess invoices, payments, payroll, balances, or settlement state."
  },
  {
    title: "Empty state",
    text: "No finance records found in the authorized scope. Hidden financial records are never hinted."
  },
  {
    title: "Stale data",
    text: "This finance summary may be outdated. Open the authoritative source before relying on it."
  },
  {
    title: "Partial data",
    text: "Some invoice, payment, payroll, reconciliation, or adjustment references are unavailable."
  },
  {
    title: "Access denied",
    text: "You do not have permission to view this financial detail. Request access through the approved path."
  },
  {
    title: "Service error",
    text: "Finance source information is unavailable. Retry later or use the governed support path."
  },
  {
    title: "Unavailable source",
    text: "A source workflow is unavailable. The page must not infer missing financial state."
  },
  {
    title: "Delayed aggregation",
    text: "Summary data is delayed. Labels must show the latest known freshness before any decision."
  },
  {
    title: "Restricted financial detail",
    text: "Sensitive finance detail is hidden by policy, role, or scope. The summary remains minimum necessary."
  }
] as const;

export const aiAllowed = [
  "Summarize visible financial information",
  "Explain finance status labels",
  "Identify missing or inconsistent summary data",
  "Draft human-reviewed finance notes",
  "Suggest navigation to owner workflows"
] as const;

export const aiProhibited = [
  "Approve invoices",
  "Initiate payments",
  "Calculate authoritative payroll",
  "Issue refunds",
  "Release payouts",
  "Modify balances",
  "Reconcile funds",
  "Change rates",
  "Make tax determinations",
  "Write authoritative finance state"
] as const;
