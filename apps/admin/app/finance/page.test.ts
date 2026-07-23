import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiProhibited,
  financeRecords,
  page067BoundaryStatements,
  protectedActions,
  statusPanels
} from "./financeContent";

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

  it("keeps finance summaries masked and separate from authoritative finance records", () => {
    expect(financeRecords.every((record) => record.amount.includes("Masked"))).toBe(true);
    expect(financeRecords.some((record) => record.invoice.includes("not editable"))).toBe(true);
    expect(
      financeRecords.some((record) => record.payment.includes("settlement not confirmed"))
    ).toBe(true);
    expect(financeRecords.some((record) => record.privacy.includes("bank"))).toBe(true);
  });

  it("uses governed handoffs instead of direct invoice, payment, payroll, or refund execution", () => {
    expect(protectedActions).toContain("Open invoice owner workflow");
    expect(protectedActions).toContain("Open payment owner workflow");
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
