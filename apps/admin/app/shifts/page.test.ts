import { describe, expect, it } from "vitest";
import {
  aiProhibited,
  page066BoundaryStatements,
  protectedActions,
  shiftRecords,
  statusPanels
} from "./shiftsContent";

describe("Page 066 Shifts governance content", () => {
  it("preserves the approved shift boundary statements", () => {
    expect(page066BoundaryStatements).toEqual([
      "Shift record != Assignment",
      "Scheduled shift != Worked shift",
      "Shift state != Payroll state",
      "Shift exception != Fault finding",
      "Visibility != Authority",
      "Permission != Completed approval",
      "Summary != Source of truth",
      "AI suggestion != Human decision"
    ]);
  });

  it("keeps shift summaries separate from assignment, attendance, and payroll authority", () => {
    expect(shiftRecords.map((shift) => shift.lifecycle)).toContain("Published");
    expect(
      shiftRecords.some((shift) => shift.assignment.includes("No worker assigned by this page"))
    ).toBe(true);
    expect(shiftRecords.some((shift) => shift.privacy.includes("Sensitive exception reason"))).toBe(
      true
    );
  });

  it("requires governed handoffs instead of direct neighboring workflow execution", () => {
    expect(protectedActions).toContain("Open source workflow");
    expect(protectedActions).toContain("Request governed export");
    expect(aiProhibited).toContain("Assign workers");
    expect(aiProhibited).toContain("Approve attendance");
    expect(aiProhibited).toContain("Calculate payroll");
  });

  it("includes loading, empty, denied, stale, partial, and service-error states", () => {
    expect(statusPanels.map((panel) => panel.title)).toEqual([
      "Loading state",
      "Empty state",
      "Stale data",
      "Access denied",
      "Partial data",
      "Service error"
    ]);
  });
});
