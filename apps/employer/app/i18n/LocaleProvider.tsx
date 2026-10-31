"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { interpolate, type EmployerLocale } from "./config";
import { dictionaries, type MessageKey, type Messages } from "./messages";

export { fmtLocale } from "./config";

export type Translate = (
  key: MessageKey,
  vars?: Readonly<Record<string, string | number>>
) => string;

type LocaleContextValue = Readonly<{ locale: EmployerLocale; t: Translate }>;
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children
}: Readonly<{ locale: EmployerLocale; children: ReactNode }>) {
  const value = useMemo<LocaleContextValue>(() => {
    const messages: Partial<Messages> = dictionaries[locale] ?? dictionaries["en-CA"];
    const fallback = dictionaries["en-CA"];
    const t: Translate = (key, vars) => interpolate(messages[key] ?? fallback[key] ?? key, vars);
    return { locale, t };
  }, [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT/useLocale must be used within <LocaleProvider>");
  return ctx;
}
export function useLocale(): EmployerLocale {
  return useLocaleContext().locale;
}
export function useT(): Translate {
  return useLocaleContext().t;
}
