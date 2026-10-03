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

export const LOCALE_COOKIE = "rwos.locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function htmlLang(locale: RwosLocale): string {
  return locale === "fr-CA" ? "fr" : "en";
}

export const localeShortLabel: Readonly<Record<RwosLocale, string>> = {
  "en-CA": "EN",
  "fr-CA": "FR"
};
export const localeSelfName: Readonly<Record<RwosLocale, string>> = {
  "en-CA": "English",
  "fr-CA": "Français"
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
