import { cookies } from "next/headers";
import { legalLanguageFor, type LegalLanguage } from "@rwos/shared";
import { LOCALE_COOKIE, resolveWorkerLocale } from "../i18n/config";

type SearchParams = Promise<Record<string, string | string[] | undefined>> | undefined;

/**
 * The legal-page language. A `?lang=fr|en|ar` link (used by the phone app) wins; otherwise the
 * site's language cookie decides ("fr-CA" → French, "ar" → Arabic, anything else → English).
 */
export async function readLegalLanguage(searchParams?: SearchParams): Promise<LegalLanguage> {
  const requested = (await searchParams)?.lang;
  if (typeof requested === "string" && /^(en|fr|ar)(-[A-Za-z]{2})?$/.test(requested)) {
    return legalLanguageFor(requested);
  }
  const store = await cookies();
  return legalLanguageFor(resolveWorkerLocale(store.get(LOCALE_COOKIE)?.value));
}
