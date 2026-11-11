// Server-only: the viewer's text-table language, read from the locale cookie.
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveEmployerLocale } from "./config";
import { langOf, type Lang } from "./localText";

export async function serverLang(): Promise<Lang> {
  const store = await cookies();
  return langOf(resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value));
}
