import { createLocalFakePaymentProvider, type PaymentProviderPort, type ProviderPaymentResult } from "@rwos/shared";
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

// Stage 2b.4-B — READ-ONLY characterization of the payment-attempt `processing` stranding seam.
// These prove existing behavior only; no runtime change. execute() claims the attempt to `processing`
// (a committed write) BEFORE calling the provider, then finalizes in a separate transaction.
describe("payment execute() resilience characterization (Stage 2b.4-B, read-only)", () => {
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

  it("provider THROW after the claim → attempt is left in `processing` with NO finalize event (event-less strand)", async () => {
    const throwing: PaymentProviderPort = { async execute() { throw new Error("network transport failure"); } };
    const target = setup(throwing);
    target.employerPaymentAttempt.findFirst.mockResolvedValue(pending);

    await expect(target.repository.execute(execInput)).rejects.toThrow();
    // The claim to `processing` (version+1) is committed BEFORE the provider call...
    expect(target.employerPaymentAttempt.updateMany).toHaveBeenCalledTimes(1);
    expect(target.employerPaymentAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: "processing", version: { increment: 1 } }) })
    );
    // ...but the finalize transaction never runs → no event, no allocation. The row is stranded.
    expect(target.employerPaymentEvent.create).not.toHaveBeenCalled();
    expect(target.employerPaymentAllocation.create).not.toHaveBeenCalled();
  });

  it("provider UNKNOWN result → attempt lands in `processing` WITH a finalize event (designed indeterminate path)", async () => {
    const unknown: PaymentProviderPort = {
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
    // Claim + finalize both run; a finalize event IS recorded (unlike the throw path) — recoverable via webhook.
    expect(target.employerPaymentAttempt.updateMany).toHaveBeenCalledTimes(2);
    expect(target.employerPaymentEvent.create).toHaveBeenCalledTimes(1);
    expect(target.employerPaymentAllocation.create).not.toHaveBeenCalled();
  });

  it("SAFETY INVARIANT: a stranded `processing` attempt cannot be re-executed → no second provider charge", async () => {
    const providerCalls = vi.fn();
    const throwing: PaymentProviderPort = { async execute() { providerCalls(); throw new Error("network transport failure"); } };
    const target = setup(throwing);

    // First execute strands the attempt (provider throws after the `processing` claim).
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce(pending);
    await expect(target.repository.execute(execInput)).rejects.toThrow();
    expect(providerCalls).toHaveBeenCalledTimes(1);

    // A naive retry now sees the attempt in `processing` (version 2). assertOperationState rejects
    // `processing` for every operation, so execute() throws BEFORE calling the provider again.
    target.employerPaymentAttempt.findFirst.mockResolvedValueOnce({ ...row, state: "processing", version: 2 });
    await expect(target.repository.execute({ ...execInput, expectedVersion: 2 })).rejects.toThrow();
    expect(providerCalls).toHaveBeenCalledTimes(1); // provider was NOT charged a second time
  });
});
