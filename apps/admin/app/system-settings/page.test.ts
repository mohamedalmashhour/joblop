import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiProhibited,
  page071BoundaryStatements,
  protectedActions,
  settingRecords,
  statusPanels
} from "./systemSettingsContent";

describe("Page 071 System Settings governance content", () => {
  it("preserves the approved system settings boundary statements", () => {
    expect(page071BoundaryStatements).toEqual([
      "Setting proposed != Setting active",
      "Feature flag != Product approval",
      "Configuration visibility != Authority to modify",
      "System setting != Legal policy",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps settings visible without exposing secrets or activating configuration", () => {
    expect(settingRecords.some((record) => record.settingState.includes("proposed"))).toBe(true);
    expect(settingRecords.some((record) => record.featureFlag.includes("reference"))).toBe(true);
    expect(settingRecords.some((record) => record.privacy.includes("secrets"))).toBe(true);
    expect(settingRecords.some((record) => record.approvalRequirement.includes("required"))).toBe(
      true
    );
  });

  it("uses governed handoffs instead of direct configuration or infrastructure changes", () => {
    expect(protectedActions).toContain("Open change-control workflow");
    expect(protectedActions).toContain("Open feature flag reference");
    expect(protectedActions).toContain("Request governed export");
    expect(aiProhibited).toContain("Activate settings");
    expect(aiProhibited).toContain("Modify configuration");
    expect(aiProhibited).toContain("Reveal runtime secrets");
    expect(aiProhibited).toContain("Run database migrations");
    expect(aiProhibited).toContain("Write authoritative state");
  });

  it("allows AI only to explain visible setting summaries and route to owner workflows", () => {
    expect(aiAllowed).toEqual([
      "Summarize visible settings",
      "Explain configuration policies",
      "Identify missing information",
      "Draft human-reviewed settings notes",
      "Suggest navigation to owner workflows",
      "Compare governed configuration options"
    ]);
  });

  it("includes all required truthful system settings states", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Partial data",
      "Access denied",
      "Service error",
      "Unavailable source",
      "Conflicting state",
      "Workflow handoff unavailable",
      "Export unavailable",
      "Audit unavailable",
      "Restricted record"
    ]);
  });
});
