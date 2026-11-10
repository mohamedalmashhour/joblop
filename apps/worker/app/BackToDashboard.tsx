"use client";

import Link from "next/link";
import { useT } from "./i18n/LocaleProvider";

// Small "back to the worker dashboard" link for signed-in sub-pages (Pay, Schedule, Documents, HR
// profile, …). The worker home ("/") is the dashboard with the section buttons, so every sub-page
// gets a one-click way back instead of relying on the browser's back button.
// Public pages (e.g. /jobs-calendar, open to signed-out visitors) pass labelKey="nav.backHome" so a
// visitor without an account is not told to go "back to dashboard".
export function BackToDashboard({ labelKey = "nav.backDashboard" }: { labelKey?: "nav.backDashboard" | "nav.backHome" }) {
  const t = useT();
  return (
    <Link
      href="/"
      className="linkbtn"
      style={{ alignItems: "center", display: "inline-flex", minHeight: 44, margin: "4px 0 8px", color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}
    >
      {t(labelKey)}
    </Link>
  );
}
