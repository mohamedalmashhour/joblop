import { describe, expect, it } from "vitest";
import { searchNearbyJobs, type MarketplaceJobCandidate, type MarketplaceRegionNames } from "./marketplaceJobSearch";
import { PROVINCE_TERRITORY_NAMES, isProvinceCode } from "./canadaLocation";

const montreal = { latitude: 45.5019, longitude: -73.5674 };

// Canada region display-name capability built from the existing map (mirrors canadaAddressAdapter
// without importing @rwos/country-canada — that would create a shared↔country build cycle).
// Preserves the exact previous no-city fallback behavior for these tests.
const canadaRegionNames: MarketplaceRegionNames = {
  regionNameFromCode: (code) => (isProvinceCode(code) ? PROVINCE_TERRITORY_NAMES[code] : null)
};

function candidate(over: Partial<MarketplaceJobCandidate>): MarketplaceJobCandidate {
  return {
    jobRequestId: "req",
    role: "Chef",
    employerName: "Residence ABC",
    verifiedEmployer: true,
    city: "Laval",
    province: "QC",
    latitude: 45.6066,
    longitude: -73.7124,
    startAt: "2026-08-20T20:00:00.000Z",
    endAt: "2026-08-21T04:00:00.000Z",
    openings: 2,
    workerRateMinor: 3000,
    currency: "CAD",
    ...over
  };
}

describe("marketplace job search", () => {
  it("ranks by distance, applies radius, and serializes privacy-safe results", () => {
    const near = candidate({ jobRequestId: "near", city: "Laval", latitude: 45.6066, longitude: -73.7124 });
    const far = candidate({ jobRequestId: "far", city: "Toronto", province: "ON", latitude: 43.6532, longitude: -79.3832 });
    const results = searchNearbyJobs({ origin: montreal, radiusKm: 25, candidates: [far, near], regionNames: canadaRegionNames });

    expect(results.map((r) => r.jobRequestId)).toEqual(["near"]); // toronto filtered by radius
    const r = results[0]!;
    expect(r.areaLabel).toBe("Laval, QC");
    expect(r.distanceLabel).toMatch(/km away$/);
    expect(r.mapPoint.approximate).toBe(true);
    // privacy: no exact address, no exact coordinates on the result
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain("45.6066");
    expect(serialized).not.toContain("addressLine");
    expect(r).not.toHaveProperty("latitude");
  });

  it("map point is rounded (approximate), never the exact worksite", () => {
    const r = searchNearbyJobs({ origin: montreal, candidates: [candidate({ latitude: 45.60663, longitude: -73.71249 })], regionNames: canadaRegionNames })[0]!;
    expect(r.mapPoint).toEqual({ latitude: 45.61, longitude: -73.71, approximate: true });
  });

  it("no radius → returns all, still distance-ranked", () => {
    const a = candidate({ jobRequestId: "a", latitude: 45.51, longitude: -73.57 });
    const b = candidate({ jobRequestId: "b", latitude: 43.65, longitude: -79.38 });
    expect(searchNearbyJobs({ origin: montreal, candidates: [b, a], regionNames: canadaRegionNames }).map((r) => r.jobRequestId)).toEqual(["a", "b"]);
  });

  it("carries the worker-facing rate only as provided (policy-gated upstream)", () => {
    const withRate = searchNearbyJobs({ origin: montreal, candidates: [candidate({ workerRateMinor: 3000 })], regionNames: canadaRegionNames })[0]!;
    const noRate = searchNearbyJobs({ origin: montreal, candidates: [candidate({ workerRateMinor: null })], regionNames: canadaRegionNames })[0]!;
    expect(withRate.workerRateMinor).toBe(3000);
    expect(noRate.workerRateMinor).toBeNull();
  });

  // CHARACTERIZATION: areaLabel rendering must remain byte-identical to the pre-decoupling Canada
  // behavior — "City, CODE" when a city exists, else the injected full province/territory name.
  it("renders area labels identically for Canadian values (city and no-city fallback)", () => {
    const label = (over: Partial<MarketplaceJobCandidate>) =>
      searchNearbyJobs({ origin: montreal, candidates: [candidate({ latitude: 45.5, longitude: -73.6, ...over })], regionNames: canadaRegionNames })[0]!.areaLabel;
    // city present → "City, CODE" (province code, not full name) — unchanged
    expect(label({ city: "Montréal", province: "QC" })).toBe("Montréal, QC");
    expect(label({ city: "Toronto", province: "ON" })).toBe("Toronto, ON");
    expect(label({ city: "Vancouver", province: "BC" })).toBe("Vancouver, BC");
    expect(label({ city: "Whitehorse", province: "YT" })).toBe("Whitehorse, YT");
    // no city → injected full province/territory display name
    expect(label({ city: null, province: "QC" })).toBe(PROVINCE_TERRITORY_NAMES.QC);
    expect(label({ city: null, province: "ON" })).toBe(PROVINCE_TERRITORY_NAMES.ON);
    expect(label({ city: null, province: "BC" })).toBe(PROVINCE_TERRITORY_NAMES.BC);
    expect(label({ city: null, province: "YT" })).toBe(PROVINCE_TERRITORY_NAMES.YT);
  });

  it("no-city label falls back to the region code when the capability returns null (neutral, no crash)", () => {
    const nullNames: MarketplaceRegionNames = { regionNameFromCode: () => null };
    const r = searchNearbyJobs({ origin: montreal, candidates: [candidate({ city: null, province: "QC", latitude: 45.5, longitude: -73.6 })], regionNames: nullNames })[0]!;
    expect(r.areaLabel).toBe("QC");
  });
});

describe("marketplace job search: long-term listing pay (employer plans flag)", () => {
  it("passes the employer's pay offer through; a job without one is serialized exactly as before", () => {
    const offer = { minMinor: 2_200, maxMinor: null, unit: "hour" as const, currency: "CAD", paidBy: "employer" as const };
    const [withOffer] = searchNearbyJobs({
      origin: montreal,
      candidates: [candidate({ workerRateMinor: null, payOffered: offer })],
      regionNames: canadaRegionNames
    });
    expect(withOffer?.workerRateMinor).toBeNull();
    expect(withOffer?.payOffered).toEqual(offer);
    const [plain] = searchNearbyJobs({ origin: montreal, candidates: [candidate({})], regionNames: canadaRegionNames });
    expect(plain).not.toHaveProperty("payOffered");
    expect(Object.keys(plain!).at(-1)).toBe("currency");
  });
});
