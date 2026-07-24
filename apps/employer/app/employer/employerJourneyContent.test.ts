import { describe, expect, it } from "vitest";
import {
  accountBoundaries,
  accountTypeOutcomes,
  companyBoundaries,
  companyIdentityLayers,
  dashboardAttention,
  dashboardAvailableOrdersCalendar,
  dashboardBoundaries,
  dashboardOrderCalendar,
  dashboardRevenueCalendar,
  departmentBoundaries,
  departmentTypes,
  employerWorkflow,
  residenceBoundaries,
  residenceExamples
} from "./employerJourneyContent";

describe("Employer journey milestone content", () => {
  it("connects employer onboarding through the dashboard in product-flow order", () => {
    expect(employerWorkflow.map((step) => step.route)).toEqual([
      "/signup/employer",
      "/employer/onboarding/company",
      "/employer/onboarding/residences",
      "/employer/onboarding/departments",
      "/employer/dashboard"
    ]);
  });

  it("keeps account creation separate from approval and staffing access", () => {
    expect(accountTypeOutcomes).toContain("Activation does not guarantee worker availability.");
    expect(accountBoundaries).toContain("Account created does not equal employer approved.");
    expect(accountBoundaries).toContain(
      "Team access does not equal permission to create or approve every shift."
    );
  });

  it("keeps company, residence, and department concepts independent", () => {
    expect(companyIdentityLayers).toContain("Legal organization");
    expect(companyBoundaries).toContain("Verification does not equal operational approval.");
    expect(residenceBoundaries).toContain("Residence does not equal department.");
    expect(departmentBoundaries).toContain("Department does not equal shift.");
  });

  it("uses clearly labelled development fixtures and no patient/private records", () => {
    expect(residenceExamples.every((residence) => residence.name.includes("fixture"))).toBe(true);
    expect(residenceBoundaries).toContain("No resident or patient information is shown.");
  });

  it("keeps dashboard summaries advisory and routed to authoritative workflows", () => {
    expect(dashboardAttention.map((card) => card.title)).toContain("Urgent staffing needs");
    expect(dashboardBoundaries).toContain("Billing summary does not equal final invoice.");
    expect(dashboardBoundaries.join(" ")).toContain("AI suggestions are advisory");
  });

  it("shows separate employer calendars for available orders, order history, and revenue timing", () => {
    expect(dashboardAvailableOrdersCalendar.map((item) => item.state)).toContain("In review");
    expect(dashboardOrderCalendar.map((item) => item.state)).toContain("Action needed");
    expect(dashboardRevenueCalendar.map((item) => item.state)).toContain("Estimate");
    expect(dashboardRevenueCalendar.map((item) => item.detail)).toContain(
      "Generated from approved timesheets"
    );
  });

  it("keeps department setup configurable without professional authorization claims", () => {
    expect(departmentTypes).toContain("Kitchen");
    expect(departmentTypes).toContain("Maintenance");
    expect(departmentBoundaries).toContain(
      "Department manager does not equal payroll or compliance authority."
    );
  });
});
