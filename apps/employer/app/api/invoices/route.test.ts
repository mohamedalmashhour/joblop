import { describe, expect, it } from "vitest";
import { parseEmployerInvoices } from "./invoiceBoundary";

describe("employer invoice BFF projection", () => {
  it("returns only the authenticated read model", () => {
    expect(
      parseEmployerInvoices({
        invoices: [
          {
            id: "invoice-a",
            organizationId: "hidden",
            timesheetId: "hidden",
            invoiceNumber: "SYN-2026-1",
            status: "issued",
            currency: "CAD",
            subtotalMinor: 10_000,
            taxMinor: 500,
            creditMinor: 0,
            totalMinor: 10_500,
            issuedAt: "2026-07-30T12:00:00.000Z",
            dueAt: null,
            createdAt: "2026-07-30T11:00:00.000Z",
            calculationSnapshot: { internal: "hidden" }
          }
        ]
      })
    ).toEqual([
      {
        id: "invoice-a",
        invoiceNumber: "SYN-2026-1",
        status: "issued",
        currency: "CAD",
        subtotalMinor: 10_000,
        taxMinor: 500,
        creditMinor: 0,
        totalMinor: 10_500,
        issuedAt: "2026-07-30T12:00:00.000Z",
        dueAt: null,
        createdAt: "2026-07-30T11:00:00.000Z"
      }
    ]);
  });

  it("rejects malformed lifecycle and monetary data", () => {
    expect(() =>
      parseEmployerInvoices({
        invoices: [
          {
            id: "invoice-a",
            invoiceNumber: null,
            status: "secret_state",
            currency: "CAD",
            subtotalMinor: -1,
            taxMinor: 0,
            creditMinor: 0,
            totalMinor: 0,
            issuedAt: null,
            dueAt: null,
            createdAt: "invalid"
          }
        ]
      })
    ).toThrow("RWOS_INVALID_INVOICE");
  });
});
