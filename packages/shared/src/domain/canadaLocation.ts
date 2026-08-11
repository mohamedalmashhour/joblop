// Canada location foundation — provider-NEUTRAL core for the JobLop marketplace.
//
// The domain owns the authoritative location model, Canadian postal-code handling,
// province/territory reference data, and geodesic distance. Concrete geocoding/maps
// providers (Google, OSM, …) sit behind the interfaces here; provider-specific DTOs
// never enter the core. Distances are kilometres (Canada).

// ── Provinces & territories ──────────────────────────────────────────────────

export const CANADA_PROVINCE_TERRITORY_CODES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"
] as const;
export type ProvinceCode = (typeof CANADA_PROVINCE_TERRITORY_CODES)[number];

export const PROVINCE_TERRITORY_NAMES: Readonly<Record<ProvinceCode, string>> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon"
};

export function isProvinceCode(value: unknown): value is ProvinceCode {
  return typeof value === "string" && (CANADA_PROVINCE_TERRITORY_CODES as readonly string[]).includes(value);
}

// First letter of a Canadian postal code → province/territory (FSA first-letter map).
// A postal code's first letter maps to a region; several provinces share letters only
// where noted. This is a coarse hint, NOT a substitute for provider geocoding.
const POSTAL_FIRST_LETTER_PROVINCE: Readonly<Record<string, ProvinceCode>> = {
  A: "NL", B: "NS", C: "PE", E: "NB", G: "QC", H: "QC", J: "QC", K: "ON", L: "ON",
  M: "ON", N: "ON", P: "ON", R: "MB", S: "SK", T: "AB", V: "BC", X: "NT", Y: "YT"
  // Note: X covers NT + NU; Y covers YT. Resolve precisely via the provider.
};

export function provinceHintFromPostalCode(postalCode: string): ProvinceCode | null {
  const normalized = normalizeCanadianPostalCode(postalCode);
  if (!normalized) return null;
  return POSTAL_FIRST_LETTER_PROVINCE[normalized[0]!] ?? null;
}

// ── Canadian postal codes ────────────────────────────────────────────────────

// Canadian postal code: letter–digit–letter digit–letter–digit, excluding letters
// D, F, I, O, Q, U everywhere and W, Z in the first position.
const CANADIAN_POSTAL_REGEX = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;

// Normalize to canonical "A1A 1A1" (upper-case, single space). Returns null when the
// input is not a valid Canadian postal-code FORMAT. Format validity is NOT proof the
// postal code exists — resolve via the geocoding provider.
export function normalizeCanadianPostalCode(input: string): string | null {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  if (compact.length !== 6) return null;
  if (!CANADIAN_POSTAL_REGEX.test(compact)) return null;
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

export function isCanadianPostalCodeFormat(input: string): boolean {
  return normalizeCanadianPostalCode(input) !== null;
}

// ── Authoritative location model ─────────────────────────────────────────────

export type GeocodePrecision = "rooftop" | "postal_code" | "locality" | "approximate" | "low_confidence";

export type CanadianLocation = Readonly<{
  country: "CA";
  province: ProvinceCode;
  city: string | null;
  postalCode: string | null; // normalized "A1A 1A1"
  addressLines: readonly string[]; // may be empty (privacy / postal-centroid)
  latitude: number;
  longitude: number;
  precision: GeocodePrecision;
  provider: string; // e.g. "osm", "google"
  providerReference: string | null; // provider place id, if any
  resolvedAt: string; // ISO
}>;

// Coarse, privacy-safe view for public marketplace discovery — NO street address.
export type PublicMarketplaceLocation = Readonly<{
  country: "CA";
  province: ProvinceCode;
  city: string | null;
  // Approximate label, e.g. "Laval, QC".
  areaLabel: string;
}>;

export function toPublicMarketplaceLocation(location: CanadianLocation): PublicMarketplaceLocation {
  const areaLabel = location.city ? `${location.city}, ${location.province}` : PROVINCE_TERRITORY_NAMES[location.province];
  return { country: "CA", province: location.province, city: location.city, areaLabel };
}

// MAP PRIVACY (locked): public marketplace map pins use APPROXIMATE coordinates —
// latitude/longitude rounded to 2 decimal places (~1.1 km), NOT the exact worksite.
// Exact coordinates stay server-side and unlock only at the offer/assignment stage.
export const PUBLIC_MAP_PRECISION_DP = 2;

export type PublicMapPoint = Readonly<{ latitude: number; longitude: number; approximate: true }>;

export function toPublicMapPoint(
  point: Readonly<{ latitude: number; longitude: number }>,
  decimalPlaces: number = PUBLIC_MAP_PRECISION_DP
): PublicMapPoint {
  const factor = 10 ** decimalPlaces;
  return {
    latitude: Math.round(point.latitude * factor) / factor,
    longitude: Math.round(point.longitude * factor) / factor,
    approximate: true
  };
}

// A privacy-safe worker search origin — never the worker's street address.
export type WorkerSearchOrigin = Readonly<{
  province: ProvinceCode | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
}>;

// ── Coordinate validation ────────────────────────────────────────────────────

// Rough bounding box for Canada (incl. territories). Used to reject obviously
// non-Canadian or malformed coordinates BEFORE they become trusted job data.
const CANADA_BOUNDS = { minLat: 41.6, maxLat: 83.2, minLng: -141.1, maxLng: -52.6 };

export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
  );
}

export function isWithinCanadaBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= CANADA_BOUNDS.minLat && latitude <= CANADA_BOUNDS.maxLat &&
    longitude >= CANADA_BOUNDS.minLng && longitude <= CANADA_BOUNDS.maxLng
  );
}

// ── Distance (geodesic / straight-line) ──────────────────────────────────────

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Great-circle (haversine) distance in kilometres. This is STRAIGHT-LINE distance —
// NOT driving distance. Driving distance/time later comes from a maps provider and
// must be labelled distinctly.
export function geodesicDistanceKm(
  a: Readonly<{ latitude: number; longitude: number }>,
  b: Readonly<{ latitude: number; longitude: number }>
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Radius filter — inclusive at the exact boundary.
export function isWithinRadiusKm(
  origin: Readonly<{ latitude: number; longitude: number }>,
  point: Readonly<{ latitude: number; longitude: number }>,
  radiusKm: number
): boolean {
  return geodesicDistanceKm(origin, point) <= radiusKm;
}

export const MARKETPLACE_RADII_KM = [5, 10, 25, 50, 100] as const;
export type MarketplaceRadiusKm = (typeof MARKETPLACE_RADII_KM)[number] | "any";

// Display helper: "3.2 km away" / "11 km away".
export function formatDistanceKm(distanceKm: number): string {
  const value = distanceKm < 10 ? Math.round(distanceKm * 10) / 10 : Math.round(distanceKm);
  return `${value} km away`;
}

// ── Provider-neutral interfaces (the adapter seam) ───────────────────────────

export type GeocodeQuery = Readonly<{
  postalCode?: string;
  address?: string;
  // Canada-restricted resolution for the launch configuration.
  countryRestriction: "CA";
}>;

export type GeocodeResult =
  | Readonly<{ status: "ok"; location: CanadianLocation }>
  | Readonly<{ status: "not_found" | "ambiguous" | "outside_canada" | "low_confidence" | "provider_unavailable" }>;

// A geocoding provider resolves a postal code/address to an authoritative
// CanadianLocation. Implementations (OSM/Nominatim, Google, …) live in adapters and
// must map their DTOs into CanadianLocation before returning.
export interface GeocodingProvider {
  readonly name: string;
  geocode(query: GeocodeQuery): Promise<GeocodeResult>;
}

// A distance provider. The default is geodesic (above); a maps provider may add
// driving distance/time later (labelled distinctly, never mixed with geodesic).
export interface DistanceProvider {
  readonly name: string;
  readonly mode: "geodesic" | "driving";
  distanceKm(a: Readonly<{ latitude: number; longitude: number }>, b: Readonly<{ latitude: number; longitude: number }>): Promise<number>;
}

export const geodesicDistanceProvider: DistanceProvider = {
  name: "geodesic",
  mode: "geodesic",
  async distanceKm(a, b) {
    return geodesicDistanceKm(a, b);
  }
};

// ── Bounding box + distance ranking (marketplace search) ─────────────────────

export type BoundingBox = Readonly<{ minLat: number; maxLat: number; minLng: number; maxLng: number }>;

const KM_PER_DEGREE_LAT = 111.045;

// A lat/lng window guaranteed to CONTAIN every point within radiusKm of the origin.
// Used as a cheap indexed SQL pre-filter (WHERE lat BETWEEN … AND lng BETWEEN …);
// exact geodesic distance then culls the small candidate set. Slightly over-covers on
// purpose (never under-covers). Longitude degrees shrink toward the poles.
export function boundingBoxKm(
  origin: Readonly<{ latitude: number; longitude: number }>,
  radiusKm: number
): BoundingBox {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const cos = Math.max(0.01, Math.cos(toRad(origin.latitude)));
  const lngDelta = radiusKm / (KM_PER_DEGREE_LAT * cos);
  return {
    minLat: origin.latitude - latDelta,
    maxLat: origin.latitude + latDelta,
    minLng: origin.longitude - lngDelta,
    maxLng: origin.longitude + lngDelta
  };
}

// Rank candidate items by geodesic distance from an origin; optionally drop items
// beyond radiusKm. Each item's distance is computed server-side — never trusted from a
// client. Returns items with their distanceKm, ascending. Stable for equal distances.
export function rankByDistanceKm<T extends { latitude: number; longitude: number }>(
  origin: Readonly<{ latitude: number; longitude: number }>,
  items: readonly T[],
  radiusKm?: number
): readonly (T & { distanceKm: number })[] {
  const withDistance = items.map((item, index) => ({
    ...item,
    distanceKm: geodesicDistanceKm(origin, item),
    _index: index
  }));
  const filtered = radiusKm === undefined ? withDistance : withDistance.filter((i) => i.distanceKm <= radiusKm);
  filtered.sort((a, b) => (a.distanceKm - b.distanceKm) || (a._index - b._index));
  return filtered.map(({ _index, ...rest }) => {
    void _index;
    return rest as T & { distanceKm: number };
  });
}
