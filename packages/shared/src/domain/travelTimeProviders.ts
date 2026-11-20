// Road travel-time (ETA) seam — "how long to actually get there" over the road network.
// Straight-line distance already exists (geodesicDistanceKm / DistanceProvider); a real ETA
// needs a routing vendor, so the core depends on TravelTimeProvider, never on Google directly.
// Fail-closed: with no provider configured (no key), callers omit the ETA and fall back to the
// geodesic distance label — nothing breaks.

export type TravelMode = "driving" | "transit" | "walking" | "bicycling";

export type TravelPoint = Readonly<{ latitude: number; longitude: number }>;

export type TravelQuery = Readonly<{
  origin: TravelPoint;
  destination: TravelPoint;
  mode?: TravelMode;
  language?: string; // "en" | "fr"; the vendor localizes the human-readable label
}>;

export type TravelEstimate = Readonly<{
  durationSeconds: number;
  durationText: string; // vendor-localized (e.g. "24 mins" / "24 min")
  distanceMeters: number;
  mode: TravelMode;
}>;

export type TravelResult =
  | { status: "ok"; estimate: TravelEstimate }
  | { status: "not_found" }
  | { status: "provider_unavailable" }
  | { status: "error" };

export interface TravelTimeProvider {
  readonly name: string;
  estimate(query: TravelQuery): Promise<TravelResult>;
}

// Privacy-safe ETA returned to the worker browser: a pre-formatted label + rounded road distance.
// No raw coordinates, no polyline — just "about this long, this far, by this mode".
export type PublicTravelEstimate = Readonly<{
  durationLabel: string;
  distanceKm: number | null;
  mode: TravelMode;
}>;

function finitePoint(p: TravelPoint | undefined | null): p is TravelPoint {
  return !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude);
}

// Locale-aware fallback formatter, for when we have seconds but prefer our own label.
export function formatTravelDuration(seconds: number, _locale: string): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

// Project a vendor estimate into the privacy-safe public view. Prefers the vendor's localized
// text; falls back to our own formatter from the duration seconds.
export function toPublicTravelEstimate(estimate: TravelEstimate, locale: string): PublicTravelEstimate {
  const label = estimate.durationText && estimate.durationText.trim().length > 0
    ? estimate.durationText.trim()
    : formatTravelDuration(estimate.durationSeconds, locale);
  const distanceKm =
    Number.isFinite(estimate.distanceMeters) && estimate.distanceMeters > 0
      ? Math.round((estimate.distanceMeters / 1000) * 10) / 10
      : null;
  return { durationLabel: label, distanceKm, mode: estimate.mode };
}

// ── Google Distance Matrix provider ──────────────────────────────────────────
type DMElement = Readonly<{
  status?: string;
  duration?: { value?: number; text?: string };
  distance?: { value?: number; text?: string };
}>;
type DMResponse = Readonly<{ status?: string; rows?: ReadonlyArray<{ elements?: ReadonlyArray<DMElement> }> }>;

export function createGoogleDistanceMatrixProvider(deps: {
  fetch: typeof fetch;
  apiKey: string;
  baseUrl?: string;
}): TravelTimeProvider {
  const baseUrl = deps.baseUrl ?? "https://maps.googleapis.com/maps/api/distancematrix/json";
  return {
    name: "google_distance_matrix",
    async estimate(query: TravelQuery): Promise<TravelResult> {
      if (!deps.apiKey || deps.apiKey.trim().length < 20) return { status: "provider_unavailable" };
      if (!finitePoint(query.origin) || !finitePoint(query.destination)) return { status: "not_found" };
      const mode: TravelMode = query.mode ?? "driving";
      const url = new URL(baseUrl);
      url.searchParams.set("origins", `${query.origin.latitude},${query.origin.longitude}`);
      url.searchParams.set("destinations", `${query.destination.latitude},${query.destination.longitude}`);
      url.searchParams.set("mode", mode);
      url.searchParams.set("units", "metric");
      url.searchParams.set("language", query.language === "fr" ? "fr" : "en");
      url.searchParams.set("key", deps.apiKey);
      try {
        const res = await deps.fetch(url.toString(), { cache: "no-store" } as RequestInit);
        if (!res.ok) return { status: "provider_unavailable" };
        const body = (await res.json()) as DMResponse;
        if (body.status !== "OK") {
          return body.status === "OVER_QUERY_LIMIT" || body.status === "REQUEST_DENIED" || body.status === "OVER_DAILY_LIMIT"
            ? { status: "provider_unavailable" }
            : { status: "error" };
        }
        const el = body.rows?.[0]?.elements?.[0];
        if (!el || el.status !== "OK" || !el.duration || typeof el.duration.value !== "number") {
          return { status: "not_found" };
        }
        return {
          status: "ok",
          estimate: {
            durationSeconds: el.duration.value,
            durationText: typeof el.duration.text === "string" ? el.duration.text : "",
            distanceMeters: typeof el.distance?.value === "number" ? el.distance.value : 0,
            mode
          }
        };
      } catch {
        return { status: "provider_unavailable" };
      }
    }
  };
}
