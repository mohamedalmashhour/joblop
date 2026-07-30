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
      "Pending",
      "Authorized",
      "Processing",
      "Succeeded",
      "Failed",
      "Cancelled",
      "Partially Refunded",
      "Refunded",
      "Disputed"
    ]);
  });

  it("keeps authorization, settlement, and worker payable separate", () => {
    expect(paymentBoundaries).toContain("Authorized != Succeeded");
    expect(paymentBoundaries).toContain("Succeeded employer payment != Worker paid");
    expect(paymentFixture.workerPayableBoundary).toContain("does not confirm worker payable");
  });

  it("shows intended methods without claiming integration or exposing credentials", () => {
    expect(paymentDataTruth).toContain("Stripe is intended but not connected; local fake provider active");
    expect(paymentDataTruth).toContain("No Québec payment-method surcharge");
    expect(paymentDataTruth).toContain("No real charge execution");
    expect(paymentFixture.maskedDetails).toBe("Synthetic provider token alias only");
    expect(paymentFixture.methodSummary).toContain("Mastercard");
    expect(paymentFixture.alternativeMethod).toContain("ACSS");
  });

  it("marks failed payment as employer action without provider integration", () => {
    const summary = getPaymentStateSummary("Failed");
    expect(summary.requiresEmployerAction).toBe(true);
    expect(summary.providerIntegrated).toBe(false);
  });
});
