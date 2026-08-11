import { describe, expect, it } from "vitest";
import { searchNearbyJobs, type MarketplaceJobCandidate } from "./marketplaceJobSearch";

const montreal = { latitude: 45.5019, longitude: -73.5674 };

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
    const results = searchNearbyJobs({ origin: montreal, radiusKm: 25, candidates: [far, near] });

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
    const r = searchNearbyJobs({ origin: montreal, candidates: [candidate({ latitude: 45.60663, longitude: -73.71249 })] })[0]!;
    expect(r.mapPoint).toEqual({ latitude: 45.61, longitude: -73.71, approximate: true });
  });

  it("no radius → returns all, still distance-ranked", () => {
    const a = candidate({ jobRequestId: "a", latitude: 45.51, longitude: -73.57 });
    const b = candidate({ jobRequestId: "b", latitude: 43.65, longitude: -79.38 });
    expect(searchNearbyJobs({ origin: montreal, candidates: [b, a] }).map((r) => r.jobRequestId)).toEqual(["a", "b"]);
  });

  it("carries the worker-facing rate only as provided (policy-gated upstream)", () => {
    const withRate = searchNearbyJobs({ origin: montreal, candidates: [candidate({ workerRateMinor: 3000 })] })[0]!;
    const noRate = searchNearbyJobs({ origin: montreal, candidates: [candidate({ workerRateMinor: null })] })[0]!;
    expect(withRate.workerRateMinor).toBe(3000);
    expect(noRate.workerRateMinor).toBeNull();
  });
});
