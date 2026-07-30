// Server-side geocoding proxy. Nominatim (OpenStreetMap) rejects browser User-Agents and rate-limits
// aggressively, so the browser can never call it directly — every lookup is proxied here with a
// descriptive User-Agent, a short timeout, and an in-memory cache (per server instance). This is the
// RWOS counterpart of the STR geocode proxy: free OSM, no API key, no billing.

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "resident-workforce-os/1.0 (+https://sybnb.app; info@sybnb.app)";
const NO_STORE = { "cache-control": "private, no-store" } as const;
const CACHEABLE = { "cache-control": "public, max-age=86400" } as const;

type GeocodeHit = { lat: number; lon: number; displayName: string };

// null = a resolved "no match" (cached so a bad address is not looked up repeatedly).
const cache = new Map<string, GeocodeHit | null>();

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 2 || query.length > 200) {
    return Response.json({ error: "invalid_query" }, { status: 400, headers: NO_STORE });
  }

  const key = query.toLowerCase();
  if (cache.has(key)) {
    const hit = cache.get(key) ?? null;
    return hit
      ? Response.json(hit, { headers: CACHEABLE })
      : Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const search = new URL(NOMINATIM_SEARCH);
    search.searchParams.set("format", "json");
    search.searchParams.set("limit", "1");
    search.searchParams.set("q", query);

    const response = await fetch(search, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) {
      return Response.json({ error: "unavailable" }, { status: 502, headers: NO_STORE });
    }

    const rows = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const row = Array.isArray(rows) ? rows[0] : undefined;
    const lat = Number(row?.lat);
    const lon = Number(row?.lon);
    if (!row || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      cache.set(key, null);
      return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    const hit: GeocodeHit = { lat, lon, displayName: row.display_name ?? query };
    cache.set(key, hit);
    return Response.json(hit, { headers: CACHEABLE });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502, headers: NO_STORE });
  } finally {
    clearTimeout(timeout);
  }
}
