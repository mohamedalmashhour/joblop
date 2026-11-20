import Link from "next/link";
import { legalLanguageFor, type LegalLanguage } from "@rwos/shared";
import { Brand } from "./Brand";
import { activeCountry } from "./country";
import { resolveWorkerLocale } from "./i18n/config";
import { dictionaries, type MessageKey } from "./i18n/messages";

// Employer site — set NEXT_PUBLIC_EMPLOYER_URL in production.
const EMPLOYER_URL = process.env.NEXT_PUBLIC_EMPLOYER_URL ?? "http://localhost:3100";
// Staff admin workspace — shown in the "For teams" footer row only when NEXT_PUBLIC_ADMIN_URL is set.
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "";

// Footer words per language. The site locale is "en-CA" / "fr-CA" / "ar", so it is mapped with
// legalLanguageFor (an exact match on the bare "fr" never matched "fr-CA").
export const footerWords: Readonly<Record<LegalLanguage, { terms: string; privacy: string; deletion: string; teams: string; employer: string; admin: string }>> = {
  en: { terms: "Terms", privacy: "Privacy", deletion: "Delete my account", teams: "For teams", employer: "Employer", admin: "Admin" },
  fr: { terms: "Conditions d’utilisation", privacy: "Confidentialité", deletion: "Supprimer mon compte", teams: "Pour les équipes", employer: "Employeur", admin: "Administration" },
  ar: { terms: "الشروط", privacy: "الخصوصية", deletion: "حذف حسابي", teams: "للفِرق", employer: "صاحب العمل", admin: "الإدارة" }
};

export const footerLinks = ["/terms", "/privacy", "/account-deletion"] as const;

// Global footer for the worker app: copyright + legal links on every page.
export function Footer({ locale }: { locale: string }) {
  const words = footerWords[legalLanguageFor(locale)];
  const dict = dictionaries[resolveWorkerLocale(locale)] ?? dictionaries["en-CA"];
  const site = (key: MessageKey) => dict[key] ?? dictionaries["en-CA"][key] ?? key;
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(248, 184, 8, 0.16)",
        background: "#000000",
        marginTop: 56,
        // Lines up with the 1040px content column above (.wrap) on wide screens.
        padding: "12px max(20px, calc((100% - 1040px) / 2))",
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 12.5,
        color: "#b3a894"
      }}
    >
      <span>© {year} <Brand /> · {activeCountry().legalEntityName}</span>
      {/* Pages that left the simple home page and the short menu stay one tap away here. */}
      <nav className="site-footer-links" style={{ display: "flex", gap: "0 20px", flexWrap: "wrap" }}>
        <a href="/how-it-works" style={footerLinkStyle}>{site("foot.howItWorks")}</a>
        <a href="/about" style={footerLinkStyle}>{site("foot.about")}</a>
        <a href="/cv-builder" style={footerLinkStyle}>{site("foot.cv")}</a>
        <a href={EMPLOYER_URL} style={footerLinkStyle}>{site("foot.employers")}</a>
        <a href="/about#contact" style={footerLinkStyle}>{site("foot.contact")}</a>
      </nav>
      {/* For teams: installable Employer and Admin workspaces, each with its own app icon. */}
      <nav aria-label={words.teams} style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span>{words.teams}:</span>
        <a href={EMPLOYER_URL} style={teamLinkStyle}>
          <img src="/team-employer.png" alt="" width={28} height={28} style={teamIconStyle} />
          {words.employer}
        </a>
        {ADMIN_URL ? (
          <a href={ADMIN_URL} style={teamLinkStyle}>
            <img src="/team-admin.png" alt="" width={28} height={28} style={teamIconStyle} />
            {words.admin}
          </a>
        ) : null}
      </nav>
      <nav style={{ display: "flex", gap: "0 20px", flexWrap: "wrap" }}>
        <Link href="/terms" style={footerLinkStyle}>
          {words.terms}
        </Link>
        <Link href="/privacy" style={footerLinkStyle}>
          {words.privacy}
        </Link>
        <Link href="/account-deletion" style={footerLinkStyle}>
          {words.deletion}
        </Link>
      </nav>
    </footer>
  );
}

// 44px tall so each footer link is easy to tap on phones.
const footerLinkStyle = { alignItems: "center", color: "#f8b808", display: "inline-flex", minHeight: 44, textDecoration: "none" } as const;

const teamLinkStyle = { ...footerLinkStyle, display: "inline-flex", alignItems: "center", gap: 6 } as const;
const teamIconStyle = { borderRadius: 7, display: "block" } as const;
