import type { ContractMoney } from "./moneyEngine";

export const invoiceStatuses = [
  "draft",
  "review_required",
  "issued",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "disputed",
  "voided",
  "refunded"
] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

export type InvoiceSourceSnapshot = Readonly<{
  type: "locked_timesheet";
  timesheetId: string;
  timesheetVersion: number;
  organizationId: string;
  assignmentId: string;
  attendanceRecordId: string;
}>;

export type InvoiceRuleSnapshot = Readonly<{
  employerTermsVersion: string;
  calculationPolicyVersion: string;
  taxPolicyVersion: string;
  travelPolicyVersion: string;
  adjustmentPolicyVersion: string;
}>;

export type InvoiceLineKind =
  "regular_hours" | "urgent_rate" | "travel_time" | "mileage" | "tax" | "adjustment";

export type InvoiceLineSnapshot = Readonly<{
  id: string;
  kind: InvoiceLineKind;
  description: string;
  quantityBasis: string;
  amount: ContractMoney;
  ruleVersion: string;
}>;

export type InvoiceCalculationSnapshot = Readonly<{
  source: InvoiceSourceSnapshot;
  rules: InvoiceRuleSnapshot;
  lines: readonly InvoiceLineSnapshot[];
  subtotal: ContractMoney;
  taxes: ContractMoney;
  adjustments: ContractMoney;
  total: ContractMoney;
  calculatedAt: string;
  calculationEngineVersion: string;
}>;

export type InvoiceCorrectionReference = Readonly<{
  kind: "credit_note" | "replacement_invoice";
  originalInvoiceId: string;
  reason: string;
}>;

const transitions: Readonly<Record<InvoiceStatus, readonly InvoiceStatus[]>> = {
  draft: ["review_required", "issued", "voided"],
  review_required: ["draft", "issued", "voided"],
  issued: ["sent", "viewed", "overdue", "disputed", "voided", "paid"],
  sent: ["viewed", "overdue", "disputed", "voided", "paid"],
  viewed: ["overdue", "disputed", "voided", "paid"],
  paid: ["disputed", "refunded"],
  overdue: ["disputed", "voided", "paid"],
  disputed: ["voided", "paid", "refunded"],
  voided: [],
  refunded: []
};

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus) {
  return transitions[from].includes(to);
}

export function assertInvoiceSource(source: InvoiceSourceSnapshot, expectedOrganizationId: string) {
  if (source.type !== "locked_timesheet") {
    throw new Error("Invoice source must be a locked Timesheet.");
  }
  if (source.organizationId !== expectedOrganizationId) {
    throw new Error("Invoice source is outside the authorized organization.");
  }
  if (!Number.isSafeInteger(source.timesheetVersion) || source.timesheetVersion < 1) {
    throw new Error("Invoice source requires a valid immutable Timesheet version.");
  }
}
