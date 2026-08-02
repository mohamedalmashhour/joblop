import { describe, expect, it } from "vitest";
import {
  aiBoundary,
  operatingPhilosophy,
  platformCapabilities,
  servedOrganizations,
  trustMechanisms,
  trustStatements
} from "./aboutContent";

const pageCopy = [
  ...trustMechanisms.flatMap((mechanism) => [mechanism.title, mechanism.text]),
  ...operatingPhilosophy,
  ...platformCapabilities,
  ...servedOrganizations,
  ...trustStatements.flatMap((statement) => [statement.audience, statement.text]),
  ...aiBoundary
].join(" ");

describe("Page 002 about content", () => {
  it("implements the approved trust mechanisms without unsupported proof", () => {
    expect(trustMechanisms.map((mechanism) => mechanism.title)).toEqual([
      "Verified worker onboarding",
      "Credential verification workflow",
      "Background check process",
      "Attendance verification",
      "Secure document handling",
      "Human oversight",
      "Operational transparency",
      "Auditability"
    ]);

    expect(pageCopy).not.toMatch(/testimonial|industry leader|thousands|certified platform/i);
  });

  it("keeps AI advisory and separated from final decisions", () => {
    expect(aiBoundary).toContain("AI can prepare recommendations.");
    expect(aiBoundary).toContain("AI cannot dispatch workers automatically.");
    expect(aiBoundary).toContain("AI cannot approve pay or final operational decisions.");
  });

  it("preserves country-neutral about-page copy", () => {
    expect(pageCopy).not.toMatch(/Canada|Syria|HIPAA|PIPEDA|province|state law/i);
  });

  it("covers the approved JobLop Phase 1 employer sectors", () => {
    expect(servedOrganizations).toEqual([
      "Hospitals",
      "Senior residences",
      "Hotels",
      "Restaurants",
      "Factories",
      "Temporary staffing agencies"
    ]);
  });

  it("keeps billing and worker compensation separated at the about-page level", () => {
    expect(operatingPhilosophy).toContain("Separate billing from compensation");
    expect(platformCapabilities).toContain("Billing and worker-pay separation");
  });
});
