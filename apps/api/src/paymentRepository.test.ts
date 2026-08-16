import { createLocalFakePaymentProvider, type PaymentProviderPort, type ProviderPaymentResult } from "@rwos/shared";
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

function setup(provider: PaymentProviderPort = createLocalFakePaymentProvider()) {
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
      provider
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

// Stage 2b.4-C1 — the `processing` claim and its `provider_call_started` audit event now commit in ONE
// transaction (no event-less strand). The event records the exact in-flight operation for later
// deterministic reconciliation. Audit/reconciliation record only — no change to amounts, state rules,
// provider execution, retry, or idempotency semantics.
describe("payment execute() atomic claim + provider_call_started (Stage 2b.4-C1)", () => {
  const pending = { ...row, state: "pending", version: 1 };
  const execInput = {
    paymentId: row.id,
    organizationId,
    operation: "authorize" as const,
    amountMinor: 10_500,
    expectedVersion: 1,
    idempotencyKey: "exec-key",
    scenario: "success" as const
  };
  const throwing: PaymentProviderPort = { id: "local_fake", async execute() { throw new Error("network transport failure"); } };
  const startEventOf = (target: ReturnType<typeof setup>) =>
    target.employerPaymentEvent.create.mock.calls
      .map((c) => (c[0] as { data: Record<string, unknown> }).data)
      .find((d) => d.eventType === "provider_call_started");

  it("[C1 #1/#4/#6/#7] claim + start event commit together; the event carries operation, amount, CAD currency, provider, and the KEY DIGEST (never the raw key)", async () => {
    const target = setup(throwing); // throwing → we observe exactly the start event, then the provider fails
    target.employerPaymentAttempt.findFirst.mockResolvedValue(pending);
    await expect(target.repository.execute(execInput)).rejects.toThrow();

    const start = startEventOf(target);
    expect(start).toBeDefined();
    expect(start).toMatchObject({
      paymentAttemptId: row.id,
      priorState: "pending",
      newState: "processing",
      operation: "authorize",
      operationAmountMinor: 10_500n,
      operationCurrency: "CAD",
      provider: "local_fake",
      idempotencyKeyDigest: createHash("sha256").update("exec-key").digest("hex")
    });
    // The raw idempotency key is NEVER persisted (only its digest).
    expect(JSON.stringify(start, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).not.toContain("exec-key");
    // The claim was committed (state → processing) in the same step as the start event.
    expect(target.employerPaymentAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: "processing", version: { increment: 1 } }) })
    );
  });

  it("[C1 #5] operation amount is the REQUESTED in-flight amount, including a PARTIAL refund", async () => {
    const target = setup(throwing);
    target.employerPaymentAttempt.findFirst.mockResolvedValue({ ...row, state: "succeeded", version: 1, allocatedMinor: 10_500n, refundedMinor: 0n });
    await expect(
      target.repository.execute({ ...execInput, operation: "refund", amountMinor: 4_000 })
    ).rejects.toThrow();
    expect(startEventOf(target)).toMatchObject({ operation: "refund", operationAmountMinor: 4_000n }); // partial, not the full 10_500
  });

  it("[C1 #2] a claim/version conflict writes NO start event", async () => {
    const target = setup(throwing);
    target.employerPaymentAttempt.findFirst.mockResolvedValue(pending);
    target.employerPaymentAttempt.updateMany.mockResolvedValueOnce({ count: 0 }); // lost the optimistic claim
    await expect(target.repository.execute(execInput)).rejects.toThrow();
    expect(target.employerPaymentEvent.create).not.toHaveBeenCalled(); // throw happens before the event write
  });

  it("[C1 #3] if the start-event write fails, execute() rejects and claim+event were co-transactional (Postgres rolls back the claim)", async () => {
    const target = setup(throwing);
    target.employerPaymentAttempt.findFirst.mockResolvedValue(pending);
    target.employerPaymentEvent.create.mockRejectedValueOnce(new Error("event write failed"));
    await expect(target.repository.execute(execInput)).rejects.toThrow("event write failed");
    // Both the claim and the failing start event ran inside the SAME $transaction callback, so a real
    // Postgres transaction rolls the claim back together with the event — no committed `processing`.
    expect(target.employerPaymentEvent.create).toHaveBeenCalledTimes(1);
  });

  it("[C1 characterization] provider THROW → attempt is `processing` WITH a start event (no longer event-less), no finalize/allocation", async () => {
    const target = setup(throwing);
    target.employerPaymentAttempt.findFirst.mockResolvedValue(pending);
    await expect(target.repository.execute(execInput)).rejects.toThrow();
    expect(target.employerPaymentEvent.create).toHaveBeenCalledTimes(1); // the start event exists (auditable)
    expect(startEventOf(target)?.eventType).toBe("provider_call_started");
    expect(target.employerPaymentAllocation.create).not.toHaveBeenCalled();
  });

  it("[C1 #8] provider UNKNOWN → start event + finalize event; attempt lands in `processing` (behavior unchanged)", async () => {
    const unknown: PaymentProviderPort = {
      id: "local_fake",
      async execute(): Promise<ProviderPaymentResult> {
        return { provider: "local_fake", providerOperationReference: "op-ref-unknown", outcome: "unknown", reason: "none", webhookExpected: true };
      }
    };
    const target = setup(unknown);
    target.employerPaymentAttempt.findFirst
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({ ...row, state: "processing", version: 2 });
    const result = await target.repository.execute(execInput);
    expect(result.state).toBe("processing");
    expect(target.employerPaymentEvent.create).toHaveBeenCalledTimes(2); // start + finalize
    expect(target.employerPaymentAllocation.create).not.toHaveBeenCalled();
  });

  it("[C1 #8] SAFETY INVARIANT preserved: a stranded `processing` attempt cannot be re-executed → no second provider charge", async () => {
    const providerCalls = vi.fn();
    const throwSpy: PaymentProviderPort = { id: "local_fake", async execute() { providerCalls(); throw new Error("network transport failure"); } };
    const target = setup(throwSpy);
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending);
    await expect(target.repository.execute(execInput)).rejects.toThrow();
    expect(providerCalls).toHaveBeenCalledTimes(1);

    // Retry sees `processing` (version 2); assertOperationState rejects it before the provider call.
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce({ ...row, state: "processing", version: 2 });
    await expect(target.repository.execute({ ...execInput, expectedVersion: 2 })).rejects.toThrow();
    expect(providerCalls).toHaveBeenCalledTimes(1); // provider was NOT charged a second time
  });
});
