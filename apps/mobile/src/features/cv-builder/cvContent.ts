// Pure data and rules for the app's CV builder — the same questions, choices and request as the
// website's CV builder (apps/worker/app/cv-builder/CvBuilder.tsx). The choices are CV content (they
// are written into the CV in the CV's own language), so they stay the website's words.
import type { CvFallbackNote, CvPlan } from "../../auth/secureSession";
import type { Locale } from "../../i18n/strings";

export type JobCategory = Readonly<{ key: string; label: string; skills: readonly string[] }>;

export const CATEGORIES: readonly JobCategory[] = [
  { key: "kitchen", label: "Kitchen / Chef", skills: ["Menu design", "Food safety (MAPAQ)", "Team leadership", "Grill & sauté", "Prep & mise en place", "Cost control", "Pastry", "Banquet service"] },
  { key: "care", label: "Healthcare / PSW", skills: ["Personal care", "Mobility assistance", "RCR / First aid", "Vital signs", "Dementia care", "Charting", "Medication reminders", "Infection control"] },
  { key: "cleaning", label: "Cleaning / Housekeeping", skills: ["Room cleaning", "SIMDUT / WHMIS", "Floor care", "Laundry", "Sanitization", "Inventory", "Attention to detail"] },
  { key: "warehouse", label: "Warehouse / Logistics", skills: ["Forklift / cariste", "Order picking", "Packing", "Inventory", "Shipping/receiving", "Pallet jack", "Safety (SIMDUT)"] },
  { key: "driver", label: "Driver / Delivery", skills: ["Class 5 licence", "Route planning", "Safe driving record", "Loading/unloading", "Customer service", "GPS navigation"] },
  { key: "security", label: "Security", skills: ["BSP licence", "Access control", "Patrol", "Incident reports", "CCTV monitoring", "Conflict de-escalation"] },
  { key: "retail", label: "Retail / Service", skills: ["Customer service", "Cash handling (POS)", "Merchandising", "Bilingual service", "Upselling", "Stock management"] },
  { key: "construction", label: "Construction / Trades", skills: ["ASP Construction card", "Framing", "Finishing", "Power tools", "Blueprint reading", "Site safety"] }
];
export const EXPERIENCE = ["< 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"] as const;
export const CITIES = ["Montréal", "Laval", "Longueuil", "Québec City", "Gatineau", "Other"] as const;
export const LANGUAGES = ["Français", "English", "العربية", "Español"] as const;
export const EDUCATION = ["No diploma", "High school / DES", "DEP (vocational)", "CEGEP / DEC", "University", "Other"] as const;
export const AVAILABILITY = ["Full-time", "Part-time", "Weekends", "Evenings / nights", "On-call"] as const;

export type CvAnswers = Readonly<{
  categoryKey: string;
  fullName: string;
  city: string;
  experience: string;
  languages: readonly string[];
  skills: readonly string[];
  education: string;
  availability: readonly string[];
  lastJob: string;
  cvLanguage: "en" | "fr";
}>;

export function categoryFor(key: string): JobCategory {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0]!;
}

/** The POST /worker/cv profile, built exactly as the website builds it. */
export function buildCvProfile(answers: CvAnswers): Record<string, unknown> {
  const category = categoryFor(answers.categoryKey);
  const summary = `${answers.experience} of experience as ${category.label}${answers.city ? ` in the ${answers.city} area` : ""}. Available: ${answers.availability.join(", ") || "flexible"}.`;
  return {
    fullName: answers.fullName.trim(),
    headline: category.label,
    location: `${answers.city}, QC`,
    summary,
    skills: [...answers.skills],
    languages: [...answers.languages],
    language: answers.cvLanguage,
    certifications: [],
    education: answers.education && answers.education !== "No diploma" ? [{ credential: answers.education, institution: "", year: "" }] : [],
    experience: answers.lastJob.trim() ? [{ role: category.label, employer: answers.lastJob.trim(), start: "", highlights: [] }] : []
  };
}

/** The API's own note (busy, over today's limit, switched off) in the worker's language. */
export function fallbackText(fallback: CvFallbackNote | null, locale: Locale): string | null {
  if (!fallback) return null;
  return fallback.message[locale] || fallback.message.en || null;
}

/** Markdown → plain readable text for the phone (headings, bold and bullets). */
export function markdownToPlain(md: string): string {
  return md
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*]\s+/, "• ")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/_(.+?)_/g, "$1")
        .trimEnd()
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Worker Pro status line (translation key + date). Status only: the app never sells Worker Pro or
 * starts a trial, so there is no price, buy button or link to pay (app store rules).
 */
export function proStatus(plan: CvPlan | null): Readonly<{ key: string; until: string | null }> {
  if (!plan || !plan.pro) return { key: "pro.statusNone", until: null };
  if (plan.source === "trial") return { key: plan.expiresAt ? "pro.statusTrialUntil" : "pro.statusTrial", until: plan.expiresAt };
  return { key: plan.expiresAt ? "pro.statusActiveUntil" : "pro.statusActive", until: plan.expiresAt };
}
