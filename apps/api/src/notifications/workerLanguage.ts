// The language a WORKER reads Joblop in: English, French or Arabic (the worker website and app are
// trilingual). The worker's choice is stored on their account (users.primary_language, set when
// they switch language while signed in; worker_identities.preferred_language when staff set it).
// Nothing stored → French, Québec's default, like every other Joblop notice.

export type WorkerLanguage = "en" | "fr" | "ar";

/** Map a stored or typed value ("en-CA", "fr", "ar") to a worker language; null when unknown. */
export function normalizeLanguagePreference(value: unknown): WorkerLanguage | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v.startsWith("ar")) return "ar";
  if (v.startsWith("en")) return "en";
  if (v.startsWith("fr")) return "fr";
  return null;
}

/** The first stored preference that is a known language, else French. */
export function resolveWorkerLanguage(...stored: readonly (string | null | undefined)[]): WorkerLanguage {
  for (const value of stored) {
    const lang = normalizeLanguagePreference(value);
    if (lang) return lang;
  }
  return "fr";
}

/** Intl locale for dates and money in that language (Arabic with Western digits, as on the website). */
export function intlLocale(language: WorkerLanguage): string {
  return language === "en" ? "en-CA" : language === "fr" ? "fr-CA" : "ar-u-nu-latn";
}

/** Money is written the Canadian way in every language ("$25.00" / "25,00 $"). */
export function moneyLocale(language: WorkerLanguage): string {
  return language === "fr" ? "fr-CA" : "en-CA";
}

/** Pick the text for a language. */
export function inLanguage<T>(language: WorkerLanguage, text: Readonly<{ en: T; fr: T; ar: T }>): T {
  return text[language];
}

/** A worker's own hourly pay, as one short line in their language ("$25.00/h", "25,00 $/h"). */
export function hourlyPayLine(rateMinor: number, currency: string, language: WorkerLanguage): string {
  const amount = new Intl.NumberFormat(moneyLocale(language), { style: "currency", currency }).format(rateMinor / 100);
  return `${amount}/h`;
}
