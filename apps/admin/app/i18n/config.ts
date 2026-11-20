// Zero-dependency i18n core for the admin console (Bill 96 / Quebec: fr-CA + en-CA at parity,
// plus Arabic). Safe to import from both server and client code.
import {
  defaultRwosLocale,
  resolveRwosLocale,
  supportedRwosLocales,
  type RwosLocale
} from "@rwos/shared";

export { defaultRwosLocale, resolveRwosLocale, supportedRwosLocales };
export type { RwosLocale };

// Admin-console locale extension. Arabic is added here (not in @rwos/shared) so the console can go
// trilingual without forcing @rwos/shared consumers to define an Arabic dictionary. Arabic is the
// only RTL locale. en-CA stays the parity source of truth + fallback.
export type AdminLocale = RwosLocale | "ar";
export const supportedAdminLocales = ["en-CA", "fr-CA", "ar"] as const satisfies readonly AdminLocale[];

/** Resolve a stored/queried value to a supported admin locale; unknown → en-CA. */
export function resolveAdminLocale(value?: string | null): AdminLocale {
  return (supportedAdminLocales as readonly string[]).includes(value ?? "")
    ? (value as AdminLocale)
    : defaultRwosLocale;
}

/** Text direction for a locale. Arabic is right-to-left; everything else left-to-right. */
export function localeDir(locale: AdminLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * The locale used for Intl date/number formatting. The @rwos/shared formatters accept only the
 * Canadian locales, so Arabic formats amounts/dates with en-CA (Western digits, CAD) while the UI
 * text stays Arabic — the conventional treatment for CAD money in an Arabic interface.
 */
export function fmtLocale(locale: AdminLocale): RwosLocale {
  return locale === "ar" ? "en-CA" : locale;
}

/** Cookie that carries the viewer's chosen UI locale across requests (shared across RWOS apps). */
export const LOCALE_COOKIE = "rwos.locale";

/** One year, in seconds — the max-age we persist the locale choice for. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The <html lang> value for a locale (BCP-47 primary subtag). */
export function htmlLang(locale: AdminLocale): string {
  return locale === "ar" ? "ar" : locale === "fr-CA" ? "fr" : "en";
}

/** Short label shown in the language switcher. */
export const localeShortLabel: Readonly<Record<AdminLocale, string>> = {
  "en-CA": "EN",
  "fr-CA": "FR",
  ar: "ع"
};

/** Accessible full name of each locale, in its own language. */
export const localeSelfName: Readonly<Record<AdminLocale, string>> = {
  "en-CA": "English",
  "fr-CA": "Français",
  ar: "العربية"
};

/** Replace {name} placeholders in a message with provided values. */
export function interpolate(
  template: string,
  vars?: Readonly<Record<string, string | number>>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}
