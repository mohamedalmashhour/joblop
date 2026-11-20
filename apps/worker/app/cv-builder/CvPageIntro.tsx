"use client";

import { useLocale, useT } from "../i18n/LocaleProvider";

// Page title + intro for /cv-builder in the visitor's language. Cream title on the black page, a
// readable intro, and a plain "Back to home" link (R2-16: the worker can always leave the builder).
export function CvPageIntro() {
  const t = useT();
  const rtl = useLocale() === "ar";
  return (
    <div style={{ display: "grid", gap: 8, margin: "18px 0 14px" }}>
      <a
        href="/"
        style={{
          alignItems: "center",
          alignSelf: "start",
          color: "#f8b808",
          display: "inline-flex",
          fontSize: 15,
          fontWeight: 700,
          gap: 6,
          justifySelf: "start",
          minHeight: 44,
          textDecoration: "none"
        }}
      >
        <span aria-hidden="true">{rtl ? "→" : "←"}</span> {t("cv.back")}
      </a>
      <h1 style={{ color: "#f4efe4", fontSize: "clamp(28px,5vw,42px)", lineHeight: 1.15, margin: 0 }}>{t("cv.pageTitle")}</h1>
      <p style={{ color: "#d8ccb4", fontSize: 16, lineHeight: 1.6, margin: 0, maxWidth: 760 }}>{t("cv.pageIntro")}</p>
    </div>
  );
}
