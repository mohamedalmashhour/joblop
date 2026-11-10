"use client";

import { useMemo } from "react";
import { useT } from "../i18n/LocaleProvider";
import { VIEW_HEIGHT, VIEW_WIDTH, osmView } from "./osmMap";

// The Find work map: a real street map of Québec (OpenStreetMap tiles, no API key, no map library)
// with one pin per city that has Joblop jobs. Public jobs carry only the city, so a pin is the city's
// centre, never a work address. There is no "You" here: a signed-out visitor has no position.

export type CityPin = Readonly<{ id: string; latitude: number; longitude: number; label: string; count: number }>;

export function QuebecJobsMap({
  pins,
  selectedId,
  onSelect,
  withQuebec
}: {
  pins: readonly CityPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Show all of southern Québec around the pins (no city searched). */
  withQuebec: boolean;
}) {
  const t = useT();
  const view = useMemo(() => osmView(pins, { withQuebec }), [pins, withQuebec]);
  return (
    <figure className="qmap" style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}>
      <div className="qmap-tiles" aria-hidden="true">
        {view.tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element -- plain map tiles, no image optimisation wanted
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="strict-origin-when-cross-origin"
            draggable={false}
            style={{ left: `${tile.leftPct}%`, top: `${tile.topPct}%`, width: `${tile.sizePctX}%`, height: `${tile.sizePctY}%` }}
          />
        ))}
      </div>
      <ul className="qmap-pins" aria-label={t("fw.mapAria", { count: pins.length })}>
        {view.pins.map(({ pin, leftPct, topPct }) => {
          const on = pin.id === selectedId;
          return (
            <li key={pin.id} style={{ left: `${leftPct}%`, top: `${topPct}%` }}>
              <button
                type="button"
                className={on ? "qmap-pin on" : "qmap-pin"}
                aria-pressed={on}
                aria-label={t("fw.mapPinAria", { city: pin.label, count: pin.count })}
                onClick={() => onSelect(pin.id)}
              >
                <span className="qmap-dot" aria-hidden="true">{pin.count}</span>
                <span className="qmap-label">{pin.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <figcaption className="qmap-credit">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
      </figcaption>
    </figure>
  );
}
