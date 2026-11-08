"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" }).then((r) => setSignedIn(r.ok)).catch(() => undefined);
  }, []);
  const nav = (ar: string, fr: string, en: string) =>
    locale === "ar" ? ar : locale.startsWith("fr") ? fr : en;
  const close = () => setOpen(false);
  const signOut = async () => {
    await fetch("/api/session/sign-out", { method: "POST" }).catch(() => undefined);
    window.location.assign("/");
  };
  return (
    <header className="topbar">
      <div className="wrap">
        <a className="brand" href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }} onClick={close}>
          <JoblopLogo height={30} />
        </a>
        <div className="topbar-right">
          {/* Mobile menu toggle — hidden on desktop via CSS; collapses the nav so it never overflows. */}
          <button
            type="button"
            className="topbar-burger"
            aria-label={nav("القائمة", "Menu", "Menu")}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
          <nav className={open ? "topbar-nav open" : "topbar-nav"}>
            {!signedIn ? <a className="muted" href="/browse" onClick={close}>{nav("الوظائف", "Emplois", "Find jobs")}</a> : null}
            <a className="muted" href="/how-it-works" onClick={close}>{nav("كيف يعمل", "Comment ça marche", "How it works")}</a>
            <a className="muted" href="/job-scanner" onClick={close}>JobScanner</a>
            <a className="muted" href="/cv-builder" onClick={close}>{nav("إنشاء السيرة", "Créer un CV", "Build CV")}</a>
            {!signedIn ? (
              <>
                <a className="muted" href={EMPLOYER_URL} onClick={close}>{nav("لأصحاب العمل", "Employeurs", "For Employers")}</a>
                <a className="muted" href="/browse#contact" onClick={close}>{nav("تواصل", "Contact", "Contact")}</a>
              </>
            ) : null}
            {signedIn ? (
              <>
                {/* Signed-in pages grouped, so the home page keeps its space for "Find work near you". */}
                <MenuGroup label={nav("عملي", "Mon travail", "My work")}>
                  <a href="/offers" onClick={close}>{nav("العروض", "Offres", "Offers")}</a>
                  <a href="/schedule" onClick={close}>{nav("جدولي", "Mon horaire", "My schedule")}</a>
                  <a href="/timesheets" onClick={close}>{nav("سجلات الدوام", "Feuilles de temps", "Timesheets")}</a>
                  <a href="/saved-jobs" onClick={close}>{nav("الوظائف المحفوظة", "Emplois sauvegardés", "Saved jobs")}</a>
                  <a href="/my-interests" onClick={close}>{nav("اهتماماتي", "Mes intérêts", "My interests")}</a>
                </MenuGroup>
                <MenuGroup label={nav("ملفي", "Mon profil", "My profile")}>
                  <a href="/verification" onClick={close}>{nav("التحقق", "Vérification", "Verification")}</a>
                  <a href="/hr" onClick={close}>{nav("ملف الموارد البشرية", "Dossier RH", "HR profile")}</a>
                  <a href="/documents" onClick={close}>{nav("المستندات", "Documents", "Documents")}</a>
                </MenuGroup>
                <MenuGroup label={nav("المال", "Argent", "Money")}>
                  <a href="/pay" onClick={close}>{nav("أجري", "Ma paie", "My pay")}</a>
                </MenuGroup>
                <MenuGroup label={nav("مساعدة", "Aide", "Help")}>
                  <a href="/contact" onClick={close}>{nav("تواصل مع Joblop", "Contacter Joblop", "Contact Joblop")}</a>
                  <button type="button" className="topbar-signout" onClick={() => void signOut()}>
                    {nav("تسجيل الخروج", "Se déconnecter", "Sign out")}
                  </button>
                </MenuGroup>
                <a className="topbar-cta" href="/" onClick={close}>{nav("ابحث عن عمل", "Trouver du travail", "Find work")}</a>
              </>
            ) : (
              <>
                <a className="topbar-cta" href="/#auth-card" onClick={close}>{nav("إنشاء حساب", "Créer un compte", "Create account")}</a>
                <a className="muted" href="/#auth-card" onClick={close}>{nav("تسجيل الدخول", "Se connecter", "Sign in")}</a>
              </>
            )}
            <LanguageSwitcher />
          </nav>
        </div>
      </div>
    </header>
  );
}

/** A small dropdown group in the header (a plain list inside the mobile menu). */
function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="topbar-group">
      <summary>{label}</summary>
      <div className="topbar-group-items">{children}</div>
    </details>
  );
}
