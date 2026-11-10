"use client";

import type { CSSProperties } from "react";
import { useT } from "../i18n/LocaleProvider";
import { requestPhase, requestPhaseLabel, requestPhaseTone, type RequestPhaseInput } from "./requestStatus";

// The one small status chip used wherever the employer sees a request (home, calendar, request detail).
export function RequestStatusChip({
  request,
  style
}: Readonly<{ request: RequestPhaseInput & Readonly<{ numberOfWorkers?: number }>; style?: CSSProperties }>) {
  const t = useT();
  const phase = requestPhase(request);
  const label = requestPhaseLabel(phase, request.numberOfWorkers ?? 1);
  const tone = requestPhaseTone(phase);
  return (
    <span
      style={{
        alignSelf: "flex-start",
        background: tone.background,
        border: `1px solid ${tone.border}`,
        borderRadius: 999,
        color: tone.color,
        display: "inline-block",
        flex: "0 1 auto",
        // Inside a grid card (the request detail) "alignSelf" alone still stretches the chip across the
        // card; justifySelf + fit-content keep it the width of its words everywhere.
        justifySelf: "start",
        width: "fit-content",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.4,
        maxWidth: "100%",
        padding: "3px 10px",
        ...style
      }}
    >
      {t(label.key, label.vars)}
    </span>
  );
}
