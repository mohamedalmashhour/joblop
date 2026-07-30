import { describe, expect, it } from "vitest";
import { parseEmployerPayments } from "./paymentBoundary";

describe("employer payment BFF projection", () => {
  it("returns only employer collection state without provider payloads", () => {
    expect(
      parseEmployerPayments({
        payments: [
          {
            id: "payment-a",
            invoiceId: "invoice-a",
            state: "processing",
            amountMinor: 10_500,
            allocatedMinor: 0,
            refundedMinor: 0,
            currency: "CAD",
            authorizationReference: null,
            version: 2,
            providerPayload: "hidden",
            workerPayable: "hidden"
          }
        ]
      })
    ).toEqual([
      {
        id: "payment-a",
        invoiceId: "invoice-a",
        state: "processing",
        amountMinor: 10_500,
        allocatedMinor: 0,
        refundedMinor: 0,
        currency: "CAD",
        authorizationReference: null,
        version: 2
      }
    ]);
  });

  it("rejects unsupported states, currencies, and invalid amounts", () => {
    expect(() =>
      parseEmployerPayments({
        payments: [
          {
            id: "payment-a",
            invoiceId: "invoice-a",
            state: "settled",
            amountMinor: 0,
            allocatedMinor: 0,
            refundedMinor: 0,
            currency: "USD",
            authorizationReference: null,
            version: 0
          }
        ]
      })
    ).toThrow("RWOS_INVALID_PAYMENT");
  });
});
