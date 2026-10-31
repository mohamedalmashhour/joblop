"use client";

import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { useLocale, useT } from "./i18n/LocaleProvider";
import { JoblopLogo } from "./JoblopLogo";

// Employer app entry — set NEXT_PUBLIC_EMPLOYER_URL in production (e.g. https://joblop-employer.onrender.com).
const EMPLOYER_URL = process.env.NEXT_PUBLIC_EMPLOYER_URL ?? "http://localhost:3100";

/** Always-visible brand bar with the Bill 96 language switcher. */
export function TopBar() {
  const t = useT();
  const locale = useLocale();
  const nav = (ar: string, fr: string, en: string) =>
    locale === "ar" ? ar : locale.startsWith("fr") ? fr : en;
  return (
    <header className="jl-topbar">
      <div className="jl-topbar-in">
        <a className="jl-brand" href="/">
          <JoblopLogo height={30} />
        </a>
        <div className="jl-topbar-nav">
          <a className="jl-navlink" href="/how-it-works">{nav("كيف يعمل", "Comment ça marche", "How it works")}</a>
          <a className="jl-navlink" href="/job-scanner">JobScanner</a>
          <a className="jl-navlink" href="/cv-builder">{nav("إنشاء السيرة", "Créer un CV", "Build CV")}</a>
          <a className="jl-navlink" href={EMPLOYER_URL}>{nav("لأصحاب العمل", "Employeurs", "For Employers")}</a>
          <span className="muted topbar-tagline" style={{ fontSize: 14 }}>{t("brand.tagline")}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
