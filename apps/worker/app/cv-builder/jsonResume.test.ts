import { describe, expect, it } from "vitest";
import { toJsonResume, type CvProfile } from "./jsonResume";

const sample: CvProfile = {
  fullName: "  Marie Dupont  ",
  headline: "Kitchen / Chef",
  location: "Laval, QC",
  summary: "5–10 years of experience as Kitchen / Chef.",
  skills: ["Grill & sauté", "", "Food safety (MAPAQ)"],
  languages: ["Français", "English"],
  certifications: ["MAPAQ", ""],
  education: [{ credential: "DEP (vocational)", institution: "", year: "2015" }],
  experience: [{ role: "Chef", employer: "Restaurant X", start: "", highlights: [] }]
};

describe("toJsonResume", () => {
  it("maps the CV profile to a valid JSON Resume object", () => {
    const r = toJsonResume(sample);
    expect(r.$schema).toContain("resume-schema");
    expect(r.basics.name).toBe("Marie Dupont");
    expect(r.basics.label).toBe("Kitchen / Chef");
    expect(r.basics.location).toEqual({ city: "Laval", region: "QC" });
    expect(r.work).toEqual([{ name: "Restaurant X", position: "Chef", highlights: [] }]);
    expect(r.education).toEqual([{ institution: "", studyType: "DEP (vocational)", endDate: "2015" }]);
    expect(r.skills).toEqual([{ name: "Grill & sauté" }, { name: "Food safety (MAPAQ)" }]);
    expect(r.languages).toEqual([{ language: "Français" }, { language: "English" }]);
    expect(r.certificates).toEqual([{ name: "MAPAQ" }]);
  });

  it("drops empty work/education rows and omits blank startDate", () => {
    const r = toJsonResume({ ...sample, experience: [{ role: "", employer: "", start: "", highlights: [] }], education: [] });
    expect(r.work).toEqual([]);
    expect(r.education).toEqual([]);
    expect(r.work.some((w) => "startDate" in w)).toBe(false);
  });

  it("handles a location with no region", () => {
    const r = toJsonResume({ ...sample, location: "Damascus" });
    expect(r.basics.location).toEqual({ city: "Damascus", region: "" });
  });
});
