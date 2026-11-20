"use client";

import { useLocale, useT } from "./i18n/LocaleProvider";
import { directionsUrlForAddress, embedUrlForAddress, isMappableAddress } from "./shiftLocation";

// Small map + "Get directions" for a confirmed shift. Only ever given the exact address the API sends
// to the assigned worker; with no address it renders nothing.
export function ShiftAddressMap({ address, height = 180 }: { address: string | null | undefined; height?: number }) {
  const t = useT();
  const locale = useLocale();
  if (!isMappableAddress(address)) return null;
  return (
    <div className="shift-map" style={{ display: "grid", gap: 8 }}>
      <div style={{ borderRadius: 12, overflow: "hidden", lineHeight: 0, border: "1px solid rgba(0,0,0,0.08)" }}>
        <iframe
          title={t("map.addressMapTitle")}
          src={embedUrlForAddress(address, locale)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ width: "100%", height, border: 0, display: "block" }}
          allowFullScreen
        />
      </div>
      <a
        className="btn ghost"
        href={directionsUrlForAddress(address)}
        target="_blank"
        rel="noreferrer"
        style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        {t("map.getDirections")}
      </a>
    </div>
  );
}
