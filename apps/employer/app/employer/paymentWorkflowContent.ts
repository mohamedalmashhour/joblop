export type EmployerPaymentState =
  | "Pending"
  | "Authorized"
  | "Processing"
  | "Succeeded"
  | "Failed"
  | "Cancelled"
  | "Partially Refunded"
  | "Refunded"
  | "Disputed";

export const paymentWorkflow = [
  {
    page: "051",
    title: "Payments",
    route: "/employer/payments",
    status: "Payment state",
    boundary: "Payment state visibility does not execute real charges."
  },
  {
    page: "051",
    title: "Payment Method",
    route: "/employer/payments/method",
    status: "Masked method",
    boundary: "Payment method state masks details and does not store credentials here."
  },
  {
    page: "051",
    title: "Authorization State",
    route: "/employer/payments/authorization",
    status: "Authorization",
    boundary: "Authorization is not settlement."
  },
  {
    page: "051",
    title: "Settlement State",
    route: "/employer/payments/settlement",
    status: "Settlement",
    boundary: "Settlement is not worker payable or payroll."
  },
  {
    page: "051",
    title: "Receipt State",
    route: "/employer/payments/receipt",
    status: "Receipt",
    boundary: "Receipt reference is fixture-backed and not provider confirmation."
  },
  {
    page: "051",
    title: "Payment Exceptions",
    route: "/employer/payments/exceptions",
    status: "Exception review",
    boundary: "Payment failure does not alter invoices or worker payables automatically."
  },
  {
    page: "052",
    title: "Reports",
    route: "/employer/reports",
    status: "Next milestone boundary",
    boundary: "Reports summarize source workflows and do not own payment state."
  }
] as const;

export const employerPaymentStates: EmployerPaymentState[] = [
  "Pending",
  "Authorized",
  "Processing",
  "Succeeded",
  "Failed",
  "Cancelled",
  "Partially Refunded",
  "Refunded",
  "Disputed"
];

export const paymentFixture = {
  invoice: "SYN-A-2026-000050",
  employerOrganization: "Test Employer Organization A",
  labourEstimate: "CAD $200.00 synthetic",
  travelEstimate: "CAD $10.00 synthetic",
  mileageEstimate: "CAD $5.00 synthetic",
  marketplaceFee: "CAD $26.50 synthetic — contract fee, independent of payment method",
  taxes: "CAD $30.00 synthetic",
  authorizationTotal: "CAD $271.50 synthetic",
  methodSummary: "Mastercard via Stripe — intended default; local fake provider active",
  alternativeMethod: "Canadian ACSS debit — secondary alternative",
  maskedDetails: "Synthetic provider token alias only",
  authorizationStatus: "Pending" as EmployerPaymentState,
  settlementStatus: "Pending" as EmployerPaymentState,
  failureReason: "None fixture",
  retryEligibility: "Governed fake-provider recovery only",
  receiptReference: "Pending fixture",
  transactionDate: "Pending fixture",
  invoiceLinkage: "Linked to invoice fixture, not provider transaction",
  workerPayableBoundary: "Employer payment does not confirm worker payable or payout"
};

export function getPaymentStateSummary(state: EmployerPaymentState) {
  return {
    state,
    requiresEmployerAction: ["Pending", "Failed", "Disputed"].includes(state),
    isSettled: state === "Succeeded",
    providerIntegrated: false
  };
}
