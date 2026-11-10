import Link from "next/link";
import { legalLanguageFor, type LegalLanguage } from "@rwos/shared";
import { Brand } from "./Brand";
import { activeCountry } from "./country";

// Footer words per language. The site locale is "en-CA" / "fr-CA" / "ar", so it is mapped with
// legalLanguageFor (an exact match on the bare "fr" never matched "fr-CA").
export const footerWords: Readonly<Record<LegalLanguage, { terms: string; privacy: string; deletion: string }>> = {
  en: { terms: "Terms", privacy: "Privacy", deletion: "Delete my account" },
  fr: { terms: "Conditions d’utilisation", privacy: "Confidentialité", deletion: "Supprimer mon compte" },
  ar: { terms: "الشروط", privacy: "الخصوصية", deletion: "حذف حسابي" }
};

export const footerLinks = ["/terms", "/privacy", "/account-deletion"] as const;

// Global footer for the worker app: copyright + legal links on every page.
export function Footer({ locale }: { locale: string }) {
  const words = footerWords[legalLanguageFor(locale)];
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
