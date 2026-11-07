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
  it("creates a persistent draft from a locked-timesheet calculation through the authorized scope", async () => {
    const app = Fastify();
    const target = repository();
    vi.mocked(target.createFromLockedTimesheet).mockResolvedValue({
      ...invoice,
      status: "draft",
      invoiceNumber: null,
      version: 1,
      issuedAt: null
    });
    registerInvoiceRoutes(app, {
      repository: target,
      authorize: async () => ({ actorId: "synthetic-finance", role: "finance_reviewer" })
    });
    const response = await app.inject({
      method: "POST",
      url: `/organizations/${organizationId}/invoices`,
      payload: {
        idempotencyKey: "synthetic-invoice-create",
        calculation: {
          source: calculation.source,
          issuer: calculation.issuer,
          tax: calculation.tax,
          rules: calculation.rules,
          occurredAt: calculation.calculatedAt,
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
        }
      }
    });
    expect(response.statusCode).toBe(201);
    expect(target.createFromLockedTimesheet).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        actorReference: "synthetic-finance",
        actorRole: "finance_reviewer",
        idempotencyKey: "synthetic-invoice-create",
        calculation: expect.objectContaining({
          source: expect.objectContaining({ organizationId }),
          total: cad(10_500)
        })
      })
    );
  });

  it("adds a server-computed card surcharge line when the employer pays by card", async () => {
    const app = Fastify();
    const target = repository();
    vi.mocked(target.createFromLockedTimesheet).mockResolvedValue({
      ...invoice,
      status: "draft",
      invoiceNumber: null,
      version: 1,
      issuedAt: null
    });
    registerInvoiceRoutes(app, {
      repository: target,
      authorize: async () => ({ actorId: "synthetic-finance", role: "finance_reviewer" })
    });
    const response = await app.inject({
      method: "POST",
      url: `/organizations/${organizationId}/invoices`,
      payload: {
        idempotencyKey: "surcharge-card",
        calculation: {
          source: calculation.source,
          issuer: calculation.issuer,
          tax: calculation.tax,
          rules: calculation.rules,
          occurredAt: calculation.calculatedAt,
          regularLabour: cad(10_000),
          urgentLabour: cad(0),
          approvedTravelTime: cad(0),
          mileage: cad(0),
          adjustments: cad(0),
          marketplaceFees: cad(500),
          credits: cad(0),
          paymentMethodKind: "mastercard",
          lineRuleVersions: {
            regular_labour: "synthetic",
            urgent_labour: "synthetic",
            approved_travel_time: "synthetic",
            mileage: "synthetic",
            adjustment: "synthetic",
            marketplace_fee: "synthetic",
            credit: "synthetic"
          }
        }
      }
    });
    expect(response.statusCode).toBe(201);
    const arg = vi.mocked(target.createFromLockedTimesheet).mock.calls[0]![0];
    // base 10_500 (labour 10_000 + marketplace 500), tax not enabled -> card fee 335 -> employer half 168 -> total 10_668
    expect(arg.calculation.total).toEqual(cad(10_668));
    const surchargeLine = arg.calculation.lines.find((entry) => entry.kind === "transfer_fee");
    expect(surchargeLine?.amount).toEqual(cad(168));
  });

  it("adds no surcharge when the employer pays by Interac / bank debit (platform absorbs the fee)", async () => {
    const app = Fastify();
    const target = repository();
    vi.mocked(target.createFromLockedTimesheet).mockResolvedValue({
      ...invoice,
      status: "draft",
      invoiceNumber: null,
      version: 1,
      issuedAt: null
    });
    registerInvoiceRoutes(app, {
      repository: target,
      authorize: async () => ({ actorId: "synthetic-finance", role: "finance_reviewer" })
    });
    const response = await app.inject({
      method: "POST",
      url: `/organizations/${organizationId}/invoices`,
      payload: {
        idempotencyKey: "surcharge-interac",
        calculation: {
          source: calculation.source,
          issuer: calculation.issuer,
          tax: calculation.tax,
          rules: calculation.rules,
          occurredAt: calculation.calculatedAt,
          regularLabour: cad(10_000),
          urgentLabour: cad(0),
          approvedTravelTime: cad(0),
          mileage: cad(0),
          adjustments: cad(0),
          marketplaceFees: cad(500),
          credits: cad(0),
          paymentMethodKind: "acss_debit",
          lineRuleVersions: {
            regular_labour: "synthetic",
            urgent_labour: "synthetic",
            approved_travel_time: "synthetic",
            mileage: "synthetic",
            adjustment: "synthetic",
            marketplace_fee: "synthetic",
            credit: "synthetic"
          }
        }
      }
    });
    expect(response.statusCode).toBe(201);
    const arg = vi.mocked(target.createFromLockedTimesheet).mock.calls[0]![0];
    expect(arg.calculation.total).toEqual(cad(10_500));
    expect(arg.calculation.lines.find((entry) => entry.kind === "transfer_fee")).toBeUndefined();
  });

  it("discards a client-supplied transferFee so the surcharge can never be spoofed or dodged", async () => {
    const app = Fastify();
    const target = repository();
    vi.mocked(target.createFromLockedTimesheet).mockResolvedValue({
      ...invoice,
      status: "draft",
      invoiceNumber: null,
      version: 1,
      issuedAt: null
    });
    registerInvoiceRoutes(app, {
      repository: target,
      authorize: async () => ({ actorId: "synthetic-finance", role: "finance_reviewer" })
    });
    const response = await app.inject({
      method: "POST",
      url: `/organizations/${organizationId}/invoices`,
      payload: {
        idempotencyKey: "surcharge-spoof",
        calculation: {
          source: calculation.source,
          issuer: calculation.issuer,
          tax: calculation.tax,
          rules: calculation.rules,
          occurredAt: calculation.calculatedAt,
          regularLabour: cad(10_000),
          urgentLabour: cad(0),
          approvedTravelTime: cad(0),
          mileage: cad(0),
          adjustments: cad(0),
          marketplaceFees: cad(500),
          credits: cad(0),
          transferFee: cad(99_999),
          lineRuleVersions: {
            regular_labour: "synthetic",
            urgent_labour: "synthetic",
            approved_travel_time: "synthetic",
            mileage: "synthetic",
            adjustment: "synthetic",
            marketplace_fee: "synthetic",
            credit: "synthetic"
          }
        }
      }
    });
    expect(response.statusCode).toBe(201);
    const arg = vi.mocked(target.createFromLockedTimesheet).mock.calls[0]![0];
    // no method chosen + client transferFee discarded -> plain base, no surcharge line
    expect(arg.calculation.total).toEqual(cad(10_500));
    expect(arg.calculation.lines.find((entry) => entry.kind === "transfer_fee")).toBeUndefined();
  });

  it("rejects a create request whose calculation crosses the organization boundary", async () => {
    const app = Fastify();
    const target = repository();
    registerInvoiceRoutes(app, {
      repository: target,
      authorize: async () => ({ actorId: "synthetic-finance", role: "finance_reviewer" })
    });
    const response = await app.inject({
      method: "POST",
      url: `/organizations/${organizationId}/invoices`,
      payload: {
        idempotencyKey: "cross-organization-create",
        calculation: {
          source: { ...calculation.source, organizationId: "other-organization" }
        }
      }
    });
    expect(response.statusCode).toBe(400);
    expect(target.createFromLockedTimesheet).not.toHaveBeenCalled();
  });

  it("issues through the durable transition with scoped numbering and optimistic concurrency", async () => {
    const app = Fastify();
    const target = repository();
    vi.mocked(target.transition).mockResolvedValue(invoice);
    registerInvoiceRoutes(app, {
      repository: target,
      authorize: async () => ({ actorId: "synthetic-admin", role: "platform_admin" })
    });
    const response = await app.inject({
      method: "POST",
      url: `/organizations/${organizationId}/invoices/${invoice.id}/issue`,
      payload: {
        expectedVersion: 2,
        numbering: {
          version: "synthetic-numbering-v1",
          organizationId,
          prefix: "SYN",
          scopeYear: 2026,
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          effectiveUntil: null
        }
      }
    });
    expect(response.statusCode).toBe(200);
    expect(target.transition).toHaveBeenCalledWith({
      invoiceId: invoice.id,
      organizationId,
      expectedVersion: 2,
      toStatus: "issued",
      actorReference: "synthetic-admin",
      actorRole: "platform_admin",
      numbering: expect.objectContaining({ organizationId, prefix: "SYN" })
    });
  });

  it("requires a reason for dispute and void transitions", async () => {
    const app = Fastify();
    const target = repository();
    registerInvoiceRoutes(app, {
      repository: target,
      authorize: async () => ({ actorId: "synthetic-admin", role: "platform_admin" })
    });
    const response = await app.inject({
      method: "POST",
      url: `/organizations/${organizationId}/invoices/${invoice.id}/void`,
      payload: { expectedVersion: 3 }
    });
    expect(response.statusCode).toBe(400);
    expect(target.transition).not.toHaveBeenCalled();
  });

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

  describe("employer visibility", () => {
    const withStatus = (status: "issued" | "sent") => ({ ...invoice, status });
    const repositoryHolding = (status: "issued" | "sent") => ({
      ...repository(),
      get: async () => withStatus(status),
      list: async () => [withStatus(status)]
    });
    const app = (status: "issued" | "sent", role: "finance_reviewer" | "platform_admin") => {
      const server = Fastify();
      registerInvoiceRoutes(server, {
        repository: repositoryHolding(status),
        authorize: async () => ({ actorId: "synthetic-actor", role })
      });
      return server;
    };

    it("hides an invoice staff have not sent from the employer", async () => {
      const server = app("issued", "finance_reviewer");
      const list = await server.inject({ method: "GET", url: `/organizations/${organizationId}/invoices` });
      expect(list.json().invoices).toEqual([]);
      for (const suffix of ["", "/pdf"]) {
        const response = await server.inject({
          method: "GET",
          url: `/organizations/${organizationId}/invoices/${invoice.id}${suffix}`
        });
        expect(response.statusCode).toBe(404);
      }
    });

    it("shows a sent invoice to the employer", async () => {
      const server = app("sent", "finance_reviewer");
      const list = await server.inject({ method: "GET", url: `/organizations/${organizationId}/invoices` });
      expect(list.json().invoices).toHaveLength(1);
      const detail = await server.inject({
        method: "GET",
        url: `/organizations/${organizationId}/invoices/${invoice.id}`
      });
      expect(detail.statusCode).toBe(200);
    });

    it("keeps an unsent invoice visible to staff", async () => {
      const server = app("issued", "platform_admin");
      const list = await server.inject({ method: "GET", url: `/organizations/${organizationId}/invoices` });
      expect(list.json().invoices).toHaveLength(1);
    });
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

  describe("employer notice on send", () => {
    const send = (app: ReturnType<typeof Fastify>) =>
      app.inject({
        method: "POST",
        url: `/organizations/${organizationId}/invoices/${invoice.id}/deliveries`,
        payload: { expectedVersion: 3, recipientAlias: "employer-contact", idempotencyKey: "send-key" }
      });
    const firstSendRepository = () => {
      const target = repository();
      vi.mocked(target.recordFakeDelivery).mockImplementation(async (input) => ({
        invoice: { ...invoice, status: "sent", version: 4 },
        receipt: { id: input.id } as Awaited<ReturnType<InvoiceRepository["recordFakeDelivery"]>>["receipt"]
      }));
      return target;
    };
    const authorize = async () => ({ actorId: "synthetic-finance", role: "finance_reviewer" as const });

    it("emails the employer on the first send and reports the result", async () => {
      const app = Fastify();
      const notifyInvoiceSent = vi.fn(async () => "sent");
      registerInvoiceRoutes(app, { repository: firstSendRepository(), authorize, notifyInvoiceSent });
      const response = await send(app);
      expect(response.json().employerNotice).toBe("sent");
      expect(notifyInvoiceSent).toHaveBeenCalledOnce();
    });

    it("does not email again when the same send is repeated", async () => {
      const app = Fastify();
      const notifyInvoiceSent = vi.fn(async () => "sent");
      registerInvoiceRoutes(app, { repository: repository(), authorize, notifyInvoiceSent });
      expect((await send(app)).statusCode).toBe(201);
      expect(notifyInvoiceSent).not.toHaveBeenCalled();
    });

    it("keeps the send when the email fails", async () => {
      const app = Fastify();
      registerInvoiceRoutes(app, { repository: firstSendRepository(), authorize, notifyInvoiceSent: async () => { throw new Error("mail down"); } });
      const response = await send(app);
      expect(response.statusCode).toBe(201);
      expect(response.json().employerNotice).toBe("error");
    });
  });
});
