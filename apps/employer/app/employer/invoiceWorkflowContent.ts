export type InvoiceState =
  | "Draft"
  | "Approved"
  | "Issued"
  | "Sent"
  | "Viewed"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Disputed"
  | "Voided"
  | "Refunded";

export const invoiceWorkflow = [
  {
    page: "050",
    title: "Invoices",
    route: "/employer/invoices",
    status: "Invoice list",
    boundary: "Invoice list displays invoice lifecycle state but does not execute payment."
  },
  {
    page: "050",
    title: "Invoice Detail",
    route: "/employer/invoices/detail",
    status: "Invoice review",
    boundary: "Invoice detail is separate from payment authorization and settlement."
  },
  {
    page: "050",
    title: "Charge Breakdown",
    route: "/employer/invoices/breakdown",
    status: "Line-item view",
    boundary: "Charge breakdown explains invoice totals without tax advice or accounting entries."
  },
  {
    page: "051",
    title: "Payment Handoff",
    route: "/employer/payments",
    status: "Next milestone boundary",
    boundary: "Payment state is separate from invoice review."
  }
] as const;

export const invoiceStates: InvoiceState[] = [
  "Draft",
  "Approved",
  "Issued",
  "Sent",
  "Viewed",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Disputed",
  "Voided",
  "Refunded"
];

export const invoiceFixture = {
  invoiceNumber: "SYN-A-2026-000050",
  shiftReference: "Kitchen evening support",
  workerReference: "Synthetic Worker A",
  employerOrganization: "Test Employer Organization A",
  department: "Kitchen",
  approvedHours: "8.00",
  baseRate: "$28.00/hr fixture",
  urgentPremium: "$0.00 fixture",
  transportCharge: "$0.00 fixture",
  travelAllowance: "$12.00 fixture",
  platformFee: "$18.00 fixture",
  taxes: "Pending configuration fixture",
  adjustments: "-$0.56 fixture",
  subtotal: "$253.44 fixture",
  total: "$253.44 fixture before configured taxes",
  generatedDate: "Pending generation fixture",
  dueDate: "Pending configuration fixture",
  invoiceState: "Draft" as InvoiceState,
  paymentState: "Not Started"
};

export const invoiceRows = [
  {
    invoiceNumber: "SYN-A-2026-000050",
    shift: "Kitchen evening support",
    state: "Draft" as InvoiceState,
    paymentState: "Not Started",
    boundary: "Draft != Issued"
  },
  {
    invoiceNumber: "SYN-A-2026-000051",
    shift: "Care aide morning",
    state: "Sent" as InvoiceState,
    paymentState: "Authorization Pending",
    boundary: "Sent != Paid"
  }
] as const;

export const chargeBreakdownRows = [
  ["Approved hours", invoiceFixture.approvedHours],
  ["Base rate", invoiceFixture.baseRate],
  ["Urgent premium", invoiceFixture.urgentPremium],
  ["Transport charge", invoiceFixture.transportCharge],
  ["Travel allowance", invoiceFixture.travelAllowance],
  ["Platform fee", invoiceFixture.platformFee],
  ["Taxes", invoiceFixture.taxes],
  ["Adjustments", invoiceFixture.adjustments],
  ["Subtotal", invoiceFixture.subtotal],
  ["Total", invoiceFixture.total]
] as const;

export const invoiceBoundaries = [
  "Invoice != Payment",
  "Issued != Paid",
  "Payment Authorized != Settled",
  "Invoice total != Worker payable",
  "Charge breakdown != Accounting ledger",
  "Tax display != Tax advice"
] as const;

export const invoiceDataTruth = [
  "Synthetic Test Employer Organization A data",
  "No payment provider",
  "No financial settlement",
  "No accounting ledger",
  "Versioned synthetic tax policy only",
  "Legal issuer model not approved for production"
] as const;

export function getInvoiceStateSummary(state: InvoiceState) {
  return {
    state,
    canPay: ["Issued", "Sent", "Viewed", "Partially Paid", "Overdue"].includes(state),
    isSettled: state === "Paid",
    isAccountingPosted: false
  };
}
