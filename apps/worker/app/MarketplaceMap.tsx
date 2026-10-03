"use client";

// MarketplaceMap — the map surface, behind a component seam so the rendering provider can
// be swapped (an OSM/tile provider could slot in here) WITHOUT the rest of the marketplace
// depending on any one map vendor. The current provider is a self-contained approximate-
// area map: it plots the APPROXIMATE public map points (already rounded server-side) around
// the worker's search origin with distance rings. It never receives or shows exact
// coordinates or addresses — there is nothing more precise than the approximate point here.

import { useMemo } from "react";
import { useT } from "./i18n/LocaleProvider";

export type MapPin = Readonly<{
  jobRequestId: string;
  latitude: number; // approximate (server-rounded) — NOT an exact worksite coordinate
  longitude: number;
  label: string; // role
  saved: boolean;
}>;

type Props = Readonly<{
  origin: { latitude: number; longitude: number } | null;
  pins: readonly MapPin[];
  selectedId: string | null;
  onSelect: (jobRequestId: string) => void;
  radiusKm: number;
}>;

const SIZE = 460; // square viewport (px, scales responsively via CSS)
const CENTER = SIZE / 2;
const PADDING = 34;

// Equirectangular local projection (km east/north of origin). Good enough for a city-scale
// approximate map and fully self-contained (no tiles, no projection library).
function toKm(origin: { latitude: number; longitude: number }, p: { latitude: number; longitude: number }) {
  const dEast = (p.longitude - origin.longitude) * 111.32 * Math.cos((origin.latitude * Math.PI) / 180);
  const dNorth = (p.latitude - origin.latitude) * 110.57;
  return { dEast, dNorth };
}

export function MarketplaceMap({ origin, pins, selectedId, onSelect, radiusKm }: Props) {
  const t = useT();
  const layout = useMemo(() => {
    if (!origin) return null;
    const km = pins.map((pin) => ({ pin, ...toKm(origin, pin) }));
    // Scale so the chosen radius (or the farthest pin, whichever is larger) fits the frame.
    const maxKm = Math.max(radiusKm, ...km.map((k) => Math.hypot(k.dEast, k.dNorth)), 1);
    const scale = (CENTER - PADDING) / maxKm;
    const rings = [radiusKm * 0.25, radiusKm * 0.5, radiusKm].filter((r) => r > 0);
    const placed = km.map((k) => ({
      pin: k.pin,
      x: CENTER + k.dEast * scale,
      y: CENTER - k.dNorth * scale // north is up
    }));
    return { placed, rings, scale };
  }, [origin, pins, radiusKm]);

  if (!origin || !layout) {
    return (
      <div className="map-empty" role="img" aria-label={t("map.unavailableAria")}>
        {t("map.runSearch")}
      </div>
    );
  }

  return (
    <svg
      className="map-svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={pins.length === 1 ? t("map.summaryOne") : t("map.summaryMany", { count: pins.length })}
    >
      <rect x="0" y="0" width={SIZE} height={SIZE} className="map-bg" />
      {/* distance rings */}
      {layout.rings.map((r, i) => (
        <g key={i}>
          <circle cx={CENTER} cy={CENTER} r={r * layout.scale} className="map-ring" />
          <text x={CENTER} y={CENTER - r * layout.scale - 4} className="map-ring-label" textAnchor="middle">
            {t("mk.kmUnit", { km: Math.round(r) })}
          </text>
        </g>
      ))}
      {/* origin ("you") */}
      <circle cx={CENTER} cy={CENTER} r={6} className="map-origin" />
      <text x={CENTER} y={CENTER + 20} className="map-origin-label" textAnchor="middle">
        {t("map.you")}
      </text>
      {/* job pins */}
      {layout.placed.map(({ pin, x, y }) => {
        const isSelected = pin.jobRequestId === selectedId;
        return (
          <g
            key={pin.jobRequestId}
            className={`map-pin${isSelected ? " selected" : ""}`}
            transform={`translate(${x}, ${y})`}
            onClick={() => onSelect(pin.jobRequestId)}
            role="button"
            tabIndex={0}
            aria-label={t("map.pinAria", { label: pin.label, saved: pin.saved ? t("map.savedSuffix") : "" })}
            aria-pressed={isSelected}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(pin.jobRequestId);
              }
            }}
          >
            <circle r={isSelected ? 11 : 8} className="map-pin-dot" />
            {pin.saved ? <text className="map-pin-star" textAnchor="middle" dy="4">★</text> : null}
          </g>
        );
      })}
    </svg>
  );
}
