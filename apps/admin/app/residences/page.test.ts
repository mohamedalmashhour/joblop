import { describe, expect, it } from "vitest";
import {
  aiProhibited,
  page065BoundaryStatements,
  protectedActions,
  residenceRecords,
  statusPanels
} from "./residencesContent";

describe("Page 065 Residences governance content", () => {
  it("preserves the approved residence boundary statements", () => {
    expect(page065BoundaryStatements).toEqual([
      "Residence != Employer",
      "Residence active != Staffing request approved",
      "Residence location != Worker tracking",
      "Residence requirements != Worker eligibility decision",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps residence summaries separate from employer, shift, and private resident authority", () => {
    expect(residenceRecords.map((residence) => residence.lifecycle)).toContain("Restricted");
    expect(
      residenceRecords.some((residence) => residence.staffingSummary.includes("summary"))
    ).toBe(true);
    expect(
      residenceRecords.some((residence) =>
        residence.privacy.includes("Sensitive operational reason")
      )
    ).toBe(true);
  });

  it("requires governed handoffs instead of direct neighboring workflow execution", () => {
    expect(protectedActions).toContain("Open source workflow");
    expect(protectedActions).toContain("Request governed export");
    expect(aiProhibited).toContain("Alter staffing requirements");
    expect(aiProhibited).toContain("Assign workers");
    expect(aiProhibited).toContain("Write authoritative state");
  });

  it("includes empty, denied, stale, partial, and service-error states", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Empty state",
      "Stale data",
      "Access denied",
      "Partial data",
      "Service error"
    ]);
  });
});
