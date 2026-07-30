export const page068BoundaryStatements = [
  "Timesheet approval != Payroll",
  "Payroll ready != Payment sent",
  "Payroll hold != Worker fault",
  "Payroll summary != Tax advice",
  "Visibility != Authority",
  "Permission != Completed approval",
  "Summary != Source of truth",
  "AI suggestion != Human decision"
] as const;

export const payrollFilters = [
  "Search",
  "Payroll cycle",
  "Lifecycle state",
  "Scope",
  "Period",
  "Freshness",
  "Exception"
] as const;

export const payrollRecords = [
  {
    id: "PAY-5102",
    title: "Current payroll cycle",
    scope: "Organization / Residence",
    lifecycle: "Payroll status unavailable",
    approvedHours: "Approved-hours handoff received",
    earningReadiness: "Fixture readiness summary only",
    payrollState: "Payroll engine unavailable — no calculation",
    paymentState: "Payment provider unavailable — no verified settlement",
    hold: "No active hold",
    exportState: "Export request available by permission",
    amount: "Masked estimate only — not net pay or a guaranteed payout",
    freshness: "Current",
    privacy:
      "No SIN, bank account, tax identifier, deductions, net pay, or protected identity values displayed"
  },
  {
    id: "PAY-5288",
    title: "Payroll exception queue",
    scope: "Residence / Department",
    lifecycle: "Under review",
    approvedHours: "Approved-hours reference partial",
    earningReadiness: "Missing fixture readiness detail",
    payrollState: "Payroll engine unavailable — exception not calculated",
    paymentState: "Payment provider unavailable — settlement not verified",
    hold: "Neutral payroll hold, not worker fault",
    exportState: "Export blocked until owner workflow resolves exception",
    amount: "Masked estimate only — not deductions, net pay, or guaranteed payout",
    freshness: "Partial",
    privacy: "Exception summary contains no bank, SIN, tax identifier, or deduction values"
  },
  {
    id: "PAY-5360",
    title: "Delayed payroll aggregation",
    scope: "Authorized payroll scope",
    lifecycle: "Restricted",
    approvedHours: "Source unavailable",
    earningReadiness: "Delayed fixture summary",
    payrollState: "Payroll engine unavailable — status not calculated",
    paymentState: "Payment provider unavailable — funds transfer not represented",
    hold: "Payroll hold summary restricted",
    exportState: "Export unavailable",
    amount: "Masked estimate unavailable — no net pay or payout claim",
    freshness: "Stale",
    privacy:
      "Bank account, SIN, tax identifier, deduction, investigation, and unrelated personal values hidden"
  }
] as const;

export const governanceDetails = [
  {
    label: "Primary source boundary",
    value: "Approved hours, earning records, and payroll-cycle references"
  },
  {
    label: "Human authority",
    value: "Protected payroll actions require explicit permission, reason capture, and handoff"
  },
  {
    label: "Allowed handoff",
    value:
      "Route to approved-hours, payroll exception, export, payment, finance, or audit owner workflow without mutation"
  },
  {
    label: "Payroll scope",
    value:
      "Cycle visibility, worker earning readiness, approved-hours handoff, exceptions, holds, export requests, and audit history"
  }
] as const;

export const protectedActions = [
  "Request payroll review",
  "Open approved-hours handoff",
  "Open payroll exception workflow",
  "Request governed payroll export",
  "Add human-reviewed payroll note"
] as const;

export const statusPanels = [
  {
    title: "Loading state",
    text: "Show payroll placeholders only. Do not guess hours, earning readiness, payroll approval, payment, or tax state."
  },
  {
    title: "Empty state",
    text: "No payroll records found in the authorized scope. Hidden payroll records are never hinted."
  },
  {
    title: "Stale data",
    text: "This payroll summary may be outdated. Open the authoritative source before relying on it."
  },
  {
    title: "Partial data",
    text: "Some approved-hours, earning, hold, export, or audit references are unavailable."
  },
  {
    title: "Denied state",
    text: "You do not have permission to view this payroll detail. Request access through the approved path."
  },
  {
    title: "Service error",
    text: "Payroll source information is unavailable. Retry later or use the governed support path."
  },
  {
    title: "Unavailable state",
    text: "Payroll engine and payment provider are unavailable. The page must not infer payroll, net pay, payout, or settlement state."
  },
  {
    title: "Delayed state",
    text: "Payroll aggregation is delayed. Labels must show freshness before any decision."
  },
  {
    title: "Restricted state",
    text: "Sensitive payroll detail is hidden by policy, role, or scope. The summary remains minimum necessary."
  }
] as const;

export const aiAllowed = [
  "Summarize payroll status",
  "Explain payroll states",
  "Identify missing information",
  "Draft human-reviewed payroll notes",
  "Suggest navigation to owner workflows"
] as const;

export const aiProhibited = [
  "Calculate payroll",
  "Approve payroll",
  "Modify payroll",
  "Release payments",
  "Change financial state",
  "Perform tax calculations",
  "Execute bank transfers",
  "Write authoritative payroll state"
] as const;
