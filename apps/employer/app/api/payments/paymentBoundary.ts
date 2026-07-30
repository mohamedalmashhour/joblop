const paymentStates = new Set([
  "pending",
  "authorized",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "partially_refunded",
  "refunded",
  "disputed"
]);

export type EmployerPaymentSummary = Readonly<{
  id: string;
  invoiceId: string;
  state: string;
  amountMinor: number;
  allocatedMinor: number;
  refundedMinor: number;
  currency: "CAD";
  authorizationReference: string | null;
  version: number;
}>;

export function parseEmployerPayments(input: unknown): readonly EmployerPaymentSummary[] {
  if (!isRecord(input) || !Array.isArray(input.payments)) throw new Error("RWOS_INVALID_PAYMENTS");
  return input.payments.map((payment) => {
    if (!isRecord(payment)) throw new Error("RWOS_INVALID_PAYMENT");
    const state = requiredString(payment.state);
    const currency = requiredString(payment.currency);
    if (!paymentStates.has(state) || currency !== "CAD") throw new Error("RWOS_INVALID_PAYMENT");
    return {
      id: requiredString(payment.id),
      invoiceId: requiredString(payment.invoiceId),
      state,
      amountMinor: positiveInteger(payment.amountMinor),
      allocatedMinor: nonNegativeInteger(payment.allocatedMinor),
      refundedMinor: nonNegativeInteger(payment.refundedMinor),
      currency,
      authorizationReference: nullableString(payment.authorizationReference),
      version: positiveInteger(payment.version)
    };
  });
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
function requiredString(input: unknown) {
  if (typeof input !== "string" || !input.trim()) throw new Error("RWOS_INVALID_PAYMENT");
  return input;
}
function nullableString(input: unknown) {
  return input === null ? null : requiredString(input);
}
function nonNegativeInteger(input: unknown) {
  if (!Number.isSafeInteger(input) || (input as number) < 0)
    throw new Error("RWOS_INVALID_PAYMENT");
  return input as number;
}
function positiveInteger(input: unknown) {
  const value = nonNegativeInteger(input);
  if (value < 1) throw new Error("RWOS_INVALID_PAYMENT");
  return value;
}
