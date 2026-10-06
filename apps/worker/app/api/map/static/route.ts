// Server-side proxy to Google Static Maps. The Maps key NEVER reaches the browser:
// the worker's job view renders <img src="/api/map/static?lat=..&lng=.."> and this
// route fetches the image server-side with GOOGLE_MAPS_API_KEY and streams it back.
//
// Fail-closed: if the key is unset, this returns 503 and the UI simply omits the map
// (the existing "approximate location" notice stays). Coordinates are validated and
// the only outbound host is the hard-coded Google Static Maps endpoint — no open proxy.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATIC_MAPS = "https://maps.googleapis.com/maps/api/staticmap";

function mapsKey(): string | null {
  const k = (process.env.GOOGLE_MAPS_API_KEY ?? "").trim();
  return k.length >= 20 ? k : null;
}

// Parse a finite coordinate inside valid Earth ranges; anything else => null.
function coord(raw: string | null, max: number): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || Math.abs(n) > max) return null;
  return n;
}

export async function GET(request: Request) {
  const key = mapsKey();
  if (!key) {
    return Response.json(
      { status: "unavailable", message: "Maps is not configured (GOOGLE_MAPS_API_KEY unset)." },
      { status: 503, headers: { "cache-control": "private, no-store" } }
    );
  }

  const params = new URL(request.url).searchParams;
  const lat = coord(params.get("lat"), 90);
  const lng = coord(params.get("lng"), 180);
  if (lat === null || lng === null) {
    return Response.json(
      { status: "invalid", message: "Valid lat and lng are required." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }
  // Only two UI languages are supported; anything else falls back to English.
  const lang = params.get("lang") === "fr" ? "fr" : "en";

  // All display parameters are fixed server-side (never caller-controlled) so this
  // stays a worksite-pin renderer, not a general image proxy.
  const center = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const url = new URL(STATIC_MAPS);
  url.searchParams.set("center", center);
  url.searchParams.set("zoom", "14");
  url.searchParams.set("size", "640x280");
  url.searchParams.set("scale", "2");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("format", "png");
  url.searchParams.set("language", lang);
  url.searchParams.set("markers", `color:0x1f9bf0|${center}`);
  url.searchParams.set("key", key);

  try {
    const upstream = await fetch(url.toString(), { cache: "no-store" });
    if (!upstream.ok) {
      return Response.json(
        { status: "unavailable", message: "Map could not be rendered." },
        { status: 502, headers: { "cache-control": "private, no-store" } }
      );
    }
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/png",
        // Worksite pin is approximate + stable; let the browser cache it briefly.
        "cache-control": "private, max-age=900"
      }
    });
  } catch {
    return Response.json(
      { status: "unavailable", message: "Map service is unreachable." },
      { status: 502, headers: { "cache-control": "private, no-store" } }
    );
  }
}
