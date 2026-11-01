// Country profile seam — shared core for F16 (country-neutral master, per MULTI_COUNTRY_PLATFORM_POLICY).
//
// Both front-end apps (worker, employer) read country-specific data from the ACTIVE CountryProfile
// instead of hardcoding Canada/Québec. The core stays country-neutral; each country is an isolated
// profile. FAIL-CLOSED: an unknown/unconfigured country refuses to resolve, so the apps never run with
// an incomplete or wrong profile. NOTE: money-domain currency (invoice/payment/contract boundaries)
// is intentionally NOT driven from here yet — that is the money layer's own staged migration.

import type { Holiday } from "./holidays";

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
  /** Short display currency symbol for informal amounts, e.g. "$". */
  currencySymbol: string;
  /** The operating legal entity shown in footers/legal. */
  legalEntityName: string;
  /** Postal contact address shown on public pages. */
  contactAddress: string;
  /** Public holidays for this country — drives the platform greeting-card occasions. Country-specific
   *  DATA; the holiday engine (holidays.ts) that resolves these to dates is country-neutral. */
  holidays: readonly Holiday[];
}>;

// ── Canada (the first launch country). Values moved verbatim from the previously hardcoded apps.
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
  currencySymbol: "$",
  legalEntityName: "9375-7649 Québec inc.",
  contactAddress: "207-805 boul. Chomedey, Laval, QC",
  // Canada's statutory / widely-observed holidays. weekday: 0=Sun … 1=Mon. QC-only days carry a region.
  holidays: [
    { key: "new_year", en: "New Year's Day", fr: "Jour de l'An", ar: "رأس السنة", rule: { kind: "fixed", month: 1, day: 1 } },
    { key: "good_friday", en: "Good Friday", fr: "Vendredi saint", ar: "الجمعة العظيمة", rule: { kind: "easterOffset", offsetDays: -2 } },
    { key: "easter_monday", en: "Easter Monday", fr: "Lundi de Pâques", ar: "اثنين الفصح", rule: { kind: "easterOffset", offsetDays: 1 } },
    { key: "victoria_day", en: "Victoria Day", fr: "Journée nationale des patriotes", ar: "عيد فيكتوريا", rule: { kind: "weekdayOnOrBefore", month: 5, day: 24, weekday: 1 } },
    { key: "saint_jean", en: "St-Jean-Baptiste Day", fr: "Fête nationale du Québec", ar: "عيد القديس يوحنا المعمدان", rule: { kind: "fixed", month: 6, day: 24 }, regions: ["QC"] },
    { key: "canada_day", en: "Canada Day", fr: "Fête du Canada", ar: "يوم كندا", rule: { kind: "fixed", month: 7, day: 1 } },
    { key: "civic_holiday", en: "Civic Holiday", fr: "Congé civique", ar: "العطلة المدنية", rule: { kind: "nthWeekday", month: 8, weekday: 1, nth: 1 } },
    { key: "labour_day", en: "Labour Day", fr: "Fête du Travail", ar: "عيد العمال", rule: { kind: "nthWeekday", month: 9, weekday: 1, nth: 1 } },
    { key: "truth_reconciliation", en: "National Day for Truth and Reconciliation", fr: "Journée de la vérité et de la réconciliation", ar: "يوم الحقيقة والمصالحة", rule: { kind: "fixed", month: 9, day: 30 } },
    { key: "thanksgiving", en: "Thanksgiving", fr: "Action de grâce", ar: "عيد الشكر", rule: { kind: "nthWeekday", month: 10, weekday: 1, nth: 2 } },
    { key: "remembrance_day", en: "Remembrance Day", fr: "Jour du Souvenir", ar: "يوم الذكرى", rule: { kind: "fixed", month: 11, day: 11 } },
    { key: "christmas", en: "Christmas Day", fr: "Noël", ar: "عيد الميلاد", rule: { kind: "fixed", month: 12, day: 25 } },
    { key: "boxing_day", en: "Boxing Day", fr: "Lendemain de Noël", ar: "يوم الملاكمة", rule: { kind: "fixed", month: 12, day: 26 } }
  ]
};

// Registry of supported country profiles. A new country is added as its own entry (eventually sourced
// from countries/<country>/) — never by editing the neutral core's logic.
const COUNTRIES: Readonly<Record<string, CountryProfile>> = { ca };

export const SUPPORTED_COUNTRIES: readonly string[] = Object.keys(COUNTRIES);

/**
 * Resolve the active country profile from `NEXT_PUBLIC_RWOS_COUNTRY` (defaults to "ca").
 * Fail-closed: throws when the configured country has no profile, so the apps cannot run with an
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
