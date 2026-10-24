// AI CV Builder capsule (dynamic offer engine / JobScanner funnel).
//
// Generates a tailored CV + cover letter for a worker, optionally targeted at a specific external job
// lead. The AI lives behind a PROVIDER SEAM (like the HR-6 AI payroll review): a deterministic
// SYNTHETIC provider works offline for tests and demos, and a real Claude-backed provider plugs in
// behind an API key later with no change to callers. Output is ADVISORY — the worker reviews and edits
// before anything is used; nothing is sent anywhere here.

export type CvExperience = Readonly<{
  role: string;
  employer: string;
  start: string; // free text, e.g. "2022"
  end?: string | null; // null/undefined = present
  highlights?: readonly string[];
}>;

export type CvEducation = Readonly<{ credential: string; institution: string; year?: string | null }>;

export type WorkerCvProfile = Readonly<{
  fullName: string;
  headline?: string | null; // e.g. "Chef de cuisine"
  location?: string | null; // "Laval, QC"
  email?: string | null;
  phone?: string | null;
  summary?: string | null;
  skills: readonly string[];
  languages?: readonly string[];
  experience?: readonly CvExperience[];
  education?: readonly CvEducation[];
  language?: "en" | "fr"; // output language, default en
}>;

export type TargetJob = Readonly<{
  title: string;
  employer?: string | null;
  description?: string | null;
  city?: string | null;
}>;

export type GeneratedCv = Readonly<{
  headline: string;
  cvMarkdown: string;
  coverLetterMarkdown: string;
  tailoredTo: string | null; // the job title it was tailored to, or null for a general CV
  matchedSkills: readonly string[]; // skills found in the target job text
  provider: string;
}>;

export interface CvBuilderProvider {
  readonly kind: string;
  generate(input: { profile: WorkerCvProfile; job?: TargetJob | null }): Promise<GeneratedCv>;
}

// ── helpers ────────────────────────────────────────────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Skills whose text appears in the target job's title/description — the tailoring signal. */
export function matchSkillsToJob(skills: readonly string[], job: TargetJob | null | undefined): string[] {
  if (!job) return [];
  const hay = norm(`${job.title} ${job.employer ?? ""} ${job.description ?? ""}`);
  return skills.filter((s) => s.trim() && hay.includes(norm(s)));
}

const L = (lang: "en" | "fr") => ({
  summary: lang === "fr" ? "Profil" : "Summary",
  skills: lang === "fr" ? "Compétences" : "Skills",
  relevant: lang === "fr" ? "Compétences pertinentes pour ce poste" : "Skills relevant to this role",
  experience: lang === "fr" ? "Expérience" : "Experience",
  education: lang === "fr" ? "Formation" : "Education",
  languages: lang === "fr" ? "Langues" : "Languages",
  present: lang === "fr" ? "présent" : "present",
  dear: lang === "fr" ? "Madame, Monsieur" : "Dear Hiring Manager",
  re: lang === "fr" ? "Objet" : "Re",
  regards: lang === "fr" ? "Cordialement" : "Sincerely"
});

function cvBody(profile: WorkerCvProfile, matched: readonly string[]): string {
  const lang = profile.language ?? "en";
  const t = L(lang);
  const lines: string[] = [];
  lines.push(`# ${profile.fullName}`);
  const sub = [profile.headline, profile.location].filter(Boolean).join(" · ");
  if (sub) lines.push(`_${sub}_`);
  const contact = [profile.email, profile.phone].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  if (profile.summary) lines.push(`\n## ${t.summary}\n${profile.summary}`);
  // Relevant skills first (tailoring), then the rest.
  if (profile.skills.length > 0) {
    if (matched.length > 0) {
      lines.push(`\n## ${t.relevant}\n${matched.map((s) => `- ${s}`).join("\n")}`);
      const rest = profile.skills.filter((s) => !matched.includes(s));
      if (rest.length > 0) lines.push(`\n## ${t.skills}\n${rest.map((s) => `- ${s}`).join("\n")}`);
    } else {
      lines.push(`\n## ${t.skills}\n${profile.skills.map((s) => `- ${s}`).join("\n")}`);
    }
  }
  if (profile.experience && profile.experience.length > 0) {
    lines.push(`\n## ${t.experience}`);
    for (const e of profile.experience) {
      lines.push(`\n**${e.role}** — ${e.employer}  \n${e.start}–${e.end ?? t.present}`);
      for (const h of e.highlights ?? []) lines.push(`- ${h}`);
    }
  }
  if (profile.education && profile.education.length > 0) {
    lines.push(`\n## ${t.education}`);
    for (const ed of profile.education) lines.push(`- ${ed.credential}, ${ed.institution}${ed.year ? ` (${ed.year})` : ""}`);
  }
  if (profile.languages && profile.languages.length > 0) {
    lines.push(`\n## ${t.languages}\n${profile.languages.join(", ")}`);
  }
  return lines.join("\n");
}

function coverLetter(profile: WorkerCvProfile, job: TargetJob | null | undefined, matched: readonly string[]): string {
  const lang = profile.language ?? "en";
  const t = L(lang);
  if (!job) {
    return lang === "fr"
      ? `${t.dear},\n\nJe vous soumets ma candidature. Vous trouverez ci-joint mon CV.\n\n${t.regards},\n${profile.fullName}`
      : `${t.dear},\n\nPlease find my CV attached for your consideration.\n\n${t.regards},\n${profile.fullName}`;
  }
  const who = job.employer ? ` at ${job.employer}` : "";
  const quiFr = job.employer ? ` chez ${job.employer}` : "";
  const strengths = (matched.length > 0 ? matched : profile.skills.slice(0, 3)).slice(0, 4);
  if (lang === "fr") {
    return [
      `${t.dear},`,
      ``,
      `${t.re} : ${job.title}${quiFr}`,
      ``,
      `Je souhaite poser ma candidature au poste de ${job.title}${quiFr}. Mon expérience et mes compétences — ${strengths.join(", ")} — correspondent à ce que vous recherchez.`,
      profile.summary ? `\n${profile.summary}` : ``,
      ``,
      `Je serais heureux(se) d'en discuter. Vous trouverez mon CV ci-joint.`,
      ``,
      `${t.regards},`,
      profile.fullName
    ].filter((l) => l !== undefined).join("\n");
  }
  return [
    `${t.dear},`,
    ``,
    `${t.re}: ${job.title}${who}`,
    ``,
    `I am writing to apply for the ${job.title} role${who}. My background and skills — ${strengths.join(", ")} — align closely with what you are looking for.`,
    profile.summary ? `\n${profile.summary}` : ``,
    ``,
    `I would welcome the chance to discuss it. My CV is attached.`,
    ``,
    `${t.regards},`,
    profile.fullName
  ].join("\n");
}

/**
 * Deterministic, offline CV provider. Produces a clean, tailored CV + cover letter from the worker's
 * profile and (optionally) a target job — no network, no LLM — so the whole flow is testable and free.
 * The real Claude-backed provider implements the same interface and swaps in behind a key.
 */
export function createSyntheticCvProvider(): CvBuilderProvider {
  return {
    kind: "synthetic-offline",
    async generate({ profile, job }) {
      const matched = matchSkillsToJob(profile.skills, job);
      return {
        headline: profile.headline ?? (profile.experience?.[0]?.role ?? profile.fullName),
        cvMarkdown: cvBody(profile, matched),
        coverLetterMarkdown: coverLetter(profile, job ?? null, matched),
        tailoredTo: job?.title ?? null,
        matchedSkills: matched,
        provider: "synthetic-offline"
      };
    }
  };
}
