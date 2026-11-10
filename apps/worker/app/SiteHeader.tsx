"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { useLocale, useT } from "./i18n/LocaleProvider";
import { JoblopLogo } from "./JoblopLogo";
import { ariaCurrent, isActivePath } from "./navActive";
import { OPEN_ACCOUNT_EVENT, accountHref, type AccountTab } from "./authScroll";
import { FIND_WORK_PATH } from "./findWorkUrl";

/**
 * The single worker-app header, used on the home page, every sub-page, and the public /browse board
 * (replacing the old TopBar, the sub-page header and the /browse marketing nav). Superset of all three:
 * brand, the primary nav, Sign in / Create account, and the Bill 96 language switcher on every page.
 * Dark brand shell (reuses the proven .topbar styles). Trilingual inline (en/fr-CA/ar).
 * The page the visitor is on is marked gold, bold and underlined, with aria-current="page".
 */
export function SiteHeader() {
  const locale = useLocale();
  const t = useT();
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
    if (window.location.pathname === "/" && document.querySelector(".home")) {
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
            {signedIn ? (
              <>
                {link("/how-it-works", nav("كيف يعمل", "Comment ça marche", "How it works"))}
                {link("/job-scanner", "JobScanner")}
                {link("/cv-builder", nav("إنشاء السيرة", "Créer un CV", "Build CV"))}
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
                {/* Signed out: just Home · Find work · Sign in. Everything else is in the footer. */}
                {link("/", t("nav.home"))}
                {link(FIND_WORK_PATH, t("nav.findWork"))}
                <a className="muted" href={accountHref("signin")} onClick={(e) => openAccount(e, "signin")}>{t("nav.signIn")}</a>
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
