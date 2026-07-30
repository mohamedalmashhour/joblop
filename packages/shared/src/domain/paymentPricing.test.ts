import { describe, expect, it } from "vitest";

import { calculateEmployerAuthorizationEstimate, type EmployerPaymentMethodKind } from "./paymentPricing";

const fee = {
  version: "synthetic-fee-v1",
  employerContractVersion: "synthetic-contract-v1",
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  effectiveUntil: null,
  fixedMinor: 500,
  ratePartsPerMillion: 100_000
} as const;

function estimate(paymentMethod: EmployerPaymentMethodKind) {
  return calculateEmployerAuthorizationEstimate({
    occurredAt: "2026-07-30T00:00:00.000Z",
    labourMinor: 20_000,
    travelMinor: 1_000,
    mileageMinor: 500,
    taxMinor: 3_000,
    paymentMethod,
    jurisdiction: "CA-QC",
    marketplaceFee: fee,
    surcharge: {
      enabled: false,
      jurisdiction: "CA-QC",
      legalApprovalReference: null,
      processorApprovalReference: null,
      ratePartsPerMillion: 0
    }
  });
}

describe("employer authorization estimate", () => {
  it("applies the contractual marketplace fee independently of payment method", () => {
    const mastercard = estimate("mastercard");
    const acss = estimate("acss_debit");
    expect(mastercard.marketplaceFeeMinor).toBe(2_650);
    expect(mastercard).toEqual(acss);
    expect(mastercard.authorizationTotalMinor).toBe(27_150);
  });

  it("never adds a Québec Mastercard or ACSS surcharge", () => {
    expect(estimate("mastercard").paymentMethodSurchargeMinor).toBe(0);
    expect(estimate("acss_debit").paymentMethodSurchargeMinor).toBe(0);
  });

  it("fails closed if a future Québec surcharge is enabled", () => {
    expect(() =>
      calculateEmployerAuthorizationEstimate({
        occurredAt: "2026-07-30T00:00:00.000Z",
        labourMinor: 20_000,
        travelMinor: 0,
        mileageMinor: 0,
        taxMinor: 0,
        paymentMethod: "mastercard",
        jurisdiction: "CA-QC",
        marketplaceFee: fee,
        surcharge: {
          enabled: true,
          jurisdiction: "CA-QC",
          legalApprovalReference: "synthetic-legal-review",
          processorApprovalReference: "synthetic-processor-review",
          ratePartsPerMillion: 10_000
        }
      })
    ).toThrow("Payment-method surcharges are disabled for Québec.");
  });

  it("requires legal and processor approval outside Québec", () => {
    expect(() =>
      calculateEmployerAuthorizationEstimate({
        occurredAt: "2026-07-30T00:00:00.000Z",
        labourMinor: 20_000,
        travelMinor: 0,
        mileageMinor: 0,
        taxMinor: 0,
        paymentMethod: "mastercard",
        jurisdiction: "CA-ON",
        marketplaceFee: fee,
        surcharge: {
          enabled: true,
          jurisdiction: "CA-ON",
          legalApprovalReference: null,
          processorApprovalReference: null,
          ratePartsPerMillion: 10_000
        }
      })
    ).toThrow("Payment-method surcharge approval is incomplete.");
  });
});
