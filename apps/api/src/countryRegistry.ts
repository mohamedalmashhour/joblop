import type { CountryProfile } from "@rwos/config";
import { syriaCountryProfile } from "@rwos/country-syria";

/**
 * API composition-root country registry (Phase 2a). The API is the country-aware composition root:
 * it wires the available isolated country implementations here and injects them into master's
 * country-neutral `resolveCountryConfig`. Master itself never references a country.
 *
 * Syria's profile is included so `RWOS_COUNTRY=syria` is RECOGNIZED, but its gate is CLOSED and the
 * profile is INCOMPLETE, so selection still fail-closes (RWOS_COUNTRY_PROFILE_INCOMPLETE). No country
 * is activatable yet; this only proves the wiring + per-service packaging.
 */
export const apiCountryRegistry: Readonly<Record<string, CountryProfile>> = {
  [syriaCountryProfile.country]: syriaCountryProfile
};
