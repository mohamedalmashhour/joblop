import { resolveKnownPlace, type KnownPlace } from "@rwos/shared";

// Map tab of Find work. Public jobs carry only the city (never the address), so each city with jobs
// becomes one dot at the city's approximate centre (KNOWN_PLACES). Jobs in a city that is not on that
// list are counted, and the page says to see them in the List.

export type MapPlacePin = Readonly<{ place: string; latitude: number; longitude: number; count: number }>;
export type MapLayout = Readonly<{
  origin: { latitude: number; longitude: number };
  pins: readonly MapPlacePin[];
  /** jobCode -> the city dot it belongs to. */
  placeOf: ReadonlyMap<string, string>;
  /** Jobs whose city is not on the map. */
  offMap: number;
  radiusKm: number;
}>;

const MONTREAL = { latitude: 45.5019, longitude: -73.5674 };
const RADII = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000] as const;

function km(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const east = (b.longitude - a.longitude) * 111.32 * Math.cos((a.latitude * Math.PI) / 180);
  const north = (b.latitude - a.latitude) * 110.57;
  return Math.hypot(east, north);
}

export function mapLayout(jobs: ReadonlyArray<{ jobCode: string; city: string | null }>, searchPlace: KnownPlace | null): MapLayout {
  const groups = new Map<string, MapPlacePin>();
  const placeOf = new Map<string, string>();
  let offMap = 0;
  for (const job of jobs) {
    const place = resolveKnownPlace(job.city);
    if (!place) {
      offMap += 1;
      continue;
    }
    const prev = groups.get(place.name);
    groups.set(place.name, { place: place.name, latitude: place.latitude, longitude: place.longitude, count: (prev?.count ?? 0) + 1 });
    placeOf.set(job.jobCode, place.name);
  }
  const pins = [...groups.values()];
  const origin = searchPlace
    ? { latitude: searchPlace.latitude, longitude: searchPlace.longitude }
    : pins.length > 0
      ? {
          latitude: pins.reduce((s, p) => s + p.latitude * p.count, 0) / pins.reduce((s, p) => s + p.count, 0),
          longitude: pins.reduce((s, p) => s + p.longitude * p.count, 0) / pins.reduce((s, p) => s + p.count, 0)
        }
      : MONTREAL;
  const farthest = Math.max(0, ...pins.map((p) => km(origin, p)));
  const radiusKm = RADII.find((r) => r >= farthest * 1.1) ?? RADII[RADII.length - 1]!;
  return { origin, pins, placeOf, offMap, radiusKm };
}
