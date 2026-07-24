import { describe, expect, it } from "vitest";
import {
  canSubmitOnboarding,
  getOnboardingCompletionScore,
  onboardingDataTruth,
  onboardingTruthBoundaries,
  workerOnboardingFlow,
  workerOnboardingStatuses,
  workerProfileSections
} from "./workerOnboardingContent";

describe("worker onboarding content", () => {
  it("connects public entry through worker dashboard", () => {
    expect(workerOnboardingFlow.map((step) => step.screen)).toEqual([
      "home",
      "worker-signup",
      "worker-profile-setup",
      "worker-qualifications-setup",
      "worker-availability-setup",
      "worker-onboarding-review",
      "worker-dashboard"
    ]);
  });

  it("includes required truthful onboarding states", () => {
    expect(workerOnboardingStatuses).toEqual([
      "Not Started",
      "In Progress",
      "Submitted",
      "Review Pending",
      "Information Required",
      "Verified",
      "Rejected",
      "Expired",
      "Renewal Required"
    ]);
  });

  it("covers identity, roles, qualifications, service area, availability, and preferences", () => {
    const allFields = workerProfileSections.flatMap((section) => section.fields);
    expect(allFields).toContain("legal name");
    expect(allFields).toContain("role or roles");
    expect(allFields).toContain("certifications");
    expect(allFields).toContain("service area");
    expect(allFields).toContain("availability calendar");
    expect(allFields).toContain("minimum acceptable rate");
  });

  it("preserves verification and eligibility boundaries", () => {
    expect(onboardingTruthBoundaries).toContain("Submitted != Verified");
    expect(onboardingTruthBoundaries).toContain("Document Uploaded != Document Approved");
    expect(onboardingTruthBoundaries).toContain("Profile Complete != Eligible for Every Shift");
  });

  it("labels fixture and integration-pending behavior", () => {
    expect(onboardingDataTruth).toContain("Fixture-backed worker onboarding data");
    expect(onboardingDataTruth).toContain("No identity verification integration");
    expect(onboardingDataTruth).toContain("No credential approval integration");
  });

  it("summarizes completion without claiming universal eligibility", () => {
    expect(getOnboardingCompletionScore()).toBe(50);
    expect(canSubmitOnboarding(["In Progress", "Submitted", "Review Pending"])).toBe(true);
    expect(canSubmitOnboarding(["Submitted", "Rejected"])).toBe(false);
  });
});
