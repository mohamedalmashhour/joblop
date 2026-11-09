import { cleanPaymentReference, parseAmountToMinor } from "./paymentFormat";

// HTTP helpers shared by the staff confirm routes of plan orders and listing orders.

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export type StaffConfirmBody = Readonly<{ interacReference: string | null; amountReceivedMinor: number | null }>;

/**
 * Staff confirm body: an optional Interac reference and an optional amount received. "invalid" when
 * an amount was typed but cannot be read (so a typo is never treated as "no amount").
 */
export function readStaffConfirmBody(body: unknown): StaffConfirmBody | "invalid" {
  const fields = record(body);
  const rawAmount = fields.amountReceived;
  const typedAmount = rawAmount !== undefined && rawAmount !== null && String(rawAmount).trim() !== "";
  const amountReceivedMinor = typedAmount ? parseAmountToMinor(rawAmount) : null;
  if (typedAmount && amountReceivedMinor === null) return "invalid";
  return { interacReference: cleanPaymentReference(fields.interacReference), amountReceivedMinor };
}

/** HTTP answer for a refused order action (409 keeps the reason so staff see a plain message). */
export function orderActionError(reason: string): Readonly<{ code: number; body: Record<string, string> }> {
  const messages: Record<string, string> = {
    canceled_by_employer: "Canceled by employer. Do not confirm: check whether the money arrived and send it back.",
    discount_already_used: "Discount already used. Ask the employer for the difference or reject.",
    amount_short: "The amount received is less than the total. Ask the employer for the difference or reject."
  };
  return {
    code: reason === "order_not_found" ? 404 : 409,
    body: { error: "RWOS_ORDER_" + reason.toUpperCase(), ...(messages[reason] ? { message: messages[reason] } : {}) }
  };
}
