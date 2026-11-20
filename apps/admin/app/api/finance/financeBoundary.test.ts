import { describe, expect, it } from "vitest";
import {
  parseFinanceInvoices,
  parseFinancePayments,
  readOrganizationId
} from "./financeBoundary";

const organizationId = "11111111-1111-4111-8111-111111111111";

describe("admin finance read boundary", () => {
  it("accepts exactly one UUID organization scope", () => {
    expect(
      readOrganizationId(new Request(`http://localhost/api/finance?organizationId=${organizationId}`))
    ).toBe(organizationId);
    expect(readOrganizationId(new Request("http://localhost/api/finance"))).toBeNull();
    expect(
      readOrganizationId(
        new Request(`http://localhost/api/finance?organizationId=${organizationId}&extra=true`)
      )
    ).toBeNull();
  });

  it("whitelists invoice read fields", () => {
    expect(
      parseFinanceInvoices({
        invoices: [{
          id: "invoice-1",
          organizationId,
          invoiceNumber: "INV-1",
          status: "issued",
          version: 2,
          currency: "CAD",
          totalMinor: 12500,
          issuedAt: "2026-11-03T00:00:00.000Z",
          dueAt: null,
          calculationSnapshot: { private: true }
        }]
      })
    ).toEqual([{
      id: "invoice-1",
      organizationId,
      invoiceNumber: "INV-1",
      status: "issued",
      version: 2,
      currency: "CAD",
      totalMinor: 12500,
      issuedAt: "2026-11-03T00:00:00.000Z",
      dueAt: null
    }]);
  });

  it("whitelists payment read fields and rejects malformed money", () => {
    expect(
      parseFinancePayments({
        payments: [{
          id: "payment-1",
          organizationId,
          invoiceId: "invoice-1",
          state: "processing",
          currency: "CAD",
          amountMinor: 12500,
          allocatedMinor: 0,
          refundedMinor: 0,
          authorizationReference: "hidden"
        }]
      })[0]
    ).not.toHaveProperty("authorizationReference");
    expect(() =>
      parseFinancePayments({
        payments: [{
          id: "payment-1",
          organizationId,
          invoiceId: "invoice-1",
          state: "processing",
          currency: "CAD",
          amountMinor: -1,
          allocatedMinor: 0,
          refundedMinor: 0
        }]
      })
    ).toThrow("Finance response is invalid.");
  });
});
