import type { CountryAddressPort, CountryProfile } from "@rwos/config";
import {
  CANADA_QUEBEC_COUNTRY_KEY,
  canadaAddressAdapter,
  canadaQuebecCountryProfile
} from "@rwos/country-canada";
import { syriaCountryProfile } from "@rwos/country-syria";
import { addressPortForCountry as testModeAddressPortForCountry } from "./countryRegistry.testMode";

/**
 * API composition-root country registry. The API is the country-aware composition root: it wires
 * the available isolated country implementations here and injects them into master's
 * country-neutral `resolveCountryConfig`. Master itself never references a country.
 *
 * - Syria is RECOGNIZED, but its gate is CLOSED and the profile INCOMPLETE, so selecting it still
 *   fail-closes (RWOS_COUNTRY_PROFILE_INCOMPLETE).
 * - Canada/Québec (`RWOS_COUNTRY=canada-quebec`) is the owner-approved launch market: open gate,
 *   complete profile, selectable in every environment including production.
 * The synthetic `canada-test` country is NOT here; it is overlaid only in local/test by
 * countryRegistry.testMode.ts.
 */
export const apiCountryRegistry: Readonly<Record<string, CountryProfile>> = {
  [syriaCountryProfile.country]: syriaCountryProfile,
  [canadaQuebecCountryProfile.country]: canadaQuebecCountryProfile
};

/**
 * Address port for the selected country. Canada/Québec gets the countries/canada adapter, which is
 * proven byte-identical to the test-mode port `canada-test` uses (countryRegistry.test.ts), so the
 * live address behaviour does not change when the country switches. Every other country falls back
 * to the test-mode resolver (canada-test only), and anything else stays undefined (fail-closed).
 */
export function apiAddressPortForCountry(country: string): CountryAddressPort | undefined {
  if (country === CANADA_QUEBEC_COUNTRY_KEY) return canadaAddressAdapter;
  return testModeAddressPortForCountry(country);
}
