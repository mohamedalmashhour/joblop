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
          <span className="muted" style={{ fontSize: 14 }}>{t("brand.tagline")}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
