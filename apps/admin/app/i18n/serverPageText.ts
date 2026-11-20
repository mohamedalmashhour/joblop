import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveAdminLocale } from "./config";
import { pickPageText, type PageText } from "./pageTextCore";

/** Server components: the current page copy for the visitor's language (reads the locale cookie). */
export async function serverPageText<T>(text: PageText<T>): Promise<T> {
  const store = await cookies();
  return pickPageText(text, resolveAdminLocale(store.get(LOCALE_COOKIE)?.value));
}
