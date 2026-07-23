import { describe, expect, it } from "vitest";
import {
  aiAllowed,
  aiProhibited,
  page070BoundaryStatements,
  protectedActions,
  reportRecords,
  statusPanels
} from "./reportsContent";

describe("Page 070 Reports governance content", () => {
  it("preserves the approved reports boundary statements", () => {
    expect(page070BoundaryStatements).toEqual([
      "Report != Source record",
      "Report export != Unlimited retention",
      "Metric != Decision",
      "Freshness warning != Source correction",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps report summaries minimum-necessary and separate from source records", () => {
    expect(reportRecords.every((record) => record.summary.includes("summary"))).toBe(true);
    expect(reportRecords.some((record) => record.sourceFreshness.includes("Stale"))).toBe(true);
    expect(reportRecords.some((record) => record.exportState.includes("Export expired"))).toBe(
      true
    );
    expect(reportRecords.some((record) => record.privacy.includes("raw protected datasets"))).toBe(
      true
    );
  });

  it("uses governed handoffs instead of direct workflow modification or export infrastructure", () => {
    expect(protectedActions).toContain("Request report generation");
    expect(protectedActions).toContain("Open source owner workflow");
    expect(protectedActions).toContain("Request governed export");
    expect(aiProhibited).toContain("Modify source records");
    expect(aiProhibited).toContain("Distribute reports");
    expect(aiProhibited).toContain("Expose restricted information");
    expect(aiProhibited).toContain("Write authoritative state");
  });

  it("allows AI only to explain visible reports and suggest governed navigation", () => {
    expect(aiAllowed).toEqual([
      "Summarize visible reports",
      "Explain report definitions",
      "Identify missing or stale data",
      "Compare governed report periods",
      "Draft human-reviewed report notes",
      "Suggest navigation"
    ]);
  });

  it("includes all required freshness, generation, export, restricted, and empty states", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Partial data",
      "Access denied",
      "Service error",
      "Unavailable source",
      "Delayed generation",
      "Generation failed",
      "Restricted report",
      "Export unavailable",
      "Export expired",
      "No matching results"
    ]);
  });
});
