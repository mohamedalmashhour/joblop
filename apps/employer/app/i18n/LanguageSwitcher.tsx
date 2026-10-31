"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  localeSelfName,
  localeShortLabel,
  supportedEmployerLocales,
  type EmployerLocale
} from "./config";
import { useLocale, useT } from "./LocaleProvider";

export function LanguageSwitcher() {
  const current = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: EmployerLocale) {
    if (locale === current) return;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="langswitch" role="group" aria-label="Language / Langue">
      {supportedEmployerLocales.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`langbtn${locale === current ? " active" : ""}`}
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
