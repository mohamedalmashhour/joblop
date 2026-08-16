import { createLocalFakePaymentProvider, PaymentProviderPreflightError, type PaymentProviderPort, type ProviderPaymentResult } from "@rwos/shared";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createPrismaPaymentRepository } from "./paymentRepository";

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
    create: vi.fn().mockResolvedValue({}),
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
