// Directions + external-view helpers for the OSM map capsule. No API key, no billing — everything
// points at openstreetmap.org, which handles routing from the viewer's own location on its side (the
// employer app itself has geolocation disabled via Permissions-Policy, so we never ask for it here).

export function directionsUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/directions?to=${encodeURIComponent(`${lat},${lon}`)}`;
}

export function osmViewUrl(lat: number, lon: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}

// Small bounding box around a point for a street-level embed (~0.008deg ≈ under 1km each side).
export function embedBbox(lat: number, lon: number, delta = 0.008): string {
  return `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
}
