import type { AdminLocale } from "./config";

// Per-page copy for the staff console. Each page keeps its own `text.ts` with the same keys in
// English, French and Arabic, so pages can be translated independently of the shared catalogue.
// (No "use client" here: both server and client components import this.)
export type PageText<T> = Readonly<{ en: T; fr: T; ar: T }>;

export function pickPageText<T>(text: PageText<T>, locale: AdminLocale): T {
  if (locale === "ar") return text.ar;
  if (locale.startsWith("fr")) return text.fr;
  return text.en;
}
