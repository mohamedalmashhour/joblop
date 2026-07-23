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
      "Helper",
      "Maintenance"
    ]);
  });

  it("separates worker and employer journeys", () => {
    expect(workerJourney).toEqual(["Discover shifts", "Apply", "Get approved", "Work", "Get paid"]);
    expect(employerJourney).toEqual([
      "Request staff",
      "AI-assisted matching",
      "Review candidates",
      "Confirm assignment",
      "Track shift",
      "Approve timesheet"
    ]);
  });

  it("shows worker value and trust mechanisms without fake proof", () => {
    expect(workerBenefits).toContain("Transparent earnings");
    expect(workerBenefits).toContain("Verified employers");
    expect(trustControls).toEqual([
      "Verified Healthcare Workers",
      "Credential Verification",
      "Background Checks",
      "Compliance Monitoring",
      "Attendance Verification",
      "Quality Assurance"
    ]);
  });
});
