import { describe, expect, it } from "vitest";
import { COUNTRY_CONFIG_ERRORS, isCountryProfileActivatable, resolveCountryConfig } from "@rwos/config";
import { apiCountryRegistry } from "./countryRegistry";
import { TEST_MODE_COUNTRY, withTestModeCountry } from "./countryRegistry.testMode";

describe("test-mode country injection", () => {
  it("the synthetic test country is complete and activatable", () => {
    expect(TEST_MODE_COUNTRY.country).toBe("canada-test");
    expect(isCountryProfileActivatable(TEST_MODE_COUNTRY)).toBe(true);
  });

  it("injects the synthetic country in local when the flag is enabled", () => {
    const reg = withTestModeCountry(apiCountryRegistry, "local", true);
    expect(reg["canada-test"]).toBeDefined();
    expect(resolveCountryConfig({ rwosEnv: "local", country: "canada-test", registry: reg }))
      .toBe(TEST_MODE_COUNTRY);
  });

  it("does NOT inject when the flag is disabled (base registry unchanged)", () => {
    const reg = withTestModeCountry(apiCountryRegistry, "local", false);
    expect(reg["canada-test"]).toBeUndefined();
    expect(reg).toBe(apiCountryRegistry);
  });

  it("NEVER injects in production/staging, even with the flag on (fail-closed)", () => {
    const prod = withTestModeCountry(apiCountryRegistry, "production", true);
    expect(prod["canada-test"]).toBeUndefined();
    expect(prod).toBe(apiCountryRegistry);
    expect(() =>
      resolveCountryConfig({ rwosEnv: "production", country: "canada-test", registry: prod })
    ).toThrow(COUNTRY_CONFIG_ERRORS.UNSUPPORTED);
  });

  it("does not disturb the base registry (Syria still the only real entry, no canada-test)", () => {
    expect(apiCountryRegistry["canada-test"]).toBeUndefined();
    expect(apiCountryRegistry.syria).toBeDefined();
  });
});
