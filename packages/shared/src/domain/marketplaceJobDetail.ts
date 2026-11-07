// Marketplace job DETAIL + employer PUBLIC PROFILE — the privacy-safe serialization for
// the worker-facing job page and employer page. Same locked rule as the list/map search:
// the browser NEVER receives exact coordinates, the exact street address, the residence
// internal name, the employer legal name, contract rates, or any administrative data.
//
// These are pure functions: an adapter fetches the full (privileged) rows, and these strip
// them down to exactly what a worker may see. Distance is computed server-side from the
// worker's search origin when provided.

import {
  formatDistanceKm,
  geodesicDistanceKm,
  toPublicMapPoint,
  type ProvinceCode,
  type PublicMapPoint
} from "./canadaLocation";
import type { MarketplaceRegionNames } from "./marketplaceJobSearch";
import type { PublicTravelEstimate } from "./travelTimeProviders";

// A fully-resolved candidate row (server-side only — carries exact coords the caller must
// never serialize directly).
export type MarketplaceJobDetailCandidate = Readonly<{
  jobRequestId: string;
  role: string;
  title: string;
  employerId: string;
  employerName: string; // public display name only
  verifiedEmployer: boolean; // MUST come from a real verification state, never inferred
  city: string | null;
  province: ProvinceCode;
  latitude: number; // exact — server-side only, never serialized out
  longitude: number;
  startAt: string;
  endAt: string;
  openings: number;
  workerRateMinor: number | null; // policy-gated worker-facing rate
  currency: string;
  description: string | null; // public job description
  duties: string | null; // duties summary
  safetyNotes: string | null; // employer's safety and site-access notes
  qualifications: readonly string[];
}>;

// Privacy-safe detail returned to the worker browser. No exact coords, no street address.
export type MarketplaceJobDetail = Readonly<{
  jobRequestId: string;
  role: string;
  title: string;
  employer: MarketplaceEmployerRef;
  areaLabel: string;
  distanceKm: number | null; // null when no search origin was supplied
  distanceLabel: string | null;
  mapPoint: PublicMapPoint; // approximate (rounded)
  travelTime: PublicTravelEstimate | null; // road ETA origin->worksite; null unless a routing provider resolved it
  startAt: string;
  endAt: string;
  openings: number;
  workerRateMinor: number | null;
  currency: string;
  description: string | null;
  duties: string | null;
  safetyNotes: string | null;
  qualifications: readonly string[];
}>;

export type MarketplaceEmployerRef = Readonly<{
  id: string;
  name: string;
  verified: boolean;
}>;

function areaLabel(city: string | null, province: ProvinceCode, regionNames: MarketplaceRegionNames): string {
  return city ? `${city}, ${province}` : (regionNames.regionNameFromCode(province) ?? province);
}

export function toMarketplaceJobDetail(input: {
  candidate: MarketplaceJobDetailCandidate;
  origin?: Readonly<{ latitude: number; longitude: number }> | null;
  regionNames: MarketplaceRegionNames; // injected country display-name capability (no implicit default)
}): MarketplaceJobDetail {
  const c = input.candidate;
  const distanceKm = input.origin
    ? Math.round(geodesicDistanceKm(input.origin, { latitude: c.latitude, longitude: c.longitude }) * 10) / 10
    : null;
  return {
    jobRequestId: c.jobRequestId,
    role: c.role,
    title: c.title,
    employer: { id: c.employerId, name: c.employerName, verified: c.verifiedEmployer },
    areaLabel: areaLabel(c.city, c.province, input.regionNames),
    distanceKm,
    distanceLabel:
      input.origin != null
        ? formatDistanceKm(geodesicDistanceKm(input.origin, { latitude: c.latitude, longitude: c.longitude }))
        : null,
    mapPoint: toPublicMapPoint({ latitude: c.latitude, longitude: c.longitude }),
    travelTime: null, // enriched by the API layer when a routing provider + origin are available
    startAt: c.startAt,
    endAt: c.endAt,
    openings: c.openings,
    workerRateMinor: c.workerRateMinor,
    currency: c.currency,
    description: c.description,
    duties: c.duties,
    safetyNotes: c.safetyNotes,
    qualifications: c.qualifications
  };
}

// ── Employer public profile ──

export type MarketplaceEmployerOpportunity = Readonly<{
  jobRequestId: string;
  role: string;
  areaLabel: string;
  startAt: string;
  endAt: string;
  openings: number;
}>;

export type MarketplaceEmployerProfile = Readonly<{
  id: string;
  name: string; // public display name only (never legal name)
  verified: boolean; // real verification state only
  areas: readonly string[]; // general "City, Prov" areas of active opportunities (approximate)
  activeOpportunityCount: number;
  opportunities: readonly MarketplaceEmployerOpportunity[];
}>;

export type MarketplaceEmployerProfileCandidate = Readonly<{
  id: string;
  name: string;
  verified: boolean;
  opportunities: readonly Readonly<{
    jobRequestId: string;
    role: string;
    city: string | null;
    province: ProvinceCode;
    startAt: string;
    endAt: string;
    openings: number;
  }>[];
}>;

export function toMarketplaceEmployerProfile(
  candidate: MarketplaceEmployerProfileCandidate,
  regionNames: MarketplaceRegionNames // injected country display-name capability (no implicit default)
): MarketplaceEmployerProfile {
  const opportunities = candidate.opportunities.map((o) => ({
    jobRequestId: o.jobRequestId,
    role: o.role,
    areaLabel: areaLabel(o.city, o.province, regionNames),
    startAt: o.startAt,
    endAt: o.endAt,
    openings: o.openings
  }));
  const areas = [...new Set(opportunities.map((o) => o.areaLabel))];
  return {
    id: candidate.id,
    name: candidate.name,
    verified: candidate.verified,
    areas,
    activeOpportunityCount: opportunities.length,
    opportunities
  };
}
