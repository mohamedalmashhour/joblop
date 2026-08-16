import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

// Stage 2b.4-C3-B — CHARACTERIZATION ONLY of the PROPOSED provider-operation-key contract.
//
// This function is defined LOCALLY here — it is NOT wired into runtime, adds no schema, and implements
// no reconcile/sweeper. Its sole purpose is to prove the contract's properties before C3 implementation.
//
// Contract: the internal provider idempotency key is derived deterministically from durable, non-secret
// PERSISTED fields and uniquely identifies ONE provider operation. The discriminator is the C1
// `provider_call_started` event id (employer_payment_events.id — a committed, unique UUID), NOT the
// amount. So two same-amount partial refunds stay distinct, while a replay of the same operation yields
// the same key. The caller's raw idempotency key is an API/request-dedup input only (persisted as a
// digest, never raw) and is deliberately NOT part of this internal key.
function proposedProviderOperationKey(input: {
  startEventId: string; // employer_payment_events.id of the provider_call_started event (durable PK)
  organizationId: string;
  paymentAttemptId: string;
  operation: "authorize" | "capture" | "void" | "refund";
}): string {
  const digest = createHash("sha256")
    .update(`${input.startEventId}:${input.organizationId}:${input.paymentAttemptId}:${input.operation}`)
    .digest("hex");
  return `rwos_op_${digest}`;
}

describe("provider-operation key contract (Stage 2b.4-C3-B characterization)", () => {
  const organizationId = "org-1";
  const paymentAttemptId = "attempt-1";

  it("distinct operations on one attempt get distinct keys (authorize/capture/void/refund)", () => {
    const keys = (["authorize", "capture", "void", "refund"] as const).map((operation) =>
      proposedProviderOperationKey({ startEventId: `E-${operation}`, organizationId, paymentAttemptId, operation })
    );
    expect(new Set(keys).size).toBe(4);
  });

  it("two partial refunds of the SAME amount are DIFFERENT operations → different keys (amount is NOT the discriminator)", () => {
    // Each execute() commits a fresh provider_call_started event with a new UUID, so the two $100
    // refunds carry distinct start-event ids and therefore distinct provider keys.
    const first = proposedProviderOperationKey({ startEventId: "E-refund-1", organizationId, paymentAttemptId, operation: "refund" });
    const second = proposedProviderOperationKey({ startEventId: "E-refund-2", organizationId, paymentAttemptId, operation: "refund" });
    expect(first).not.toBe(second);
  });

  it("replay of the SAME operation (same start-event id) yields the SAME key — reconcile re-derives it", () => {
    const derive = () => proposedProviderOperationKey({ startEventId: "E-refund-1", organizationId, paymentAttemptId, operation: "refund" });
    expect(derive()).toBe(derive()); // deterministic, re-derivable purely from persisted fields
  });

  it("keys are org- and attempt-scoped (no cross-tenant / cross-attempt collision)", () => {
    const base = { startEventId: "E-1", operation: "authorize" as const };
    const a = proposedProviderOperationKey({ ...base, organizationId: "org-A", paymentAttemptId: "att-1" });
    const b = proposedProviderOperationKey({ ...base, organizationId: "org-B", paymentAttemptId: "att-1" });
    const c = proposedProviderOperationKey({ ...base, organizationId: "org-A", paymentAttemptId: "att-2" });
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("the key is a stable, opaque, non-reversible hash (contains no raw operational data)", () => {
    const key = proposedProviderOperationKey({ startEventId: "E-1", organizationId, paymentAttemptId, operation: "authorize" });
    expect(key).toMatch(/^rwos_op_[a-f0-9]{64}$/);
  });
});
