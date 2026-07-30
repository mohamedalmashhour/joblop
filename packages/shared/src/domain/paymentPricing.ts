export const employerPaymentMethodKinds = ["mastercard", "acss_debit"] as const;
export type EmployerPaymentMethodKind = (typeof employerPaymentMethodKinds)[number];

export type MarketplaceFeePolicy = Readonly<{
  version: string;
  employerContractVersion: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  fixedMinor: number;
  ratePartsPerMillion: number;
}>;

export type PaymentMethodSurchargePolicy = Readonly<{
  enabled: boolean;
  jurisdiction: string;
  legalApprovalReference: string | null;
  processorApprovalReference: string | null;
  ratePartsPerMillion: number;
}>;

export type EmployerAuthorizationEstimate = Readonly<{
  labourMinor: number;
  travelMinor: number;
  mileageMinor: number;
  marketplaceFeeMinor: number;
  taxMinor: number;
  paymentMethodSurchargeMinor: number;
  authorizationTotalMinor: number;
  currency: "CAD";
  marketplaceFeePolicyVersion: string;
}>;

export function calculateEmployerAuthorizationEstimate(input: {
  occurredAt: string;
  labourMinor: number;
  travelMinor: number;
  mileageMinor: number;
  taxMinor: number;
  paymentMethod: EmployerPaymentMethodKind;
  jurisdiction: string;
  marketplaceFee: MarketplaceFeePolicy;
  surcharge: PaymentMethodSurchargePolicy;
}): EmployerAuthorizationEstimate {
  for (const amount of [input.labourMinor, input.travelMinor, input.mileageMinor, input.taxMinor]) {
    assertNonNegativeMinor(amount);
  }
  assertEffective(input.marketplaceFee, input.occurredAt);
  if (
    !Number.isSafeInteger(input.marketplaceFee.ratePartsPerMillion) ||
    input.marketplaceFee.ratePartsPerMillion < 0
  ) {
    throw new Error("Marketplace fee rate must use non-negative integer parts per million.");
  }
  const serviceBase = input.labourMinor + input.travelMinor + input.mileageMinor;
  const marketplaceFeeMinor =
    input.marketplaceFee.fixedMinor +
    roundHalfUp(serviceBase, input.marketplaceFee.ratePartsPerMillion);
  assertNonNegativeMinor(marketplaceFeeMinor);
  const paymentMethodSurchargeMinor = calculateSurcharge(
    serviceBase + marketplaceFeeMinor,
    input.jurisdiction,
    input.surcharge
  );
  return {
    labourMinor: input.labourMinor,
    travelMinor: input.travelMinor,
    mileageMinor: input.mileageMinor,
    marketplaceFeeMinor,
    taxMinor: input.taxMinor,
    paymentMethodSurchargeMinor,
    authorizationTotalMinor:
      serviceBase + marketplaceFeeMinor + input.taxMinor + paymentMethodSurchargeMinor,
    currency: "CAD",
    marketplaceFeePolicyVersion: input.marketplaceFee.version
  };
}

function calculateSurcharge(
  baseMinor: number,
  jurisdiction: string,
  policy: PaymentMethodSurchargePolicy
) {
  if (jurisdiction.toUpperCase() === "CA-QC") {
    if (policy.enabled) throw new Error("Payment-method surcharges are disabled for Québec.");
    return 0;
  }
  if (!policy.enabled) return 0;
  if (
    !policy.legalApprovalReference ||
    !policy.processorApprovalReference ||
    policy.jurisdiction !== jurisdiction
  ) {
    throw new Error("Payment-method surcharge approval is incomplete.");
  }
  return roundHalfUp(baseMinor, policy.ratePartsPerMillion);
}

function roundHalfUp(baseMinor: number, ratePartsPerMillion: number) {
  const numerator = baseMinor * ratePartsPerMillion;
  if (!Number.isSafeInteger(numerator)) throw new Error("Payment estimate overflow.");
  return Math.floor((numerator + 500_000) / 1_000_000);
}

function assertEffective(
  policy: Pick<MarketplaceFeePolicy, "effectiveFrom" | "effectiveUntil">,
  occurredAt: string
) {
  const instant = Date.parse(occurredAt);
  const start = Date.parse(policy.effectiveFrom);
  const end = policy.effectiveUntil === null ? null : Date.parse(policy.effectiveUntil);
  if (
    !Number.isFinite(instant) ||
    !Number.isFinite(start) ||
    instant < start ||
    (end !== null && instant >= end)
  ) {
    throw new Error("Marketplace fee policy is not effective.");
  }
}

function assertNonNegativeMinor(amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("Payment estimate values must be non-negative integer minor units.");
  }
}
