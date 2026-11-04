"use client";

import Link from "next/link";
import { useT } from "./i18n/LocaleProvider";

// Small "back to the worker dashboard" link for signed-in sub-pages (Pay, Schedule, Documents, HR
// profile, …). The worker home ("/") is the dashboard with the section buttons, so every sub-page
// gets a one-click way back instead of relying on the browser's back button.
export function BackToDashboard() {
  const t = useT();
  return (
    <Link
      href="/"
      className="linkbtn"
      style={{ display: "inline-block", margin: "4px 0 12px", color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}
    >
      {t("nav.backDashboard")}
    </Link>
  );
}
