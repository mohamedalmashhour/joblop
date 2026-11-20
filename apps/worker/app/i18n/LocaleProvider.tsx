"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { interpolate, type WorkerLocale } from "./config";
import { dictionaries, type MessageKey, type Messages } from "./messages";

export { fmtLocale } from "./config";

export type Translate = (
  key: MessageKey,
  vars?: Readonly<Record<string, string | number>>
) => string;

type LocaleContextValue = Readonly<{ locale: WorkerLocale; t: Translate }>;

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Wraps the tree with the active locale. The full dictionary is bundled client-side (it is small),
 * so only the resolved locale crosses the server→client boundary. en-CA is the parity fallback for
 * any key a locale somehow lacks (the type system already forbids that at build time).
 */
export function LocaleProvider({
  locale,
  children
}: Readonly<{ locale: WorkerLocale; children: ReactNode }>) {
  const value = useMemo<LocaleContextValue>(() => {
    const messages: Partial<Messages> = dictionaries[locale] ?? dictionaries["en-CA"];
    const fallback = dictionaries["en-CA"];
    const t: Translate = (key, vars) =>
      interpolate(messages[key] ?? fallback[key] ?? key, vars);
    return { locale, t };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT/useLocale must be used within <LocaleProvider>");
  return ctx;
}

export function useLocale(): WorkerLocale {
  return useLocaleContext().locale;
}

export function useT(): Translate {
  return useLocaleContext().t;
}
