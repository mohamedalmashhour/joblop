export const workerEarningsStatusModel = [
  "Pending Timesheet Approval",
  "Finance Ready",
  "Payable Created",
  "Payment Scheduled",
  "Processing",
  "Paid",
  "Failed",
  "On Hold",
  "Disputed",
  "Reconciled"
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
    label: "Estimated payable",
    note: "Not a final payment or settlement"
  }
] as const;

export const workerEarningsBoundaries = [
  "Earnings estimate != final payable",
  "Payable created != payroll paid",
  "Payment scheduled != payment sent",
  "Payment sent != settled",
  "Worker payable != employer invoice"
] as const;

export const workerEarningsPrivacyRules = [
  "No employer billing or platform margin is shown",
  "No full bank details are displayed",
  "No tax, payroll or payment-provider secrets are exposed",
  "Sensitive payment destination data remains masked"
] as const;

export function getWorkerEarningsFixtureDisclosure() {
  return [
    "Fixture-backed earnings only",
    "No payroll engine is connected",
    "No payment provider is connected",
    "No payout is simulated"
  ] as const;
}

