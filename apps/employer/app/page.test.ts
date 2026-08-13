import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  employerJourney,
  staffingCategories,
  trustControls,
  workerBenefits,
  workerJourney
} from "./landingContent";

const landingSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

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

  it("routes public authentication through the sign-in capsule and gates production access", () => {
    expect(landingSource).toContain('isProduction ? "/signin"');
    expect(landingSource).toContain('isProduction ? "/contact" : "/signup/employer"');
    expect(landingSource).not.toContain('href="/employer/calendar" style={styles.ghostButton}');
  });

  it("presents the employer experience as JobLop", () => {
    expect(landingSource).toContain("JobLop");
    expect(landingSource).toContain("Mobile-first staffing without hidden employer economics.");
    expect(landingSource).not.toContain("Resident Job");
    expect(landingSource).not.toContain("Resident Workforce OS home");
  });

  it("labels the public staging landing page without changing production access", () => {
    expect(landingSource).toContain('process.env.RWOS_ENV === "staging"');
    expect(landingSource).toContain('process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER === "staging"');
    expect(landingSource).toContain("STAGING");
    expect(landingSource).toContain("SYNTHETIC DATA");
    expect(landingSource).toContain("NO REAL PAYMENT");
    expect(landingSource).toContain("NO PRODUCTION CUSTOMER DATA");
  });

  it("provides a real FAQ destination for every preview", () => {
    expect(landingSource).toContain('href="/faq" style={styles.textLink}');
    expect(landingSource).not.toContain("Answer preview links to the governed FAQ page.");
  });
});
