"use client";
// Per-transaction audit report — read-only, printable. Built from the same
// /api/control-room/{id} BFF the Control Room uses. Additive.
//
// `view` masks the report for who is looking:
//   "full"     — internal/admin: everything (default).
//   "employer" — the client: their invoice + taxes only. Worker pay, worker
//                rate and platform margin are HIDDEN (worker rate is never
//                shown to the employer).
//   "worker"   — the worker: only their own pay line. Employer invoice, the
//                platform margin and any other worker are HIDDEN.
import { useEffect, useState, type CSSProperties } from "react";

type Stage = { n: number; name: string; state: string };
type Check = { label: string; state: string };
type Ledger = Record<string, unknown> & { balanceMinor?: number; rateSource?: string };
type Data = {
  job?: { id: string; number: string; title: string; status: string; startAt: string | null; endAt: string | null; workers: number | null; hours: number | null };
  stages?: Stage[];
  ledger?: Ledger | null;
  checks?: Check[];
};
type View = "full" | "employer" | "worker";

const C: Record<string, string> = {
  bg: "#000000", panel: "#0c0c0c", panel2: "#141210", line: "#2a2114",
  fg: "#fbf9f4", muted: "#b3a894", faint: "#6b6356", pass: "#36c48e", hold: "#f2b949", accent: "#c9a24b",
};
const money = (m: unknown) => {
  const n = Number(m);
  return Number.isFinite(n) ? `$${(n / 100).toFixed(2)}` : "—";
};
const dt = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function TransactionReport(
  { jobRequestId, view = "full" }: { jobRequestId: string; view?: View }
) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [share, setShare] = useState<{ url: string; view: string; expiresAt: string; id?: string } | null>(null);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function mint(v: "worker" | "employer") {
    setBusy(v); setShareErr(null); setShare(null); setCopied(false);
    try {
      const res = await fetch(`/api/control-room/${encodeURIComponent(jobRequestId)}/share-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ view: v }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setShareErr(j?.message || `Could not create link (HTTP ${res.status}).`);
      else setShare(j);
    } catch (e) {
      setShareErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    fetch(`/api/control-room/${encodeURIComponent(jobRequestId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then(setD)
      .catch((e) => setErr(String(e)));
  }, [jobRequestId]);

  const wrap: CSSProperties = { maxWidth: 860, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif", color: C.fg, background: C.bg, minHeight: "100vh" };
  if (err) return <main style={wrap}>Could not load transaction {jobRequestId}: {err}</main>;
  if (!d) return <main style={wrap}>Loading report…</main>;

  const job = d.job;
  const L = d.ledger || {};
  const closed = (L.balanceMinor ?? -1) === 0;

  const title = view === "employer" ? "Your invoice — Joblop"
    : view === "worker" ? "Your pay — Joblop"
    : "Transaction audit report";

  // Per-worker figures derived from the aggregate ledger.
  const wRate = Number(L.workerRateMinor);
  const wHours = Number(L.billableHours);
  const wGrossEach = Number.isFinite(wRate) && Number.isFinite(wHours) ? wRate * wHours : NaN;
  const wNetEach = Number(L.workerNetEachMinor);
  const wDedEach = Number.isFinite(wGrossEach) && Number.isFinite(wNetEach) ? wGrossEach - wNetEach : NaN;

  // Settlement rows per view (explicit, so masking is auditable — not a generic dump).
  type Row = [string, unknown, boolean?];
  let settle: Row[];
  if (view === "employer") {
    settle = [
      ["Labour", L.labourMinor],
      ["Card processing surcharge", L.surchargeMinor],
      ["GST (illustrative)", L.gstMinor],
      ["QST (illustrative)", L.qstMinor],
      ["Total you pay", L.invoiceMinor, true],
    ];
  } else if (view === "worker") {
    settle = [
      ["Your rate / hr", L.workerRateMinor],
      ["Hours worked", wHours],
      ["Gross", wGrossEach],
      ["Statutory deductions", -wDedEach],
      ["Your net pay", wNetEach, true],
    ];
  } else {
    settle = [
      ["Employer pays in (invoice)", L.invoiceMinor],
      ["Workers — net total", L.workersNetMinor],
      ["  worker net, each", L.workerNetEachMinor],
      ["Payroll remittances", L.remittancesMinor],
      ["Government GST + QST", Number(L.gstMinor) + Number(L.qstMinor)],
      ["Card processing fee", L.cardFeeMinor],
      ["Platform net margin (kept)", L.platformNetMinor],
      ["SETTLEMENT BALANCE", L.balanceMinor, true],
    ];
  }

  const hoursCell = (k: string, v: unknown) =>
    k === "Hours worked" ? `${Number.isFinite(Number(v)) ? v : "—"}h` : money(v);

  const H = ({ t }: { t: string }) => <h2 style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.muted, borderBottom: `1px solid ${C.line}`, paddingBottom: 6, margin: "24px 0 8px" }}>{t}</h2>;
  const td: CSSProperties = { padding: "6px 0", borderBottom: `1px dashed ${C.line}`, color: C.fg };
  const tdR: CSSProperties = { ...td, textAlign: "right", fontFamily: "ui-monospace, monospace", fontVariantNumeric: "tabular-nums" };
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

  return (
    <main style={wrap}>
      <style>{`@media print{
        body{background:#fff!important}
        .noprint{display:none!important}
        main{background:#fff!important;color:#000!important}
        main *{color:#000!important;border-color:#ccc!important}
      }`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 19, margin: 0 }}>{title}</h1>
          <div style={{ color: C.muted, fontSize: 13 }}>{job?.title ?? "Staffing request"} · {job?.number ?? jobRequestId}</div>
        </div>
        {view !== "full" && (
          <span style={{ fontSize: 11, color: C.faint, border: `1px solid ${C.line}`, padding: "4px 9px", borderRadius: 7 }}>
            Read-only · your view
          </span>
        )}
        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.5, padding: "5px 12px", borderRadius: 7,
          background: closed ? "rgba(54,196,142,.15)" : "rgba(242,185,73,.15)", color: closed ? C.pass : C.hold,
          border: `1px solid ${closed ? "rgba(54,196,142,.35)" : "rgba(242,185,73,.35)"}` }}>
          {closed ? (view === "worker" ? "PAID" : view === "employer" ? "SETTLED" : "CLOSED · $0.00") : "IN PROGRESS"}
        </span>
        <button className="noprint" onClick={() => window.print()}
          style={{ padding: "8px 13px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel2, color: C.fg, cursor: "pointer", fontWeight: 600 }}>
          ⎙ Print / Save PDF
        </button>
      </div>

      {view === "full" && (
        <div className="noprint" style={{ marginTop: 14, padding: "12px 14px", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: C.muted, flex: "1 1 220px" }}>Create a private, time-limited link that shows only one party their own view:</span>
            <button onClick={() => mint("worker")} disabled={!!busy}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel, color: C.fg, cursor: busy ? "default" : "pointer", fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
              {busy === "worker" ? "Creating…" : "Create worker link"}
            </button>
            <button onClick={() => mint("employer")} disabled={!!busy}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel, color: C.fg, cursor: busy ? "default" : "pointer", fontWeight: 600, opacity: busy ? 0.6 : 1 }}>
              {busy === "employer" ? "Creating…" : "Create client link"}
            </button>
          </div>
          {share && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input aria-label="Share link URL" readOnly value={share.url} onFocus={(e) => e.currentTarget.select()}
                style={{ flex: "1 1 320px", minWidth: 0, fontFamily: "ui-monospace, monospace", fontSize: 12, padding: "8px 10px", borderRadius: 7, border: `1px solid ${C.line}`, background: C.bg, color: C.fg }} />
              <button onClick={() => { navigator.clipboard?.writeText(share.url).then(() => setCopied(true)).catch(() => {}); }}
                style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel, color: C.fg, cursor: "pointer", fontWeight: 600 }}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <span style={{ fontSize: 11, color: C.faint, flexBasis: "100%" }}>
                {share.view === "worker" ? "Worker view" : "Client view"} · expires {new Date(share.expiresAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                {share.id ? <> · link id <code style={{ fontFamily: "ui-monospace, monospace" }}>{share.id}</code> (add to CONTROL_ROOM_REVOKED_JTIS to revoke)</> : null}
              </span>
            </div>
          )}
          {shareErr && <div style={{ marginTop: 10, fontSize: 12, color: C.hold }}>{shareErr}</div>}
        </div>
      )}

      <H t="Transaction details" />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
        <tr><td style={{ ...td, color: C.muted }}>Report generated</td><td style={tdR}>{stamp}</td></tr>
        <tr><td style={{ ...td, color: C.muted }}>Job request</td><td style={tdR}>{job?.number ?? jobRequestId}</td></tr>
        <tr><td style={{ ...td, color: C.muted }}>Title</td><td style={tdR}>{job?.title ?? "—"}</td></tr>
        <tr><td style={{ ...td, color: C.muted }}>Status</td><td style={tdR}>{(job?.status ?? "—").toString().toUpperCase()}</td></tr>
        <tr><td style={{ ...td, color: C.muted }}>Shift start</td><td style={tdR}>{dt(job?.startAt ?? null)}</td></tr>
        <tr><td style={{ ...td, color: C.muted }}>Shift end</td><td style={tdR}>{dt(job?.endAt ?? null)}</td></tr>
        {view !== "worker" && <tr><td style={{ ...td, color: C.muted }}>Headcount</td><td style={tdR}>{job?.workers != null ? `${job.workers} worker(s)` : "—"}</td></tr>}
      </tbody></table>

      {d.ledger ? (
        <>
          <H t={view === "employer" ? "Your invoice" : view === "worker" ? "Your pay" : "Settlement ledger (final)"} />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
            {settle.map(([k, v, strong]) => (
              <tr key={k}>
                <td style={{ ...td, color: strong ? C.fg : C.muted, fontWeight: strong ? 600 : 400, borderTop: strong ? `1px solid ${C.line}` : undefined, borderBottom: strong ? "0" : td.borderBottom, paddingTop: strong ? 8 : 6 }}>{k}</td>
                <td style={{ ...tdR, color: strong ? C.pass : C.fg, fontWeight: strong ? 700 : 400, fontSize: strong ? 15 : 13, borderTop: strong ? `1px solid ${C.line}` : undefined, borderBottom: strong ? "0" : tdR.borderBottom, paddingTop: strong ? 8 : 6 }}>{hoursCell(k, v)}</td>
              </tr>
            ))}
          </tbody></table>
          {view === "employer" && (
            <p style={{ color: C.faint, fontSize: 11, marginTop: 10 }}>You are billed only for clock-verified hours. Worker pay rates are set and paid by Joblop and are not shown on your invoice.</p>
          )}
          {view === "worker" && (
            <p style={{ color: C.faint, fontSize: 11, marginTop: 10 }}>Joblop takes no fee from your pay. Hours are taken from your recorded clock-in / clock-out, and the 6-hour minimum is honoured.</p>
          )}
        </>
      ) : (
        <p style={{ color: C.faint, fontSize: 13, marginTop: 16 }}>No priced figures yet for this transaction.</p>
      )}

      {view !== "worker" && Array.isArray(d.stages) && d.stages.length > 0 && (
        <>
          <H t="Lifecycle" />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
            {d.stages.map((s) => (
              <tr key={s.n}>
                <td style={td}>{s.n}. {s.name}</td>
                <td style={{ ...tdR, fontWeight: 700, fontSize: 11, letterSpacing: 0.5, color: s.state === "done" ? C.pass : s.state === "current" ? C.accent : C.faint }}>{s.state.toUpperCase()}</td>
              </tr>
            ))}
          </tbody></table>
        </>
      )}

      {view === "full" && Array.isArray(d.checks) && d.checks.length > 0 && (
        <>
          <H t="Governance checks" />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
            {d.checks.map((c, i) => (
              <tr key={i}>
                <td style={td}>{c.label}</td>
                <td style={{ ...tdR, fontWeight: 700, fontSize: 11, letterSpacing: 0.5, color: c.state === "pass" ? C.pass : C.hold }}>{c.state.toUpperCase()}</td>
              </tr>
            ))}
          </tbody></table>
        </>
      )}

      <p style={{ color: C.faint, fontSize: 11, marginTop: 22, borderTop: `1px solid ${C.line}`, paddingTop: 12, lineHeight: 1.6 }}>
        {view === "full"
          ? <>Prepared by the Financial Controller function. Pricing &amp; splits computed by the real @rwos/shared engine (20% platform margin, 6-hour minimum). Pricing snapshot immutable at approval; an unpriced request can never be approved. Figures are test-mode until a payment provider is bound; tax &amp; payroll deductions illustrative. Settlement balance {money(L.balanceMinor)}.</>
          : <>Joblop · read-only statement for this transaction. Figures from the @rwos/shared pricing engine. Test-mode until a payment provider is bound for your region; tax &amp; deductions illustrative.</>}
      </p>
    </main>
  );
}
