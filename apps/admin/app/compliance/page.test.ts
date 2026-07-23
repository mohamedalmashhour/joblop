import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiProhibited,
  complianceRecords,
  page069BoundaryStatements,
  protectedActions,
  statusPanels
} from "./complianceContent";

describe("Page 069 Compliance governance content", () => {
  it("preserves the approved compliance boundary statements", () => {
    expect(page069BoundaryStatements).toEqual([
      "Compliance flag != Misconduct",
      "Policy warning != Legal conclusion",
      "Verification summary != Source evidence",
      "Exception review != Automatic restriction",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps compliance summaries masked and separate from authoritative evidence", () => {
    expect(complianceRecords.every((record) => record.evidence.includes("Masked"))).toBe(true);
    expect(complianceRecords.some((record) => record.verification.includes("summary"))).toBe(true);
    expect(complianceRecords.some((record) => record.exception.includes("does not restrict"))).toBe(
      true
    );
    expect(complianceRecords.some((record) => record.privacy.includes("identity documents"))).toBe(
      true
    );
  });

  it("uses governed handoffs instead of credential verification, discipline, or legal action", () => {
    expect(protectedActions).toContain("Open credential owner workflow");
    expect(protectedActions).toContain("Open policy reference");
    expect(protectedActions).toContain("Request governed export");
    expect(aiProhibited).toContain("Approve compliance");
    expect(aiProhibited).toContain("Verify credentials");
    expect(aiProhibited).toContain("Suspend workers");
    expect(aiProhibited).toContain("Initiate investigations");
    expect(aiProhibited).toContain("Change authoritative records");
  });

  it("allows AI only to explain visible compliance summaries and route to owner workflows", () => {
    expect(aiAllowed).toEqual([
      "Summarize compliance status",
      "Explain compliance categories",
      "Identify missing information",
      "Draft human-reviewed compliance notes",
      "Suggest navigation to owner workflows"
    ]);
  });

  it("includes all required truthful states including review pending and freshness handling", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Partial data",
      "Denied state",
      "Service error",
      "Unavailable state",
      "Delayed state",
      "Restricted state",
      "Review pending"
    ]);
  });
});
