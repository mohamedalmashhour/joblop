"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Control Room landing — enter a transaction id or number to open its audit view.
export default function ControlRoomLanding() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const open = () => { const v = value.trim(); if (v) router.push(`/control-room/${encodeURIComponent(v)}`); };

  const C = { bg: "#0a1424", panel: "#0f1d33", line: "#1e3254", fg: "#e8eef8", muted: "#8aa0c2", accent: "#1f9bf0" };
  return (
    <main style={{ background: C.bg, color: C.fg, minHeight: "100vh", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", paddingBlock: 40, paddingInline: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#1f9bf0,#57b6f7)", display: "grid", placeItems: "center", color: "#06192e", fontWeight: 700 }}>JL</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>Transaction Control Room</div>
            <div style={{ color: C.muted, fontSize: 13 }}>Open any transaction to see exactly what happened and how the money settled.</div>
          </div>
        </div>
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18 }}>
          <label htmlFor="cr-id" style={{ display: "block", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Transaction id or number</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input id="cr-id" value={value} onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") open(); }}
              placeholder="e.g. JR-2026-287288 or a job id"
              style={{ flex: "1 1 260px", minWidth: 0, background: "#13243f", color: C.fg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px", fontSize: 14 }} />
            <button onClick={open} style={{ background: C.accent, color: "#06192e", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>Open</button>
          </div>
          <div style={{ color: "#5c749c", fontSize: 12, marginTop: 10 }}>Read-only. Shows the lifecycle timeline, settlement ledger and governance checks for the transaction.</div>
        </div>
      </div>
    </main>
  );
}
