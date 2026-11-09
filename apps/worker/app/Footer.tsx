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
        padding: "22px 16px",
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
      <nav style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Link href="/terms" style={{ color: "#f8b808", textDecoration: "none" }}>
          {words.terms}
        </Link>
        <Link href="/privacy" style={{ color: "#f8b808", textDecoration: "none" }}>
          {words.privacy}
        </Link>
        <Link href="/account-deletion" style={{ color: "#f8b808", textDecoration: "none" }}>
          {words.deletion}
        </Link>
      </nav>
    </footer>
  );
}
