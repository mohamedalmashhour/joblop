import type { CountryProfile } from "@rwos/config";

/**
 * Syria country profile — ISOLATED country implementation (countries/syria).
 *
 * Activation gate is CLOSED and the profile is INTENTIONALLY INCOMPLETE: legal terms are DRAFT,
 * providers are unbound, and the data region is undecided. `resolveCountryConfig` therefore
 * fail-closes with RWOS_COUNTRY_PROFILE_INCOMPLETE if Syria is selected — Syria is NOT launch-ready.
 *
 * Completing this profile is gated on qualified legal review, targeted-sanctions screening, and
 * written per-provider Syria-policy confirmation (broad U.S./EU sanctions were lifted in 2025;
 * targeted measures remain). See docs/launch/JOBLOP_COUNTRY_ARCHITECTURE_AUDIT_AND_MIGRATION_PLAN.md.
 *
 * This module does NOT change any financial, payroll, tax, employment, legal, currency, or provider
 * SEMANTICS — it only declares Syria's country-context values and holds the gate shut.
 */
export const syriaCountryProfile: CountryProfile = {
  country: "syria",
  displayName: "Syria",
  supported: true,
  activationGate: "closed", // held shut until the Syria implementation passes its own gates
  currency: "SYP",
  timezone: "Asia/Damascus",
  phoneCountryCode: "+963",
  dataRegion: null, // undecided — provider availability + data sovereignty (owner/provider)
  legalTermsVersion: null, // DRAFT — not finalized (qualified counsel)
  privacyTermsVersion: null, // DRAFT — not finalized (qualified counsel)
  providers: { payment: null, sms: null, geocoding: null } // unbound — per-provider confirmation
};
