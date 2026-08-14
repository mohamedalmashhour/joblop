import { describe, expect, it } from "vitest";
import {
  COUNTRY_CONFIG_ERRORS,
  NEUTRAL_FIXTURE_COUNTRY,
  isCountryProfileActivatable,
  resolveCountryConfig,
  type CountryProfile
} from "./country";

// A synthetic, fully-complete + activatable profile (NOT a real market — for resolver tests only).
const completeProfile: CountryProfile = {
  country: "testland",
  displayName: "Testland",
  supported: true,
  activationGate: "open",
  currency: "TST",
  timezone: "Etc/UTC",
  phoneCountryCode: "+999",
  dataRegion: "test-region",
  legalTermsVersion: "legal-v1",
  privacyTermsVersion: "privacy-v1",
  providers: { payment: "test-pay", sms: "test-sms", geocoding: "test-geo" }
};

const incompleteProfile: CountryProfile = {
  ...completeProfile,
  country: "halfland",
  legalTermsVersion: null, // DRAFT → not activatable
  providers: { payment: null, sms: null, geocoding: null }
};

const registry = { testland: completeProfile, halfland: incompleteProfile };

describe("country selection (fail-closed)", () => {
  it("no RWOS_COUNTRY in local/test → neutral fixture (engine-only, never activatable)", () => {
    for (const env of ["local", "test"]) {
      const p = resolveCountryConfig({ rwosEnv: env, country: undefined, registry });
      expect(p).toBe(NEUTRAL_FIXTURE_COUNTRY);
      expect(isCountryProfileActivatable(p)).toBe(false);
    }
  });

  it("no RWOS_COUNTRY in staging/production → REFUSE (RWOS_COUNTRY_REQUIRED)", () => {
    for (const env of ["staging", "production"]) {
      expect(() => resolveCountryConfig({ rwosEnv: env, country: undefined, registry })).toThrow(
        COUNTRY_CONFIG_ERRORS.MISSING
      );
    }
  });

  it("neutral-fixture is rejected outside local/test", () => {
    expect(() => resolveCountryConfig({ rwosEnv: "production", country: "neutral-fixture", registry })).toThrow(
      COUNTRY_CONFIG_ERRORS.UNSUPPORTED
    );
    expect(resolveCountryConfig({ rwosEnv: "local", country: "neutral-fixture", registry })).toBe(
      NEUTRAL_FIXTURE_COUNTRY
    );
  });

  it("unknown country → UNSUPPORTED (no silent fallback to another country)", () => {
    expect(() => resolveCountryConfig({ rwosEnv: "production", country: "atlantis", registry })).toThrow(
      COUNTRY_CONFIG_ERRORS.UNSUPPORTED
    );
  });

  it("incomplete/gate-closed profile → INCOMPLETE (fail-closed even when registered)", () => {
    expect(() => resolveCountryConfig({ rwosEnv: "production", country: "halfland", registry })).toThrow(
      COUNTRY_CONFIG_ERRORS.INCOMPLETE
    );
    expect(isCountryProfileActivatable(incompleteProfile)).toBe(false);
  });

  it("a complete, supported, open profile resolves and is activatable", () => {
    const p = resolveCountryConfig({ rwosEnv: "production", country: "testland", registry });
    expect(p).toBe(completeProfile);
    expect(isCountryProfileActivatable(p)).toBe(true);
  });

  it("the neutral fixture itself is never activatable", () => {
    expect(isCountryProfileActivatable(NEUTRAL_FIXTURE_COUNTRY)).toBe(false);
  });
});
