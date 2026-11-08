import { addCounts, MASK_PLACEHOLDER, maskForAi, reportMasked, type MaskCounts, type PrivacyLogger } from "./aiPrivacyFilter";
import { createSyntheticCvProvider, matchSkillsToJob, type CvBuilderProvider, type GeneratedCv, type TargetJob, type WorkerCvProfile } from "./cvBuilder";

// Real Claude-backed CV provider (premium tier). Calls the Anthropic Messages API over raw HTTP (the
// API package already uses global fetch; no SDK dependency added). Activates only when ANTHROPIC_API_KEY
// is set — otherwise getCvProvider() falls back to the deterministic synthetic provider, so the feature
// always works. Advisory output: the worker reviews/edits before use; nothing is sent anywhere.
//
// Model defaults to claude-opus-5-5 (override with CV_MODEL for a cheaper tier, e.g. claude-haiku-5-5).
// The prompt forbids inventing facts — a CV must never fabricate experience about a real person.
//
// Privacy filter (always on): the worker's name, email and phone never leave. The model writes the CV body
// and the letter without them; the header (name, headline, area, contact) is added back here from the
// worker's own profile, and the letter's sign-off placeholder is replaced by the name locally. Every
// other string (summary, highlights, the target job text) is masked for contact details before sending.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const COVER_SENTINEL = "===COVER LETTER===";

const NAME_TOKEN = "[CANDIDATE_NAME]";

export type ClaudeCvConfig = Readonly<{ apiKey: string; model?: string; fetchImpl?: typeof fetch; logger?: PrivacyLogger }>;

/** What leaves for the outside AI: no name, email or phone; every string masked for contact details. */
export function buildCvPrompt(profile: WorkerCvProfile, job: TargetJob | null): Readonly<{ prompt: string; masked: MaskCounts; droppedKeys: number }> {
  const lang = profile.language === "fr" ? "French" : "English";
  const facts = maskForAi({
    headline: profile.headline ?? null,
    area: profile.location ?? null,
    summary: profile.summary ?? null,
    skills: profile.skills,
    languages: profile.languages ?? [],
    experience: profile.experience ?? [],
    // Renamed so the school is not mistaken for a bank "institution" number and dropped.
    education: (profile.education ?? []).map((e) => ({ credential: e.credential, school: e.institution, year: e.year ?? null })),
    certifications: profile.certifications ?? []
  });
  const target = job ? maskForAi<TargetJob>({ title: job.title, employer: job.employer ?? null, city: job.city ?? null, description: job.description ?? null }) : null;
  const t = target?.value;
  const targetText = t
    ? `Target job:\n- Title: ${t.title}\n- Employer: ${t.employer ?? "—"}\n- City: ${t.city ?? "—"}\n- Description: ${t.description ?? "—"}\n`
    : "No specific target job — produce a strong general CV.\n";
  const prompt = [
    `Write a professional, one-page CV and a tailored cover letter for this worker, in ${lang}, for the Québec job market.`,
    ``,
    `Worker facts (use ONLY these — do NOT invent employers, dates, credentials or achievements not listed):`,
    JSON.stringify(facts.value, null, 2),
    ``,
    targetText,
    `Rules:`,
    `- Tailor the CV and letter to the target job when one is given; lead with the most relevant skills/experience.`,
    `- Keep it truthful and concise. Québec conventions. ${lang} throughout.`,
    `- The worker's name and contact details are added later by the app. Do NOT write a name, title line, email, phone, address or any contact block in the CV: start the CV directly with its first section heading.`,
    `- In the cover letter, write no contact block or address; sign off with exactly ${NAME_TOKEN} on its own line.`,
    `- Personal details in the facts may appear as placeholders like [phone] or [email]; never copy a placeholder into the output.`,
    `- Output the CV in Markdown FIRST, then a line containing exactly "${COVER_SENTINEL}", then the cover letter in Markdown.`,
    `- Do not add any commentary before or after.`
  ].join("\n");
  return { prompt, masked: target ? addCounts(facts.masked, target.masked) : facts.masked, droppedKeys: facts.droppedKeys + (target?.droppedKeys ?? 0) };
}

const PLACEHOLDERS = [...Object.values(MASK_PLACEHOLDER), NAME_TOKEN];

/** Drops any line made only of placeholders (e.g. a stray "[phone] · [email]") and inline placeholders. */
function withoutPlaceholders(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => {
      let rest = line;
      for (const p of PLACEHOLDERS) rest = rest.split(p).join("");
      return !(rest !== line && !/[\p{L}\p{N}]/u.test(rest));
    })
    .map((line) => PLACEHOLDERS.reduce((acc, p) => acc.split(p).join(""), line))
    .join("\n")
    .trim();
}

/** The CV header, built locally from the worker's own profile (same shape as the offline CV). */
function cvHeader(profile: WorkerCvProfile): string {
  const lines = [`# ${profile.fullName}`];
  const sub = [profile.headline, profile.location].filter(Boolean).join(" · ");
  if (sub) lines.push(`_${sub}_`);
  const contact = [profile.email, profile.phone].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  return lines.join("\n");
}

function signLetter(letter: string, fullName: string): string {
  if (!letter) return letter;
  const signed = letter.split(NAME_TOKEN).join(fullName);
  return withoutPlaceholders(signed === letter ? `${letter}\n\n${fullName}` : signed);
}

function parseText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter((b): b is { type: string; text: string } => !!b && typeof b === "object" && (b as { type?: string }).type === "text" && typeof (b as { text?: unknown }).text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export function createClaudeCvProvider(config: ClaudeCvConfig): CvBuilderProvider {
  const model = config.model ?? process.env.CV_MODEL ?? "claude-opus-5-5";
  const doFetch = config.fetchImpl ?? fetch;
  return {
    kind: `claude:${model}`,
    async generate({ profile, job }) {
      const { prompt, masked, droppedKeys } = buildCvPrompt(profile, job ?? null);
      reportMasked("cv_builder", masked, droppedKeys, config.logger);
      const res = await doFetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          system: "You are an expert bilingual (French/English) résumé writer for the Québec job market. You never invent facts about a candidate.",
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!res.ok) {
        throw new Error(`RWOS_CV_CLAUDE_HTTP_${res.status}`);
      }
      const data = (await res.json()) as { content?: unknown };
      const text = parseText(data.content);
      if (!text) throw new Error("RWOS_CV_CLAUDE_EMPTY");
      const idx = text.indexOf(COVER_SENTINEL);
      const cvBody = withoutPlaceholders((idx >= 0 ? text.slice(0, idx) : text).trim());
      const cvMarkdown = `${cvHeader(profile)}\n\n${cvBody}`;
      const coverLetterMarkdown = signLetter(idx >= 0 ? text.slice(idx + COVER_SENTINEL.length).trim() : "", profile.fullName);
      const matched = matchSkillsToJob(profile.skills, job);
      return {
        headline: profile.headline ?? (profile.experience?.[0]?.role ?? profile.fullName),
        cvMarkdown,
        coverLetterMarkdown,
        tailoredTo: job?.title ?? null,
        matchedSkills: matched,
        provider: `claude:${model}`
      } satisfies GeneratedCv;
    }
  };
}

/** The active CV provider: Claude when ANTHROPIC_API_KEY is set, otherwise the synthetic offline one. */
export function getCvProvider(): CvBuilderProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (apiKey) return createClaudeCvProvider({ apiKey });
  return createSyntheticCvProvider();
}
