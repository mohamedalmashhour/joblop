import { describe, expect, it } from "vitest";
import {
  employerPaymentStates,
  getPaymentStateSummary,
  paymentBoundaries,
  paymentDataTruth,
  paymentFixture,
  paymentWorkflow
} from "./paymentWorkflowContent";

describe("Employer payment state workflow content", () => {
  it("connects invoice detail to reports handoff", () => {
    expect(paymentWorkflow.map((step) => step.route)).toEqual([
      "/employer/payments",
      "/employer/payments/method",
      "/employer/payments/authorization",
      "/employer/payments/settlement",
      "/employer/payments/receipt",
      "/employer/payments/exceptions",
      "/employer/reports"
    ]);
  });

  it("includes required employer payment states", () => {
    expect(employerPaymentStates).toEqual([
      "Not Started",
      "Method Required",
      "Authorization Pending",
      "Authorized",
      "Processing",
      "Settled",
      "Failed",
      "Retry Required",
      "Refunded",
      "Disputed"
    ]);
  });

  it("keeps authorization, settlement, and worker payable separate", () => {
    expect(paymentBoundaries).toContain("Authorized != Settled");
    expect(paymentBoundaries).toContain("Settled employer payment != Worker paid");
    expect(paymentFixture.workerPayableBoundary).toContain("does not confirm worker payable");
  });

  it("does not claim provider integration or expose credentials", () => {
    expect(paymentDataTruth).toContain("No payment provider selected");
    expect(paymentDataTruth).toContain("No real charge execution");
    expect(paymentDataTruth).toContain("No full payment credentials exposed");
    expect(paymentFixture.maskedDetails).toBe("**** **** **** 4242");
  });

  it("marks retry-required as employer action without provider integration", () => {
    const summary = getPaymentStateSummary("Retry Required");
    expect(summary.requiresEmployerAction).toBe(true);
    expect(summary.providerIntegrated).toBe(false);
  });
});
