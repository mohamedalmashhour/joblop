import Fastify from "fastify";
import { calculateInvoiceSnapshot, type InvoiceCalculationInput } from "@rwos/shared";
import { describe, expect, it, vi } from "vitest";
import type { InvoiceRepository, DurableInvoice } from "./invoiceRepository";
import { registerInvoiceRoutes } from "./invoiceRoutes";

const organizationId = "00000000-0000-4000-8000-00000000000a";
const cad = (amountMinor: number) => ({ amountMinor, currency: "CAD" as const });
const calculation = calculateInvoiceSnapshot({
  source: {
    type: "locked_timesheet",
    timesheetId: "00000000-0000-4000-8000-000000000010",
    timesheetVersion: 3,
    organizationId,
    assignmentId: "00000000-0000-4000-8000-000000000011",
    attendanceRecordId: "00000000-0000-4000-8000-000000000012"
  },
  issuer: {
    version: "synthetic",
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
    version: "synthetic",
    treatment: "tax_not_enabled",
    issuerRegisteredForGst: false,
    issuerRegisteredForQst: false,
    supplyClassification: "synthetic",
    placeOfSupplyPolicyVersion: "synthetic",
    gstRatePartsPerMillion: 0,
    qstRatePartsPerMillion: 0,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null
  },
  rules: {
    employerTermsVersion: "synthetic",
    calculationPolicyVersion: "synthetic",
    taxPolicyVersion: "synthetic",
    travelPolicyVersion: "synthetic",
    adjustmentPolicyVersion: "synthetic",
    paymentTermsVersion: "synthetic"
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
    regular_labour: "synthetic",
    urgent_labour: "synthetic",
    approved_travel_time: "synthetic",
    mileage: "synthetic",
    adjustment: "synthetic",
    marketplace_fee: "synthetic",
    credit: "synthetic"
  }
} satisfies InvoiceCalculationInput);
const invoice: DurableInvoice = {
  id: "00000000-0000-4000-8000-000000000020",
  organizationId,
  timesheetId: "00000000-0000-4000-8000-000000000010",
  timesheetVersion: 3,
  status: "issued",
  invoiceNumber: "SYN-2026-000001",
  currency: "CAD",
  calculationSnapshot: calculation,
  subtotalMinor: 10_500,
  taxMinor: 0,
  creditMinor: 0,
  totalMinor: 10_500,
  version: 3,
  issuedAt: "2026-07-30T12:00:00.000Z",
  dueAt: null,
  createdAt: "2026-07-30T12:00:00.000Z"
};

function repository(): InvoiceRepository {
  return {
    createFromLockedTimesheet: vi.fn(),
    list: vi.fn().mockResolvedValue([invoice]),
    get: vi.fn().mockResolvedValue(invoice),
    transition: vi.fn(),
    listAudit: vi.fn().mockResolvedValue([]),
    recordFakeDelivery: vi.fn().mockResolvedValue({
      invoice: { ...invoice, status: "sent", version: 4 },
      receipt: {
        id: "delivery-a",
        invoiceId: invoice.id,
        organizationId,
        recipientAlias: "synthetic-recipient",
        documentDigest: "a".repeat(64),
        status: "accepted",
        acceptedAt: "2026-07-30T12:01:00.000Z"
      }
    }),
    listDeliveries: vi.fn().mockResolvedValue([]),
    createCreditNote: vi.fn(),
    transitionCreditNote: vi.fn(),
    listCreditNotes: vi.fn().mockResolvedValue([])
  };
}

describe("authenticated invoice routes", () => {
  it("returns indistinguishable not-found for denied organization access", async () => {
    const app = Fastify();
    registerInvoiceRoutes(app, {
      repository: repository(),
      authorize: async () => null
    });
    const response = await app.inject({
      method: "GET",
      url: `/organizations/${organizationId}/invoices/${invoice.id}`
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "RWOS_RESOURCE_UNAVAILABLE" });
  });

  it("serves the bilingual PDF only through an authorized organization scope", async () => {
    const app = Fastify();
    registerInvoiceRoutes(app, {
      repository: repository(),
      authorize: async () => ({ actorId: "synthetic-admin", role: "platform_admin" })
    });
    const response = await app.inject({
      method: "GET",
      url: `/organizations/${organizationId}/invoices/${invoice.id}/pdf`
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.rawPayload.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("derives the delivery digest server-side and never accepts document bytes", async () => {
    const app = Fastify();
    const target = repository();
    registerInvoiceRoutes(app, {
      repository: target,
      authorize: async () => ({ actorId: "synthetic-finance", role: "finance_reviewer" })
    });
    const response = await app.inject({
      method: "POST",
      url: `/organizations/${organizationId}/invoices/${invoice.id}/deliveries`,
      payload: {
        expectedVersion: 3,
        recipientAlias: "synthetic-recipient",
        idempotencyKey: "synthetic-delivery-key"
      }
    });
    expect(response.statusCode).toBe(201);
    expect(target.recordFakeDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        invoiceId: invoice.id,
        documentDigest: expect.stringMatching(/^[a-f0-9]{64}$/u)
      })
    );
  });
});
