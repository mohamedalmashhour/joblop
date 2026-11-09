import type { CountryProfile } from "@rwos/config";
import { LEGAL_DOCUMENTS_VERSION } from "@rwos/shared";

/**
 * Canada / Québec LAUNCH profile (owner-approved official launch market).
 *
 * Select it on the API with `RWOS_COUNTRY=canada-quebec`. Unlike the closed `canada` reference
 * profile (./profile.ts, kept as a behaviour reference and still gate-closed), this profile has an
 * OPEN activation gate, so `resolveCountryConfig` can select it in staging and production.
 *
 * It carries exactly the values the live soft launch runs with today under the synthetic
 * `canada-test` country, so selecting it changes nothing the API does:
 *   currency "CAD" · timezone "America/Toronto" · phone "+1" · data region northamerica-northeast2,
 * and the API wires the same Canadian address adapter for it (see apps/api countryRegistry.ts).
 * Québec has no separate IANA zone in this codebase; America/Toronto is the zone every money and
 * schedule path already uses (America/Montreal is a deprecated alias of it).
 *
 * Legal versions are the published Terms/Privacy version sign-up already records
 * (LEGAL_DOCUMENTS_VERSION). Providers name what live actually uses: Stripe (plus Interac
 * e-transfer handled by staff) for payment, Brevo for SMS, Google Maps for geocoding. The provider
 * names are descriptive; each integration is still switched on by its own env settings.
 *
 * Languages and sales taxes are descriptive metadata (EN/FR/AR; GST 5% + QST 9.975%); the money
 * engine keeps its own rates and apps/api asserts they agree.
 *
 * productionDefaults turns the RWOS_JOB_FLOW_ENABLED / RWOS_PUBLIC_SIGNUP_ENABLED production flags
 * ON when their env vars are unset, so the live job flow and sign-up keep working after the switch.
 */
export const CANADA_QUEBEC_COUNTRY_KEY = "canada-quebec";

export const canadaQuebecCountryProfile: CountryProfile = {
  country: CANADA_QUEBEC_COUNTRY_KEY,
  displayName: "Canada (Québec)",
  supported: true,
  activationGate: "open",
  currency: "CAD",
  timezone: "America/Toronto",
  phoneCountryCode: "+1",
  dataRegion: "northamerica-northeast2",
  legalTermsVersion: `terms-${LEGAL_DOCUMENTS_VERSION}`,
  privacyTermsVersion: `privacy-${LEGAL_DOCUMENTS_VERSION}`,
  providers: { payment: "stripe", sms: "brevo", geocoding: "google-maps" },
  languages: ["en", "fr", "ar"],
  salesTaxes: [
    { code: "GST", ratePartsPerMillion: 50_000 },
    { code: "QST", ratePartsPerMillion: 99_750 }
  ],
  productionDefaults: { jobFlow: true, publicSignup: true }
};
