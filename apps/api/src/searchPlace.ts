import { resolveKnownPlace, type GeocodingProvider } from "@rwos/shared";

// The "Where?" box of the worker job search: a city name or a postal code, resolved to a point.
//
// Order: a postal code goes to the geocoding provider; a city name is first looked up in the fixed
// city list (accent-insensitive, no network, no cost), then sent to the provider as an address.
// Anything that cannot be resolved is "not_found", so the caller answers with a friendly 400, never
// a 500. Only an outage of the provider is "unavailable".

export type SearchPlaceAddress = Readonly<{
  normalizePostalCode(input: string): string | null;
  readonly geocodeCountryRestriction: string;
}>;

export type ResolvedSearchPlace = Readonly<{
  latitude: number;
  longitude: number;
  province: string;
  city: string | null;
  postalCode: string | null;
  /** What to show back to the worker ("Montréal, QC", "H2X 1Y4"). */
  label: string;
}>;

export type SearchPlaceResult =
  | Readonly<{ status: "ok"; place: ResolvedSearchPlace }>
  | Readonly<{ status: "missing" | "not_found" | "unavailable" }>;

const MAX_PLACE_LENGTH = 80;

/** Trim, collapse spaces and bound what the worker typed; empty → null. */
export function cleanPlaceInput(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.replace(/\s+/g, " ").trim().slice(0, MAX_PLACE_LENGTH);
  return value.length > 0 ? value : null;
}

export async function resolveSearchPlace(
  input: unknown,
  deps: Readonly<{ countryAddress: SearchPlaceAddress; geocoder: GeocodingProvider }>
): Promise<SearchPlaceResult> {
  const raw = cleanPlaceInput(input);
  if (!raw) return { status: "missing" };
  const restriction = deps.countryAddress.geocodeCountryRestriction;

  const postal = deps.countryAddress.normalizePostalCode(raw);
  if (postal) {
    const geo = await safeGeocode(deps.geocoder, { countryRestriction: restriction, postalCode: postal });
    if (geo.status === "ok") {
      const loc = geo.location;
      return {
        status: "ok",
        place: { latitude: loc.latitude, longitude: loc.longitude, province: loc.province, city: loc.city, postalCode: postal, label: postal }
      };
    }
    return { status: geo.status === "provider_unavailable" ? "unavailable" : "not_found" };
  }

  const known = resolveKnownPlace(raw);
  if (known) {
    return {
      status: "ok",
      place: {
        latitude: known.latitude,
        longitude: known.longitude,
        province: known.province,
        city: known.name,
        postalCode: null,
        label: `${known.name}, ${known.province}`
      }
    };
  }

  // A free-text place needs at least two letters; "ZZZ"-style junk is still tried, and the provider
  // answers not_found for it.
  if (!/\p{L}.*\p{L}/u.test(raw)) return { status: "not_found" };
  const geo = await safeGeocode(deps.geocoder, { countryRestriction: restriction, address: raw });
  if (geo.status === "ok") {
    const loc = geo.location;
    const city = loc.city ?? null;
    return {
      status: "ok",
      place: {
        latitude: loc.latitude,
        longitude: loc.longitude,
        province: loc.province,
        city,
        postalCode: null,
        label: city ? `${city}, ${loc.province}` : raw
      }
    };
  }
  return { status: geo.status === "provider_unavailable" ? "unavailable" : "not_found" };
}

async function safeGeocode(geocoder: GeocodingProvider, query: Parameters<GeocodingProvider["geocode"]>[0]) {
  try {
    return await geocoder.geocode(query);
  } catch {
    return { status: "provider_unavailable" } as const;
  }
}

/** The API answer for a place that could not be used (status code + body). Never a 500. */
export function searchPlaceFailure(status: "missing" | "not_found" | "unavailable"): { code: number; body: { error: string; message: string } } {
  if (status === "missing") {
    return { code: 400, body: { error: "RWOS_PLACE_REQUIRED", message: "Type a city or a postal code." } };
  }
  if (status === "unavailable") {
    return { code: 503, body: { error: "RWOS_PLACE_UNAVAILABLE", message: "We can't look up places right now. Please try again in a moment." } };
  }
  return {
    code: 400,
    body: { error: "RWOS_PLACE_NOT_FOUND", message: "We couldn't find that place. Check the city or postal code, or try a nearby one." }
  };
}
