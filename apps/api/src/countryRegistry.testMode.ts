import type { CountryProfile, CountryAddressPort } from "@rwos/config";
import {
  PROVINCE_TERRITORY_NAMES,
  isCanadianPostalCodeFormat,
  isProvinceCode,
  isWithinCanadaBounds,
  normalizeCanadianPostalCode,
  provinceHintFromPostalCode
} from "@rwos/shared";

/**
 * TEST-MODE country injection (local/test only).
 *
 * Lets the full activatable country path — currency, timezone, worker search, the
 * hire→paid lifecycle — run end-to-end WITHOUT opening any real market's gate. It does
 * NOT touch `apiCountryRegistry` or the reference `countries/canada` profile (which is
 * deliberately gate-closed and asserted by canada.test.ts). Instead it overlays a
 * SYNTHETIC, clearly-labelled country that only ever exists under an explicit flag.
 *
 * Fail-closed by construction:
 *   - injected ONLY when RWOS_COUNTRY_TEST_MODE is set AND rwosEnv is local|test.
 *   - staging/production receive the base registry verbatim — the synthetic country is
 *     never present, so `resolveCountryConfig` cannot select it there.
 *
 * To exercise the flow:  RWOS_COUNTRY_TEST_MODE=1 RWOS_COUNTRY=canada-test  (local/test).
 */
export const TEST_MODE_COUNTRY: CountryProfile = {
  country: "canada-test",
  displayName: "Canada (TEST MODE — synthetic, NOT a launch market)",
  supported: true,
  activationGate: "open",
  currency: "CAD",
  timezone: "America/Toronto",
  phoneCountryCode: "+1",
  dataRegion: "northamerica-northeast2",
  // Placeholder, obviously-non-production identifiers. Real markets get finalized legal
  // versions from counsel and bound providers from contracts (see the Execution Pack).
  legalTermsVersion: "test-legal-v0",
  privacyTermsVersion: "test-privacy-v0",
  providers: { payment: "fake-local", sms: "fake-local", geocoding: "fake-local" }
};

/** True only when the test-mode flag is explicitly set. */
export function isCountryTestModeEnabled(env = process.env.RWOS_COUNTRY_TEST_MODE): boolean {
  return env === "1" || env === "true" || env === "local";
}

/**
 * Return the base registry, augmented with the synthetic test country ONLY in local/test
 * when the flag is enabled. Everywhere else (and whenever disabled) the base registry is
 * returned unchanged — so production/staging behaviour is identical to not calling this.
 */
export function withTestModeCountry(
  base: Readonly<Record<string, CountryProfile>>,
  rwosEnv: string,
  enabled: boolean = isCountryTestModeEnabled()
): Readonly<Record<string, CountryProfile>> {
  const isDev = rwosEnv === "local" || rwosEnv === "test";
  if (!enabled || !isDev) return base;
  return { ...base, [TEST_MODE_COUNTRY.country]: TEST_MODE_COUNTRY };
}

/**
 * Test-mode address port — identical Canada semantics, kept self-contained in apps/api so it
 * takes NO dependency on the gate-closed countries/canada package. Used only when the synthetic
 * `canada-test` country is selected, so the marketplace / job-detail + geocoding path (and the
 * worksite map + ETA) runs end-to-end locally. Real markets wire their own adapter.
 */
export const testModeCanadaAddressPort: CountryAddressPort = {
  normalizePostalCode: (input) => normalizeCanadianPostalCode(input),
  isPostalCodeFormat: (input) => isCanadianPostalCodeFormat(input),
  regionNameFromCode: (code) => (isProvinceCode(code) ? PROVINCE_TERRITORY_NAMES[code] : null),
  isRegionCode: (code) => isProvinceCode(code),
  regionHintFromPostalCode: (postalCode) => provinceHintFromPostalCode(postalCode),
  isWithinCountryBounds: (latitude, longitude) => isWithinCanadaBounds(latitude, longitude),
  geocodeCountryRestriction: "CA"
};

/**
 * Resolve the address port for a selected country. Test-mode only here (canada-test); returns
 * undefined otherwise so non-test markets fail closed until their own adapter is wired.
 */
export function addressPortForCountry(country: string): CountryAddressPort | undefined {
  return country === TEST_MODE_COUNTRY.country ? testModeCanadaAddressPort : undefined;
}
