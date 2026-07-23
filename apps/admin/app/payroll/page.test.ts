import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiProhibited,
  page068BoundaryStatements,
  payrollRecords,
  protectedActions,
  statusPanels
} from "./payrollContent";

describe("Page 068 Payroll governance content", () => {
  it("preserves the approved payroll boundary statements", () => {
    expect(page068BoundaryStatements).toEqual([
      "Timesheet approval != Payroll",
      "Payroll ready != Payment sent",
      "Payroll hold != Worker fault",
      "Payroll summary != Tax advice",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps payroll summaries masked and separate from calculations, tax, and payments", () => {
    expect(payrollRecords.every((record) => record.amount.includes("Masked"))).toBe(true);
    expect(payrollRecords.some((record) => record.paymentState.includes("Not paid"))).toBe(true);
    expect(payrollRecords.some((record) => record.hold.includes("not worker fault"))).toBe(true);
    expect(payrollRecords.some((record) => record.privacy.includes("SIN"))).toBe(true);
  });

  it("uses governed handoffs instead of direct payroll, payment, banking, or tax execution", () => {
    expect(protectedActions).toContain("Open approved-hours handoff");
    expect(protectedActions).toContain("Open payroll exception workflow");
    expect(protectedActions).toContain("Request governed payroll export");
    expect(aiProhibited).toContain("Calculate payroll");
    expect(aiProhibited).toContain("Approve payroll");
    expect(aiProhibited).toContain("Release payments");
    expect(aiProhibited).toContain("Perform tax calculations");
    expect(aiProhibited).toContain("Execute bank transfers");
  });

  it("allows AI only to explain visible payroll summaries and route to owner workflows", () => {
    expect(aiAllowed).toEqual([
      "Summarize payroll status",
      "Explain payroll states",
      "Identify missing information",
      "Draft human-reviewed payroll notes",
      "Suggest navigation to owner workflows"
    ]);
  });

  it("includes all required truthful operational states for payroll visibility", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Partial data",
      "Denied state",
      "Service error",
      "Unavailable state",
      "Delayed state",
      "Restricted state"
    ]);
  });
});
