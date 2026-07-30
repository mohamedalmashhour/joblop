import { createLocalFakePaymentProvider } from "@rwos/shared";
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

function setup() {
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
      createLocalFakePaymentProvider()
    ),
    employerPaymentMethod,
    employerPaymentAttempt,
    employerPaymentEvent
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
  });

  it("rejects raw card-shaped values in payment method references", async () => {
    const target = setup();
    await expect(
      target.repository.registerMethod({
        id: "method-a",
        organizationId,
        provider: "local_fake",
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
});
