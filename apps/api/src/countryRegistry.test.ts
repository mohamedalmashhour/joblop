import { describe, expect, it } from "vitest";
import {
  COUNTRY_CONFIG_ERRORS,
  NEUTRAL_FIXTURE_COUNTRY,
  isCountryProfileActivatable,
  resolveCountryConfig
} from "@rwos/config";
import { apiAddressPortForCountry, apiCountryRegistry } from "./countryRegistry";
import { TEST_MODE_COUNTRY, testModeCanadaAddressPort, withTestModeCountry } from "./countryRegistry.testMode";
import { GST_RATE_PPM, QST_RATE_PPM } from "./payChannel";

describe("API composition-root country registry (Phase 2a)", () => {
  it("registers Syria (recognized) but keeps it NOT activatable", () => {
    const syria = apiCountryRegistry.syria;
    expect(syria).toBeDefined();
    expect(syria?.country).toBe("syria");
    expect(isCountryProfileActivatable(syria!)).toBe(false);
  });

  it("selecting Syria fails closed (recognized, INCOMPLETE — gate still shut)", () => {
    expect(() =>
      resolveCountryConfig({ rwosEnv: "production", country: "syria", registry: apiCountryRegistry })
    ).toThrow(COUNTRY_CONFIG_ERRORS.INCOMPLETE);
  });

  it("no country in local/test still resolves the non-market neutral fixture", () => {
    expect(
      resolveCountryConfig({ rwosEnv: "local", country: undefined, registry: apiCountryRegistry })
    ).toBe(NEUTRAL_FIXTURE_COUNTRY);
  });

  it("no country in staging/production still refuses (RWOS_COUNTRY_REQUIRED)", () => {
    expect(() =>
      resolveCountryConfig({ rwosEnv: "production", country: undefined, registry: apiCountryRegistry })
    ).toThrow(COUNTRY_CONFIG_ERRORS.MISSING);
  });

  it("an unknown country is never silently substituted", () => {
    expect(() =>
      resolveCountryConfig({ rwosEnv: "production", country: "atlantis", registry: apiCountryRegistry })
    ).toThrow(COUNTRY_CONFIG_ERRORS.UNSUPPORTED);
  });
});

describe("Canada/Québec launch market (RWOS_COUNTRY=canada-quebec)", () => {
  it("is registered and selectable in production and staging", () => {
    for (const rwosEnv of ["production", "staging"]) {
      const profile = resolveCountryConfig({ rwosEnv, country: "canada-quebec", registry: apiCountryRegistry });
      expect(profile.country).toBe("canada-quebec");
      expect(isCountryProfileActivatable(profile)).toBe(true);
    }
  });

  it("is also selectable in test mode, and canada-test keeps resolving exactly as before", () => {
    const testRegistry = withTestModeCountry(apiCountryRegistry, "test", true);
    expect(resolveCountryConfig({ rwosEnv: "test", country: "canada-quebec", registry: testRegistry }).country).toBe(
      "canada-quebec"
    );
    expect(resolveCountryConfig({ rwosEnv: "test", country: "canada-test", registry: testRegistry })).toBe(
      TEST_MODE_COUNTRY
    );
  });

  it("injects the same timezone and currency the live canada-test country does", () => {
    const quebec = apiCountryRegistry["canada-quebec"]!;
    expect(quebec.timezone).toBe(TEST_MODE_COUNTRY.timezone);
    expect(quebec.currency).toBe(TEST_MODE_COUNTRY.currency);
    expect(quebec.phoneCountryCode).toBe(TEST_MODE_COUNTRY.phoneCountryCode);
    expect(quebec.dataRegion).toBe(TEST_MODE_COUNTRY.dataRegion);
    expect(TEST_MODE_COUNTRY.productionDefaults).toBeUndefined();
  });

  it("declares the same GST and QST rates the money engine charges", () => {
    expect(apiCountryRegistry["canada-quebec"]!.salesTaxes).toEqual([
      { code: "GST", ratePartsPerMillion: GST_RATE_PPM },
      { code: "QST", ratePartsPerMillion: QST_RATE_PPM }
    ]);
  });

  it("canada-test still gets the very same test-mode address port (live behaviour unchanged)", () => {
    expect(apiAddressPortForCountry("canada-test")).toBe(testModeCanadaAddressPort);
    expect(apiAddressPortForCountry("syria")).toBeUndefined();
    expect(apiAddressPortForCountry("neutral-fixture")).toBeUndefined();
  });

  it("canada-quebec gets an address port that behaves identically to the canada-test port", () => {
    const quebec = apiAddressPortForCountry("canada-quebec")!;
    const live = testModeCanadaAddressPort;
    expect(quebec).toBeDefined();
    expect(quebec.geocodeCountryRestriction).toBe(live.geocodeCountryRestriction);
    const postal = ["H7V 1A1", "h7v1a1", "K1A0B1", "  m5v2t6  ", "D1A 1A1", "W1A 1A1", "A1A 1A", "A1A1A1", "12345", ""];
    for (const s of postal) {
      expect(quebec.normalizePostalCode(s)).toBe(live.normalizePostalCode(s));
      expect(quebec.isPostalCodeFormat(s)).toBe(live.isPostalCodeFormat(s));
      expect(quebec.regionHintFromPostalCode(s)).toBe(live.regionHintFromPostalCode(s));
    }
    for (const code of ["QC", "ON", "BC", "YT", "ZZ", "qc", "", null, undefined]) {
      expect(quebec.isRegionCode(code)).toBe(live.isRegionCode(code));
      if (typeof code === "string") expect(quebec.regionNameFromCode(code)).toBe(live.regionNameFromCode(code));
    }
    for (const [lat, lng] of [[45.5, -73.6], [43.65, -79.38], [40.7, -74.0], [83.5, -70.0], [0, 0]] as const) {
      expect(quebec.isWithinCountryBounds(lat, lng)).toBe(live.isWithinCountryBounds(lat, lng));
    }
  });
});
