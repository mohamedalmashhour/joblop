import { describe, expect, it } from "vitest";
import {
  aiSuggestionBoundaries,
  aiSuggestionInputs,
  conflictWarnings,
  publishedShiftRows,
  qualificationTypes,
  recurrenceBoundaries,
  recurringLifecycles,
  scheduleWarnings,
  shiftBoundaries,
  shiftLifecycle,
  shiftWorkflow,
  urgentBoundaries,
  urgentLevels
} from "./shiftManagementContent";

describe("Employer shift management milestone content", () => {
  it("connects shift management in product-flow order", () => {
    expect(shiftWorkflow.map((step) => step.route)).toEqual([
      "/employer/shifts/create",
      "/employer/shifts/recurring",
      "/employer/shifts/urgent",
      "/employer/shifts/published",
      "/employer/shifts/ai-suggestions"
    ]);
  });

  it("keeps shift lifecycle states independent", () => {
    expect(shiftLifecycle).toContain("Publication Requested");
    expect(shiftLifecycle).toContain("Downstream Attendance / Timesheet / Payroll Workflows");
    expect(shiftBoundaries).toContain("Published != Filled");
    expect(shiftBoundaries).toContain("Configured rate != Payroll");
  });

  it("keeps scheduling, qualifications, and conflicts truthful", () => {
    expect(scheduleWarnings).toContain("Actual worked time is recorded later through attendance workflows.");
    expect(qualificationTypes).toContain("Background check");
    expect(conflictWarnings).toContain("Publication conflict");
  });

  it("separates recurring templates, occurrences, and exceptions", () => {
    expect(recurringLifecycles.map((lifecycle) => lifecycle.title)).toEqual([
      "Template lifecycle",
      "Occurrence lifecycle",
      "Exception lifecycle"
    ]);
    expect(recurrenceBoundaries).toContain("Template != Occurrence");
  });

  it("keeps urgent staffing from bypassing governance", () => {
    expect(urgentLevels).toContain("Critical Operational Need");
    expect(urgentBoundaries).toContain("Urgency != Permission to bypass governance");
    expect(urgentBoundaries).toContain("Priority review != Coverage confirmed");
  });

  it("keeps published shifts and AI suggestions non-authoritative", () => {
    expect(publishedShiftRows.every((row) => row.boundary.includes("!="))).toBe(true);
    expect(aiSuggestionInputs).toContain("verified qualifications");
    expect(aiSuggestionBoundaries).toContain("AI recommendation != Human decision");
    expect(aiSuggestionBoundaries).toContain(
      "Protected characteristics and retaliation signals are excluded"
    );
  });
});

