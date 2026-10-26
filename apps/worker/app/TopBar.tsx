"use client";

import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { useT } from "./i18n/LocaleProvider";
import { JobLopMark } from "./JobLopMark";

/** Always-visible brand bar with the Bill 96 language switcher. */
export function TopBar() {
  const t = useT();
  return (
    <header className="topbar">
      <div className="wrap">
        <a className="brand" href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <JobLopMark size={28} />
          <span style={{ color: "var(--text)" }}>Job<span>Lop</span></span>
        </a>
        <div className="topbar-right">
          <a className="muted" href="/job-scanner" style={{ fontSize: 14, fontWeight: 700 }}>JobScanner</a>
          <a className="muted" href="/cv-builder" style={{ fontSize: 14, fontWeight: 700 }}>Build CV</a>
          <span className="muted topbar-tagline" style={{ fontSize: 14 }}>{t("brand.tagline")}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
