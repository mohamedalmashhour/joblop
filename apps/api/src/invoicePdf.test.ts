import { calculateInvoiceSnapshot, type InvoiceCalculationInput } from "@rwos/shared";
import { describe, expect, it } from "vitest";
import { renderBilingualSyntheticInvoicePdf } from "./invoicePdf";
import type { DurableInvoice } from "./invoiceRepository";

const cad = (amountMinor: number) => ({ amountMinor, currency: "CAD" as const });
const calculation = calculateInvoiceSnapshot({
  source: {
    type: "locked_timesheet",
    timesheetId: "timesheet-synthetic",
    timesheetVersion: 1,
    organizationId: "tenantA",
    assignmentId: "assignment-synthetic",
    attendanceRecordId: "attendance-synthetic"
  },
  issuer: {
    version: "issuer-v1",
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
    version: "tax-v1",
    treatment: "tax_not_enabled",
    issuerRegisteredForGst: false,
    issuerRegisteredForQst: false,
    supplyClassification: "synthetic",
    placeOfSupplyPolicyVersion: "place-v1",
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
    paymentTermsVersion: "payment-v1"
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
    regular_labour: "v1",
    urgent_labour: "v1",
    approved_travel_time: "v1",
    mileage: "v1",
    adjustment: "v1",
    marketplace_fee: "v1",
    credit: "v1"
  }
} satisfies InvoiceCalculationInput);

const invoice: DurableInvoice = {
  id: "invoice-synthetic",
  organizationId: "tenantA",
  timesheetId: "timesheet-synthetic",
  timesheetVersion: 1,
  status: "issued",
  invoiceNumber: "SYN-A-2026-000001",
  currency: "CAD",
  calculationSnapshot: calculation,
  subtotalMinor: 10_500,
  taxMinor: 0,
  creditMinor: 0,
  totalMinor: 10_500,
  version: 3,
  issuedAt: "2026-07-30T00:00:00.000Z",
  dueAt: null,
  createdAt: "2026-07-30T00:00:00.000Z"
};

describe("bilingual synthetic invoice PDF", () => {
  it("renders a deterministic valid PDF with English/French labels and synthetic warning", () => {
    const first = renderBilingualSyntheticInvoicePdf(invoice);
    const second = renderBilingualSyntheticInvoicePdf(invoice);
    const text = Buffer.from(first.bytes).toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("INVOICE / FACTURE");
    expect(text).toContain("SYNTHETIC LOCAL TEST DOCUMENT");
    expect(first.digest).toBe(second.digest);
    expect(first.filename).toBe("SYN-A-2026-000001.pdf");
  });

  it("fails closed before issuance", () => {
    expect(() =>
      renderBilingualSyntheticInvoicePdf({
        ...invoice,
        status: "approved",
        invoiceNumber: null,
        issuedAt: null
      })
    ).toThrow("issued");
  });
});
