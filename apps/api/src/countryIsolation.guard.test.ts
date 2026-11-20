import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Gate 1 (country-neutral architecture) isolation guard — MULTI_COUNTRY_PLATFORM_POLICY.md.
// The API composition root (app.ts) is country-NEUTRAL: it must not reach for a specific country's
// location primitives. Country-specific address/region behavior is injected via the neutral
// CountryAddressPort (options.countryAddress); the Canadian implementation lives in
// countries/canada's adapter (and the local/test-only testModeCanadaAddressPort). This guard
// fails closed if anyone re-couples master to Canada's location functions directly.
const apiSource = readFileSync(new URL("./app.ts", import.meta.url), "utf8");

// Behavior functions that are Canada-specific and must NEVER be used directly in master. (The
// reserved TYPE `ProvinceCode` is intentionally allowed — it is a type, not a jurisdiction behavior.)
const CANADA_LOCATION_FUNCTIONS = [
  "isProvinceCode",
  "normalizeCanadianPostalCode",
  "isCanadianPostalCodeFormat",
  "isWithinCanadaBounds",
  "provinceHintFromPostalCode",
  "PROVINCE_TERRITORY_NAMES",
  "canadaLocation"
] as const;

describe("country isolation — master API holds no country-specific location coupling", () => {
  it("app.ts does not reference any Canada-specific location function", () => {
    for (const fn of CANADA_LOCATION_FUNCTIONS) {
      expect(apiSource).not.toContain(fn);
    }
  });

  it("app.ts routes region/address behavior through the injected country port instead", () => {
    // The neutral port is the only sanctioned path for region/postal/bounds checks.
    expect(apiSource).toContain("options.countryAddress");
    expect(apiSource).toContain("countryAddress?.isRegionCode");
  });
});
