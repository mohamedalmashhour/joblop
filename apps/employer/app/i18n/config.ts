// Zero-dependency i18n core for the employer app (Bill 96 / Quebec: fr-CA + en-CA, equal parity).
// Safe to import from both server and client code.
import {
  defaultRwosLocale,
  resolveRwosLocale,
  supportedRwosLocales,
  type RwosLocale
} from "@rwos/shared";

export { defaultRwosLocale, resolveRwosLocale, supportedRwosLocales };
export type { RwosLocale };

// Employer-app locale extension. Arabic is added here (not in @rwos/shared) so the employer app can
// go trilingual without forcing @rwos/shared consumers to define an Arabic dictionary. Arabic is the
// only RTL locale. en-CA stays the parity source of truth + fallback; fr-CA stays at full parity
// (Bill 96).
export type EmployerLocale = RwosLocale | "ar";
export const supportedEmployerLocales = ["en-CA", "fr-CA", "ar"] as const satisfies readonly EmployerLocale[];

export const LOCALE_COOKIE = "rwos.locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Resolve a stored/queried value to a supported employer locale; unknown → en-CA. */
export function resolveEmployerLocale(value?: string | null): EmployerLocale {
  return (supportedEmployerLocales as readonly string[]).includes(value ?? "")
    ? (value as EmployerLocale)
    : defaultRwosLocale;
}

/** Text direction for a locale. Arabic is right-to-left; everything else left-to-right. */
export function localeDir(locale: EmployerLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * The locale used for Intl date/number formatting. The @rwos/shared formatters accept only the
 * Canadian locales, so Arabic formats amounts/dates with en-CA (Western digits, CAD) while the UI
 * text stays Arabic — the conventional treatment for CAD money in an Arabic interface.
 */
export function fmtLocale(locale: EmployerLocale): RwosLocale {
  return locale === "ar" ? "en-CA" : locale;
}

export function htmlLang(locale: EmployerLocale): string {
  return locale === "ar" ? "ar" : locale === "fr-CA" ? "fr" : "en";
}

export const localeShortLabel: Readonly<Record<EmployerLocale, string>> = {
  "en-CA": "EN",
  "fr-CA": "FR",
  ar: "ع"
};
export const localeSelfName: Readonly<Record<EmployerLocale, string>> = {
  "en-CA": "English",
  "fr-CA": "Français",
  ar: "العربية"
};

export function interpolate(
  template: string,
  vars?: Readonly<Record<string, string | number>>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}
