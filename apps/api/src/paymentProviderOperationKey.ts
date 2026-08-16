import { createHash } from "node:crypto";
import type { PaymentOperation } from "@rwos/shared";

// Stage 2b.4-C3-D: derive the internal provider-operation key from DURABLE, NON-SECRET persisted fields.
// The discriminator is the C1 `provider_call_started` event id (employer_payment_events.id — a committed
// unique UUID), NOT the amount, so two same-amount partial refunds stay distinct while a replay of the
// same operation re-derives the identical key. The caller's raw idempotency key is deliberately excluded
// (it stays request-dedup only, persisted as a digest, never raw). execute() derives this at claim time;
// a later reconcile() reconstructs the same key purely from the persisted start event.
export function deriveProviderOperationKey(input: {
  startEventId: string;
  organizationId: string;
  paymentAttemptId: string;
  operation: PaymentOperation;
}): string {
  const digest = createHash("sha256")
    .update(`${input.startEventId}:${input.organizationId}:${input.paymentAttemptId}:${input.operation}`)
    .digest("hex");
  return `rwos_op_${digest}`;
}
