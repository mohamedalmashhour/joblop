"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  localeSelfName,
  localeShortLabel,
  supportedAdminLocales,
  type AdminLocale
} from "./config";
import { useLocale, useT } from "./LocaleProvider";

/**
 * Bill 96: a visible, always-available language control that treats the languages equally.
 * Persists the choice in a cookie the server layout reads, then refreshes so every server-rendered
 * string re-renders in the chosen language.
 */
export function LanguageSwitcher() {
  const current = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: AdminLocale) {
    if (locale === current) return;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="admin-langswitch" role="group" aria-label="Language / Langue">
      {supportedAdminLocales.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`admin-langbtn${locale === current ? " active" : ""}`}
          aria-pressed={locale === current}
          aria-label={t("lang.switchTo", { language: localeSelfName[locale] })}
          onClick={() => choose(locale)}
          disabled={pending}
        >
          {localeShortLabel[locale]}
        </button>
      ))}
    </div>
  );
}
