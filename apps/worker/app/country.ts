// Country profile seam — F16 Stage 1 (country-neutral master, per MULTI_COUNTRY_PLATFORM_POLICY.md).
//
// The worker app must not hardcode Canada/Québec assumptions. Instead it reads all country-specific
// data from the ACTIVE CountryProfile. The core stays country-neutral; each country is an isolated
// profile. This is Stage 1: it introduces the seam and migrates the structured data (regions, legal
// entity, contact address, currency). Later stages migrate remaining copy/labels and hoist the
// profiles into countries/<country>/ as the policy prescribes.
//
// FAIL-CLOSED (policy requirement): an unknown or unconfigured country refuses to resolve rather than
// silently falling back, so the app never runs with an incomplete/wrong country profile.

export type Region = Readonly<{ code: string; en: string; fr: string; ar: string }>;

export type CountryProfile = Readonly<{
  /** Lower-case country selector, e.g. "ca". */
  code: string;
  /** Display name of the country. */
  name: string;
  /** First-level administrative regions (provinces/states/governorates). */
  regions: readonly Region[];
  /** ISO 4217 currency code, e.g. "CAD". */
  currencyCode: string;
  /** The operating legal entity shown in footers/legal. */
  legalEntityName: string;
  /** Postal contact address shown on public pages. */
  contactAddress: string;
}>;

// ── Canada (the first launch country). Values moved verbatim from the previously hardcoded worker app.
const ca: CountryProfile = {
  code: "ca",
  name: "Canada",
  regions: [
    { code: "AB", en: "Alberta", fr: "Alberta", ar: "ألبرتا" },
    { code: "BC", en: "British Columbia", fr: "Colombie-Britannique", ar: "كولومبيا البريطانية" },
    { code: "MB", en: "Manitoba", fr: "Manitoba", ar: "مانيتوبا" },
    { code: "NB", en: "New Brunswick", fr: "Nouveau-Brunswick", ar: "نيو برونزويك" },
    { code: "NL", en: "Newfoundland and Labrador", fr: "Terre-Neuve-et-Labrador", ar: "نيوفاوندلاند ولابرادور" },
    { code: "NS", en: "Nova Scotia", fr: "Nouvelle-Écosse", ar: "نوفا سكوشا" },
    { code: "NT", en: "Northwest Territories", fr: "Territoires du Nord-Ouest", ar: "الأقاليم الشمالية الغربية" },
    { code: "NU", en: "Nunavut", fr: "Nunavut", ar: "نونافوت" },
    { code: "ON", en: "Ontario", fr: "Ontario", ar: "أونتاريو" },
    { code: "PE", en: "Prince Edward Island", fr: "Île-du-Prince-Édouard", ar: "جزيرة الأمير إدوارد" },
    { code: "QC", en: "Quebec", fr: "Québec", ar: "كيبيك" },
    { code: "SK", en: "Saskatchewan", fr: "Saskatchewan", ar: "ساسكاتشوان" },
    { code: "YT", en: "Yukon", fr: "Yukon", ar: "يوكون" }
  ],
  currencyCode: "CAD",
  legalEntityName: "9375-7649 Québec inc.",
  contactAddress: "207-805 boul. Chomedey, Laval, QC"
};

// Registry of supported country profiles. A new country is added as its own entry (eventually sourced
// from countries/<country>/) — never by editing the neutral core's logic.
const COUNTRIES: Readonly<Record<string, CountryProfile>> = { ca };

export const SUPPORTED_COUNTRIES: readonly string[] = Object.keys(COUNTRIES);

/**
 * Resolve the active country profile from `NEXT_PUBLIC_RWOS_COUNTRY` (defaults to "ca").
 * Fail-closed: throws when the configured country has no profile, so the app cannot run with an
 * unsupported/incomplete country.
 */
export function activeCountry(): CountryProfile {
  const code = (process.env.NEXT_PUBLIC_RWOS_COUNTRY ?? "ca").trim().toLowerCase();
  const profile = COUNTRIES[code];
  if (!profile) {
    throw new Error(
      `[country] No CountryProfile configured for "${code}". Set NEXT_PUBLIC_RWOS_COUNTRY to a supported country (${SUPPORTED_COUNTRIES.join(", ")}).`
    );
  }
  return profile;
}
