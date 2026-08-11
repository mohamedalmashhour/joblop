// Concrete geocoding providers behind the provider-neutral GeocodingProvider seam.
// The JobLop core depends on GeocodingProvider, never on a specific vendor. Add a
// Google provider later the same way — it must map its DTOs into CanadianLocation.

import {
  isProvinceCode,
  isValidCoordinate,
  isWithinCanadaBounds,
  normalizeCanadianPostalCode,
  provinceHintFromPostalCode,
  type CanadianLocation,
  type GeocodeQuery,
  type GeocodeResult,
  type GeocodingProvider,
  type GeocodePrecision,
  type ProvinceCode
} from "./canadaLocation";

// ── Fixture provider (deterministic; no network) ─────────────────────────────
// For tests + local development. Resolves a normalized postal code to a known
// Canadian location. Never calls out; never a hidden dependency.

export type GeocodeFixture = Readonly<{
  province: ProvinceCode;
  city: string;
  latitude: number;
  longitude: number;
  precision?: GeocodePrecision;
}>;

export function createFixtureGeocodingProvider(
  fixtures: Readonly<Record<string, GeocodeFixture>>,
  options: { now?: () => Date } = {}
): GeocodingProvider {
  const now = options.now ?? (() => new Date());
  return {
    name: "fixture",
    async geocode(query: GeocodeQuery): Promise<GeocodeResult> {
      if (query.countryRestriction !== "CA") return { status: "outside_canada" };
      const postal = query.postalCode ? normalizeCanadianPostalCode(query.postalCode) : null;
      if (!postal) return { status: "not_found" };
      const fixture = fixtures[postal] ?? fixtures[postal.slice(0, 3)];
      if (!fixture) return { status: "not_found" };
      if (!isWithinCanadaBounds(fixture.latitude, fixture.longitude)) return { status: "outside_canada" };
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
}): GeocodingProvider {
  const baseUrl = deps.baseUrl ?? "https://nominatim.openstreetmap.org";
  const now = deps.now ?? (() => new Date());
  return {
    name: "osm",
    async geocode(query: GeocodeQuery): Promise<GeocodeResult> {
      if (query.countryRestriction !== "CA") return { status: "outside_canada" };
      const q = query.postalCode ?? query.address;
      if (!q || !q.trim()) return { status: "not_found" };
      const normalizedPostal = query.postalCode ? normalizeCanadianPostalCode(query.postalCode) : null;
      if (query.postalCode && !normalizedPostal) return { status: "not_found" }; // invalid CA format

      const url = new URL(`${baseUrl}/search`);
      url.searchParams.set("q", normalizedPostal ?? q);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("countrycodes", "ca");
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
      if (first.address?.country_code && first.address.country_code.toLowerCase() !== "ca") {
        return { status: "outside_canada" };
      }
      const latitude = Number(first.lat);
      const longitude = Number(first.lon);
      if (!isValidCoordinate(latitude, longitude) || !isWithinCanadaBounds(latitude, longitude)) {
        return { status: "outside_canada" };
      }
      const province =
        (first.address?.state && PROVINCE_NAME_TO_CODE[first.address.state.trim().toLowerCase()]) ||
        (normalizedPostal ? provinceHintFromPostalCode(normalizedPostal) : null);
      if (!province || !isProvinceCode(province)) return { status: "low_confidence" };

      const location: CanadianLocation = {
        country: "CA",
        province,
        city: first.address?.city ?? first.address?.town ?? first.address?.village ?? null,
        postalCode: normalizedPostal ?? (first.address?.postcode ? normalizeCanadianPostalCode(first.address.postcode) : null),
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
