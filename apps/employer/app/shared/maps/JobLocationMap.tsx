"use client";

import { useEffect, useState } from "react";

import { styles } from "../../employer/employerStyles";
import { useT } from "../../i18n/LocaleProvider";
import { directionsUrl, osmViewUrl } from "./directions";
import { geocodeAddress, type GeocodeResult } from "./geocodeClient";
import { LocationMap } from "./LocationMap";

// Where the map starts before the address is found: Montréal and Laval, where most Joblop sites are.
// The wider box shows both cities at once instead of a zoomed-out view of the whole region.
export const DEFAULT_MAP_CENTER = { lat: 45.54, lon: -73.65 } as const;
export const DEFAULT_MAP_DELTA = 0.12;

/**
 * Binds the map capsule to a job's free-text address (`addressSummary`). It geocodes the address via
 * the same-origin proxy and shows the location with a "Get directions" link. Until the pin is placed
 * the map shows Montréal/Laval with a small "Finding the address…" note. Because the address is a
 * stated summary (not a verified coordinate), the map is labelled as approximate — this respects the
 * app's location-verification framework and never implies a confirmed worksite. When the address is
 * restricted or not provided, the capsule renders nothing.
 */
export function JobLocationMap({
  address,
  height = 300
}: {
  address: string | null | undefined;
  height?: number;
}) {
  const t = useT();
  const trimmed = (address ?? "").trim();
  const mappable = trimmed.length > 1 && !/restricted|not provided/i.test(trimmed);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [geo, setGeo] = useState<GeocodeResult | null>(null);

  useEffect(() => {
    if (!mappable) return;
    const controller = new AbortController();
    setStatus("loading");
    setGeo(null);
    geocodeAddress(trimmed, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result) {
        setGeo(result);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    });
    return () => controller.abort();
  }, [trimmed, mappable]);

  if (!mappable) return null;

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {status === "loading" ? (
        <div style={{ position: "relative" }}>
          <LocationMap
            lat={DEFAULT_MAP_CENTER.lat}
            lon={DEFAULT_MAP_CENTER.lon}
            delta={DEFAULT_MAP_DELTA}
            marker={false}
            title={t("map.defaultTitle")}
            height={height}
          />
          <p
            role="status"
            aria-live="polite"
            style={{
              position: "absolute",
              top: 10,
              insetInlineStart: 10,
              margin: 0,
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(0, 0, 0, 0.78)",
              color: "#f4efe4",
              fontSize: "0.85rem",
              fontWeight: 700
            }}
          >
            {t("map.finding")}
          </p>
        </div>
      ) : null}

      {status === "error" ? (
        <p style={styles.sectionCopy}>
          {t("map.notFound", { address: trimmed })}{" "}
          <a
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(trimmed)}`}
            target="_blank"
            rel="noreferrer"
            style={styles.inlineLink}
          >
            {t("map.searchOsm")}
          </a>
        </p>
      ) : null}

      {status === "ready" && geo ? (
        <>
          <LocationMap lat={geo.lat} lon={geo.lon} title={t("map.frameTitle", { label: trimmed })} height={height} />
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <a
              href={directionsUrl(geo.lat, geo.lon)}
              target="_blank"
              rel="noreferrer"
              style={styles.secondaryButton}
            >
              {t("map.directions")}
            </a>
            <a href={osmViewUrl(geo.lat, geo.lon)} target="_blank" rel="noreferrer" style={styles.inlineLink}>
              {t("map.larger")}
            </a>
          </div>
          <p style={{ ...styles.sectionCopy, fontSize: "0.8rem", opacity: 0.75 }}>
            {t("map.approx")}
          </p>
        </>
      ) : null}
    </div>
  );
}
