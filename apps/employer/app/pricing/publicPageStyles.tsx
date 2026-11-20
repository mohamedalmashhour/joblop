import type { CSSProperties, ReactNode } from "react";
import { cookies } from "next/headers";
import { JobLopLogo } from "../JobLopLogo";
import { SiteHeader } from "../shared/SiteHeader";
import { LOCALE_COOKIE, resolveEmployerLocale, type EmployerLocale } from "../i18n/config";
import { pricingCopy } from "./pricingContent";

// Shared look for the plain public pages (/pricing, /faq): black page, gold #F8B808 accents.
export const GOLD = "#F8B808";

export async function readPublicLocale(): Promise<EmployerLocale> {
  const store = await cookies();
  return resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
}

export type PublicNavLabels = Readonly<{
  home: string;
  howItWorks: string;
  pricing: string;
  plans: string;
  faq: string;
  contact: string;
  signIn: string;
  terms: string;
  privacy: string;
}>;

/**
 * Public header. Every signed-out employer page uses the same header as the home page (logo, EN/FR/ع,
 * menu with a ☰ button on phones, Sign In and the main button). `nav` is kept so existing callers do not
 * change; the labels come from the shared header in the visitor's language.
 */
export async function PublicHeader({ current }: { nav?: PublicNavLabels; current?: string | undefined }) {
  return <SiteHeader current={current} />;
}

export function PublicFooter({ nav, children }: { nav: PublicNavLabels; children?: ReactNode }) {
  return (
    <footer style={publicStyles.footer}>
      <a href="/" style={publicStyles.brand} aria-label="Joblop home">
        <JobLopLogo height={26} />
      </a>
      <nav aria-label="Footer navigation" style={publicStyles.footerLinks}>
        <a href="/" style={publicStyles.footerLink}>{nav.home}</a>
        <a href="/pricing" style={publicStyles.footerLink}>{nav.pricing}</a>
        <a href="/plans" style={publicStyles.footerLink}>{nav.plans}</a>
        <a href="/faq" style={publicStyles.footerLink}>{nav.faq}</a>
        <a href="/contact" style={publicStyles.footerLink}>{nav.contact}</a>
        <a href="/terms" style={publicStyles.footerLink}>{nav.terms}</a>
        <a href="/privacy" style={publicStyles.footerLink}>{nav.privacy}</a>
      </nav>
      {children}
    </footer>
  );
}

const line = "1px solid rgba(248, 184, 8, 0.16)";
// Side padding that keeps content in a centred 1040px column on wide screens (borders stay full width).
const gutter = "max(clamp(16px, 4vw, 40px), calc((100% - 1040px) / 2))";
const button: CSSProperties = {
  alignItems: "center",
  borderRadius: 8,
  display: "inline-flex",
  fontSize: 15,
  fontWeight: 800,
  justifyContent: "center",
  minHeight: 48,
  padding: "0 20px",
  textDecoration: "none"
};

export const publicStyles: Record<string, CSSProperties> = {
  // Column layout so the footer sits at the bottom of short pages (no black band under it).
  page: { background: "#000000", color: "#f4efe4", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  header: {
    alignItems: "center",
    background: "#000000",
    borderBottom: line,
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: "18px clamp(16px, 4vw, 40px)",
    position: "sticky",
    top: 0,
    zIndex: 1
  },
  brand: { color: "#f4efe4", textDecoration: "none" },
  nav: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 14 },
  navLink: { color: "#f4efe4", fontSize: 14, fontWeight: 700, textDecoration: "none" },
  hero: { background: "#1b160e", display: "grid", gap: 14, padding: `clamp(34px, 7vw, 72px) ${gutter}` },
  eyebrow: { color: GOLD, fontSize: 13, fontWeight: 900, margin: 0, textTransform: "uppercase" },
  title: { color: "#ffffff", fontSize: "clamp(32px, 5vw, 54px)", lineHeight: 1.1, margin: 0, maxWidth: 900 },
  lede: { color: "#f0e8d8", fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 760 },
  section: { borderBottom: line, padding: `40px ${gutter}` },
  sectionTitle: { color: "#f4efe4", fontSize: "clamp(24px, 3.5vw, 34px)", lineHeight: 1.15, margin: "0 0 10px" },
  sectionCopy: { color: "#f0e8d8", fontSize: 16, lineHeight: 1.6, margin: "0 0 14px", maxWidth: 780 },
  list: { color: "#f4efe4", display: "grid", fontSize: 16, gap: 8, lineHeight: 1.55, margin: 0, maxWidth: 860, paddingInlineStart: 22 },
  cardGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" },
  card: { background: "#0c0c0c", border: line, borderRadius: 10, padding: 20 },
  cardTitle: { color: "#f4efe4", fontSize: 20, margin: 0 },
  cardPrice: { color: GOLD, fontSize: 18, fontWeight: 900, margin: "6px 0 10px" },
  cardText: { color: "#b3a894", fontSize: 15, lineHeight: 1.6, margin: "8px 0 0" },
  link: { color: GOLD, display: "inline-block", fontWeight: 800, marginTop: 16, textDecoration: "none" },
  actions: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 },
  primaryButton: { ...button, background: GOLD, color: "#000000" },
  secondaryButton: { ...button, border: line, color: "#ffffff" },
  footer: {
    alignItems: "center",
    background: "#1b160e",
    color: "#ffffff",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    marginTop: "auto",
    padding: `24px ${gutter}`
  },
  footerLinks: { display: "flex", flexWrap: "wrap", gap: "0 16px" },
  // 44px tall so each footer link is easy to tap on phones.
  footerLink: { alignItems: "center", color: "#ffffff", display: "inline-flex", fontWeight: 700, minHeight: 44, textDecoration: "none" }
};

/**
 * The public footer in the visitor's language, with Terms, Privacy and FAQ. Every signed-out page on
 * the employer site ends with this footer.
 */
export async function PublicSiteFooter() {
  return <PublicFooter nav={pricingCopy[await readPublicLocale()].nav} />;
}
