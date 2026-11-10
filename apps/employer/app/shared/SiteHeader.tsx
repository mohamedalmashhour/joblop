import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { HeaderNav } from "../HeaderNav";
import { JobLopLogo } from "../JobLopLogo";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../i18n/config";
import { getLandingContent } from "../landingContent";

/**
 * The one header for every signed-out employer page (home, /how-it-works, /about, /contact, /pricing,
 * /plans, /faq, /signin, /signup, /terms, /privacy): logo, EN/FR/ع switch, the menu (a ☰ button on
 * phones), "Sign In" and the main button. Labels come from the visitor's language.
 */
export async function SiteHeader({ current }: { current?: string | undefined }) {
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const c = getLandingContent(locale);
  // Production keeps the owner's "contact us first" rule: the main button goes to /contact.
  const isProduction = process.env.RWOS_ENV === "production";
  return (
    <header style={siteHeaderStyles.header}>
      <a href="/" style={siteHeaderStyles.brand} aria-label="Joblop home">
        <JobLopLogo height={30} />
      </a>
      <div style={siteHeaderStyles.right}>
        <LanguageSwitcher />
        <HeaderNav
          ctaHref={isProduction ? "/contact" : "/signup/employer"}
          ctaLabel={isProduction ? c.header.ctaRequestAccess : c.header.ctaGetStarted}
          links={c.header.navLinks}
          openLabel={c.header.openMenu}
          closeLabel={c.header.closeMenu}
          signIn={c.header.signIn}
          current={current}
        />
      </div>
    </header>
  );
}

export const siteHeaderStyles: Record<string, CSSProperties> = {
  header: {
    alignItems: "center",
    background: "#000000",
    borderBottom: "1px solid rgba(248, 184, 8, 0.16)",
    display: "flex",
    flexWrap: "nowrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "18px clamp(16px, 5vw, 72px)",
    position: "sticky",
    top: 0,
    zIndex: 10
  },
  brand: { alignItems: "center", color: "#f4efe4", display: "inline-flex", flexShrink: 0, textDecoration: "none" },
  right: { alignItems: "center", display: "flex", gap: 14 }
};
