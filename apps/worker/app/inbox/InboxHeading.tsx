"use client";

import { useT } from "../i18n/LocaleProvider";

// Page title and intro for /inbox, in the visitor's language.
export function InboxHeading() {
  const t = useT();
  return (
    <>
      <h1 style={{ color: "var(--text)", fontSize: "clamp(26px,5vw,40px)", margin: "18px 0 6px" }}>{t("inbox.title")}</h1>
      <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6, margin: "0 0 10px", maxWidth: 760 }}>{t("inbox.intro")}</p>
    </>
  );
}
