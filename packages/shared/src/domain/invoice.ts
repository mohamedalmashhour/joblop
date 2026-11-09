import type { ContractMoney } from "./moneyEngine";

export const invoiceStatuses = [
  "draft",
  "approved",
  "issued",
  "sent",
  "viewed",
  "partially_paid",
  "paid",
  "overdue",
  "disputed",
  "voided",
  "refunded"
] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const invoiceActions = [
  "create",
  "approve",
  "issue",
  "send",
  "view",
  "record_payment_evidence",
  "dispute",
  "create_credit_note",
  "void"
] as const;
export type InvoiceAction = (typeof invoiceActions)[number];
export type InvoiceActorRole = "employer_member" | "finance_reviewer" | "platform_admin";

const actionRoles: Readonly<Record<InvoiceAction, readonly InvoiceActorRole[]>> = {
  create: ["finance_reviewer", "platform_admin"],
  approve: ["finance_reviewer", "platform_admin"],
  issue: ["finance_reviewer", "platform_admin"],
  send: ["finance_reviewer", "platform_admin"],
  view: ["employer_member", "finance_reviewer", "platform_admin"],
  record_payment_evidence: ["finance_reviewer", "platform_admin"],
  dispute: ["employer_member", "finance_reviewer", "platform_admin"],
  create_credit_note: ["finance_reviewer", "platform_admin"],
  void: ["platform_admin"]
};

export function canPerformInvoiceAction(role: InvoiceActorRole, action: InvoiceAction) {
  return actionRoles[action].includes(role);
}

export const invoiceIssuerModels = [
  "platform_principal",
  "worker_supplier",
  "self_billing_agent"
] as const;
export type InvoiceIssuerModel = (typeof invoiceIssuerModels)[number];

export const invoiceTaxTreatments = ["taxable", "zero_rated", "exempt", "tax_not_enabled"] as const;
export type InvoiceTaxTreatment = (typeof invoiceTaxTreatments)[number];

export type EffectivePeriod = Readonly<{
  effectiveFrom: string;
  effectiveUntil: string | null;
}>;

export type InvoiceIssuerConfiguration = Readonly<{
  version: string;
  issuerModel: InvoiceIssuerModel;
  productionApprovalReference: string | null;
  legalName: string;
  enterpriseIdentifier: string;
  gstRegistrationReference: string | null;
  qstRegistrationReference: string | null;
}> &
  EffectivePeriod;

export type InvoiceTaxConfiguration = Readonly<{
  version: string;
  treatment: InvoiceTaxTreatment;
  issuerRegisteredForGst: boolean;
  issuerRegisteredForQst: boolean;
  supplyClassification: string;
  placeOfSupplyPolicyVersion: string;
  gstRatePartsPerMillion: number;
  qstRatePartsPerMillion: number;
}> &
  EffectivePeriod;

export type InvoiceNumberingConfiguration = Readonly<{
  version: string;
  organizationId: string;
  prefix: string;
  scopeYear: number;
}> &
  EffectivePeriod;

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
  paymentTermsVersion: string;
}>;

export type InvoiceLineKind =
  | "regular_labour"
  | "urgent_labour"
  | "approved_travel_time"
  | "mileage"
  | "adjustment"
  | "marketplace_fee"
  | "transfer_fee"
  | "bonus"
  | "gst"
  | "qst"
  | "credit";

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
  issuer: InvoiceIssuerConfiguration;
  rules: InvoiceRuleSnapshot;
  tax: InvoiceTaxConfiguration;
  lines: readonly InvoiceLineSnapshot[];
  subtotal: ContractMoney;
  taxes: ContractMoney;
  credits: ContractMoney;
  total: ContractMoney;
  calculatedAt: string;
  calculationEngineVersion: string;
  roundingPolicy: "integer_minor_units_half_up";
}>;

export type InvoiceCorrectionReference = Readonly<{
  kind: "credit_note" | "replacement_invoice";
  originalInvoiceId: string;
  reason: string;
}>;

export type InvoiceCalculationInput = Readonly<{
  source: InvoiceSourceSnapshot;
  rules: InvoiceRuleSnapshot;
  issuer: InvoiceIssuerConfiguration;
  tax: InvoiceTaxConfiguration;
  occurredAt: string;
  regularLabour: ContractMoney;
  urgentLabour: ContractMoney;
  approvedTravelTime: ContractMoney;
  mileage: ContractMoney;
  adjustments: ContractMoney;
  marketplaceFees: ContractMoney;
  /** Optional upfront card payment surcharge (employer's share). Omitted/zero -> no surcharge line. */
  transferFee?: ContractMoney;
  /** Optional employer-funded job bonus (accepted by the employer). Omitted/zero -> no bonus line. */
  bonus?: ContractMoney;
  /** Optional label for the regular labour line (e.g. a late-cancellation charge). Default "Regular labour". */
  regularLabourDescription?: string;
  credits: ContractMoney;
  lineRuleVersions: Readonly<
    Record<
      | "regular_labour"
      | "urgent_labour"
      | "approved_travel_time"
      | "mileage"
      | "adjustment"
      | "marketplace_fee"
      | "credit",
      string
    > &
      Partial<Record<"transfer_fee" | "bonus", string>>
  >;
}>;

const transitions: Readonly<Record<InvoiceStatus, readonly InvoiceStatus[]>> = {
  draft: ["approved", "voided"],
  approved: ["issued", "voided"],
  issued: ["sent", "viewed", "partially_paid", "paid", "overdue", "disputed", "voided"],
  sent: ["viewed", "partially_paid", "paid", "overdue", "disputed", "voided"],
  viewed: ["partially_paid", "paid", "overdue", "disputed", "voided"],
  partially_paid: ["paid", "overdue", "disputed", "voided", "refunded"],
  paid: ["disputed", "refunded"],
  overdue: ["partially_paid", "paid", "disputed", "voided"],
  disputed: ["partially_paid", "paid", "voided", "refunded"],
  voided: [],
  refunded: []
};

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus) {
  return transitions[from].includes(to);
}

export function assertInvoiceSource(source: InvoiceSourceSnapshot, expectedOrganizationId: string) {
  if (source.organizationId !== expectedOrganizationId) {
    throw new Error("Invoice source is outside the authorized organization.");
  }
  if (!Number.isSafeInteger(source.timesheetVersion) || source.timesheetVersion < 1) {
    throw new Error("Invoice source requires a valid immutable Timesheet version.");
  }
}

export function calculateInvoiceSnapshot(
  input: InvoiceCalculationInput
): InvoiceCalculationSnapshot {
  assertInvoiceSource(input.source, input.source.organizationId);
  assertEffective(input.issuer, input.occurredAt, "issuer");
  assertEffective(input.tax, input.occurredAt, "tax");
  assertLocalIssuer(input.issuer);

  const untaxedLines: InvoiceLineSnapshot[] = [
    line(
      "regular_labour",
      input.regularLabourDescription?.trim() || "Regular labour",
      input.regularLabour,
      input.lineRuleVersions.regular_labour
    ),
    line(
      "urgent_labour",
      "Urgent labour",
      input.urgentLabour,
      input.lineRuleVersions.urgent_labour
    ),
    line(
      "approved_travel_time",
      "Approved travel time",
      input.approvedTravelTime,
      input.lineRuleVersions.approved_travel_time
    ),
    line("mileage", "Approved mileage", input.mileage, input.lineRuleVersions.mileage),
    line("adjustment", "Adjustments", input.adjustments, input.lineRuleVersions.adjustment),
    line(
      "marketplace_fee",
      "Marketplace fees",
      input.marketplaceFees,
      input.lineRuleVersions.marketplace_fee
    )
  ];
  // Card payment surcharge (upfront set-rate). Present only for card payments; Interac absorbs the
  // fee so no line is passed. Placed in the taxed subtotal (GST/QST apply), pending QC tax review.
  if (input.transferFee && input.transferFee.amountMinor > 0) {
    untaxedLines.push(
      line(
        "transfer_fee",
        "Payment processing surcharge",
        input.transferFee,
        input.lineRuleVersions.transfer_fee ?? "transfer-fee-v1"
      )
    );
  }
  // Employer-funded job bonus (accepted by the employer). Taxed like the labour it rewards (in the
  // GST/QST subtotal). Platform-funded bonuses are never billed, so no line is passed for them.
  if (input.bonus && input.bonus.amountMinor > 0) {
    untaxedLines.push(
      line("bonus", "Job bonus", input.bonus, input.lineRuleVersions.bonus ?? "bonus-v1")
    );
  }
  const subtotal = sumInvoiceMoney(untaxedLines.map((item) => item.amount));
  const gst = taxAmount(subtotal, input.tax, "gst");
  const qst = taxAmount(subtotal, input.tax, "qst");
  const taxes = addInvoiceMoney(gst, qst);
  const beforeCredits = addInvoiceMoney(subtotal, taxes);
  const total = subtractInvoiceMoney(beforeCredits, input.credits);

  return {
    source: input.source,
    issuer: input.issuer,
    rules: input.rules,
    tax: input.tax,
    lines: [
      ...untaxedLines,
      line("gst", "GST", gst, input.tax.version),
      line("qst", "QST", qst, input.tax.version),
      line("credit", "Credits", input.credits, input.lineRuleVersions.credit)
    ],
    subtotal,
    taxes,
    credits: input.credits,
    total,
    calculatedAt: input.occurredAt,
    calculationEngineVersion: "invoice-foundation-v1",
    roundingPolicy: "integer_minor_units_half_up"
  };
}

export function assertProductionInvoiceIssuanceReady(input: {
  issuer: InvoiceIssuerConfiguration;
  tax: InvoiceTaxConfiguration;
  numbering: InvoiceNumberingConfiguration | null;
  paymentTermsVersion: string | null;
}) {
  if (!input.issuer.productionApprovalReference) {
    throw new Error("Invoice issuer model is not approved for production.");
  }
  if (!input.issuer.legalName || !input.issuer.enterpriseIdentifier) {
    throw new Error("Invoice issuer identity is incomplete.");
  }
  if (input.tax.treatment === "tax_not_enabled") {
    throw new Error("Invoice tax policy is not enabled.");
  }
  if (!input.numbering) throw new Error("Invoice numbering policy is missing.");
  if (!input.paymentTermsVersion) throw new Error("Invoice payment terms are missing.");
}

function line(
  kind: InvoiceLineKind,
  description: string,
  amount: ContractMoney,
  ruleVersion: string
): InvoiceLineSnapshot {
  assertCad(amount);
  if (!ruleVersion) throw new Error("Invoice line rule version is required.");
  return {
    id: `${kind}:${description.toLowerCase().replaceAll(" ", "_")}`,
    kind,
    description,
    quantityBasis: "precalculated_minor_units",
    amount,
    ruleVersion
  };
}

function taxAmount(
  subtotal: ContractMoney,
  configuration: InvoiceTaxConfiguration,
  kind: "gst" | "qst"
): ContractMoney {
  if (configuration.treatment !== "taxable") return zeroCad();
  const registered =
    kind === "gst" ? configuration.issuerRegisteredForGst : configuration.issuerRegisteredForQst;
  const rate =
    kind === "gst" ? configuration.gstRatePartsPerMillion : configuration.qstRatePartsPerMillion;
  if (
    !registered ||
    !configuration.supplyClassification ||
    !configuration.placeOfSupplyPolicyVersion
  ) {
    return zeroCad();
  }
  if (!Number.isSafeInteger(rate) || rate < 0 || rate > 1_000_000) {
    throw new Error("Invoice tax rate must be integer parts per million.");
  }
  const numerator = subtotal.amountMinor * rate;
  if (!Number.isSafeInteger(numerator)) throw new Error("Invoice tax calculation overflow.");
  return {
    amountMinor: Math.floor((numerator + 500_000) / 1_000_000),
    currency: "CAD"
  };
}

function sumInvoiceMoney(amounts: readonly ContractMoney[]): ContractMoney {
  const [first] = amounts;
  if (!first) throw new Error("Invoice requires at least one line.");
  return amounts.reduce(addInvoiceMoney);
}

function addInvoiceMoney(left: ContractMoney, right: ContractMoney): ContractMoney {
  assertCad(left);
  assertCad(right);
  const amountMinor = left.amountMinor + right.amountMinor;
  if (!Number.isSafeInteger(amountMinor)) throw new Error("Invoice calculation overflow.");
  return { amountMinor, currency: "CAD" };
}

function subtractInvoiceMoney(left: ContractMoney, right: ContractMoney): ContractMoney {
  assertCad(left);
  assertCad(right);
  if (right.amountMinor > left.amountMinor) {
    throw new Error("Invoice credits cannot exceed subtotal plus taxes.");
  }
  return { amountMinor: left.amountMinor - right.amountMinor, currency: "CAD" };
}

function assertCad(amount: ContractMoney) {
  if (amount.currency !== "CAD") throw new Error("Invoice foundation currently supports CAD only.");
  if (!Number.isSafeInteger(amount.amountMinor) || amount.amountMinor < 0) {
    throw new Error("Invoice amounts must be non-negative safe integer minor units.");
  }
}

function zeroCad(): ContractMoney {
  return { amountMinor: 0, currency: "CAD" };
}

function assertLocalIssuer(issuer: InvoiceIssuerConfiguration) {
  if (issuer.productionApprovalReference !== null) {
    throw new Error("Local invoice calculation cannot use a production issuer approval.");
  }
}

function assertEffective(period: EffectivePeriod, occurredAt: string, label: string) {
  const instant = Date.parse(occurredAt);
  const start = Date.parse(period.effectiveFrom);
  const end = period.effectiveUntil === null ? null : Date.parse(period.effectiveUntil);
  if (
    !Number.isFinite(instant) ||
    !Number.isFinite(start) ||
    (end !== null && !Number.isFinite(end))
  ) {
    throw new Error(`Invoice ${label} effective period is invalid.`);
  }
  if (instant < start || (end !== null && instant >= end)) {
    throw new Error(`Invoice ${label} configuration is not effective.`);
  }
}
