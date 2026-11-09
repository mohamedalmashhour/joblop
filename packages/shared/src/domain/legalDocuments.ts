// One version for Joblop's published Terms of Service and Privacy Policy (employer and worker
// sites, and the phone app, which opens the worker site's pages). Bump LEGAL_DOCUMENTS_VERSION and
// LEGAL_EFFECTIVE_DATE together whenever the published text changes: sign-up records this version
// as the one the person accepted (see apps/api /auth/register, audit reason "legal_accepted:<v>").
//
// DRAFT — must be reviewed by a Québec lawyer before relying on it. See docs/legal/LEGAL_REVIEW_NOTES.md.
import { PLATFORM_INVOICE_CONTACT, PLATFORM_INVOICE_ISSUER } from "./platformInvoiceIssuer";

export const LEGAL_DOCUMENTS_VERSION = "2026-11-09";
export const LEGAL_EFFECTIVE_DATE = "2026-11-09";

/** The contact address shown on the public sites for privacy and legal questions. */
export const LEGAL_CONTACT_EMAIL = "contact@joblop.com";

export const LEGAL_COMPANY = {
  legalName: PLATFORM_INVOICE_ISSUER.legalName,
  tradeName: "Joblop",
  neq: PLATFORM_INVOICE_ISSUER.enterpriseIdentifier,
  gst: PLATFORM_INVOICE_ISSUER.gstRegistrationReference,
  qst: PLATFORM_INVOICE_ISSUER.qstRegistrationReference,
  address: `${PLATFORM_INVOICE_CONTACT.addressLine1}, ${PLATFORM_INVOICE_CONTACT.city}, ${PLATFORM_INVOICE_CONTACT.province} ${PLATFORM_INVOICE_CONTACT.postalCode}`,
  email: LEGAL_CONTACT_EMAIL
} as const;

const VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** A version a client says was accepted, kept only when it is the date form used above. */
export function readAcceptedLegalVersion(value: unknown): string | null {
  return typeof value === "string" && VERSION_PATTERN.test(value.trim()) ? value.trim() : null;
}

/**
 * Plain building blocks for legal text, so the same wording can be rendered by each site.
 * Email addresses inside text are turned into mailto links by the renderers.
 */
export type LegalBlock =
  | Readonly<{ kind: "h2"; text: string; id?: string }>
  | Readonly<{ kind: "h3"; text: string }>
  | Readonly<{ kind: "p"; text: string }>
  | Readonly<{ kind: "ul"; items: readonly string[] }>
  | Readonly<{ kind: "ol"; items: readonly string[] }>
  | Readonly<{ kind: "table"; head: readonly string[]; rows: readonly (readonly string[])[] }>
  | Readonly<{ kind: "links"; links: readonly Readonly<{ href: string; label: string }>[] }>;

export type LegalLanguage = "en" | "fr" | "ar";

/** Maps a site locale ("en-CA", "fr-CA", "ar", or the phone app's "en"/"fr"/"ar") to a legal language. */
export function legalLanguageFor(locale: string | null | undefined): LegalLanguage {
  const value = (locale ?? "").toLowerCase();
  if (value === "ar" || value.startsWith("ar-")) return "ar";
  if (value === "fr" || value.startsWith("fr-")) return "fr";
  return "en";
}
