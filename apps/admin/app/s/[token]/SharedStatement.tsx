"use client";
// Presentational renderer for a party-scoped shared statement. Receives an
// already-verified, already-masked snapshot (or null for an invalid/expired
// link). Shows only what the snapshot carries — it has no access to anything
// the recipient is not entitled to see.
import type { CSSProperties } from "react";
import type { Snapshot } from "../../../lib/controlRoomLedger";

const C: Record<string, string> = {
  bg: "#000000", panel2: "#141210", line: "#2a2114",
  fg: "#fbf9f4", muted: "#b3a894", faint: "#6b6356", pass: "#36c48e", hold: "#f2b949",
};

export default function SharedStatement({ snapshot }: { snapshot: Snapshot | null }) {
  const wrap: CSSProperties = { maxWidth: 680, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif", color: C.fg, background: C.bg, minHeight: "100vh" };

  if (!snapshot) {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: 18 }}>This link is invalid or has expired</h1>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
          Statement links are private and time-limited. Ask the sender for a fresh link.
        </p>
      </main>
    );
  }

  const s = snapshot;
  const td: CSSProperties = { padding: "6px 0", borderBottom: `1px dashed ${C.line}`, color: C.muted };
  const tdR: CSSProperties = { padding: "6px 0", borderBottom: `1px dashed ${C.line}`, textAlign: "right", fontFamily: "ui-monospace, monospace", fontVariantNumeric: "tabular-nums", color: C.fg };
  const H = ({ t }: { t: string }) => <h2 style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.muted, borderBottom: `1px solid ${C.line}`, paddingBottom: 6, margin: "22px 0 8px" }}>{t}</h2>;

  return (
    <main style={wrap}>
      <style>{`@media print{body{background:#fff!important}.noprint{display:none!important}main{background:#fff!important;color:#000!important}main *{color:#000!important;border-color:#ccc!important}}`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#ece3d2", marginBottom: 4 }}>Joblop</div>
          <h1 style={{ fontSize: 19, margin: 0 }}>{s.title}</h1>
          <div style={{ color: C.muted, fontSize: 13 }}>{s.number}</div>
        </div>
        <span style={{ fontSize: 11, color: C.faint, border: `1px solid ${C.line}`, padding: "4px 9px", borderRadius: 7 }}>Read-only · your view</span>
        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.5, padding: "5px 12px", borderRadius: 7,
          background: s.closed ? "rgba(54,196,142,.15)" : "rgba(242,185,73,.15)", color: s.closed ? C.pass : C.hold,
          border: `1px solid ${s.closed ? "rgba(54,196,142,.35)" : "rgba(242,185,73,.35)"}` }}>{s.badge}</span>
        <button className="noprint" onClick={() => window.print()}
          style={{ padding: "8px 13px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel2, color: C.fg, cursor: "pointer", fontWeight: 600 }}>
          ⎙ Print / Save PDF
        </button>
      </div>

      <H t="Transaction" />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
        {s.jobRows.map((r, i) => (
          <tr key={i}><td style={td}>{r.label}</td><td style={tdR}>{r.value}</td></tr>
        ))}
      </tbody></table>

      <H t={s.view === "employer" ? "Your invoice" : "Your pay"} />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
        {s.settleRows.map((r, i) => (
          <tr key={i}>
            <td style={{ ...td, color: r.strong ? C.fg : C.muted, fontWeight: r.strong ? 600 : 400, borderTop: r.strong ? `1px solid ${C.line}` : undefined, borderBottom: r.strong ? "0" : td.borderBottom, paddingTop: r.strong ? 8 : 6 }}>{r.label}</td>
            <td style={{ ...tdR, color: r.strong ? C.pass : C.fg, fontWeight: r.strong ? 700 : 400, fontSize: r.strong ? 16 : 13, borderTop: r.strong ? `1px solid ${C.line}` : undefined, borderBottom: r.strong ? "0" : tdR.borderBottom, paddingTop: r.strong ? 8 : 6 }}>{r.value}</td>
          </tr>
        ))}
      </tbody></table>

      <p style={{ color: C.faint, fontSize: 11.5, marginTop: 12, lineHeight: 1.6 }}>{s.note}</p>
      <p style={{ color: C.faint, fontSize: 11, marginTop: 18, borderTop: `1px solid ${C.line}`, paddingTop: 12, lineHeight: 1.6 }}>
        Issued {new Date(s.generated).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" })} (Eastern time). Taxes and deductions shown here are estimates; your invoice or pay statement is the official record. This is a private statement and the link expires.
      </p>
    </main>
  );
}
