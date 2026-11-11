"use client";

import { embedBbox } from "./directions";

/**
 * Single-location map (OSM embed). Dependency-free — an iframe onto openstreetmap.org centred on the
 * point with a marker, so there is no Leaflet bundle, no tile keys, and nothing to bill. Reusable for
 * any "show this one place" need across the app. `marker={false}` shows the area without a pin, and
 * `delta` widens the view (the default is street level).
 */
export function LocationMap({
  lat,
  lon,
  title,
  height = 320,
  marker = true,
  delta
}: {
  lat: number;
  lon: number;
  title: string;
  height?: number;
  marker?: boolean;
  delta?: number;
}) {
  const bbox = encodeURIComponent(delta === undefined ? embedBbox(lat, lon) : embedBbox(lat, lon, delta));
  const pin = marker ? `&marker=${encodeURIComponent(`${lat},${lon}`)}` : "";
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${pin}`;

  return (
    <iframe
      title={title}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer"
      style={{
        width: "100%",
        height,
        border: 0,
        borderRadius: 12,
        display: "block"
      }}
    />
  );
}
