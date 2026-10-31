// Concrete geocoding providers behind the provider-neutral GeocodingProvider seam.
// The Joblop core depends on GeocodingProvider, never on a specific vendor. Add a
// Google provider later the same way — it must map its DTOs into CanadianLocation.
//
// Phase 2b.2b-ii: the Canada-specific address behavior (postal normalization, geographic bounds,
// region hint, and the country restriction) is no longer imported directly. It is injected via a
// neutral GeocodingAddressCapability (a structural subset of CountryAddressPort) supplied at the
// composition boundary. There is NO implicit Canada fallback here — an absent capability fails
// closed. Canada behavior comes from countries/canada's canadaAddressAdapter. The CanadianLocation
// result type and ProvinceCode are intentionally unchanged (reserved).

import {
  isProvinceCode,
  isValidCoordinate,
  type CanadianLocation,
  type GeocodeQuery,
  type GeocodeResult,
  type GeocodingProvider,
  type GeocodePrecision,
  type ProvinceCode
} from "./canadaLocation";

/**
 * The address behavior a geocoding provider needs from the selected country, injected explicitly.
 * Structurally a subset of @rwos/config's CountryAddressPort, declared locally so this shared
 * package takes no dependency on config (and no build cycle via countries/*).
 */
export interface GeocodingAddressCapability {
  normalizePostalCode(input: string): string | null;
  isWithinCountryBounds(latitude: number, longitude: number): boolean;
  regionHintFromPostalCode(postalCode: string): string | null;
  readonly geocodeCountryRestriction: string;
}

// ── Fixture provider (deterministic; no network) ─────────────────────────────
// For tests + local development. Resolves a normalized postal code to a known
// location. Never calls out; never a hidden dependency.

export type GeocodeFixture = Readonly<{
  province: ProvinceCode;
  city: string;
  latitude: number;
  longitude: number;
  precision?: GeocodePrecision;
}>;

export function createFixtureGeocodingProvider(
  fixtures: Readonly<Record<string, GeocodeFixture>>,
  options: { countryAddress?: GeocodingAddressCapability | undefined; now?: () => Date } = {}
): GeocodingProvider {
  const now = options.now ?? (() => new Date());
  const countryAddress = options.countryAddress;
  return {
    name: "fixture",
    async geocode(query: GeocodeQuery): Promise<GeocodeResult> {
      if (!countryAddress) return { status: "provider_unavailable" };
      if (query.countryRestriction !== countryAddress.geocodeCountryRestriction) return { status: "outside_canada" };
      const postal = query.postalCode ? countryAddress.normalizePostalCode(query.postalCode) : null;
      if (!postal) return { status: "not_found" };
      const fixture = fixtures[postal] ?? fixtures[postal.slice(0, 3)];
      if (!fixture) return { status: "not_found" };
      if (!countryAddress.isWithinCountryBounds(fixture.latitude, fixture.longitude)) return { status: "outside_canada" };
      const location: CanadianLocation = {
        country: "CA",
        province: fixture.province,
        city: fixture.city,
        postalCode: postal,
        addressLines: [],
        latitude: fixture.latitude,
        longitude: fixture.longitude,
        precision: fixture.precision ?? "postal_code",
        provider: "fixture",
        providerReference: null,
        resolvedAt: now().toISOString()
      };
      return { status: "ok", location };
    }
  };
}

// ── OSM / Nominatim provider (free, no API key) ──────────────────────────────
// The neutral default. Requires network + a descriptive User-Agent per Nominatim's
// usage policy. Callers should cache results (do not call per render).

type NominatimResult = {
  lat?: string;
  lon?: string;
  address?: { state?: string; city?: string; town?: string; village?: string; postcode?: string; country_code?: string };
  importance?: number;
};

const PROVINCE_NAME_TO_CODE: Readonly<Record<string, ProvinceCode>> = {
  alberta: "AB", "british columbia": "BC", manitoba: "MB", "new brunswick": "NB",
  "newfoundland and labrador": "NL", "nova scotia": "NS", "northwest territories": "NT",
  nunavut: "NU", ontario: "ON", "prince edward island": "PE", quebec: "QC", "québec": "QC",
  saskatchewan: "SK", yukon: "YT"
};

export function createOsmGeocodingProvider(deps: {
  fetch: typeof fetch;
  userAgent: string;
  baseUrl?: string;
  now?: () => Date;
  countryAddress?: GeocodingAddressCapability | undefined;
}): GeocodingProvider {
  const baseUrl = deps.baseUrl ?? "https://nominatim.openstreetmap.org";
  const now = deps.now ?? (() => new Date());
  const countryAddress = deps.countryAddress;
  return {
    name: "osm",
    async geocode(query: GeocodeQuery): Promise<GeocodeResult> {
      if (!countryAddress) return { status: "provider_unavailable" };
      const restriction = countryAddress.geocodeCountryRestriction;
      if (query.countryRestriction !== restriction) return { status: "outside_canada" };
      const q = query.postalCode ?? query.address;
      if (!q || !q.trim()) return { status: "not_found" };
      const normalizedPostal = query.postalCode ? countryAddress.normalizePostalCode(query.postalCode) : null;
      if (query.postalCode && !normalizedPostal) return { status: "not_found" }; // invalid postal format

      const url = new URL(`${baseUrl}/search`);
      url.searchParams.set("q", normalizedPostal ?? q);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("countrycodes", restriction.toLowerCase());
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "2");

      let results: readonly NominatimResult[];
      try {
        const res = await deps.fetch(url.toString(), { headers: { "user-agent": deps.userAgent, accept: "application/json" } });
        if (!res.ok) return { status: "provider_unavailable" };
        const body = (await res.json()) as unknown;
        results = Array.isArray(body) ? (body as NominatimResult[]) : [];
      } catch {
        return { status: "provider_unavailable" };
      }
      if (results.length === 0) return { status: "not_found" };
      if (results.length > 1) return { status: "ambiguous" };

      const first = results[0]!;
      if (first.address?.country_code && first.address.country_code.toLowerCase() !== restriction.toLowerCase()) {
        return { status: "outside_canada" };
      }
      const latitude = Number(first.lat);
      const longitude = Number(first.lon);
      if (!isValidCoordinate(latitude, longitude) || !countryAddress.isWithinCountryBounds(latitude, longitude)) {
        return { status: "outside_canada" };
      }
      const province =
        (first.address?.state && PROVINCE_NAME_TO_CODE[first.address.state.trim().toLowerCase()]) ||
        (normalizedPostal ? countryAddress.regionHintFromPostalCode(normalizedPostal) : null);
      if (!province || !isProvinceCode(province)) return { status: "low_confidence" };

      const location: CanadianLocation = {
        country: "CA",
        province,
        city: first.address?.city ?? first.address?.town ?? first.address?.village ?? null,
        postalCode: normalizedPostal ?? (first.address?.postcode ? countryAddress.normalizePostalCode(first.address.postcode) : null),
        addressLines: [],
        latitude,
        longitude,
        precision: normalizedPostal ? "postal_code" : "approximate",
        provider: "osm",
        providerReference: null,
        resolvedAt: now().toISOString()
      };
      return { status: "ok", location };
    }
  };
}

// ── Google Geocoding provider (API key) ──────────────────────────────────────
// Resolves a postal code/address to a CanadianLocation via Google's Geocoding API,
// restricted to the selected country. Fail-closed: no countryAddress capability, no
// API key, or an unusable response => a non-ok GeocodeResult (callers fall back).
type GoogleAddressComponent = { long_name?: string; short_name?: string; types?: string[] };
type GoogleGeocodeHit = {
  geometry?: { location?: { lat?: number; lng?: number }; location_type?: string };
  address_components?: GoogleAddressComponent[];
  place_id?: string;
};
type GoogleGeocodeResponse = { status?: string; results?: GoogleGeocodeHit[] };

function componentShort(components: GoogleAddressComponent[] | undefined, type: string): string | null {
  const hit = (components ?? []).find((c) => (c.types ?? []).includes(type));
  return hit?.short_name ?? hit?.long_name ?? null;
}
function componentLong(components: GoogleAddressComponent[] | undefined, type: string): string | null {
  const hit = (components ?? []).find((c) => (c.types ?? []).includes(type));
  return hit?.long_name ?? hit?.short_name ?? null;
}

export function createGoogleGeocodingProvider(deps: {
  fetch: typeof fetch;
  apiKey: string;
  baseUrl?: string;
  now?: () => Date;
  countryAddress?: GeocodingAddressCapability | undefined;
}): GeocodingProvider {
  const baseUrl = deps.baseUrl ?? "https://maps.googleapis.com/maps/api/geocode/json";
  const now = deps.now ?? (() => new Date());
  const countryAddress = deps.countryAddress;
  return {
    name: "google",
    async geocode(query: GeocodeQuery): Promise<GeocodeResult> {
      if (!countryAddress) return { status: "provider_unavailable" };
      if (!deps.apiKey || deps.apiKey.trim().length < 20) return { status: "provider_unavailable" };
      const restriction = countryAddress.geocodeCountryRestriction;
      if (query.countryRestriction !== restriction) return { status: "outside_canada" };
      const normalizedPostal = query.postalCode ? countryAddress.normalizePostalCode(query.postalCode) : null;
      if (query.postalCode && !normalizedPostal) return { status: "not_found" }; // invalid postal format
      const q = normalizedPostal ?? query.address;
      if (!q || !q.trim()) return { status: "not_found" };

      const url = new URL(baseUrl);
      // Country-restrict via components; add postal_code component when we have one.
      url.searchParams.set(
        "components",
        normalizedPostal ? `postal_code:${normalizedPostal}|country:${restriction}` : `country:${restriction}`
      );
      if (!normalizedPostal && query.address) url.searchParams.set("address", query.address);
      url.searchParams.set("key", deps.apiKey);

      let body: GoogleGeocodeResponse;
      try {
        const res = await deps.fetch(url.toString(), { cache: "no-store" } as RequestInit);
        if (!res.ok) return { status: "provider_unavailable" };
        body = (await res.json()) as GoogleGeocodeResponse;
      } catch {
        return { status: "provider_unavailable" };
      }
      if (body.status === "ZERO_RESULTS") return { status: "not_found" };
      if (body.status === "OVER_QUERY_LIMIT" || body.status === "REQUEST_DENIED" || body.status === "OVER_DAILY_LIMIT") {
        return { status: "provider_unavailable" };
      }
      if (body.status !== "OK" || !body.results || body.results.length === 0) return { status: "not_found" };

      const first = body.results[0];
      if (!first) return { status: "not_found" };
      const latitude = Number(first.geometry?.location?.lat);
      const longitude = Number(first.geometry?.location?.lng);
      if (!isValidCoordinate(latitude, longitude) || !countryAddress.isWithinCountryBounds(latitude, longitude)) {
        return { status: "outside_canada" };
      }
      const provinceRaw =
        componentShort(first.address_components, "administrative_area_level_1") ??
        (normalizedPostal ? countryAddress.regionHintFromPostalCode(normalizedPostal) : null);
      const province = provinceRaw ? provinceRaw.trim().toUpperCase() : null;
      if (!province || !isProvinceCode(province)) return { status: "low_confidence" };

      const resolvedPostal =
        normalizedPostal ??
        (componentLong(first.address_components, "postal_code")
          ? countryAddress.normalizePostalCode(componentLong(first.address_components, "postal_code")!)
          : null);

      const precision: GeocodePrecision =
        first.geometry?.location_type === "ROOFTOP"
          ? "rooftop"
          : normalizedPostal
            ? "postal_code"
            : "approximate";

      const location: CanadianLocation = {
        country: "CA",
        province,
        city:
          componentLong(first.address_components, "locality") ??
          componentLong(first.address_components, "postal_town") ??
          componentLong(first.address_components, "administrative_area_level_2"),
        postalCode: resolvedPostal,
        addressLines: [],
        latitude,
        longitude,
        precision,
        provider: "google",
        providerReference: first.place_id ?? null,
        resolvedAt: now().toISOString()
      };
      return { status: "ok", location };
    }
  };
}
