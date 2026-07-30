import { describe, expect, it } from "vitest";

import { calculateInvoiceSnapshot, type InvoiceCalculationInput } from "./invoice";
import { createLocalInvoiceService } from "./invoiceService";

const cad = (amountMinor: number) => ({ amountMinor, currency: "CAD" as const });

function calculation(organizationId = "tenantA") {
  const input: InvoiceCalculationInput = {
    source: {
      type: "locked_timesheet",
      timesheetId: "synthetic-timesheet",
      timesheetVersion: 1,
      organizationId,
      assignmentId: "synthetic-assignment",
      attendanceRecordId: "synthetic-attendance"
    },
    issuer: {
      version: "issuer-v1",
      issuerModel: "self_billing_agent",
      productionApprovalReference: null,
      legalName: "Synthetic Issuer",
      enterpriseIdentifier: "SYNTHETIC-ENTERPRISE",
      gstRegistrationReference: null,
      qstRegistrationReference: null,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveUntil: null
    },
    tax: {
      version: "tax-v1",
      treatment: "tax_not_enabled",
      issuerRegisteredForGst: false,
      issuerRegisteredForQst: false,
      supplyClassification: "synthetic_service",
      placeOfSupplyPolicyVersion: "synthetic-place-v1",
      gstRatePartsPerMillion: 0,
      qstRatePartsPerMillion: 0,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveUntil: null
    },
    rules: {
      employerTermsVersion: "terms-v1",
      calculationPolicyVersion: "calculation-v1",
      taxPolicyVersion: "tax-v1",
      travelPolicyVersion: "travel-v1",
      adjustmentPolicyVersion: "adjustment-v1",
      paymentTermsVersion: "terms-30-v1"
    },
    occurredAt: "2026-07-30T00:00:00.000Z",
    regularLabour: cad(10_000),
    urgentLabour: cad(0),
    approvedTravelTime: cad(0),
    mileage: cad(0),
    adjustments: cad(0),
    marketplaceFees: cad(500),
    credits: cad(0),
    lineRuleVersions: {
      regular_labour: "regular-v1",
      urgent_labour: "urgent-v1",
      approved_travel_time: "travel-v1",
      mileage: "mileage-v1",
      adjustment: "adjustment-v1",
      marketplace_fee: "fee-v1",
      credit: "credit-v1"
    }
  };
  return calculateInvoiceSnapshot(input);
}

function setup() {
  let tick = 0;
  return createLocalInvoiceService({
    now: () => `2026-07-30T00:00:0${tick++}.000Z`
  });
}

const numbering = {
  version: "number-v1",
  organizationId: "tenantA",
  prefix: "SYN-A",
  scopeYear: 2026,
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  effectiveUntil: null
} as const;

describe("local invoice service", () => {
  it("creates idempotently, approves, and issues a collision-safe organization number", () => {
    const service = setup();
    const draft = service.create({
      id: "invoice-a-1",
      organizationId: "tenantA",
      role: "finance_reviewer",
      calculation: calculation(),
      idempotencyKey: "create-1"
    });
    expect(
      service.create({
        id: "invoice-a-1",
        organizationId: "tenantA",
        role: "finance_reviewer",
        calculation: calculation(),
        idempotencyKey: "create-1"
      })
    ).toEqual(draft);
    const approved = service.transition({
      invoiceId: draft.id,
      organizationId: "tenantA",
      role: "finance_reviewer",
      toStatus: "approved",
      expectedVersion: draft.version
    });
    const issued = service.transition({
      invoiceId: approved.id,
      organizationId: "tenantA",
      role: "finance_reviewer",
      toStatus: "issued",
      expectedVersion: approved.version,
      numbering
    });
    expect(issued.number).toBe("SYN-A-2026-000001");
    expect(issued.issuedAt).not.toBeNull();
  });

  it("rejects stale concurrent transitions without consuming a second number", () => {
    const service = setup();
    const draft = service.create({
      id: "invoice-a-2",
      organizationId: "tenantA",
      role: "finance_reviewer",
      calculation: calculation(),
      idempotencyKey: "create-2"
    });
    const approved = service.transition({
      invoiceId: draft.id,
      organizationId: "tenantA",
      role: "finance_reviewer",
      toStatus: "approved",
      expectedVersion: 1
    });
    service.transition({
      invoiceId: approved.id,
      organizationId: "tenantA",
      role: "finance_reviewer",
      toStatus: "issued",
      expectedVersion: 2,
      numbering
    });
    expect(() =>
      service.transition({
        invoiceId: approved.id,
        organizationId: "tenantA",
        role: "finance_reviewer",
        toStatus: "issued",
        expectedVersion: 2,
        numbering
      })
    ).toThrow("Invoice version conflict.");
  });

  it("denies every cross-organization invoice, credit-note, and audit path", () => {
    const service = setup();
    const draft = service.create({
      id: "invoice-a-3",
      organizationId: "tenantA",
      role: "platform_admin",
      calculation: calculation(),
      idempotencyKey: "create-3"
    });
    expect(() => service.get(draft.id, "tenantB")).toThrow(
      "Invoice is outside the authorized organization."
    );
    expect(() => service.listCreditNotes(draft.id, "tenantB")).toThrow(
      "Invoice is outside the authorized organization."
    );
    expect(() => service.listAudit(draft.id, "tenantB")).toThrow(
      "Invoice is outside the authorized organization."
    );
    expect(() =>
      service.transition({
        invoiceId: draft.id,
        organizationId: "tenantB",
        role: "platform_admin",
        toStatus: "voided",
        expectedVersion: 1
      })
    ).toThrow("Invoice is outside the authorized organization.");
  });

  it("uses an append-only audit trail and corrects issued documents with credit notes", () => {
    const service = setup();
    const draft = service.create({
      id: "invoice-a-4",
      organizationId: "tenantA",
      role: "platform_admin",
      calculation: calculation(),
      idempotencyKey: "create-4"
    });
    const approved = service.transition({
      invoiceId: draft.id,
      organizationId: "tenantA",
      role: "platform_admin",
      toStatus: "approved",
      expectedVersion: 1
    });
    const issued = service.transition({
      invoiceId: approved.id,
      organizationId: "tenantA",
      role: "platform_admin",
      toStatus: "issued",
      expectedVersion: 2,
      numbering
    });
    const note = service.createCreditNote({
      id: "credit-a-1",
      invoiceId: issued.id,
      organizationId: "tenantA",
      role: "finance_reviewer",
      reason: "Synthetic correction",
      amountMinor: 500
    });
    expect(note.currency).toBe("CAD");
    expect(service.get(issued.id, "tenantA").calculation.total).toEqual(cad(10_500));
    expect(service.listAudit(issued.id, "tenantA").map((entry) => entry.action)).toEqual([
      "create",
      "approve",
      "issue",
      "create_credit_note"
    ]);
  });

  it("fails closed for authorization, missing numbering, and replay conflicts", () => {
    const service = setup();
    const draft = service.create({
      id: "invoice-a-5",
      organizationId: "tenantA",
      role: "finance_reviewer",
      calculation: calculation(),
      idempotencyKey: "create-5"
    });
    expect(() =>
      service.create({
        id: "different-id",
        organizationId: "tenantA",
        role: "finance_reviewer",
        calculation: calculation(),
        idempotencyKey: "create-5"
      })
    ).toThrow("Invoice creation idempotency conflict.");
    expect(() =>
      service.transition({
        invoiceId: draft.id,
        organizationId: "tenantA",
        role: "employer_member",
        toStatus: "approved",
        expectedVersion: 1
      })
    ).toThrow("Invoice action approve is not authorized");
    const approved = service.transition({
      invoiceId: draft.id,
      organizationId: "tenantA",
      role: "finance_reviewer",
      toStatus: "approved",
      expectedVersion: 1
    });
    expect(() =>
      service.transition({
        invoiceId: approved.id,
        organizationId: "tenantA",
        role: "finance_reviewer",
        toStatus: "issued",
        expectedVersion: 2
      })
    ).toThrow("Invoice numbering policy is missing.");
  });
});
