import { createLocalFakePaymentProvider, PaymentProviderPreflightError, type PaymentProviderPort, type ProviderPaymentResult, type ProviderReconcileResult } from "@rwos/shared";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createPrismaPaymentRepository } from "./paymentRepository";
import { deriveProviderOperationKey } from "./paymentProviderOperationKey";

const organizationId = "00000000-0000-4000-8000-00000000000a";
const row = {
  id: "00000000-0000-4000-8000-000000000040",
  organizationId,
  assignmentId: "00000000-0000-4000-8000-000000000011",
  timesheetId: "00000000-0000-4000-8000-000000000010",
  invoiceId: "00000000-0000-4000-8000-000000000020",
  paymentMethodId: null,
  policyVersion: "synthetic-policy-v1",
  policyMode: "manual_collection",
  state: "pending",
  amountMinor: 10_500n,
  allocatedMinor: 0n,
  refundedMinor: 0n,
  currency: "CAD",
  authorizationReference: null,
  version: 1,
  requestDigest: ""
};

function setup(provider: PaymentProviderPort = createLocalFakePaymentProvider(), options?: { providerExecuteTimeoutMs?: number }) {
  const invoice = {
    findFirst: vi.fn().mockResolvedValue({
      id: row.invoiceId,
      organizationId,
      timesheetId: row.timesheetId,
      status: "issued",
      totalMinor: 10_500n
    })
  };
  const employerPaymentMethod = {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    updateMany: vi.fn()
  };
  const employerPaymentAttempt = {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn(),
    create: vi.fn().mockResolvedValue(row),
    updateMany: vi.fn().mockResolvedValue({ count: 1 })
  };
  const employerPaymentEvent = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: "start-event-id" }), // C3-D: execute captures the start-event id
    updateMany: vi.fn()
  };
  const employerPaymentAllocation = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn()
  };
  const employerPaymentRefund = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn()
  };
  const transaction = {
    invoice,
    employerPaymentMethod,
    employerPaymentAttempt,
    employerPaymentEvent,
    employerPaymentAllocation,
    employerPaymentRefund
  };
  return {
    repository: createPrismaPaymentRepository(
      {
        ...transaction,
        $transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) =>
          callback(transaction)
        )
      },
      provider,
      options
    ),
    employerPaymentMethod,
    employerPaymentAttempt,
    employerPaymentEvent,
    employerPaymentAllocation,
    employerPaymentRefund,
    invoice
  };
}

describe("durable payment repository", () => {
  it("creates an organization-scoped attempt with a versioned policy snapshot", async () => {
    const target = setup();
    const payment = await target.repository.createAttempt({
      id: row.id,
      organizationId,
      assignmentId: row.assignmentId,
      timesheetId: row.timesheetId,
      invoiceId: row.invoiceId,
      paymentMethodId: null,
      policyVersion: row.policyVersion,
      policyMode: "manual_collection",
      amountMinor: 10_500,
      idempotencyKey: "synthetic-create-payment"
    });
    expect(payment.policyMode).toBe("manual_collection");
    expect(target.employerPaymentAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        policyVersion: row.policyVersion,
        policyMode: "manual_collection",
        amountMinor: 10_500n
      })
    });
    expect(target.employerPaymentEvent.create).toHaveBeenCalledTimes(1);
    expect(target.invoice.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: row.invoiceId,
        organizationId,
        timesheetId: row.timesheetId
      })
    });
  });

  it("rejects raw card-shaped values in payment method references", async () => {
    const target = setup();
    await expect(
      target.repository.registerMethod({
        id: "method-a",
        organizationId,
        provider: "local_fake",
        methodKind: "mastercard",
        providerCustomerReference: "customer-a",
        providerMethodReference: "5555 5555 5555 4444",
        displayAlias: "Mastercard test",
        reusable: true
      })
    ).rejects.toThrow("raw payment data");
    expect(target.employerPaymentMethod.create).not.toHaveBeenCalled();
  });

  it("returns null rather than leaking an attempt from another organization", async () => {
    const target = setup();
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(null);
    await expect(target.repository.get(row.id, "00000000-0000-4000-8000-00000000000b"))
      .resolves.toBeNull();
    expect(target.employerPaymentAttempt.findFirst).toHaveBeenCalledWith({
      where: {
        id: row.id,
        organizationId: "00000000-0000-4000-8000-00000000000b"
      }
    });
  });

  it("persists a signed provider success once with allocation and optimistic versioning", async () => {
    const target = setup();
    target.employerPaymentAttempt.findFirst
      .mockResolvedValueOnce({ ...row, state: "processing", version: 2 })
      .mockResolvedValueOnce({
        ...row,
        state: "succeeded",
        allocatedMinor: row.amountMinor,
        version: 3
      });
    const result = await target.repository.processProviderEvent({
      eventId: "evt_synthetic_success",
      paymentId: row.id,
      organizationId,
      expectedVersion: 2,
      amountMinor: 10_500,
      newState: "succeeded",
      payloadDigest: "a".repeat(64),
      occurredAt: new Date("2026-07-30T12:30:00.000Z")
    });
    expect(result.state).toBe("succeeded");
    expect(target.employerPaymentAttempt.updateMany).toHaveBeenCalledWith({
      where: {
        id: row.id,
        organizationId,
        version: 2,
        state: "processing"
      },
      data: {
        state: "succeeded",
        version: { increment: 1 },
        allocatedMinor: row.amountMinor
      }
    });
  });
});

// Stage 2b.4-C2 — bounded provider execution + failure classification (on the C1 atomic claim/start
// event). A provable non-execution fails safely (`failed`); a timeout or any other throw is INDETERMINATE
// (outcome "unknown" → stays `processing`) and is NEVER auto-re-executed. success/decline are unchanged.
describe("payment execute() bounded execution + failure classification (Stage 2b.4-C2)", () => {
  const pending = { ...row, state: "pending", version: 1 };
  const processingV2 = { ...row, state: "processing", version: 2 };
  const failedV2 = { ...row, state: "failed", version: 2 };
  const authorizedV2 = { ...row, state: "authorized", version: 2, authorizationReference: "op-ref" };
  const execInput = {
    paymentId: row.id, organizationId, operation: "authorize" as const,
    amountMinor: 10_500, expectedVersion: 1, idempotencyKey: "exec-key", scenario: "success" as const
  };
  const accepted: PaymentProviderPort = {
    id: "local_fake",
    async execute(): Promise<ProviderPaymentResult> {
      return { provider: "local_fake", providerOperationReference: "op-ref", outcome: "accepted", reason: "none", webhookExpected: false };
    }
  };
  const declined: PaymentProviderPort = {
    id: "local_fake",
    async execute(): Promise<ProviderPaymentResult> {
      return { provider: "local_fake", providerOperationReference: "op-ref", outcome: "declined", reason: "decline", webhookExpected: false };
    }
  };
  const genericThrow: PaymentProviderPort = { id: "local_fake", async execute() { throw new Error("network transport failure"); } };
  const hanging: PaymentProviderPort = { id: "local_fake", execute: () => new Promise<ProviderPaymentResult>(() => undefined) };
  const preflight: PaymentProviderPort = {
    id: "local_fake",
    async execute() { throw new PaymentProviderPreflightError("request rejected before any charge", "decline"); }
  };
  const eventsOf = (t: ReturnType<typeof setup>) => t.employerPaymentEvent.create.mock.calls.map((c) => (c[0] as { data: Record<string, unknown> }).data);
  const startEventOf = (t: ReturnType<typeof setup>) => eventsOf(t).find((d) => d.eventType === "provider_call_started");
  const finalizeEventOf = (t: ReturnType<typeof setup>) => eventsOf(t).find((d) => d.eventType !== "provider_call_started");

  it("[C2] generic provider THROW → INDETERMINATE: attempt stays `processing`, start+finalize events, no allocation, execute does NOT reject", async () => {
    const target = setup(genericThrow);
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce(processingV2);
    const result = await target.repository.execute(execInput);
    expect(result.state).toBe("processing"); // never a definitive failure
    expect(target.employerPaymentEvent.create).toHaveBeenCalledTimes(2); // start + finalize (no longer event-less)
    expect(finalizeEventOf(target)?.safeReasonCode).toBe("unknown_outcome");
    expect(target.employerPaymentAllocation.create).not.toHaveBeenCalled();
  });

  it("[C2] provable non-execution (PaymentProviderPreflightError) → SAFE FAIL: state `failed`", async () => {
    const target = setup(preflight);
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce(failedV2);
    const result = await target.repository.execute(execInput);
    expect(result.state).toBe("failed"); // proven not executed → safe to fail
    expect(finalizeEventOf(target)?.safeReasonCode).toBe("decline");
    expect(target.employerPaymentAllocation.create).not.toHaveBeenCalled();
  });

  it("[C2] TIMEOUT → INDETERMINATE: state `processing`, finalize reason `timeout`", async () => {
    const target = setup(hanging, { providerExecuteTimeoutMs: 20 });
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce(processingV2);
    const result = await target.repository.execute(execInput);
    expect(result.state).toBe("processing"); // hung call cannot prove non-execution
    expect(finalizeEventOf(target)?.safeReasonCode).toBe("timeout");
  });

  it("[C2] provider DECLINE result → state `failed` (unchanged)", async () => {
    const target = setup(declined);
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce(failedV2);
    expect((await target.repository.execute(execInput)).state).toBe("failed");
  });

  it("[C2] provider SUCCESS (accepted) → state `authorized` (unchanged)", async () => {
    const target = setup(accepted);
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce(authorizedV2);
    expect((await target.repository.execute(execInput)).state).toBe("authorized");
  });

  it("[C2] the C1 start event still carries operation/amount/CAD/provider/key-digest and never the raw key", async () => {
    const target = setup(accepted);
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce(authorizedV2);
    await target.repository.execute(execInput);
    const start = startEventOf(target);
    expect(start).toMatchObject({
      paymentAttemptId: row.id, priorState: "pending", newState: "processing",
      operation: "authorize", operationAmountMinor: 10_500n, operationCurrency: "CAD",
      provider: "local_fake", idempotencyKeyDigest: createHash("sha256").update("exec-key").digest("hex")
    });
    expect(JSON.stringify(start, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).not.toContain("exec-key");
  });

  it("[C2] partial refund → the start event records the REQUESTED partial amount", async () => {
    const target = setup(genericThrow);
    target.employerPaymentAttempt.findFirst
      .mockResolvedValueOnce({ ...row, state: "succeeded", version: 1, allocatedMinor: 10_500n, refundedMinor: 0n })
      .mockResolvedValueOnce({ ...row, state: "processing", version: 2 });
    await target.repository.execute({ ...execInput, operation: "refund", amountMinor: 4_000 });
    expect(startEventOf(target)).toMatchObject({ operation: "refund", operationAmountMinor: 4_000n });
  });

  it("[C2] claim/version conflict → NO start event and NO provider call", async () => {
    const providerCalls = vi.fn();
    const spy: PaymentProviderPort = { id: "local_fake", async execute() { providerCalls(); return { provider: "local_fake", providerOperationReference: "", outcome: "accepted", reason: "none", webhookExpected: false }; } };
    const target = setup(spy);
    target.employerPaymentAttempt.findFirst.mockResolvedValue(pending);
    target.employerPaymentAttempt.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(target.repository.execute(execInput)).rejects.toThrow();
    expect(target.employerPaymentEvent.create).not.toHaveBeenCalled();
    expect(providerCalls).not.toHaveBeenCalled();
  });

  it("[C2] start-event write failure → execute rejects and claim+event were co-transactional (Postgres rolls back)", async () => {
    const target = setup(accepted);
    target.employerPaymentAttempt.findFirst.mockResolvedValue(pending);
    target.employerPaymentEvent.create.mockRejectedValueOnce(new Error("event write failed"));
    await expect(target.repository.execute(execInput)).rejects.toThrow("event write failed");
  });

  it("[C2] NO-DOUBLE-CHARGE INVARIANT: an indeterminate attempt stays `processing`; a retry is blocked → provider called once", async () => {
    const providerCalls = vi.fn();
    const throwSpy: PaymentProviderPort = { id: "local_fake", async execute() { providerCalls(); throw new Error("network transport failure"); } };
    const target = setup(throwSpy);
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce(processingV2);

    // First execute → INDETERMINATE (resolves `processing`, does not reject), provider called once.
    expect((await target.repository.execute(execInput)).state).toBe("processing");
    expect(providerCalls).toHaveBeenCalledTimes(1);

    // Retry sees `processing`; assertOperationState rejects it BEFORE the provider call → no second charge.
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(processingV2);
    await expect(target.repository.execute({ ...execInput, expectedVersion: 2 })).rejects.toThrow();
    expect(providerCalls).toHaveBeenCalledTimes(1);
  });
});

// Stage 2b.4-C3-D — execute() and reconcile() derive the SAME provider-operation key; local_fake reconcile
// is a read-only lookup (never authorize/capture/refund/charge). No application-level finalize here (C3-E).
describe("payment execute() ↔ reconcile provider-operation key (Stage 2b.4-C3-D)", () => {
  // Opaque, letter-bearing ids — the mock's all-digit UUIDs would trip the provider's card-number
  // opaqueness heuristic (a 13–19 digit run). Real org/payment ids are UUIDs (with a–f), so this reflects
  // production and lets the real local_fake accept the request.
  const orgOp = "org-op-a1";
  const payId = "pay-op-authorize-a1";
  const rowP = { ...row, id: payId, organizationId: orgOp };
  const pending = { ...rowP, state: "pending", version: 1 };
  const authorizedV2 = { ...rowP, state: "authorized", version: 2, authorizationReference: "op-ref" };
  const execInput = {
    paymentId: payId, organizationId: orgOp, operation: "authorize" as const,
    amountMinor: 10_500, expectedVersion: 1, idempotencyKey: "exec-key", scenario: "success" as const
  };

  it("execute() stores the operation under the key reconcile() reconstructs from the persisted start-event id", async () => {
    const lf = createLocalFakePaymentProvider();
    const target = setup(lf);
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce(authorizedV2);
    await target.repository.execute(execInput); // start event id "start-event-id" → key derived + threaded

    const query = (providerOperationKey: string) => ({
      providerOperationKey, paymentId: payId, organizationId: orgOp, operation: "authorize" as const, amountMinor: 10_500, providerOperationReference: null
    });
    // Reconstruct the key exactly as a later reconcile would — from persisted fields only.
    const key = deriveProviderOperationKey({ startEventId: "start-event-id", organizationId: orgOp, paymentAttemptId: payId, operation: "authorize" });
    const reconciled = await lf.reconcile!(query(key));
    expect(reconciled).toMatchObject({ provider: "local_fake", outcome: "accepted" }); // FOUND under the same key

    // A different operation (different start-event id) → not found → distinct key.
    const otherKey = deriveProviderOperationKey({ startEventId: "other-event", organizationId: orgOp, paymentAttemptId: payId, operation: "authorize" });
    expect((await lf.reconcile!(query(otherKey))).outcome).toBe("not_found");
  });
});

// Stage 2b.4-C3-E — application-level reconcile FINALIZE. Reconcile queries the provider (never
// execute/charge) and applies a VERIFIED result to an indeterminate (`processing`) attempt via the
// nextState-driven finalize, with a deterministic reconcile event reference + version/state guard.
describe("payment reconcile() application finalize (Stage 2b.4-C3-E)", () => {
  const startEvent = (operation: string, amt: bigint) => ({ id: `E-${operation}`, operation, operationAmountMinor: amt });
  const rec = (over: Partial<ProviderReconcileResult>): ProviderReconcileResult =>
    ({ provider: "local_fake", outcome: "accepted", providerOperationReference: "op-ref", reason: "none", ...over });

  function harness(o: {
    attempt: Record<string, unknown>;
    startEvent?: Record<string, unknown>;
    finalAttempt?: Record<string, unknown>;
    reconcileResult?: ProviderReconcileResult;
    priorEvent?: Record<string, unknown> | null;
    updateCount?: number;
    hasReconcile?: boolean;
    providerId?: string;
  }) {
    const providerId = o.providerId ?? "local_fake";
    const executeSpy = vi.fn(async () => { throw new Error("execute must NOT be called during reconcile"); });
    const reconcileSpy = vi.fn(async () => o.reconcileResult as ProviderReconcileResult);
    const provider = (o.hasReconcile === false
      ? { id: providerId, execute: executeSpy }
      : { id: providerId, execute: executeSpy, reconcile: reconcileSpy }) as unknown as PaymentProviderPort;
    const target = setup(provider);
    target.employerPaymentAttempt.findFirst.mockReset();
    target.employerPaymentAttempt.findFirst
      .mockResolvedValueOnce(o.attempt)                 // get()
      .mockResolvedValue(o.finalAttempt ?? o.attempt);  // final / race / prior reads
    target.employerPaymentAttempt.updateMany.mockResolvedValue({ count: o.updateCount ?? 1 });
    target.employerPaymentEvent.findFirst.mockImplementation(async (args: unknown) => {
      const where = (args as { where: { eventType?: string; providerEventReference?: string } }).where;
      if (where?.eventType === "provider_call_started") return o.startEvent ?? null;
      if (where?.providerEventReference) return o.priorEvent ?? null;
      return null;
    });
    return { target, executeSpy, reconcileSpy };
  }
  const processing = (over: Record<string, unknown> = {}) => ({ ...row, state: "processing", version: 2, ...over });

  it("[1] indeterminate authorize → reconcile accepted → authorized", async () => {
    const h = harness({ attempt: processing(), startEvent: startEvent("authorize", 10_500n), reconcileResult: rec({}), finalAttempt: processing({ state: "authorized", version: 3 }) });
    expect((await h.target.repository.reconcile({ paymentId: row.id, organizationId })).state).toBe("authorized");
    expect(h.target.employerPaymentAllocation.create).not.toHaveBeenCalled();
  });

  it("[2] indeterminate capture → reconcile accepted → succeeded + exactly one allocation", async () => {
    const h = harness({ attempt: processing({ state: "processing", allocatedMinor: 0n }), startEvent: startEvent("capture", 10_500n), reconcileResult: rec({}), finalAttempt: processing({ state: "succeeded", version: 3, allocatedMinor: 10_500n }) });
    const result = await h.target.repository.reconcile({ paymentId: row.id, organizationId });
    expect(result.state).toBe("succeeded");
    expect(h.target.employerPaymentAllocation.create).toHaveBeenCalledTimes(1);
    expect(h.target.employerPaymentAllocation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountMinor: 10_500n, currency: "CAD" }) }));
  });

  it("[3] indeterminate PARTIAL refund → reconcile accepted → partially_refunded + exactly one refund row of the partial amount", async () => {
    const h = harness({ attempt: processing({ allocatedMinor: 10_500n, refundedMinor: 0n }), startEvent: startEvent("refund", 4_000n), reconcileResult: rec({}), finalAttempt: processing({ state: "partially_refunded", version: 3, allocatedMinor: 10_500n, refundedMinor: 4_000n }) });
    const result = await h.target.repository.reconcile({ paymentId: row.id, organizationId });
    expect(result.state).toBe("partially_refunded");
    expect(h.target.employerPaymentRefund.create).toHaveBeenCalledTimes(1);
    expect(h.target.employerPaymentRefund.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountMinor: 4_000n }) }));
    expect(h.target.employerPaymentAllocation.create).not.toHaveBeenCalled();
  });

  it("[4] not_found → failed, zero allocation/refund", async () => {
    const h = harness({ attempt: processing(), startEvent: startEvent("capture", 10_500n), reconcileResult: rec({ outcome: "not_found", providerOperationReference: null }), finalAttempt: processing({ state: "failed", version: 3 }) });
    expect((await h.target.repository.reconcile({ paymentId: row.id, organizationId })).state).toBe("failed");
    expect(h.target.employerPaymentAllocation.create).not.toHaveBeenCalled();
    expect(h.target.employerPaymentRefund.create).not.toHaveBeenCalled();
  });

  it("[5] unknown → stays processing, zero money-record writes (no terminalization)", async () => {
    const h = harness({ attempt: processing(), startEvent: startEvent("authorize", 10_500n), reconcileResult: rec({ outcome: "unknown", providerOperationReference: null }) });
    expect((await h.target.repository.reconcile({ paymentId: row.id, organizationId })).state).toBe("processing");
    expect(h.target.employerPaymentAttempt.updateMany).not.toHaveBeenCalled();
    expect(h.target.employerPaymentEvent.create).not.toHaveBeenCalled();
    expect(h.target.employerPaymentAllocation.create).not.toHaveBeenCalled();
    expect(h.target.employerPaymentRefund.create).not.toHaveBeenCalled();
  });

  it("[6] repeated reconcile (already-terminal on the 2nd call) → no duplicate state/event/allocation/refund", async () => {
    const h = harness({ attempt: processing({ state: "succeeded", version: 3 }), startEvent: startEvent("capture", 10_500n), reconcileResult: rec({}) });
    // The attempt is already terminal (a prior reconcile/webhook resolved it) → no-op.
    const result = await h.target.repository.reconcile({ paymentId: row.id, organizationId });
    expect(result.state).toBe("succeeded");
    expect(h.target.employerPaymentAttempt.updateMany).not.toHaveBeenCalled();
    expect(h.target.employerPaymentEvent.create).not.toHaveBeenCalled();
    expect(h.target.employerPaymentAllocation.create).not.toHaveBeenCalled();
  });

  it("[7] webhook wins the race → reconcile is a no-op/conflict (updateMany count 0)", async () => {
    const h = harness({ attempt: processing(), startEvent: startEvent("capture", 10_500n), reconcileResult: rec({}), updateCount: 0, finalAttempt: processing({ state: "succeeded", version: 3, allocatedMinor: 10_500n }) });
    const result = await h.target.repository.reconcile({ paymentId: row.id, organizationId });
    expect(result.state).toBe("succeeded"); // the webhook's state stands
    expect(h.target.employerPaymentAllocation.create).not.toHaveBeenCalled(); // reconcile did not double-apply
  });

  it("[8] reconcile wins the race; a later webhook cannot double-apply (version guard on processProviderEvent)", async () => {
    // reconcile finalizes to succeeded @v3.
    const h = harness({ attempt: processing(), startEvent: startEvent("capture", 10_500n), reconcileResult: rec({}), finalAttempt: processing({ state: "succeeded", version: 3, allocatedMinor: 10_500n }) });
    await h.target.repository.reconcile({ paymentId: row.id, organizationId });
    // A stale webhook (expectedVersion 2) now arrives: processProviderEvent's version guard rejects it.
    h.target.employerPaymentAttempt.findFirst.mockReset();
    h.target.employerPaymentAttempt.findFirst.mockResolvedValue({ ...row, state: "succeeded", version: 3 });
    h.target.employerPaymentEvent.findFirst.mockResolvedValue(null);
    await expect(h.target.repository.processProviderEvent({ eventId: "evt_late", paymentId: row.id, organizationId, expectedVersion: 2, amountMinor: 10_500, newState: "succeeded", payloadDigest: "a".repeat(64), occurredAt: new Date() })).rejects.toThrow(/version/);
  });

  it("[9] wrong tenant / wrong payment → fail closed, no writes", async () => {
    const h = harness({ attempt: processing(), startEvent: startEvent("authorize", 10_500n), reconcileResult: rec({}) });
    h.target.employerPaymentAttempt.findFirst.mockReset();
    h.target.employerPaymentAttempt.findFirst.mockResolvedValue(null); // not found for this org
    await expect(h.target.repository.reconcile({ paymentId: row.id, organizationId: "00000000-0000-4000-8000-00000000000b" })).rejects.toThrow();
    expect(h.reconcileSpy).not.toHaveBeenCalled();
    expect(h.target.employerPaymentAttempt.updateMany).not.toHaveBeenCalled();
  });

  it("[10] provider WITHOUT reconcile() → fail closed, no writes, provider.execute never called", async () => {
    const h = harness({ attempt: processing(), startEvent: startEvent("authorize", 10_500n), hasReconcile: false });
    await expect(h.target.repository.reconcile({ paymentId: row.id, organizationId })).rejects.toThrow(/does not support reconciliation/);
    expect(h.executeSpy).not.toHaveBeenCalled();
    expect(h.target.employerPaymentAttempt.updateMany).not.toHaveBeenCalled();
    expect(h.target.employerPaymentEvent.create).not.toHaveBeenCalled();
  });

  it("[11] reconcile NEVER invokes provider execute (authorize/capture/refund/void)", async () => {
    const h = harness({ attempt: processing(), startEvent: startEvent("capture", 10_500n), reconcileResult: rec({}), finalAttempt: processing({ state: "succeeded", version: 3, allocatedMinor: 10_500n }) });
    await h.target.repository.reconcile({ paymentId: row.id, organizationId });
    expect(h.executeSpy).not.toHaveBeenCalled(); // query-only: no money movement
    expect(h.reconcileSpy).toHaveBeenCalledTimes(1);
  });

  // ── Stage 2b.4-C3-G-c3: provider-specific `not_found` policy wired into runtime reconcile() ──
  const recStripe = (over: Partial<ProviderReconcileResult>): ProviderReconcileResult =>
    ({ provider: "stripe_test", outcome: "accepted", providerOperationReference: "op-ref", reason: "none", ...over });

  it("[gc3-1] local_fake + not_found STILL terminalizes to failed (authoritative absence preserved)", async () => {
    const h = harness({ providerId: "local_fake", attempt: processing(), startEvent: startEvent("capture", 10_500n), reconcileResult: rec({ outcome: "not_found", providerOperationReference: null }), finalAttempt: processing({ state: "failed", version: 3 }) });
    expect((await h.target.repository.reconcile({ paymentId: row.id, organizationId })).state).toBe("failed");
  });

  it("[gc3-2] stripe + not_found + NO durable reference → stays processing + manual signal, never failed", async () => {
    const h = harness({ providerId: "stripe_test", attempt: processing({ authorizationReference: null }), startEvent: startEvent("authorize", 10_500n), reconcileResult: recStripe({ outcome: "not_found", providerOperationReference: null }) });
    const result = await h.target.repository.reconcile({ paymentId: row.id, organizationId });
    expect(result.state).toBe("processing"); // NOT failed
    expect(h.target.employerPaymentAttempt.updateMany).not.toHaveBeenCalled(); // no terminalization
    expect(h.target.employerPaymentAllocation.create).not.toHaveBeenCalled();
    expect(h.target.employerPaymentRefund.create).not.toHaveBeenCalled();
    // Observable, non-sensitive manual/webhook signal recorded once.
    expect(h.target.employerPaymentEvent.create).toHaveBeenCalledTimes(1);
    const data = h.target.employerPaymentEvent.create.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.eventType).toBe("reconcile_manual_required");
    expect(data.newState).toBe("processing");
    expect(data.safeReasonCode).toBe("manual_or_webhook_required");
    expect(data.providerEventReference).toBe("reconcile-manual:E-authorize");
    expect(h.executeSpy).not.toHaveBeenCalled(); // query-only
  });

  it("[gc3-3] stripe + not_found + durable reference (ambiguous 404) → stays processing, never failed, no manual duplicate", async () => {
    const h = harness({ providerId: "stripe_test", attempt: processing({ authorizationReference: "auth-ref-x" }), startEvent: startEvent("capture", 10_500n), reconcileResult: recStripe({ outcome: "not_found", providerOperationReference: "auth-ref-x" }) });
    const result = await h.target.repository.reconcile({ paymentId: row.id, organizationId });
    expect(result.state).toBe("processing"); // NOT failed
    expect(h.target.employerPaymentAttempt.updateMany).not.toHaveBeenCalled();
    expect(h.target.employerPaymentEvent.create).not.toHaveBeenCalled(); // remain_processing, no manual event
  });

  it("[gc3-4] unknown/new provider fails closed: not_found never terminalizes", async () => {
    // providerId (the PORT id) is the unknown/new provider; the result's `provider` label is cosmetic
    // and not read by the disposition (which keys off provider.id via reconcilePolicyFor).
    const noRef = harness({ providerId: "acme_unknown", attempt: processing({ authorizationReference: null }), startEvent: startEvent("authorize", 10_500n), reconcileResult: { provider: "stripe_test", outcome: "not_found", providerOperationReference: null, reason: "none" } as ProviderReconcileResult });
    expect((await noRef.target.repository.reconcile({ paymentId: row.id, organizationId })).state).toBe("processing");
    expect(noRef.target.employerPaymentAttempt.updateMany).not.toHaveBeenCalled(); // never failed
    expect(noRef.target.employerPaymentEvent.create).toHaveBeenCalledTimes(1); // manual signal (no durable ref)
  });

  it("[gc3-5] stripe ambiguous/indeterminate outcomes stay processing (unknown + authentication_required)", async () => {
    for (const outcome of ["unknown", "authentication_required"] as const) {
      const h = harness({ providerId: "stripe_test", attempt: processing(), startEvent: startEvent("authorize", 10_500n), reconcileResult: recStripe({ outcome, providerOperationReference: null }) });
      expect((await h.target.repository.reconcile({ paymentId: row.id, organizationId })).state).toBe("processing");
      expect(h.target.employerPaymentAttempt.updateMany).not.toHaveBeenCalled();
      expect(h.target.employerPaymentEvent.create).not.toHaveBeenCalled(); // indeterminate ≠ manual-required
    }
  });

  it("[gc3-6] authoritative accepted/declined STILL terminalize for stripe (positive signals)", async () => {
    const acc = harness({ providerId: "stripe_test", attempt: processing({ authorizationReference: "auth-ref-x" }), startEvent: startEvent("authorize", 10_500n), reconcileResult: recStripe({ outcome: "accepted" }), finalAttempt: processing({ state: "authorized", version: 3 }) });
    expect((await acc.target.repository.reconcile({ paymentId: row.id, organizationId })).state).toBe("authorized");
    expect(acc.target.employerPaymentAttempt.updateMany).toHaveBeenCalledTimes(1);

    const dec = harness({ providerId: "stripe_test", attempt: processing({ authorizationReference: "auth-ref-x" }), startEvent: startEvent("capture", 10_500n), reconcileResult: recStripe({ outcome: "declined" }), finalAttempt: processing({ state: "failed", version: 3 }) });
    expect((await dec.target.repository.reconcile({ paymentId: row.id, organizationId })).state).toBe("failed");
  });

  it("[gc3-10] the manual signal carries NO provider error / PAN / secret / raw idempotency data", async () => {
    const h = harness({ providerId: "stripe_test", attempt: processing({ authorizationReference: null }), startEvent: startEvent("authorize", 10_500n), reconcileResult: recStripe({ outcome: "not_found", providerOperationReference: null, reason: "unknown_outcome" }) });
    await h.target.repository.reconcile({ paymentId: row.id, organizationId });
    const serialized = JSON.stringify(h.target.employerPaymentEvent.create.mock.calls[0]![0].data);
    expect(serialized).not.toMatch(/sk_(test|live)|pan|4111|idempotency|secret|op-ref/i);
    expect(serialized).toContain("manual_or_webhook_required"); // only the safe classification
  });
});
