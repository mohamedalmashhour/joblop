// Marketplace job search — the pure ranking + privacy-serialization pipeline. The DB
// bounding-box pre-filter (adapter) fetches candidate jobs whose worksite lat/lng fall
// in the box; this ranks them by authoritative geodesic distance, applies the inclusive
// radius, and serializes a PRIVACY-SAFE result: area label + approximate map point +
// distance — NEVER the exact street address or exact coordinates.

import {
  formatDistanceKm,
  rankByDistanceKm,
  toPublicMapPoint,
  type ProvinceCode,
  type PublicMapPoint
} from "./canadaLocation";
import type { PayOfferedView } from "./payOffered";

/**
 * The region display-name behavior the neutral marketplace serializers need from the selected
 * country, injected explicitly. Structurally a subset of @rwos/config's CountryAddressPort
 * (`regionNameFromCode`), declared locally so this shared package takes no dependency on config
 * (and no build cycle via countries/*). There is NO implicit Canada default here — the capability
 * is supplied at the API composition boundary (canadaAddressAdapter today).
 */
export interface MarketplaceRegionNames {
  /** Human display name for a region (province/state/…) code, or null if unknown. */
  regionNameFromCode(code: string): string | null;
}

// A candidate row from the DB bounding-box query (worksite already resolved).
export type MarketplaceJobCandidate = Readonly<{
  jobRequestId: string;
  role: string;
  employerName: string; // public organization display name
  verifiedEmployer: boolean;
  city: string | null;
  province: ProvinceCode;
  latitude: number; // exact — server-side only, never serialized out
  longitude: number;
  startAt: string;
  endAt: string;
  openings: number;
  workerRateMinor: number | null; // governed worker-facing rate, if policy allows
  currency: string;
  /** Long-term listing only (employer plans flag): the employer's own pay offer, paid directly. */
  payOffered?: PayOfferedView | null;
}>;

// Privacy-safe result for List + Map views. No exact address; no exact coordinates.
export type MarketplaceJobResult = Readonly<{
  jobRequestId: string;
  role: string;
  employerName: string;
  verifiedEmployer: boolean;
  areaLabel: string; // "Laval, QC"
  distanceKm: number;
  distanceLabel: string; // "3.2 km away"
  mapPoint: PublicMapPoint; // approximate (rounded)
  startAt: string;
  endAt: string;
  openings: number;
  workerRateMinor: number | null;
  currency: string;
  /** Long-term listing only (employer plans flag): the employer's own pay offer, paid directly. */
  payOffered?: PayOfferedView | null;
}>;

function areaLabel(city: string | null, province: ProvinceCode, regionNames: MarketplaceRegionNames): string {
  return city ? `${city}, ${province}` : (regionNames.regionNameFromCode(province) ?? province);
}

// Rank the candidates by distance from the worker origin, apply the radius, and return
// privacy-safe results (one contract powering both List and Map views).
export function searchNearbyJobs(input: {
  origin: Readonly<{ latitude: number; longitude: number }>;
  radiusKm?: number; // undefined = "any distance"
  candidates: readonly MarketplaceJobCandidate[];
  regionNames: MarketplaceRegionNames; // injected country display-name capability (no implicit default)
}): readonly MarketplaceJobResult[] {
  const ranked = rankByDistanceKm(input.origin, input.candidates, input.radiusKm);
  return ranked.map((c) => ({
    jobRequestId: c.jobRequestId,
    role: c.role,
    employerName: c.employerName,
    verifiedEmployer: c.verifiedEmployer,
    areaLabel: areaLabel(c.city, c.province, input.regionNames),
    distanceKm: Math.round(c.distanceKm * 10) / 10,
    distanceLabel: formatDistanceKm(c.distanceKm),
    mapPoint: toPublicMapPoint({ latitude: c.latitude, longitude: c.longitude }),
    startAt: c.startAt,
    endAt: c.endAt,
    openings: c.openings,
    workerRateMinor: c.workerRateMinor,
    currency: c.currency,
    ...(c.payOffered !== undefined ? { payOffered: c.payOffered } : {})
  }));
}
