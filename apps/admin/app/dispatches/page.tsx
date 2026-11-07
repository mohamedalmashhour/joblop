"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Dispatch reviews index — a live list (from /api/dispatches/list), each row opening its
// dispatch detail workspace. Read-only; additive.
type Row = {
  id: string;
  jobRequestId: string;
  state: string;
  priority: string;
  requiredWorkerCount: number;
  createdAt: string;
  jobRequestNumber?: string | null;
};
type Load =
  | { state: "loading" }
  | { state: "ready"; rows: Row[] }
  | { state: "empty" }
  | { state: "error"; reason: string };

const stateColor = (s: string): string => {
  const v = s.toLowerCase();
  if (v.includes("assign") || v.includes("complete") || v.includes("closed")) return "#1a7f4b";
  if (v.includes("offer") || v.includes("shortlist")) return "#8a6414";
  if (v.includes("cancel") || v.includes("paused")) return "#9a1f2b";
  return "#171511";
};
const fmt = (s: string) => {
  try { return new Date(s).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }); } catch { return s; }
};

export default function DispatchReviewsPage() {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    fetch("/api/dispatches/list")
      .then(async (r) => (r.ok ? r.json() : Promise.reject(r.status === 401 ? "Sign in to view dispatch reviews." : `Could not load dispatch reviews (HTTP ${r.status}).`)))
      .then((j) => {
        const rows: Row[] = Array.isArray(j?.dispatches) ? j.dispatches : [];
        setLoad(rows.length ? { state: "ready", rows } : { state: "empty" });
      })
      .catch((reason) => setLoad({ state: "error", reason: String(reason) }));
  }, []);

  const C = { bg: "#fbf9f4", fg: "#171511", muted: "#6b6356", line: "#ece3d2", card: "#ffffff", accent: "#e0a500" };

  return (
    <main style={{ background: C.bg, color: C.fg, minHeight: "100vh", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 40 }}>
        <h1 style={{ fontSize: 24, margin: "0 0 4px" }}>Dispatch reviews</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 0 }}>
          Open a dispatch to review candidates, prepare and send offers, and create assignments. You can also open an approved request from the <a href="/calendar" style={{ color: C.accent }}>request calendar</a>.
        </p>

        {load.state === "loading" && <div style={{ color: C.muted, fontSize: 14, padding: "10px 0" }}>Loading dispatch reviews…</div>}
        {load.state === "error" && <div style={{ color: "#9a1f2b", fontSize: 14, padding: "10px 0" }}>{load.reason}</div>}
        {load.state === "empty" && <div style={{ color: C.muted, fontSize: 14, padding: "10px 0" }}>No dispatch reviews yet. Approve a request in the calendar to start one.</div>}

        {load.state === "ready" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {load.rows.map((r) => (
              <button key={r.id} onClick={() => router.push(`/dispatches/${encodeURIComponent(r.id)}`)}
                style={{ textAlign: "left", background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "13px 15px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: stateColor(r.state), border: `1px solid ${C.line}`, borderRadius: 6, padding: "2px 7px" }}>{r.state.replace(/_/g, " ")}</span>
                    {r.priority !== "normal" && <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "#9a1f2b" }}>{r.priority}</span>}
                  </div>
                  <div style={{ fontSize: 13.5, marginTop: 4 }}>Request <span style={{ fontFamily: "ui-monospace, monospace" }}>{r.jobRequestNumber ?? `${r.jobRequestId.slice(0, 8)}…`}</span></div>
                  <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>{fmt(r.createdAt)} · needs {r.requiredWorkerCount} worker(s)</div>
                </div>
                <span style={{ color: C.accent, fontWeight: 600, fontSize: 13 }}>Open review →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
