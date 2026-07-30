import { calculateInvoiceSnapshot, type InvoiceCalculationInput } from "@rwos/shared";
import { describe, expect, it, vi } from "vitest";
import { createPrismaInvoiceRepository } from "./invoiceRepository";

const cad = (amountMinor: number) => ({ amountMinor, currency: "CAD" as const });
const calculation = calculateInvoiceSnapshot({
  source: {
    type: "locked_timesheet",
    timesheetId: "00000000-0000-4000-8000-000000000010",
    timesheetVersion: 3,
    organizationId: "00000000-0000-4000-8000-00000000000a",
    assignmentId: "00000000-0000-4000-8000-000000000011",
    attendanceRecordId: "00000000-0000-4000-8000-000000000012"
  },
  issuer: {
    version: "synthetic-issuer-v1",
    issuerModel: "self_billing_agent",
    productionApprovalReference: null,
    legalName: "Synthetic Issuer",
    enterpriseIdentifier: "SYNTHETIC",
    gstRegistrationReference: null,
    qstRegistrationReference: null,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null
  },
  tax: {
    version: "synthetic-tax-v1",
    treatment: "tax_not_enabled",
    issuerRegisteredForGst: false,
    issuerRegisteredForQst: false,
    supplyClassification: "synthetic",
    placeOfSupplyPolicyVersion: "synthetic-place-v1",
    gstRatePartsPerMillion: 0,
    qstRatePartsPerMillion: 0,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null
  },
  rules: {
    employerTermsVersion: "synthetic-terms-v1",
    calculationPolicyVersion: "synthetic-calculation-v1",
    taxPolicyVersion: "synthetic-tax-v1",
    travelPolicyVersion: "synthetic-travel-v1",
    adjustmentPolicyVersion: "synthetic-adjustment-v1",
    paymentTermsVersion: "synthetic-payment-v1"
  },
  occurredAt: "2026-07-30T12:00:00.000Z",
  regularLabour: cad(10_000),
  urgentLabour: cad(0),
  approvedTravelTime: cad(0),
  mileage: cad(0),
  adjustments: cad(0),
  marketplaceFees: cad(500),
  credits: cad(0),
  lineRuleVersions: {
    regular_labour: "v1",
    urgent_labour: "v1",
    approved_travel_time: "v1",
    mileage: "v1",
    adjustment: "v1",
    marketplace_fee: "v1",
    credit: "v1"
  }
} satisfies InvoiceCalculationInput);

const invoiceRow = {
  id: "00000000-0000-4000-8000-000000000020",
  organizationId: calculation.source.organizationId,
  timesheetId: calculation.source.timesheetId,
  timesheetVersion: 3,
  status: "draft",
  invoiceNumber: null,
  currency: "CAD",
  calculationSnapshot: calculation,
  subtotalMinor: 10_500n,
  taxMinor: 0n,
  creditMinor: 0n,
  totalMinor: 10_500n,
  version: 1,
  issuedAt: null,
  dueAt: null,
  createdAt: new Date("2026-07-30T12:00:00.000Z"),
  requestDigest: ""
};

function setup() {
  const timesheet = { findFirst: vi.fn().mockResolvedValue({ id: calculation.source.timesheetId }) };
  const invoice = {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([invoiceRow]),
    create: vi.fn().mockResolvedValue(invoiceRow),
    updateMany: vi.fn().mockResolvedValue({ count: 1 })
  };
  const invoiceAuditEntry = {
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn(),
    aggregate: vi.fn().mockResolvedValue({ _max: { sequence: 1 } })
  };
  const invoiceNumberSequence = {
    upsert: vi.fn().mockResolvedValue({ lastValue: 1 })
  };
  const transaction = { timesheet, invoice, invoiceAuditEntry, invoiceNumberSequence };
  const client = {
    ...transaction,
    $transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) =>
      callback(transaction)
    )
  };
  return {
    repository: createPrismaInvoiceRepository(client),
    timesheet,
    invoice,
    invoiceAuditEntry,
    invoiceNumberSequence
  };
}

describe("durable invoice repository", () => {
  it("creates only from the exact organization-scoped locked timesheet and records audit", async () => {
    const { repository, timesheet, invoice, invoiceAuditEntry } = setup();
    const created = await repository.createFromLockedTimesheet({
      id: invoiceRow.id,
      organizationId: invoiceRow.organizationId,
      calculation,
      actorReference: "synthetic-finance-reviewer",
      actorRole: "finance_reviewer",
      idempotencyKey: "synthetic-create-key"
    });
    expect(created.status).toBe("draft");
    expect(timesheet.findFirst).toHaveBeenCalledWith({
      where: {
        id: calculation.source.timesheetId,
        organizationId: calculation.source.organizationId,
        status: "locked",
        version: calculation.source.timesheetVersion
      },
      select: { id: true }
    });
    expect(invoice.create.mock.calls[0]?.[0]?.data).toMatchObject({
      organizationId: calculation.source.organizationId,
      timesheetId: calculation.source.timesheetId,
      timesheetVersion: 3,
      status: "draft"
    });
    expect(invoiceAuditEntry.create).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the locked timesheet source is unavailable", async () => {
    const target = setup();
    target.timesheet.findFirst.mockResolvedValueOnce(null);
    await expect(
      target.repository.createFromLockedTimesheet({
        id: invoiceRow.id,
        organizationId: invoiceRow.organizationId,
        calculation,
        actorReference: "synthetic-finance-reviewer",
        actorRole: "finance_reviewer",
        idempotencyKey: "synthetic-create-key"
      })
    ).rejects.toThrow("approved and locked");
    expect(target.invoice.create).not.toHaveBeenCalled();
  });

  it("scopes list and detail reads to the authorized organization", async () => {
    const { repository, invoice } = setup();
    await repository.list(invoiceRow.organizationId, ["draft"]);
    expect(invoice.findMany).toHaveBeenCalledWith({
      where: { organizationId: invoiceRow.organizationId, status: { in: ["draft"] } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }]
    });
    invoice.findFirst.mockResolvedValueOnce(invoiceRow);
    await repository.get(invoiceRow.id, invoiceRow.organizationId);
    expect(invoice.findFirst).toHaveBeenLastCalledWith({
      where: { id: invoiceRow.id, organizationId: invoiceRow.organizationId }
    });
  });

  it("uses expected version, prior status and organization for transitions", async () => {
    const target = setup();
    target.invoice.findFirst
      .mockResolvedValueOnce(invoiceRow)
      .mockResolvedValueOnce({ ...invoiceRow, status: "approved", version: 2 });
    const approved = await target.repository.transition({
      invoiceId: invoiceRow.id,
      organizationId: invoiceRow.organizationId,
      expectedVersion: 1,
      toStatus: "approved",
      actorReference: "synthetic-finance-reviewer",
      actorRole: "finance_reviewer"
    });
    expect(approved.status).toBe("approved");
    expect(target.invoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: invoiceRow.id,
        organizationId: invoiceRow.organizationId,
        version: 1,
        status: "draft"
      },
      data: { status: "approved", version: { increment: 1 } }
    });
  });
});
