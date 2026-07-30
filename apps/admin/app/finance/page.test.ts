import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiProhibited,
  page067BoundaryStatements,
  protectedActions,
  statusPanels
} from "./financeContent";
import { governedMutationLabels } from "./FinanceDataPanel";

describe("Page 067 Finance governance content", () => {
  it("preserves the approved finance boundary statements", () => {
    expect(page067BoundaryStatements).toEqual([
      "Finance summary != Accounting ledger",
      "Adjustment request != Approved adjustment",
      "Invoice reference != Invoice editing",
      "Payment status != Bank settlement truth",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps governed mutations explicitly disabled in the durable read integration", () => {
    expect(governedMutationLabels).toContain("Approve or issue invoice");
    expect(governedMutationLabels).toContain("Create or capture payment");
    expect(governedMutationLabels).toContain("Void or refund payment");
    expect(governedMutationLabels).toContain("Mark settlement or reconciliation complete");
  });

  it("uses governed handoffs instead of direct invoice, payment, payroll, or refund execution", () => {
    expect(protectedActions).toContain("Open invoice owner workflow");
    expect(protectedActions).toContain("Open payment owner workflow");
    expect(protectedActions).toContain("Review failed or unknown fake-provider attempt");
    expect(protectedActions).toContain("Request governed fake-provider retry or refund");
    expect(protectedActions).toContain("Request governed export");
    expect(aiProhibited).toContain("Approve invoices");
    expect(aiProhibited).toContain("Initiate payments");
    expect(aiProhibited).toContain("Calculate authoritative payroll");
    expect(aiProhibited).toContain("Issue refunds");
    expect(aiProhibited).toContain("Write authoritative finance state");
  });

  it("allows AI only to explain visible summaries and route to human-owned workflows", () => {
    expect(aiAllowed).toEqual([
      "Summarize visible financial information",
      "Explain finance status labels",
      "Identify missing or inconsistent summary data",
      "Draft human-reviewed finance notes",
      "Suggest navigation to owner workflows"
    ]);
  });

  it("includes all required truthful operational states for finance visibility", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Partial data",
      "Access denied",
      "Service error",
      "Unavailable source",
      "Delayed aggregation",
      "Restricted financial detail"
    ]);
  });
});
