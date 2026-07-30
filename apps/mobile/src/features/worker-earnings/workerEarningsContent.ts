export const workerEarningsStatusModel = [
  "Estimated amount — fixture only",
  "Approved-hours handoff — fixture only",
  "Payroll status unavailable",
  "Payment provider unavailable",
  "Verified settlement unavailable"
] as const;

export const workerEarningsRows = [
  {
    amount: "$96.50",
    label: "Approved hours",
    note: "Derived from approved timesheet fixture"
  },
  {
    amount: "$12.00",
    label: "Premiums",
    note: "Worker-facing summary only"
  },
  {
    amount: "$0.00",
    label: "Travel allowance",
    note: "No approved allowance in this fixture"
  },
  {
    amount: "$108.50",
    label: "Estimated worker-facing amount",
    note: "Not net pay, a guaranteed payout, or verified settlement"
  }
] as const;

export const workerEarningsBoundaries = [
  "Earnings estimate != final payable",
  "Approved-hours handoff != payroll calculation",
  "Payroll status unavailable != paid",
  "Payment provider unavailable != settlement",
  "Worker payable != employer invoice"
] as const;

export const workerEarningsPrivacyRules = [
  "No employer billing or platform margin is shown",
  "No bank account or payment destination values are displayed",
  "No SIN or tax identifier values are displayed",
  "No deductions or net pay are calculated or displayed",
  "No payroll or payment-provider secrets are exposed",
  "Sensitive payment destination data remains masked"
] as const;

export function getWorkerEarningsFixtureDisclosure() {
  return [
    "Fixture-backed earnings only",
    "No payroll engine is connected",
    "No payment provider is connected",
    "No payout is simulated or guaranteed",
    "No verified settlement evidence is available"
  ] as const;
}
