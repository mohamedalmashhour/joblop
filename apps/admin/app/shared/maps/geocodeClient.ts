// Browser-side geocoding client. It only ever calls the same-origin `/api/geocode` proxy — never
// Nominatim directly (which blocks browser User-Agents). The proxy holds its own in-memory cache, so
// repeated lookups are cheap without a client-side cache hint.

export type GeocodeResult = { lat: number; lon: number; displayName: string };

export async function geocodeAddress(
  query: string,
  signal?: AbortSignal
): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;
  try {
    // `exactOptionalPropertyTypes` forbids `signal: undefined`, so only attach it when present.
    const response = await fetch(
      `/api/geocode?q=${encodeURIComponent(trimmed)}`,
      signal ? { signal } : undefined
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      typeof (data as GeocodeResult).lat === "number" &&
      typeof (data as GeocodeResult).lon === "number"
    ) {
      return data as GeocodeResult;
    }
    return null;
  } catch {
    return null;
  }
}
