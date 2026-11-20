"use client";

import { useLocale } from "./LocaleProvider";
import { pickPageText, type PageText } from "./pageTextCore";

export type { PageText } from "./pageTextCore";

/** Client components: the current page copy for the visitor's language. */
export function usePageText<T>(text: PageText<T>): T {
  return pickPageText(text, useLocale());
}
