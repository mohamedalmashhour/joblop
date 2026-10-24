"use client";

import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { useT } from "./i18n/LocaleProvider";

/** Always-visible brand bar with the Bill 96 language switcher. */
export function TopBar() {
  const t = useT();
  return (
    <header className="topbar">
      <div className="wrap">
        <div className="brand">
          Job<span>Lop</span>
        </div>
        <div className="topbar-right">
          <a className="muted" href="/job-scanner" style={{ fontSize: 14, fontWeight: 700 }}>JobScanner</a>
          <a className="muted" href="/cv-builder" style={{ fontSize: 14, fontWeight: 700 }}>Build CV</a>
          <span className="muted" style={{ fontSize: 14 }}>{t("brand.tagline")}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
