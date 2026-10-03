"use client";

import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { useT } from "./i18n/LocaleProvider";

/** Shared sub-page header: brand home link, a localized back link, and the language switcher
 *  (Bill 96 — the language control is available on every page, not just the home). */
export function SubPageHeader() {
  const t = useT();
  return (
    <header className="topbar">
      <div className="wrap">
        <a className="brand" href="/">
          Job<span>Lop</span>
        </a>
        <div className="topbar-right">
          <a className="muted" href="/" style={{ fontSize: 14 }}>{t("nav.backToSearch")}</a>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
