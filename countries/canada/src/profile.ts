import type { CountryProfile } from "@rwos/config";

/**
 * Canada REFERENCE country profile (countries/canada). This captures the country-context values the
 * master platform uses TODAY, verbatim, so Phase 2b repoints can source them from a country profile
 * instead of inline literals — with zero behavior change. Canada is a behavior reference in this
 * release, NOT a launch market: its activation gate is CLOSED, so it is never activatable, and it
 * inherits nothing and is inherited by nothing.
 *
 * Values below MUST equal the current master defaults (asserted by canada.test.ts):
 *   currency "CAD" · timezone "America/Toronto" · phone "+1".
 */
export const canadaCountryProfile: CountryProfile = {
  country: "canada",
  displayName: "Canada (reference)",
  supported: true,
  activationGate: "closed", // reference only — not a launch market this release
  currency: "CAD",
  timezone: "America/Toronto",
  phoneCountryCode: "+1",
  dataRegion: "northamerica-northeast2",
  legalTermsVersion: null, // not a launch market → no finalized legal
  privacyTermsVersion: null,
  providers: { payment: null, sms: null, geocoding: null }
};
