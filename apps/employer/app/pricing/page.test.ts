import { describe, expect, it } from "vitest";
import {
  aiFinancialBoundary,
  authorizationTimeline,
  calculatorInputs,
  estimateComponents,
  estimateFlow,
  pricingModels,
  transparencyPrinciples
} from "./pricingContent";

const pricingCopy = [
  ...pricingModels,
  ...transparencyPrinciples,
  ...authorizationTimeline,
  ...estimateFlow,
  ...estimateComponents,
  ...calculatorInputs,
  ...aiFinancialBoundary
].join(" ");

describe("Page 004 pricing content", () => {
  it("separates authorization from final charge", () => {
    expect(authorizationTimeline).toEqual([
      "Payment authorization",
      "Shift confirmed",
      "Worker check-in",
      "Worker check-out",
      "Employer timesheet review",
      "Approved adjustments",
      "Final charge calculation",
      "Invoice",
      "Settlement"
    ]);
  });

  it("keeps estimate, worked hours, adjustments, and invoice distinct", () => {
    expect(estimateFlow).toEqual([
      "Estimated cost",
      "Actual hours worked",
      "Approved adjustments",
      "Final invoice"
    ]);
  });

  it("protects financial governance boundaries", () => {
    expect(transparencyPrinciples).toContain("Workers and employers have separate financial records");
    expect(aiFinancialBoundary).toContain("AI does not make financial decisions.");
    expect(aiFinancialBoundary).toContain(
      "AI does not calculate payroll or provide legal, tax, accounting, or payroll advice."
    );
  });

  it("does not introduce forbidden pricing offers or hardcoded public fees", () => {
    expect(pricingCopy).not.toMatch(/coupon|discount|subscription|commission|guaranteed rate/i);
    expect(pricingCopy).not.toMatch(/\$\d|%\s*platform|fixed tariff/i);
  });

  it("keeps the pricing page country-neutral", () => {
    expect(pricingCopy).not.toMatch(/Canada|Syria|province|state law|GST|HST|VAT/i);
  });
});

