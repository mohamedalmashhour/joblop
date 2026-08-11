import { describe, expect, it } from "vitest";
import {
  CANADA_PROVINCE_TERRITORY_CODES,
  PROVINCE_TERRITORY_NAMES,
  boundingBoxKm,
  rankByDistanceKm,
  formatDistanceKm,
  geodesicDistanceKm,
  isCanadianPostalCodeFormat,
  isProvinceCode,
  isValidCoordinate,
  isWithinCanadaBounds,
  isWithinRadiusKm,
  normalizeCanadianPostalCode,
  provinceHintFromPostalCode,
  toPublicMarketplaceLocation,
  type CanadianLocation
} from "./canadaLocation";

describe("Canadian postal codes", () => {
  it("normalizes to A1A 1A1 regardless of case/spacing", () => {
    expect(normalizeCanadianPostalCode("h7v0b1")).toBe("H7V 0B1");
    expect(normalizeCanadianPostalCode("H7V 0B1")).toBe("H7V 0B1");
    expect(normalizeCanadianPostalCode("  h7v  0b1 ")).toBe("H7V 0B1");
    expect(normalizeCanadianPostalCode("M5V2T6")).toBe("M5V 2T6");
  });

  it("rejects invalid Canadian formats", () => {
    expect(normalizeCanadianPostalCode("12345")).toBeNull(); // US-style
    expect(normalizeCanadianPostalCode("D1A 1A1")).toBeNull(); // D not allowed first
    expect(normalizeCanadianPostalCode("A1A1A")).toBeNull(); // too short
    expect(isCanadianPostalCodeFormat("SW1A 1AA")).toBe(false); // UK
    expect(isCanadianPostalCodeFormat("H7V 0B1")).toBe(true);
  });

  it("gives a coarse province hint from the first letter", () => {
    expect(provinceHintFromPostalCode("H7V 0B1")).toBe("QC"); // Laval
    expect(provinceHintFromPostalCode("M5V 2T6")).toBe("ON"); // Toronto
    expect(provinceHintFromPostalCode("V6B 1A1")).toBe("BC"); // Vancouver
    expect(provinceHintFromPostalCode("not-a-code")).toBeNull();
  });
});

describe("provinces / territories", () => {
  it("covers all 13 with names", () => {
    expect(CANADA_PROVINCE_TERRITORY_CODES).toHaveLength(13);
    for (const code of CANADA_PROVINCE_TERRITORY_CODES) {
      expect(PROVINCE_TERRITORY_NAMES[code]).toBeTruthy();
    }
    expect(isProvinceCode("QC")).toBe(true);
    expect(isProvinceCode("ZZ")).toBe(false);
  });
});

describe("coordinates", () => {
  it("validates coordinate ranges", () => {
    expect(isValidCoordinate(45.6, -73.7)).toBe(true);
    expect(isValidCoordinate(200, -73.7)).toBe(false);
    expect(isValidCoordinate("45", -73.7)).toBe(false);
    expect(isValidCoordinate(NaN, 0)).toBe(false);
  });

  it("bounds-checks Canada", () => {
    expect(isWithinCanadaBounds(45.6, -73.7)).toBe(true); // Montreal
    expect(isWithinCanadaBounds(40.7, -74.0)).toBe(false); // NYC — outside
    expect(isWithinCanadaBounds(51.5, -0.1)).toBe(false); // London
  });
});

describe("geodesic distance + radius", () => {
  // Montreal ↔ Laval ≈ 11 km; Montreal ↔ Toronto ≈ 500 km.
  const montreal = { latitude: 45.5019, longitude: -73.5674 };
  const laval = { latitude: 45.6066, longitude: -73.7124 };
  const toronto = { latitude: 43.6532, longitude: -79.3832 };

  it("computes plausible km distances", () => {
    const d = geodesicDistanceKm(montreal, laval);
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(20);
    expect(geodesicDistanceKm(montreal, toronto)).toBeGreaterThan(450);
  });

  it("radius filter is inclusive at the exact boundary", () => {
    const exact = geodesicDistanceKm(montreal, laval);
    expect(isWithinRadiusKm(montreal, laval, exact)).toBe(true); // boundary inclusive
    expect(isWithinRadiusKm(montreal, laval, exact - 0.001)).toBe(false);
    expect(isWithinRadiusKm(montreal, toronto, 50)).toBe(false);
    expect(isWithinRadiusKm(montreal, laval, 25)).toBe(true);
  });

  it("formats distance in km", () => {
    expect(formatDistanceKm(3.24)).toBe("3.2 km away");
    expect(formatDistanceKm(11.4)).toBe("11 km away");
  });
});

describe("bounding box + ranking (search)", () => {
  const montreal = { latitude: 45.5019, longitude: -73.5674 };
  const laval = { latitude: 45.6066, longitude: -73.7124 };
  const toronto = { latitude: 43.6532, longitude: -79.3832 };

  it("bounding box CONTAINS every point within the radius (never under-covers)", () => {
    const box = boundingBoxKm(montreal, 25);
    // Laval (~11km) is inside the box.
    expect(laval.latitude).toBeGreaterThanOrEqual(box.minLat);
    expect(laval.latitude).toBeLessThanOrEqual(box.maxLat);
    expect(laval.longitude).toBeGreaterThanOrEqual(box.minLng);
    expect(laval.longitude).toBeLessThanOrEqual(box.maxLng);
    // Toronto (~500km) is outside a 25km box.
    expect(toronto.longitude < box.minLng).toBe(true);
  });

  it("ranks candidates by distance ascending and filters by radius", () => {
    const items = [
      { id: "far", ...toronto },
      { id: "near", ...laval },
      { id: "here", ...montreal }
    ];
    const ranked = rankByDistanceKm(montreal, items, 25);
    expect(ranked.map((r) => r.id)).toEqual(["here", "near"]); // toronto filtered out
    expect(ranked[0]!.distanceKm).toBeLessThan(ranked[1]!.distanceKm);
    // no radius → all, still sorted
    expect(rankByDistanceKm(montreal, items).map((r) => r.id)).toEqual(["here", "near", "far"]);
  });

  it("is stable for equal distances (deterministic)", () => {
    const a = { id: "a", ...laval };
    const b = { id: "b", ...laval };
    expect(rankByDistanceKm(montreal, [a, b]).map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("privacy-safe public location", () => {
  it("exposes only area label, never street address", () => {
    const loc: CanadianLocation = {
      country: "CA", province: "QC", city: "Laval", postalCode: "H7V 0B1",
      addressLines: ["805 boul. Chomedey, unit 12"], latitude: 45.6, longitude: -73.7,
      precision: "rooftop", provider: "osm", providerReference: "node/1", resolvedAt: "2026-08-10T00:00:00.000Z"
    };
    const pub = toPublicMarketplaceLocation(loc);
    expect(pub.areaLabel).toBe("Laval, QC");
    expect(JSON.stringify(pub)).not.toContain("Chomedey");
    expect(pub).not.toHaveProperty("addressLines");
    expect(pub).not.toHaveProperty("latitude");
  });
});
