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
  return (
    <header className="topbar">
      <div className="wrap">
        <a className="brand" href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <JoblopLogo height={30} />
        </a>
        <div className="topbar-right">
          <a className="muted" href="/how-it-works" style={{ fontSize: 14, fontWeight: 700 }}>{locale.startsWith("fr") ? "Comment ça marche" : "How it works"}</a>
          <a className="muted" href="/job-scanner" style={{ fontSize: 14, fontWeight: 700 }}>JobScanner</a>
          <a className="muted" href="/cv-builder" style={{ fontSize: 14, fontWeight: 700 }}>Build CV</a>
          <a className="muted" href={EMPLOYER_URL} style={{ fontSize: 14, fontWeight: 700 }}>{locale.startsWith("fr") ? "Employeurs" : "For Employers"}</a>
          <span className="muted topbar-tagline" style={{ fontSize: 14 }}>{t("brand.tagline")}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
