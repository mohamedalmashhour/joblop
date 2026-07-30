import { describe, expect, it } from "vitest";

import {
  assertInvoiceSource,
  assertProductionInvoiceIssuanceReady,
  calculateInvoiceSnapshot,
  canPerformInvoiceAction,
  canTransitionInvoice,
  invoiceStatuses,
  type InvoiceCalculationInput
} from "./invoice";

const cad = (amountMinor: number) => ({ amountMinor, currency: "CAD" as const });

function input(overrides: Partial<InvoiceCalculationInput> = {}): InvoiceCalculationInput {
  return {
    source: {
      type: "locked_timesheet",
      timesheetId: "synthetic-timesheet-a",
      timesheetVersion: 3,
      organizationId: "tenantA",
      assignmentId: "synthetic-assignment-a",
      attendanceRecordId: "synthetic-attendance-a"
    },
    issuer: {
      version: "synthetic-issuer-v1",
      issuerModel: "platform_principal",
      productionApprovalReference: null,
      legalName: "Synthetic Marketplace Issuer",
      enterpriseIdentifier: "SYNTHETIC-NEQ-0000000000",
      gstRegistrationReference: "SYNTHETIC-GST-000000000",
      qstRegistrationReference: "SYNTHETIC-QST-0000000000",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveUntil: null
    },
    tax: {
      version: "synthetic-qc-tax-v1",
      treatment: "taxable",
      issuerRegisteredForGst: true,
      issuerRegisteredForQst: true,
      supplyClassification: "synthetic_taxable_service",
      placeOfSupplyPolicyVersion: "synthetic-qc-place-v1",
      gstRatePartsPerMillion: 50_000,
      qstRatePartsPerMillion: 99_750,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveUntil: null
    },
    rules: {
      employerTermsVersion: "synthetic-terms-v1",
      calculationPolicyVersion: "synthetic-calc-v1",
      taxPolicyVersion: "synthetic-qc-tax-v1",
      travelPolicyVersion: "synthetic-travel-v1",
      adjustmentPolicyVersion: "synthetic-adjust-v1",
      paymentTermsVersion: "synthetic-net-30-v1"
    },
    occurredAt: "2026-07-30T00:00:00.000Z",
    regularLabour: cad(20_000),
    urgentLabour: cad(2_500),
    approvedTravelTime: cad(1_500),
    mileage: cad(750),
    adjustments: cad(250),
    marketplaceFees: cad(1_000),
    credits: cad(500),
    lineRuleVersions: {
      regular_labour: "regular-v1",
      urgent_labour: "urgent-v1",
      approved_travel_time: "travel-v1",
      mileage: "mileage-v1",
      adjustment: "adjust-v1",
      marketplace_fee: "fee-v1",
      credit: "credit-v1"
    },
    ...overrides
  };
}

describe("invoice foundation", () => {
  it("exposes the approved lifecycle without coupling issue to payment", () => {
    expect(invoiceStatuses).toContain("partially_paid");
    expect(invoiceStatuses).toContain("refunded");
    expect(canTransitionInvoice("draft", "approved")).toBe(true);
    expect(canTransitionInvoice("approved", "issued")).toBe(true);
    expect(canTransitionInvoice("issued", "refunded")).toBe(false);
    expect(canTransitionInvoice("voided", "issued")).toBe(false);
  });

  it("calculates distinct CAD lines and separately rounded GST/QST using synthetic policy", () => {
    const snapshot = calculateInvoiceSnapshot(input());

    expect(snapshot.lines.map((line) => line.kind)).toEqual([
      "regular_labour",
      "urgent_labour",
      "approved_travel_time",
      "mileage",
      "adjustment",
      "marketplace_fee",
      "gst",
      "qst",
      "credit"
    ]);
    expect(snapshot.subtotal).toEqual(cad(26_000));
    expect(snapshot.lines.find((line) => line.kind === "gst")?.amount).toEqual(cad(1_300));
    expect(snapshot.lines.find((line) => line.kind === "qst")?.amount).toEqual(cad(2_594));
    expect(snapshot.total).toEqual(cad(29_394));
    expect(snapshot.roundingPolicy).toBe("integer_minor_units_half_up");
  });

  it.each(["zero_rated", "exempt", "tax_not_enabled"] as const)(
    "does not silently apply taxes for %s treatment",
    (treatment) => {
      const candidate = input({ tax: { ...input().tax, treatment } });
      expect(calculateInvoiceSnapshot(candidate).taxes).toEqual(cad(0));
    }
  );

  it("does not apply a configured rate without issuer registration", () => {
    const candidate = input({
      tax: {
        ...input().tax,
        issuerRegisteredForGst: false,
        issuerRegisteredForQst: false
      }
    });
    expect(calculateInvoiceSnapshot(candidate).taxes).toEqual(cad(0));
  });

  it("denies a cross-organization source", () => {
    expect(() => assertInvoiceSource(input().source, "tenantB")).toThrow(
      "Invoice source is outside the authorized organization."
    );
  });

  it("rejects stale configuration and non-CAD money", () => {
    expect(() =>
      calculateInvoiceSnapshot(
        input({
          issuer: { ...input().issuer, effectiveUntil: "2026-02-01T00:00:00.000Z" }
        })
      )
    ).toThrow("Invoice issuer configuration is not effective.");
    expect(() =>
      calculateInvoiceSnapshot({
        ...input(),
        regularLabour: { amountMinor: 1, currency: "USD" }
      })
    ).toThrow("Invoice foundation currently supports CAD only.");
  });

  it("fails production issuance closed while issuer approval is absent", () => {
    expect(() =>
      assertProductionInvoiceIssuanceReady({
        issuer: input().issuer,
        tax: input().tax,
        numbering: null,
        paymentTermsVersion: null
      })
    ).toThrow("Invoice issuer model is not approved for production.");
  });

  it("enforces the invoice authorization matrix", () => {
    expect(canPerformInvoiceAction("employer_member", "view")).toBe(true);
    expect(canPerformInvoiceAction("employer_member", "dispute")).toBe(true);
    expect(canPerformInvoiceAction("employer_member", "issue")).toBe(false);
    expect(canPerformInvoiceAction("finance_reviewer", "create_credit_note")).toBe(true);
    expect(canPerformInvoiceAction("finance_reviewer", "void")).toBe(false);
    expect(canPerformInvoiceAction("platform_admin", "void")).toBe(true);
  });
});
