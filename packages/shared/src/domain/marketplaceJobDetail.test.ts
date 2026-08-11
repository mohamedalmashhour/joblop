import { describe, expect, it } from "vitest";
import {
  toMarketplaceJobDetail,
  toMarketplaceEmployerProfile,
  type MarketplaceJobDetailCandidate,
  type MarketplaceEmployerProfileCandidate
} from "./marketplaceJobDetail";

const montreal = { latitude: 45.5019, longitude: -73.5674 };

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
    const detail = toMarketplaceJobDetail({ candidate: candidate(), origin: montreal });
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
    const detail = toMarketplaceJobDetail({ candidate: candidate(), origin: null });
    expect(detail.distanceKm).toBeNull();
    expect(detail.distanceLabel).toBeNull();
    // still shows approximate area + map point
    expect(detail.mapPoint.approximate).toBe(true);
  });

  it("carries the verified flag verbatim — never inferred", () => {
    expect(toMarketplaceJobDetail({ candidate: candidate({ verifiedEmployer: false }) }).employer.verified).toBe(false);
    expect(toMarketplaceJobDetail({ candidate: candidate({ verifiedEmployer: true }) }).employer.verified).toBe(true);
  });

  it("map point is rounded to the approximate precision, never the exact worksite", () => {
    const detail = toMarketplaceJobDetail({ candidate: candidate({ latitude: 45.60663, longitude: -73.71249 }) });
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
    const profile = toMarketplaceEmployerProfile(profileCandidate());
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
