// Zero-dependency i18n core for the worker app (Bill 96 / Quebec: fr-CA + en-CA, equivalent parity).
// No framework strings live here — this module is safe to import from both server and client code.
import {
  defaultRwosLocale,
  resolveRwosLocale,
  supportedRwosLocales,
  type RwosLocale
} from "@rwos/shared";

export { defaultRwosLocale, resolveRwosLocale, supportedRwosLocales };
export type { RwosLocale };

/** Cookie that carries the viewer's chosen UI locale across requests. */
export const LOCALE_COOKIE = "rwos.locale";

/** One year, in seconds — the max-age we persist the locale choice for. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The <html lang> value for a locale (BCP-47 primary subtag). */
export function htmlLang(locale: RwosLocale): string {
  return locale === "fr-CA" ? "fr" : "en";
}

/** Short label shown in the language switcher. */
export const localeShortLabel: Readonly<Record<RwosLocale, string>> = {
  "en-CA": "EN",
  "fr-CA": "FR"
};

/** Accessible full name of each locale, in its own language. */
export const localeSelfName: Readonly<Record<RwosLocale, string>> = {
  "en-CA": "English",
  "fr-CA": "Français"
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
