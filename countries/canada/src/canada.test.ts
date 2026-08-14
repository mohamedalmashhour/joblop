import { describe, expect, it } from "vitest";
import { isCountryProfileActivatable } from "@rwos/config";
import {
  PROVINCE_TERRITORY_NAMES,
  isCanadianPostalCodeFormat,
  isWithinCanadaBounds,
  normalizeCanadianPostalCode,
  provinceHintFromPostalCode
} from "@rwos/shared";
import { canadaAddressAdapter } from "./addressAdapter";
import { canadaCountryProfile } from "./profile";

// CHARACTERIZATION: the Canada reference must equal today's master Canadian behavior exactly.
describe("Canada reference profile — preserves current master defaults", () => {
  it("carries the exact current country-context values", () => {
    expect(canadaCountryProfile.currency).toBe("CAD");
    expect(canadaCountryProfile.timezone).toBe("America/Toronto");
    expect(canadaCountryProfile.phoneCountryCode).toBe("+1");
  });

  it("is a reference only — NOT activatable (gate closed)", () => {
    expect(canadaCountryProfile.activationGate).toBe("closed");
    expect(isCountryProfileActivatable(canadaCountryProfile)).toBe(false);
  });
});

describe("Canada address adapter — byte-identical delegation to existing functions", () => {
  const postalSamples = [
    // valid + canonicalization (spacing/case)
    "H7V 1A1",
    "h7v1a1",
    "K1A0B1",
    "M5V 2T6",
    "  m5v2t6  ",
    // format boundaries: excluded letters D/F/I/O/Q/U everywhere; W/Z forbidden in first position
    "D1A 1A1",
    "F1A 1A1",
    "W1A 1A1",
    "Z1A 1A1",
    "A1D 1A1",
    "A1A 1O1",
    // length boundaries
    "A1A 1A",
    "A1A 1A11",
    "A1A1A1",
    // non-codes
    "not-a-code",
    "12345",
    ""
  ];

  it("normalizePostalCode matches normalizeCanadianPostalCode for all samples", () => {
    for (const s of postalSamples) {
      expect(canadaAddressAdapter.normalizePostalCode(s)).toBe(normalizeCanadianPostalCode(s));
    }
  });

  it("isPostalCodeFormat matches isCanadianPostalCodeFormat for all samples", () => {
    for (const s of postalSamples) {
      expect(canadaAddressAdapter.isPostalCodeFormat(s)).toBe(isCanadianPostalCodeFormat(s));
    }
  });

  it("regionNameFromCode matches PROVINCE_TERRITORY_NAMES (and null for unknown)", () => {
    for (const code of Object.keys(PROVINCE_TERRITORY_NAMES)) {
      expect(canadaAddressAdapter.regionNameFromCode(code)).toBe(
        PROVINCE_TERRITORY_NAMES[code as keyof typeof PROVINCE_TERRITORY_NAMES]
      );
    }
    expect(canadaAddressAdapter.regionNameFromCode("ZZ")).toBeNull();
  });

  it("regionHintFromPostalCode + isWithinCountryBounds delegate identically", () => {
    for (const s of postalSamples) {
      expect(canadaAddressAdapter.regionHintFromPostalCode(s)).toBe(provinceHintFromPostalCode(s));
    }
    const coords: Array<[number, number]> = [
      [45.5, -73.6], // Montreal (in bounds)
      [43.65, -79.38], // Toronto (in bounds)
      [40.7, -74.0], // NYC (out of bounds, south)
      [83.5, -70.0], // far north edge
      [41.0, -95.0], // south-central US (out)
      [60.0, -141.0], // Yukon/Alaska border longitude edge
      [0, 0],
      [90, 180],
      [-90, -180]
    ];
    for (const [lat, lng] of coords) {
      expect(canadaAddressAdapter.isWithinCountryBounds(lat, lng)).toBe(isWithinCanadaBounds(lat, lng));
    }
  });
});
