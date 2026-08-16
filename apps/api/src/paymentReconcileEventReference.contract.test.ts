import { describe, expect, it } from "vitest";

// Stage 2b.4-C3-C — CHARACTERIZATION ONLY of the PROPOSED deterministic reconcile event reference.
//
// Defined LOCALLY here — NOT wired into runtime, no schema, no reconcile implementation. Purpose: prove
// the idempotency/race properties the reconcile application path will rely on.
//
// A reconcile that finalizes an indeterminate operation writes a payment event whose provider event
// reference is derived DETERMINISTICALLY from the durable provider-operation identity (the C1
// provider_call_started.id). Because employer_payment_events has @@unique(organizationId,
// providerEventReference), a repeated reconcile hits a replay no-op; and because it is namespaced
// (`reconcile:`), it can never collide with a real webhook's provider event id — so webhook vs reconcile
// is resolved by the optimistic version guard, never by accidental reference dedup.
function reconcileEventReference(startEventId: string): string {
  return `reconcile:${startEventId}`;
}

// A real webhook's reference is the provider's own event id (a different namespace).
function webhookEventReference(providerEventId: string): string {
  return providerEventId;
}

describe("reconcile event-reference contract (Stage 2b.4-C3-C characterization)", () => {
  it("is deterministic — a repeated reconcile of the same operation yields the SAME reference (replay no-op)", () => {
    expect(reconcileEventReference("E-1")).toBe(reconcileEventReference("E-1"));
  });

  it("is unique per operation — distinct operations get distinct references", () => {
    expect(reconcileEventReference("E-1")).not.toBe(reconcileEventReference("E-2"));
  });

  it("is namespaced away from webhook references — reconcile and webhook never accidentally dedup each other", () => {
    // Even if a provider event id happened to equal a start-event id, the namespaces do not collide.
    expect(reconcileEventReference("evt_123")).not.toBe(webhookEventReference("evt_123"));
    expect(reconcileEventReference("E-1")).toMatch(/^reconcile:/);
  });
});
