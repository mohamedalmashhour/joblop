// R2-12b: map the CV-builder profile to the JSON Resume schema (https://jsonresume.org/schema), an open
// standard supported by many free, MIT-licensed themes. Exporting this lets a worker render their CV with
// ANY JSON Resume theme (in-app theme rendering is a follow-up). Pure + deterministic so it is unit-tested.

export type CvProfile = Readonly<{
  fullName: string;
  headline: string;
  location: string;
  summary: string;
  skills: readonly string[];
  languages: readonly string[];
  certifications: readonly string[];
  education: ReadonlyArray<{ credential: string; institution: string; year: string }>;
  experience: ReadonlyArray<{ role: string; employer: string; start: string; highlights: readonly string[] }>;
}>;

export type JsonResume = Readonly<{
  $schema: string;
  basics: { name: string; label: string; summary: string; location: { city: string; region: string } };
  work: ReadonlyArray<{ name: string; position: string; startDate?: string; highlights: readonly string[] }>;
  education: ReadonlyArray<{ institution: string; studyType: string; endDate?: string }>;
  skills: ReadonlyArray<{ name: string }>;
  languages: ReadonlyArray<{ language: string }>;
  certificates: ReadonlyArray<{ name: string }>;
}>;

// "City, Region" → { city, region }; falls back gracefully when there's no comma.
function splitLocation(location: string): { city: string; region: string } {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { city: parts[0] ?? "", region: parts.slice(1).join(", ") };
  return { city: parts[0] ?? "", region: "" };
}

export function toJsonResume(profile: CvProfile): JsonResume {
  return {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics: {
      name: profile.fullName.trim(),
      label: profile.headline.trim(),
      summary: profile.summary.trim(),
      location: splitLocation(profile.location)
    },
    work: profile.experience
      .filter((e) => e.employer.trim() || e.role.trim())
      .map((e) => ({
        name: e.employer.trim(),
        position: e.role.trim(),
        ...(e.start.trim() ? { startDate: e.start.trim() } : {}),
        highlights: e.highlights.filter((h) => h.trim())
      })),
    education: profile.education
      .filter((ed) => ed.credential.trim() || ed.institution.trim())
      .map((ed) => ({
        institution: ed.institution.trim(),
        studyType: ed.credential.trim(),
        ...(ed.year.trim() ? { endDate: ed.year.trim() } : {})
      })),
    skills: profile.skills.filter((s) => s.trim()).map((s) => ({ name: s.trim() })),
    languages: profile.languages.filter((l) => l.trim()).map((l) => ({ language: l.trim() })),
    certificates: profile.certifications.filter((c) => c.trim()).map((c) => ({ name: c.trim() }))
  };
}
