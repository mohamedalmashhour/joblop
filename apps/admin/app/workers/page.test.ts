import { describe, expect, it } from "vitest";
import {
  aiProhibited,
  page063BoundaryStatements,
  protectedActions,
  statusPanels,
  workerRecords
} from "./workersContent";

describe("Page 063 Workers governance content", () => {
  it("preserves the approved worker boundary statements", () => {
    expect(page063BoundaryStatements).toEqual([
      "User != Worker",
      "Worker profile != User account",
      "Worker active != Available",
      "Available != Eligible",
      "Eligible != Assigned",
      "Document submitted != Verified",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps worker summaries separate from hidden sensitive details", () => {
    expect(workerRecords.every((worker) => worker.maskedName.length <= 5)).toBe(true);
    expect(
      workerRecords.some((worker) => worker.privacy.includes("Sensitive reason not displayed"))
    ).toBe(true);
    expect(workerRecords.map((worker) => worker.freshness)).toContain("Stale");
  });

  it("requires governed handoffs instead of direct authority", () => {
    expect(protectedActions).toContain("Open source workflow");
    expect(protectedActions).toContain("Request governed export");
    expect(aiProhibited).toContain("Assign workers");
    expect(aiProhibited).toContain("Write authoritative state");
  });

  it("includes empty, denied, stale, and partial states", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Empty state",
      "Stale data",
      "Access denied",
      "Partial data"
    ]);
  });
});
