import type { CSSProperties, ReactNode } from "react";
import { cookies } from "next/headers";
import { JobLopLogo } from "../JobLopLogo";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { LOCALE_COOKIE, resolveEmployerLocale, type EmployerLocale } from "../i18n/config";

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

export function PublicHeader({ nav, current }: { nav: PublicNavLabels; current: "/pricing" | "/faq" }) {
  const links: readonly (readonly [string, string])[] = [
    ["/", nav.home],
    ["/how-it-works", nav.howItWorks],
    ["/pricing", nav.pricing],
    ["/plans", nav.plans],
    ["/faq", nav.faq],
    ["/contact", nav.contact],
    ["/signin", nav.signIn]
  ];
  return (
    <header style={publicStyles.header}>
      <a href="/" style={publicStyles.brand} aria-label="Joblop home">
        <JobLopLogo height={28} />
      </a>
      <nav aria-label="Primary navigation" style={publicStyles.nav}>
        {links.map(([href, label]) => (
          <a key={href} href={href} style={publicStyles.navLink} aria-current={href === current ? "page" : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <LanguageSwitcher />
    </header>
  );
}

export function PublicFooter({ nav, children }: { nav: PublicNavLabels; children?: ReactNode }) {
  return (
    <footer style={publicStyles.footer}>
      <span>Joblop</span>
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
  page: { background: "#000000", color: "#f4efe4", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
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
  hero: { background: "#1b160e", display: "grid", gap: 14, padding: "clamp(34px, 7vw, 72px) clamp(16px, 4vw, 40px)" },
  eyebrow: { color: GOLD, fontSize: 13, fontWeight: 900, margin: 0, textTransform: "uppercase" },
  title: { color: "#ffffff", fontSize: "clamp(32px, 5vw, 54px)", lineHeight: 1.06, margin: 0, maxWidth: 900 },
  lede: { color: "#f0e8d8", fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 760 },
  section: { borderBottom: line, padding: "40px clamp(16px, 4vw, 40px)" },
  sectionTitle: { color: "#f4efe4", fontSize: "clamp(24px, 3.5vw, 34px)", lineHeight: 1.15, margin: "0 0 10px" },
  sectionCopy: { color: "#f0e8d8", fontSize: 16, lineHeight: 1.6, margin: "0 0 14px", maxWidth: 780 },
  list: { color: "#f4efe4", display: "grid", fontSize: 16, gap: 8, lineHeight: 1.55, margin: 0, maxWidth: 820, paddingInlineStart: 22 },
  cardGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", maxWidth: 820 },
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
    padding: "28px clamp(16px, 4vw, 40px)"
  },
  footerLinks: { display: "flex", flexWrap: "wrap", gap: 12 },
  footerLink: { color: "#ffffff", fontWeight: 700, textDecoration: "none" }
};
