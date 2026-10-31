"use client";

// Provider-neutral admin worksite map. Renders one or more worksite points as a
// self-contained SVG — NO dependency on Google/OSM/any vendor. A tile provider could later
// replace the backdrop behind this same component seam without changing callers.
//
// This is the AUTHORITATIVE admin view, so exact worksite coordinates are permitted here.
// It only ever plots WORKSITE locations (never worker home/personal locations).

export type WorksitePoint = Readonly<{
  id: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  detail?: string | null;
}>;

const SIZE = 320;
const PAD = 40;

export function AdminWorksiteMap({ points, emptyLabel }: { points: readonly WorksitePoint[]; emptyLabel: string }) {
  const located = points.filter((p) => p.latitude !== null && p.longitude !== null) as ReadonlyArray<
    WorksitePoint & { latitude: number; longitude: number }
  >;
  if (located.length === 0) {
    return (
      <div style={styles.empty} role="img" aria-label={emptyLabel}>
        {emptyLabel}
      </div>
    );
  }

  // Fit all located points into the frame (equirectangular; fine at city scale).
  const lats = located.map((p) => p.latitude);
  const lngs = located.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const spanLat = Math.max(maxLat - minLat, 0.01);
  const spanLng = Math.max((maxLng - minLng) * Math.cos((midLat * Math.PI) / 180), 0.01);
  const span = Math.max(spanLat, spanLng);
  const project = (lat: number, lng: number) => ({
    x: PAD + ((lng - minLng) / (span * 2 || 1) + (0.5 - (maxLng - minLng) / (span * 2 || 1) / 2)) * (SIZE - 2 * PAD),
    y: PAD + ((maxLat - lat) / (span * 2 || 1) + (0.5 - (maxLat - minLat) / (span * 2 || 1) / 2)) * (SIZE - 2 * PAD)
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`Worksite map with ${located.length} location${located.length === 1 ? "" : "s"}. The same information is listed beside the map.`}
      style={styles.svg}
    >
      <rect x={0} y={0} width={SIZE} height={SIZE} fill="#fbf9f4" />
      {[0.25, 0.5, 0.75].map((f) => (
        <g key={f} stroke="#faf6ec" strokeWidth={1}>
          <line x1={f * SIZE} y1={0} x2={f * SIZE} y2={SIZE} />
          <line x1={0} y1={f * SIZE} x2={SIZE} y2={f * SIZE} />
        </g>
      ))}
      {located.map((p) => {
        const { x, y } = project(p.latitude, p.longitude);
        return (
          <g key={p.id} transform={`translate(${x}, ${y})`}>
            <circle r={9} fill="#171511" stroke="#ffffff" strokeWidth={2} />
            <text x={0} y={-14} textAnchor="middle" fontSize={11} fontWeight={700} fill="#171511">
              {p.label}
            </text>
            {p.detail ? (
              <text x={0} y={22} textAnchor="middle" fontSize={10} fill="#171511">
                {p.detail}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  svg: { width: "100%", height: "auto", aspectRatio: "1 / 1", border: "1px solid #faf6ec", borderRadius: 10, display: "block" },
  empty: {
    aspectRatio: "1 / 1",
    border: "1px dashed #ece3d2",
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    color: "#6b6356",
    textAlign: "center",
    padding: 20,
    fontSize: 13
  }
};
