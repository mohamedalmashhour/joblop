import { createSyntheticCvProvider, matchSkillsToJob, type CvBuilderProvider, type GeneratedCv, type TargetJob, type WorkerCvProfile } from "./cvBuilder";

// Real Claude-backed CV provider (premium tier). Calls the Anthropic Messages API over raw HTTP (the
// API package already uses global fetch; no SDK dependency added). Activates only when ANTHROPIC_API_KEY
// is set — otherwise getCvProvider() falls back to the deterministic synthetic provider, so the feature
// always works. Advisory output: the worker reviews/edits before use; nothing is sent anywhere.
//
// Model defaults to claude-opus-5-5 (override with CV_MODEL for a cheaper tier, e.g. claude-haiku-5-5).
// The prompt forbids inventing facts — a CV must never fabricate experience about a real person.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const COVER_SENTINEL = "===COVER LETTER===";

export type ClaudeCvConfig = Readonly<{ apiKey: string; model?: string; fetchImpl?: typeof fetch }>;

function buildPrompt(profile: WorkerCvProfile, job: TargetJob | null): string {
  const lang = profile.language === "fr" ? "French" : "English";
  const facts = JSON.stringify(
    {
      fullName: profile.fullName,
      headline: profile.headline ?? null,
      location: profile.location ?? null,
      email: profile.email ?? null,
      phone: profile.phone ?? null,
      summary: profile.summary ?? null,
      skills: profile.skills,
      languages: profile.languages ?? [],
      experience: profile.experience ?? [],
      education: profile.education ?? []
    },
    null,
    2
  );
  const target = job
    ? `Target job:\n- Title: ${job.title}\n- Employer: ${job.employer ?? "—"}\n- City: ${job.city ?? "—"}\n- Description: ${job.description ?? "—"}\n`
    : "No specific target job — produce a strong general CV.\n";
  return [
    `Write a professional, one-page CV and a tailored cover letter for this worker, in ${lang}, for the Québec job market.`,
    ``,
    `Worker facts (use ONLY these — do NOT invent employers, dates, credentials or achievements not listed):`,
    facts,
    ``,
    target,
    `Rules:`,
    `- Tailor the CV and letter to the target job when one is given; lead with the most relevant skills/experience.`,
    `- Keep it truthful and concise. Québec conventions. ${lang} throughout.`,
    `- Output the CV in Markdown FIRST, then a line containing exactly "${COVER_SENTINEL}", then the cover letter in Markdown.`,
    `- Do not add any commentary before or after.`
  ].join("\n");
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
          messages: [{ role: "user", content: buildPrompt(profile, job ?? null) }]
        })
      });
      if (!res.ok) {
        throw new Error(`RWOS_CV_CLAUDE_HTTP_${res.status}`);
      }
      const data = (await res.json()) as { content?: unknown };
      const text = parseText(data.content);
      if (!text) throw new Error("RWOS_CV_CLAUDE_EMPTY");
      const idx = text.indexOf(COVER_SENTINEL);
      const cvMarkdown = (idx >= 0 ? text.slice(0, idx) : text).trim();
      const coverLetterMarkdown = idx >= 0 ? text.slice(idx + COVER_SENTINEL.length).trim() : "";
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
