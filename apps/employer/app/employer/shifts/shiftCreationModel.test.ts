import { describe, expect, it } from "vitest";
import {
  defaultShiftDraft,
  markPublicationRequested,
  markPublishedFixture,
  shiftCreationHandoffs,
  shiftDataStates,
  shiftOperationalStates,
  validateShiftDraft
} from "./shiftCreationModel";

describe("shift creation workflow model", () => {
  it("validates a complete development fixture as ready", () => {
    expect(validateShiftDraft(defaultShiftDraft)).toEqual({
      missing: [],
      state: "Ready"
    });
  });

  it("reports missing required fields without publishing", () => {
    const result = validateShiftDraft({ ...defaultShiftDraft, role: "", rate: "" });
    expect(result.state).toBe("Validation Required");
    expect(result.missing).toEqual(["role", "rate"]);
  });

  it("separates publication requested from published fixture state", () => {
    expect(markPublicationRequested(defaultShiftDraft).publicationState).toBe("Publication Requested");
    expect(markPublishedFixture(defaultShiftDraft).publicationState).toBe("Published");
  });

  it("connects review, publish, detail, and applicants without dead ends", () => {
    expect(shiftCreationHandoffs.map((handoff) => handoff.route)).toEqual([
      "/employer/shifts/review",
      "/employer/shifts/publish",
      "/employer/shifts/detail",
      "/employer/applicants"
    ]);
  });

  it("covers the required operational states truthfully", () => {
    expect(shiftOperationalStates).toContain("Applications Open");
    expect(shiftOperationalStates).toContain("Replacement Required");
    expect(shiftOperationalStates).toContain("Unfilled");
  });

  it("labels fixture-backed data and integration status", () => {
    expect(shiftDataStates).toContain("Development fixture");
    expect(shiftDataStates).toContain("No server persistence");
    expect(shiftDataStates).toContain("No backend publication");
  });
});

