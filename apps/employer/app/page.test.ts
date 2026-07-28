import { describe, expect, it } from "vitest";
import {
  employerJourney,
  staffingCategories,
  trustControls,
  workerBenefits,
  workerJourney
} from "./landingContent";

describe("Page 001 landing content", () => {
  it("keeps the approved staffing categories visible", () => {
    expect(staffingCategories.map((category) => category.name)).toEqual([
      "Kitchen",
      "Care / Nurse",
      "Housekeeping & Dining",
      "Maintenance"
    ]);
    expect(staffingCategories[0]?.roles).toContain("Chef diplômé");
    expect(staffingCategories[1]?.roles).toContain("Préposé(e) aux bénéficiaires");
  });

  it("separates worker and employer journeys", () => {
    expect(workerJourney).toEqual([
      "Sign in",
      "Review owned offer",
      "Accept or decline",
      "See confirmed assignment",
      "Continue to attendance handoff"
    ]);
    expect(employerJourney).toEqual([
      "Create request",
      "Submit for review",
      "Correct if requested",
      "Track staffing progress",
      "See confirmed assignments"
    ]);
  });

  it("shows worker value and trust mechanisms without fake proof", () => {
    expect(workerBenefits).toContain("Private offer visibility");
    expect(workerBenefits).toContain("Truthful empty states");
    expect(trustControls).toEqual([
      "Database-backed roles",
      "Tenant isolation",
      "Worker-owned records",
      "Human dispatch review",
      "Version conflict checks",
      "Attendance handoff boundary"
    ]);
  });
});
