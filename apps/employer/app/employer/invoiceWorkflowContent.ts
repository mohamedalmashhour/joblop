export type InvoiceState =
  | "Pending Generation"
  | "Draft"
  | "Issued"
  | "Due"
  | "Partially Paid"
  | "Paid"
  | "Failed"
  | "Overdue"
  | "Disputed"
  | "Voided";

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
    boundary: "Charge breakdown explains fixture totals without tax advice or accounting entries."
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
  "Pending Generation",
  "Draft",
  "Issued",
  "Due",
  "Partially Paid",
  "Paid",
  "Failed",
  "Overdue",
  "Disputed",
  "Voided"
];

export const invoiceFixture = {
  invoiceNumber: "INV-FIXTURE-050",
  shiftReference: "Kitchen evening support",
  workerReference: "Assigned worker fixture",
  residence: "Maple Residence",
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
    invoiceNumber: "INV-FIXTURE-050",
    shift: "Kitchen evening support",
    state: "Draft" as InvoiceState,
    paymentState: "Not Started",
    boundary: "Draft != Issued"
  },
  {
    invoiceNumber: "INV-FIXTURE-051",
    shift: "Care aide morning",
    state: "Due" as InvoiceState,
    paymentState: "Authorization Pending",
    boundary: "Due != Paid"
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
  "Fixture-backed invoice data",
  "No payment provider",
  "No financial settlement",
  "No accounting ledger",
  "No tax engine",
  "Payment integration pending"
] as const;

export function getInvoiceStateSummary(state: InvoiceState) {
  return {
    state,
    canPay: ["Issued", "Due", "Partially Paid", "Overdue"].includes(state),
    isSettled: state === "Paid",
    isAccountingPosted: false
  };
}
