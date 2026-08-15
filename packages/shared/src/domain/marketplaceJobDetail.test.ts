import { describe, expect, it } from "vitest";
import {
  toMarketplaceJobDetail,
  toMarketplaceEmployerProfile,
  type MarketplaceJobDetailCandidate,
  type MarketplaceEmployerProfileCandidate
} from "./marketplaceJobDetail";
import type { MarketplaceRegionNames } from "./marketplaceJobSearch";
import { PROVINCE_TERRITORY_NAMES, isProvinceCode } from "./canadaLocation";

const montreal = { latitude: 45.5019, longitude: -73.5674 };

// Canada region display-name capability (mirrors canadaAddressAdapter without importing the country
// package — avoids a shared↔country build cycle). Preserves the exact prior no-city fallback.
const canadaRegionNames: MarketplaceRegionNames = {
  regionNameFromCode: (code) => (isProvinceCode(code) ? PROVINCE_TERRITORY_NAMES[code] : null)
};

function candidate(over?: Partial<MarketplaceJobDetailCandidate>): MarketplaceJobDetailCandidate {
  return {
    jobRequestId: "job-1",
    role: "Chef",
    title: "Evening kitchen shift",
    employerId: "org-1",
    employerName: "Residence ABC",
    verifiedEmployer: false,
    city: "Laval",
    province: "QC",
    latitude: 45.6066,
    longitude: -73.7124,
    startAt: "2026-08-20T20:00:00.000Z",
    endAt: "2026-08-21T04:00:00.000Z",
    openings: 2,
    workerRateMinor: null,
    currency: "CAD",
    description: "Busy dinner service.",
    duties: "Prep, plating, cleanup.",
    qualifications: ["Food handler certificate"],
    ...over
  };
}

describe("marketplace job detail serialization", () => {
  it("computes distance from origin and is privacy-safe (no exact coords/address)", () => {
    const detail = toMarketplaceJobDetail({ candidate: candidate(), origin: montreal, regionNames: canadaRegionNames });
    expect(detail.areaLabel).toBe("Laval, QC");
    expect(detail.distanceKm).not.toBeNull();
    expect(detail.distanceLabel).toMatch(/km away$/);
    expect(detail.mapPoint.approximate).toBe(true);

    const serialized = JSON.stringify(detail);
    expect(serialized).not.toContain("45.6066"); // exact lat never leaks
    expect(serialized).not.toContain("-73.7124"); // exact lng never leaks
    expect(serialized).not.toContain("addressLine");
    expect(detail).not.toHaveProperty("latitude");
    expect(detail).not.toHaveProperty("longitude");
  });

  it("omits distance when no origin is supplied", () => {
    const detail = toMarketplaceJobDetail({ candidate: candidate(), origin: null, regionNames: canadaRegionNames });
    expect(detail.distanceKm).toBeNull();
    expect(detail.distanceLabel).toBeNull();
    // still shows approximate area + map point
    expect(detail.mapPoint.approximate).toBe(true);
  });

  it("carries the verified flag verbatim — never inferred", () => {
    expect(toMarketplaceJobDetail({ candidate: candidate({ verifiedEmployer: false }), regionNames: canadaRegionNames }).employer.verified).toBe(false);
    expect(toMarketplaceJobDetail({ candidate: candidate({ verifiedEmployer: true }), regionNames: canadaRegionNames }).employer.verified).toBe(true);
  });

  it("map point is rounded to the approximate precision, never the exact worksite", () => {
    const detail = toMarketplaceJobDetail({ candidate: candidate({ latitude: 45.60663, longitude: -73.71249 }), regionNames: canadaRegionNames });
    expect(detail.mapPoint).toEqual({ latitude: 45.61, longitude: -73.71, approximate: true });
  });
});

describe("marketplace employer profile serialization", () => {
  function profileCandidate(): MarketplaceEmployerProfileCandidate {
    return {
      id: "org-1",
      name: "Residence ABC",
      verified: false,
      opportunities: [
        { jobRequestId: "j1", role: "Chef", city: "Laval", province: "QC", startAt: "2026-08-20T20:00:00.000Z", endAt: "2026-08-21T04:00:00.000Z", openings: 2 },
        { jobRequestId: "j2", role: "Cook", city: "Laval", province: "QC", startAt: "2026-08-22T20:00:00.000Z", endAt: "2026-08-23T04:00:00.000Z", openings: 1 },
        { jobRequestId: "j3", role: "Cook", city: "Montreal", province: "QC", startAt: "2026-08-24T20:00:00.000Z", endAt: "2026-08-25T04:00:00.000Z", openings: 1 }
      ]
    };
  }

  it("summarizes active opportunities + distinct areas, exposing only public fields", () => {
    const profile = toMarketplaceEmployerProfile(profileCandidate(), canadaRegionNames);
    expect(profile.name).toBe("Residence ABC");
    expect(profile.verified).toBe(false);
    expect(profile.activeOpportunityCount).toBe(3);
    expect(profile.areas).toEqual(["Laval, QC", "Montreal, QC"]);
    // no leakage of internal identifiers/addresses
    const serialized = JSON.stringify(profile);
    expect(serialized).not.toContain("addressLine");
    expect(serialized).not.toContain("legalName");
  });
});

// CHARACTERIZATION: representative Canadian values must render identically to pre-decoupling.
describe("marketplace detail/profile area-label equivalence (Canada)", () => {
  it("job detail renders city and no-city labels identically for representative provinces/territory", () => {
    const label = (over: Partial<MarketplaceJobDetailCandidate>) =>
      toMarketplaceJobDetail({ candidate: candidate(over), origin: null, regionNames: canadaRegionNames }).areaLabel;
    expect(label({ city: "Montréal", province: "QC" })).toBe("Montréal, QC");
    expect(label({ city: "Toronto", province: "ON" })).toBe("Toronto, ON");
    expect(label({ city: "Vancouver", province: "BC" })).toBe("Vancouver, BC");
    expect(label({ city: "Whitehorse", province: "YT" })).toBe("Whitehorse, YT");
    expect(label({ city: null, province: "QC" })).toBe(PROVINCE_TERRITORY_NAMES.QC);
    expect(label({ city: null, province: "ON" })).toBe(PROVINCE_TERRITORY_NAMES.ON);
    expect(label({ city: null, province: "BC" })).toBe(PROVINCE_TERRITORY_NAMES.BC);
    expect(label({ city: null, province: "YT" })).toBe(PROVINCE_TERRITORY_NAMES.YT);
  });

  it("employer profile no-city area uses the injected full region name; null capability falls back to code", () => {
    const cand: MarketplaceEmployerProfileCandidate = {
      id: "org-x",
      name: "Residence X",
      verified: false,
      opportunities: [
        { jobRequestId: "a", role: "Cook", city: null, province: "ON", startAt: "2026-08-20T20:00:00.000Z", endAt: "2026-08-21T04:00:00.000Z", openings: 1 }
      ]
    };
    expect(toMarketplaceEmployerProfile(cand, canadaRegionNames).areas).toEqual([PROVINCE_TERRITORY_NAMES.ON]);
    const nullNames: MarketplaceRegionNames = { regionNameFromCode: () => null };
    expect(toMarketplaceEmployerProfile(cand, nullNames).areas).toEqual(["ON"]);
  });
});
