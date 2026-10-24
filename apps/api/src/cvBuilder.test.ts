import { describe, expect, it } from "vitest";
import { createSyntheticCvProvider, matchSkillsToJob, type WorkerCvProfile, type TargetJob } from "./cvBuilder";

const profile: WorkerCvProfile = {
  fullName: "Marie Tremblay",
  headline: "Chef de cuisine",
  location: "Laval, QC",
  email: "marie@example.ca",
  summary: "10 years leading busy kitchen brigades.",
  skills: ["Menu design", "Food safety (MAPAQ)", "Team leadership", "Cost control", "Pastry"],
  languages: ["Français", "English"],
  experience: [
    { role: "Sous-chef", employer: "Bistro Laval", start: "2019", end: null, highlights: ["Ran dinner service for 120 covers"] }
  ],
  education: [{ credential: "DEP Cuisine", institution: "ITHQ", year: "2014" }]
};

const chefJob: TargetJob = {
  title: "Chef de cuisine",
  employer: "Pain Toasté",
  description: "Seeking a chef with strong menu design, team leadership and food safety knowledge.",
  city: "Montréal"
};

describe("matchSkillsToJob", () => {
  it("returns skills whose text appears in the job (accent/case-insensitive)", () => {
    const m = matchSkillsToJob(profile.skills, chefJob);
    expect(m).toContain("Menu design");
    expect(m).toContain("Team leadership");
    expect(m).not.toContain("Pastry");
  });
  it("returns nothing without a job", () => {
    expect(matchSkillsToJob(profile.skills, null)).toEqual([]);
  });
});

describe("createSyntheticCvProvider", () => {
  it("generates a tailored CV that lists relevant skills first and a cover letter naming the job", async () => {
    const cv = await createSyntheticCvProvider().generate({ profile, job: chefJob });
    expect(cv.provider).toBe("synthetic-offline");
    expect(cv.tailoredTo).toBe("Chef de cuisine");
    expect(cv.matchedSkills).toContain("Menu design");
    expect(cv.cvMarkdown).toContain("# Marie Tremblay");
    expect(cv.cvMarkdown).toContain("Skills relevant to this role");
    expect(cv.coverLetterMarkdown).toContain("Chef de cuisine");
    expect(cv.coverLetterMarkdown).toContain("Pain Toasté");
    expect(cv.coverLetterMarkdown).toContain("Marie Tremblay");
  });

  it("renders uploaded certifications in their own section", async () => {
    const cv = await createSyntheticCvProvider().generate({
      profile: { ...profile, certifications: ["Food safety (MAPAQ)", "RCR / First aid"] },
      job: chefJob
    });
    expect(cv.cvMarkdown).toContain("## Certifications");
    expect(cv.cvMarkdown).toContain("Food safety (MAPAQ)");
    expect(cv.cvMarkdown).toContain("RCR / First aid");
  });

  it("produces a general CV with no target job", async () => {
    const cv = await createSyntheticCvProvider().generate({ profile });
    expect(cv.tailoredTo).toBeNull();
    expect(cv.matchedSkills).toEqual([]);
    expect(cv.cvMarkdown).toContain("## Skills");
  });

  it("honours French output", async () => {
    const cv = await createSyntheticCvProvider().generate({ profile: { ...profile, language: "fr" }, job: chefJob });
    expect(cv.cvMarkdown).toContain("## Compétences pertinentes pour ce poste");
    expect(cv.coverLetterMarkdown).toContain("Cordialement");
  });
});
