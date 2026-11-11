// Small per-page text tables (en / fr-CA / ar) for screens whose words live next to the page, the
// same way the about, how-it-works and contact pages keep their own content files. Safe to import
// from server and client code. Server pages get the language with serverLang() (serverLang.ts);
// client components use langOf(useLocale()).
import { interpolate, type EmployerLocale } from "./config";

export type Lang = "en" | "fr" | "ar";
export type Trilingual<T> = Readonly<Record<Lang, T>>;

/** The text-table language for an employer locale. */
export function langOf(locale: EmployerLocale): Lang {
  return locale === "ar" ? "ar" : locale === "fr-CA" ? "fr" : "en";
}

/** Replace {name} placeholders, e.g. fill("Back to {page}", { page: "invoices" }). */
export function fill(template: string, vars: Readonly<Record<string, string | number>>): string {
  return interpolate(template, vars);
}

/**
 * A plain-words label for a status code such as "employer_review". Unknown codes fall back to the
 * code with spaces, so a new status never shows as blank.
 */
export function statusLabel(labels: Readonly<Record<string, string>>, code: string): string {
  return labels[code] ?? code.replaceAll("_", " ");
}
