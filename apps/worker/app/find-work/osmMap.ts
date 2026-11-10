// Maths for the Find work map: a real street map of Québec (OpenStreetMap tiles, no API key) with one
// pin per city that has Joblop jobs. Pure functions (no React) so they are easy to test.
//
// Standard Web Mercator "slippy map" tiles: at zoom z the world is 256·2^z pixels wide and each tile is
// 256 px. We pick the closest zoom that still fits every pin, centre the view on them, list the tiles
// that cover the view and place each pin as a percentage of the view, so the map scales with CSS.

export const TILE_SIZE = 256;
/** The view's own pixel size; the page scales it to the screen width (the aspect ratio stays). */
export const VIEW_WIDTH = 640;
export const VIEW_HEIGHT = 440;
const MIN_ZOOM = 4;
const MAX_ZOOM = 11;

export type LatLng = Readonly<{ latitude: number; longitude: number }>;
export type Bounds = Readonly<{ south: number; west: number; north: number; east: number }>;

/** Southern Québec, from Gatineau to Québec City and Saguenay: what a visitor sees before any search. */
export const QUEBEC_BOUNDS: Bounds = { south: 45.0, west: -76.2, north: 48.6, east: -70.6 };
/** A search for one city still shows its surroundings (degrees). */
const MIN_SPAN_LAT = 0.8;
const MIN_SPAN_LNG = 1.2;

export function projectX(longitude: number, zoom: number): number {
  return ((longitude + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

export function projectY(latitude: number, zoom: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const rad = (clamped * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * TILE_SIZE * 2 ** zoom;
}

/**
 * Bounds around the pins (at least MIN_SPAN wide); Québec when there are no pins. With `withQuebec`
 * (no city searched) the view always shows southern Québec too, so a visitor sees where the jobs are.
 */
export function boundsFor(points: readonly LatLng[], withQuebec = false): Bounds {
  if (points.length === 0) return QUEBEC_BOUNDS;
  if (withQuebec) {
    const corners: LatLng[] = [
      { latitude: QUEBEC_BOUNDS.south, longitude: QUEBEC_BOUNDS.west },
      { latitude: QUEBEC_BOUNDS.north, longitude: QUEBEC_BOUNDS.east }
    ];
    const all = [...points, ...corners];
    return {
      south: Math.min(...all.map((p) => p.latitude)),
      north: Math.max(...all.map((p) => p.latitude)),
      west: Math.min(...all.map((p) => p.longitude)),
      east: Math.max(...all.map((p) => p.longitude))
    };
  }
  let south = Math.min(...points.map((p) => p.latitude));
  let north = Math.max(...points.map((p) => p.latitude));
  let west = Math.min(...points.map((p) => p.longitude));
  let east = Math.max(...points.map((p) => p.longitude));
  if (north - south < MIN_SPAN_LAT) {
    const mid = (north + south) / 2;
    south = mid - MIN_SPAN_LAT / 2;
    north = mid + MIN_SPAN_LAT / 2;
  }
  if (east - west < MIN_SPAN_LNG) {
    const mid = (east + west) / 2;
    west = mid - MIN_SPAN_LNG / 2;
    east = mid + MIN_SPAN_LNG / 2;
  }
  // A little room so pins and their labels are not on the edge.
  const padLat = (north - south) * 0.12;
  const padLng = (east - west) * 0.12;
  return { south: south - padLat, west: west - padLng, north: north + padLat, east: east + padLng };
}

/** The closest zoom at which the bounds fit inside the view. */
export function zoomFor(bounds: Bounds, width: number = VIEW_WIDTH, height: number = VIEW_HEIGHT): number {
  for (let z = MAX_ZOOM; z > MIN_ZOOM; z -= 1) {
    const w = projectX(bounds.east, z) - projectX(bounds.west, z);
    const h = projectY(bounds.south, z) - projectY(bounds.north, z);
    if (w <= width && h <= height) return z;
  }
  return MIN_ZOOM;
}

export type MapTile = Readonly<{ key: string; url: string; leftPct: number; topPct: number; sizePctX: number; sizePctY: number }>;
export type PlacedPin<P> = Readonly<{ pin: P; leftPct: number; topPct: number }>;
export type OsmView<P> = Readonly<{ zoom: number; tiles: readonly MapTile[]; pins: readonly PlacedPin<P>[] }>;

export function osmTileUrl(z: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/** Tiles and pin positions for a view that fits every pin (or Québec when there are none). */
export function osmView<P extends LatLng>(
  pins: readonly P[],
  opts: Readonly<{ withQuebec?: boolean; width?: number; height?: number }> = {}
): OsmView<P> {
  const width = opts.width ?? VIEW_WIDTH;
  const height = opts.height ?? VIEW_HEIGHT;
  const bounds = boundsFor(pins, opts.withQuebec ?? false);
  const zoom = zoomFor(bounds, width, height);
  const cx = (projectX(bounds.west, zoom) + projectX(bounds.east, zoom)) / 2;
  const cy = (projectY(bounds.north, zoom) + projectY(bounds.south, zoom)) / 2;
  const left = cx - width / 2;
  const top = cy - height / 2;
  const count = 2 ** zoom;
  const tiles: MapTile[] = [];
  for (let ty = Math.floor(top / TILE_SIZE); ty <= Math.floor((top + height) / TILE_SIZE); ty += 1) {
    if (ty < 0 || ty >= count) continue;
    for (let tx = Math.floor(left / TILE_SIZE); tx <= Math.floor((left + width) / TILE_SIZE); tx += 1) {
      const wrapped = ((tx % count) + count) % count;
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        url: osmTileUrl(zoom, wrapped, ty),
        leftPct: ((tx * TILE_SIZE - left) / width) * 100,
        topPct: ((ty * TILE_SIZE - top) / height) * 100,
        sizePctX: (TILE_SIZE / width) * 100,
        sizePctY: (TILE_SIZE / height) * 100
      });
    }
  }
  const placed = pins.map((pin) => ({
    pin,
    leftPct: ((projectX(pin.longitude, zoom) - left) / width) * 100,
    topPct: ((projectY(pin.latitude, zoom) - top) / height) * 100
  }));
  return { zoom, tiles, pins: placed };
}
