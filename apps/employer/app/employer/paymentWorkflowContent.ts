export type EmployerPaymentState =
  | "Not Started"
  | "Method Required"
  | "Authorization Pending"
  | "Authorized"
  | "Processing"
  | "Settled"
  | "Failed"
  | "Retry Required"
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
  "Not Started",
  "Method Required",
  "Authorization Pending",
  "Authorized",
  "Processing",
  "Settled",
  "Failed",
  "Retry Required",
  "Refunded",
  "Disputed"
];

export const paymentFixture = {
  invoice: "INV-FIXTURE-050",
  amount: "$253.44 fixture",
  methodSummary: "Card ending 4242 fixture",
  maskedDetails: "**** **** **** 4242",
  authorizationStatus: "Authorization Pending" as EmployerPaymentState,
  settlementStatus: "Not Started" as EmployerPaymentState,
  failureReason: "None fixture",
  retryEligibility: "Eligible only after real integration returns retry rules",
  receiptReference: "Pending fixture",
  transactionDate: "Pending fixture",
  invoiceLinkage: "Linked to invoice fixture, not provider transaction",
  workerPayableBoundary: "Employer payment does not confirm worker payable or payout"
};

export const paymentBoundaries = [
  "Payment Method != Authorization",
  "Authorized != Settled",
  "Settled employer payment != Worker paid",
  "Payment failure != Invoice voided",
  "Retry eligible != Retry executed",
  "Receipt reference != Provider settlement proof"
] as const;

export const paymentDataTruth = [
  "Fixture-backed payment state",
  "No payment provider selected",
  "No real charge execution",
  "No settlement simulation",
  "No full payment credentials exposed",
  "Worker payable remains separate"
] as const;

export function getPaymentStateSummary(state: EmployerPaymentState) {
  return {
    state,
    requiresEmployerAction: ["Method Required", "Failed", "Retry Required", "Disputed"].includes(state),
    isSettled: state === "Settled",
    providerIntegrated: false
  };
}
