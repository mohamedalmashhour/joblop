import type { PublicLead } from "../../auth/secureSession";

// Pure helpers for the signed-out public job search (no React, so they are unit-tested directly).

/** Before the person types anything, show everyday work first (same words as the website). */
export const EVERYDAY_WORK_QUERY = "cleaner cook warehouse driver retail labourer";

/** How many rows of each kind the first screen asks for. */
export const PUBLIC_LIST_LIMIT = 12;

/** Adzuna's terms: an Adzuna-sourced listing must carry a link to Adzuna. */
export const ADZUNA_URL = "https://www.adzuna.ca";

export const DEFAULT_EMPLOYER_ORIGIN = "https://joblop-employer.onrender.com";

/** The employer website, from EXPO_PUBLIC_RWOS_EMPLOYER_ORIGIN when it is a valid https URL. */
export function employerOrigin(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  return /^https:\/\/[^\s/]+/i.test(trimmed) ? trimmed : DEFAULT_EMPLOYER_ORIGIN;
}

/**
 * The API's urgency values are "normal" | "urgent" | "immediate". Anything other than the plain
 * value gets the Urgent tag ("standard" is treated as plain too, for older answers).
 */
export function isUrgentJob(urgency: string): boolean {
  const value = urgency.trim().toLowerCase();
  return value !== "" && value !== "normal" && value !== "standard";
}

/** Lead pay: hourly when the period says so or the amount is under $200 → "$x/h", else "$xk/yr". */
export function formatLeadPay(lead: Pick<PublicLead, "salaryMinMinor" | "salaryMaxMinor" | "salaryPeriod">): string | null {
  const value = lead.salaryMaxMinor ?? lead.salaryMinMinor;
  if (!value || value <= 0) return null;
  const hourly = lead.salaryPeriod === "hour" || value < 20000;
  if (hourly) return `$${(value / 100).toFixed(2).replace(/\.00$/, "")}/h`;
  return `$${Math.round(value / 100000)}k/yr`;
}

export function isAdzunaLead(lead: Pick<PublicLead, "source">): boolean {
  return lead.source.trim().toLowerCase() === "adzuna";
}

/** "Employer · Area" (either part may be missing). */
export function leadSubline(lead: Pick<PublicLead, "employer" | "areaLabel">): string {
  return [lead.employer.trim(), lead.areaLabel.trim()].filter(Boolean).join(" · ");
}

/** Pick the one/many template and fill {n}. */
export function countLabel(count: number, one: string, many: string): string {
  return count === 1 ? one : many.replace("{n}", String(count));
}

/** A short day label for a job start, e.g. "Fri, Nov 20". Empty when the date cannot be read. */
export function formatJobDate(startAt: string, locale: string): string {
  const date = new Date(startAt);
  if (!Number.isFinite(date.getTime())) return "";
  try {
    return date.toLocaleDateString(locale === "ar" ? "ar" : locale === "fr" ? "fr-CA" : "en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Split a sentence around the brand name so the screen can draw "Joblop" in the brand style
 * (white letters, gold o's), like the website's withBrand().
 */
export function brandParts(text: string): { text: string; brand: boolean }[] {
  return text
    .split(/(Joblop)/)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, brand: part === "Joblop" }));
}

/** Job-card columns for a screen width, matching the website grid breakpoints (860 / 560 px). */
export function columnsForWidth(width: number): 1 | 2 | 3 {
  if (width >= 860) return 3;
  if (width >= 560) return 2;
  return 1;
}
