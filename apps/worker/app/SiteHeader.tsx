"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { useLocale } from "./i18n/LocaleProvider";
import { JoblopLogo } from "./JoblopLogo";
import { ariaCurrent, isActivePath } from "./navActive";
import { OPEN_ACCOUNT_EVENT, accountHref, type AccountTab } from "./authScroll";

// Employer app entry — set NEXT_PUBLIC_EMPLOYER_URL in production (e.g. https://joblop-employer.onrender.com).
const EMPLOYER_URL = process.env.NEXT_PUBLIC_EMPLOYER_URL ?? "http://localhost:3100";

/**
 * The single worker-app header, used on the home page, every sub-page, and the public /browse board
 * (replacing the old TopBar, the sub-page header and the /browse marketing nav). Superset of all three:
 * brand, the primary nav, Sign in / Create account, and the Bill 96 language switcher on every page.
 * Dark brand shell (reuses the proven .topbar styles). Trilingual inline (en/fr-CA/ar).
 * The page the visitor is on is marked gold, bold and underlined, with aria-current="page".
 */
export function SiteHeader() {
  const locale = useLocale();
  const pathname = usePathname();
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
  // "Create account" / "Sign in": on the home page the form is already there, so open it in place
  // (start of the form, first field focused). From any other page the link loads the home page on that tab.
  const openAccount = (event: MouseEvent<HTMLAnchorElement>, tab: AccountTab) => {
    close();
    if (window.location.pathname === "/" && document.getElementById("auth-card")) {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent(OPEN_ACCOUNT_EVENT, { detail: tab }));
    }
  };
  const link = (href: string, label: string, className = "muted") => (
    <a className={className} href={href} aria-current={ariaCurrent(pathname, href)} onClick={close}>
      {label}
    </a>
  );
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
            {!signedIn ? link("/browse", nav("الوظائف", "Emplois", "Find jobs")) : null}
            {link("/how-it-works", nav("كيف يعمل", "Comment ça marche", "How it works"))}
            {link("/job-scanner", "JobScanner")}
            {link("/cv-builder", nav("إنشاء السيرة", "Créer un CV", "Build CV"))}
            {!signedIn ? (
              <>
                <a className="muted" href={EMPLOYER_URL} onClick={close}>{nav("لأصحاب العمل", "Employeurs", "For Employers")}</a>
                <a className="muted" href="/browse#contact" onClick={close}>{nav("تواصل", "Contact", "Contact")}</a>
              </>
            ) : null}
            {signedIn ? (
              <>
                {/* Signed-in pages grouped, so the home page keeps its space for "Find work near you". */}
                <MenuGroup pathname={pathname} label={nav("عملي", "Mon travail", "My work")} items={[
                  ["/jobs-calendar", nav("تقويمي", "Mon calendrier", "My calendar")],
                  ["/offers", nav("العروض", "Offres", "Offers")],
                  ["/schedule", nav("جدولي", "Mon horaire", "My schedule")],
                  ["/timesheets", nav("سجلات الدوام", "Feuilles de temps", "Timesheets")],
                  ["/saved-jobs", nav("الوظائف المحفوظة", "Emplois sauvegardés", "Saved jobs")],
                  ["/my-interests", nav("اهتماماتي", "Mes intérêts", "My interests")]
                ]} onPick={close} />
                <MenuGroup pathname={pathname} label={nav("ملفي", "Mon profil", "My profile")} items={[
                  ["/verification", nav("التحقق", "Vérification", "Verification")],
                  ["/hr", nav("ملف الموارد البشرية", "Dossier RH", "HR profile")],
                  ["/documents", nav("المستندات", "Documents", "Documents")]
                ]} onPick={close} />
                <MenuGroup pathname={pathname} label={nav("المال", "Argent", "Money")} items={[["/pay", nav("أجري", "Ma paie", "My pay")]]} onPick={close} />
                <MenuGroup pathname={pathname} label={nav("مساعدة", "Aide", "Help")} items={[["/contact", nav("تواصل مع Joblop", "Contacter Joblop", "Contact Joblop")]]} onPick={close}>
                  <button type="button" className="topbar-signout" onClick={() => void signOut()}>
                    {nav("تسجيل الخروج", "Se déconnecter", "Sign out")}
                  </button>
                </MenuGroup>
                {link("/", nav("ابحث عن عمل", "Trouver du travail", "Find work"), "topbar-cta")}
              </>
            ) : (
              <>
                <a className="topbar-cta" href={accountHref("signup")} onClick={(e) => openAccount(e, "signup")}>{nav("إنشاء حساب", "Créer un compte", "Create account")}</a>
                <a className="muted" href={accountHref("signin")} onClick={(e) => openAccount(e, "signin")}>{nav("تسجيل الدخول", "Se connecter", "Sign in")}</a>
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
function MenuGroup({
  label,
  items,
  pathname,
  onPick,
  children
}: {
  label: string;
  items: ReadonlyArray<readonly [string, string]>;
  pathname: string | null;
  onPick: () => void;
  children?: ReactNode;
}) {
  const hasCurrent = items.some(([href]) => isActivePath(pathname, href));
  return (
    <details className={hasCurrent ? "topbar-group has-current" : "topbar-group"}>
      <summary>{label}</summary>
      <div className="topbar-group-items">
        {items.map(([href, text]) => (
          <a key={href} href={href} aria-current={ariaCurrent(pathname, href)} onClick={onPick}>{text}</a>
        ))}
        {children}
      </div>
    </details>
  );
}
