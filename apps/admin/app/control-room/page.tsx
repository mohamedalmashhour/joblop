"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Control Room landing — a live list of transactions (from the existing
// /api/calendar/requests BFF), each linking into its audit view + report, plus a
// manual id/number box. Read-only; additive.
type Row = {
  id: string;
  requestNumber: string;
  title: string;
  numberOfWorkers: number;
  startAt: string;
  status: string;
};
type Load =
  | { state: "loading" }
  | { state: "ready"; rows: Row[] }
  | { state: "empty" }
  | { state: "error"; reason: string };

const C = { bg: "#000000", panel: "#0c0c0c", panel2: "#141210", line: "#2a2114", fg: "#fbf9f4", muted: "#b3a894", faint: "#6b6356", accent: "#c9a24b", done: "#36c48e", hold: "#f2b949" };

function statusColor(s: string): string {
  const v = s.toLowerCase();
  if (v.includes("close") || v.includes("complete") || v.includes("paid")) return C.done;
  if (v.includes("dispute") || v.includes("hold") || v.includes("review") || v.includes("required")) return C.hold;
  return C.accent;
}
const fmtDate = (s: string) => {
  try { return new Date(s).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }); } catch { return s; }
};

export default function ControlRoomLanding() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const open = () => { const v = value.trim(); if (v) router.push(`/control-room/${encodeURIComponent(v)}`); };

  useEffect(() => {
    fetch("/api/calendar/requests")
      .then(async (r) => (r.ok ? r.json() : Promise.reject(r.status === 401 ? "Sign in to view transactions." : `Could not load transactions (HTTP ${r.status}).`)))
      .then((j) => {
        const rows: Row[] = Array.isArray(j?.requests) ? j.requests : [];
        setLoad(rows.length ? { state: "ready", rows } : { state: "empty" });
      })
      .catch((reason) => setLoad({ state: "error", reason: String(reason) }));
  }, []);

  return (
    <main style={{ background: C.bg, color: C.fg, minHeight: "100vh", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", paddingBlock: 40, paddingInline: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#c9a24b,#141210)", display: "grid", placeItems: "center", color: "#000000", fontWeight: 700 }}>JL</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>Transaction Control Room</div>
            <div style={{ color: C.muted, fontSize: 13 }}>Open any transaction to see exactly what happened and how the money settled.</div>
          </div>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <label htmlFor="cr-id" style={{ display: "block", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Open by id or number</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input id="cr-id" value={value} onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") open(); }}
              placeholder="e.g. JR-2026-287288 or a job id"
              style={{ flex: "1 1 260px", minWidth: 0, background: C.panel2, color: C.fg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px", fontSize: 14 }} />
            <button onClick={open} style={{ background: C.accent, color: "#000000", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>Open</button>
          </div>
        </div>

        <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: C.muted, margin: "0 2px 10px" }}>Transactions</div>

        {load.state === "loading" && <div style={{ color: C.faint, fontSize: 13, padding: "8px 2px" }}>Loading transactions…</div>}
        {load.state === "error" && <div style={{ color: C.hold, fontSize: 13, padding: "8px 2px" }}>{load.reason}</div>}
        {load.state === "empty" && <div style={{ color: C.faint, fontSize: 13, padding: "8px 2px" }}>No transactions yet. Open one by id above.</div>}

        {load.state === "ready" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {load.rows.map((r) => (
              <div key={r.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "13px 15px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5, color: C.accent }}>{r.requestNumber}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: statusColor(r.status), border: `1px solid ${C.line}`, borderRadius: 6, padding: "2px 7px" }}>{r.status.replace(/_/g, " ")}</span>
                  </div>
                  <div style={{ fontSize: 14, marginTop: 3 }}>{r.title}</div>
                  <div style={{ color: C.faint, fontSize: 11.5, marginTop: 2 }}>{fmtDate(r.startAt)} · {r.numberOfWorkers} worker(s)</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => router.push(`/control-room/${encodeURIComponent(r.id)}`)}
                    style={{ background: C.accent, color: "#000000", border: "none", borderRadius: 8, padding: "8px 13px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Control Room</button>
                  <button onClick={() => router.push(`/control-room/${encodeURIComponent(r.id)}/report`)}
                    style={{ background: C.panel2, color: C.fg, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 13px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Report</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ color: C.faint, fontSize: 12, marginTop: 16 }}>Read-only. Each opens the lifecycle timeline, settlement ledger and governance checks for that transaction.</div>
      </div>
    </main>
  );
}
