import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nManager, Platform } from "react-native";
import { isRtlLocale, translate, type Locale } from "./strings";

type LocaleValue = Readonly<{
  locale: Locale;
  setLocale: (next: Locale) => void;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  t: (key: string) => string;
}>;

const LocaleCtx = createContext<LocaleValue | null>(null);

export function LocaleProvider({ children, initialLocale = "en" }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const isRtl = isRtlLocale(locale);
  const dir = isRtl ? "rtl" : "ltr";

  // On web (Expo web / the preview) drive direction at the document level so RTL mirrors the page.
  // On native, I18nManager controls RTL (a full flip needs an app reload; we also apply per-text
  // writingDirection in components so Arabic reads correctly without forcing a reload).
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", locale);
    } else {
      try {
        I18nManager.allowRTL(true);
      } catch {
        /* no-op */
      }
    }
  }, [dir, locale]);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const value = useMemo<LocaleValue>(() => ({ locale, setLocale, dir, isRtl, t }), [locale, dir, isRtl, t]);
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export function useLocale(): LocaleValue {
  const ctx = useContext(LocaleCtx);
  if (!ctx) {
    // Safe fallback so a component used outside the provider still renders in English LTR.
    return { locale: "en", setLocale: () => undefined, dir: "ltr", isRtl: false, t: (k) => translate("en", k) };
  }
  return ctx;
}

/** Convenience hook for the translate function alone. */
export function useT(): (key: string) => string {
  return useLocale().t;
}
