"use client";

import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { useLocale } from "./i18n/LocaleProvider";
import { JoblopLogo } from "./JoblopLogo";

// Employer app entry — set NEXT_PUBLIC_EMPLOYER_URL in production (e.g. https://joblop-employer.onrender.com).
const EMPLOYER_URL = process.env.NEXT_PUBLIC_EMPLOYER_URL ?? "http://localhost:3100";

/**
 * The single worker-app header, used on the home page, every sub-page, and the public /browse board
 * (replacing the old TopBar, the sub-page header and the /browse marketing nav). Superset of all three:
 * brand, the primary nav, Sign in / Create account, and the Bill 96 language switcher on every page.
 * Dark brand shell (reuses the proven .topbar styles). Trilingual inline (en/fr-CA/ar).
 */
export function SiteHeader() {
  const locale = useLocale();
  const nav = (ar: string, fr: string, en: string) =>
    locale === "ar" ? ar : locale.startsWith("fr") ? fr : en;
  return (
    <header className="topbar">
      <div className="wrap">
        <a className="brand" href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <JoblopLogo height={30} />
        </a>
        <div className="topbar-right">
          {/* Primary actions: a job seeker finds a job (→ JobScanner); an employer lists a job (→ employer app). */}
          <a className="muted" href="/job-scanner" style={{ fontSize: 14, fontWeight: 700 }}>{nav("ابحث عن وظيفة", "Trouver un emploi", "Find a job")}</a>
          <a className="muted" href={EMPLOYER_URL} style={{ fontSize: 14, fontWeight: 700 }}>{nav("انشر وظيفة", "Publier un emploi", "List a job")}</a>
          <a className="muted" href="/how-it-works" style={{ fontSize: 14, fontWeight: 700 }}>{nav("كيف يعمل", "Comment ça marche", "How it works")}</a>
          <a className="muted" href="/cv-builder" style={{ fontSize: 14, fontWeight: 700 }}>{nav("إنشاء السيرة", "Créer un CV", "Build CV")}</a>
          <a className="muted" href="/inbox" style={{ fontSize: 14, fontWeight: 700 }}>{nav("صندوقي", "Mes messages", "My inbox")}</a>
          <a className="muted" href="/browse#contact" style={{ fontSize: 14, fontWeight: 700 }}>{nav("تواصل", "Contact", "Contact")}</a>
          {/* Role entry points — each opens create-account / sign-in for that side. Worker auth is the
              worker landing ("/"); employer auth is the employer app. */}
          <a href="/" style={{ fontSize: 14, fontWeight: 800, color: "#c9a24b", textDecoration: "none" }}>{nav("عامل: حساب / دخول", "Travailleur : s'inscrire / connexion", "Worker: sign up / in")}</a>
          <a href={EMPLOYER_URL} style={{ fontSize: 14, fontWeight: 800, color: "#c9a24b", textDecoration: "none" }}>{nav("صاحب عمل: حساب / دخول", "Employeur : s'inscrire / connexion", "Employer: sign up / in")}</a>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
