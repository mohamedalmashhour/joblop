"use client";

import { embedBbox } from "./directions";

/**
 * Single-location map (OSM embed). Dependency-free — an iframe onto openstreetmap.org centred on the
 * point with a marker, so there is no Leaflet bundle, no tile keys, and nothing to bill. Reusable for
 * any "show this one place" need across the app.
 */
export function LocationMap({
  lat,
  lon,
  label,
  height = 320
}: {
  lat: number;
  lon: number;
  label?: string;
  height?: number;
}) {
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    embedBbox(lat, lon)
  )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;

  return (
    <iframe
      title={label ? `Map showing ${label}` : "Location map"}
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
