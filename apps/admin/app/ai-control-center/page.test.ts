import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiGovernanceRecords,
  aiProhibited,
  page073BoundaryStatements,
  protectedActions,
  statusPanels
} from "./aiControlCenterContent";

describe("Page 073 AI Control Center governance content", () => {
  it("preserves the approved AI control center boundary statements", () => {
    expect(page073BoundaryStatements).toEqual([
      "AI enabled != Autonomous authority",
      "Simulation != Live recommendation",
      "Recommendation != Decision",
      "Guardrail warning != Workflow action",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps AI summaries masked and separate from authoritative workflow actions", () => {
    expect(
      aiGovernanceRecords.every(
        (record) => record.evidence.includes("Masked") || record.evidence.includes("unavailable")
      )
    ).toBe(true);
    expect(aiGovernanceRecords.some((record) => record.boundary.includes("human-reviewed"))).toBe(
      true
    );
    expect(aiGovernanceRecords.some((record) => record.confidence.includes("not approval"))).toBe(
      true
    );
    expect(aiGovernanceRecords.some((record) => record.simulation.includes("Simulation !="))).toBe(
      true
    );
    expect(
      aiGovernanceRecords.every(
        (record) => record.privacy.includes("hidden") || record.privacy.includes("No prompts")
      )
    ).toBe(true);
  });

  it("uses governed handoffs instead of AI execution, prompt/model changes, or operational mutation", () => {
    expect(protectedActions).toContain("Request AI policy review");
    expect(protectedActions).toContain("Open guardrail owner workflow");
    expect(protectedActions).toContain("Open evidence source reference");
    expect(aiProhibited).toContain("Execute AI actions");
    expect(aiProhibited).toContain("Change AI models");
    expect(aiProhibited).toContain("Alter prompts");
    expect(aiProhibited).toContain("Modify source records");
  });

  it("allows AI only to explain visible governance records and route to owner workflows", () => {
    expect(aiAllowed).toEqual([
      "Summarize visible AI governance records",
      "Explain AI policy summaries",
      "Identify missing governance information",
      "Draft human-reviewed AI notes",
      "Suggest navigation to owner workflows",
      "Compare governed AI options"
    ]);
  });

  it("includes every required truthful AI control center state", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Partial data",
      "Unavailable state",
      "Restricted state",
      "Access denied",
      "Service error",
      "Policy unavailable",
      "AI unavailable"
    ]);
  });
});
