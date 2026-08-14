import { describe, expect, it } from "vitest";
import {
  COUNTRY_CONFIG_ERRORS,
  NEUTRAL_FIXTURE_COUNTRY,
  isCountryProfileActivatable,
  resolveCountryConfig
} from "@rwos/config";
import { apiCountryRegistry } from "./countryRegistry";

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
