"use client";

import { useEffect, useState } from "react";

import { styles } from "../../employer/employerStyles";
import { directionsUrl, osmViewUrl } from "./directions";
import { geocodeAddress, type GeocodeResult } from "./geocodeClient";
import { LocationMap } from "./LocationMap";

/**
 * Binds the map capsule to a job's free-text address (`addressSummary`). It geocodes the address via
 * the same-origin proxy and shows the location with a "Get directions" link. Because the address is a
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
        <p style={styles.sectionCopy}>Locating “{trimmed}” on the map…</p>
      ) : null}

      {status === "error" ? (
        <p style={styles.sectionCopy}>
          Couldn’t place “{trimmed}” on the map. You can still{" "}
          <a
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(trimmed)}`}
            target="_blank"
            rel="noreferrer"
            style={styles.inlineLink}
          >
            search it on OpenStreetMap
          </a>
          .
        </p>
      ) : null}

      {status === "ready" && geo ? (
        <>
          <LocationMap lat={geo.lat} lon={geo.lon} label={trimmed} height={height} />
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
              Get directions
            </a>
            <a href={osmViewUrl(geo.lat, geo.lon)} target="_blank" rel="noreferrer" style={styles.inlineLink}>
              Open larger map
            </a>
          </div>
          <p style={{ ...styles.sectionCopy, fontSize: "0.8rem", opacity: 0.75 }}>
            Approximate location from the stated address — not a verified worksite.
          </p>
        </>
      ) : null}
    </div>
  );
}
