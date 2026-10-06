"use client";
// Per-transaction audit report — read-only, printable. Built from the same
// /api/control-room/{id} BFF the Control Room uses. Additive; touches nothing else.
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

const C: Record<string, string> = {
  bg: "#0a1424", panel: "#0f1d33", panel2: "#13243f", line: "#1e3254",
  fg: "#e8eef8", muted: "#8aa0c2", faint: "#5c749c", pass: "#36c48e", hold: "#f2b949", accent: "#45a0f5",
};
const money = (m: unknown) => {
  const n = Number(m);
  return Number.isFinite(n) ? `$${(n / 100).toFixed(2)}` : "—";
};
const dt = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function TransactionReport({ jobRequestId }: { jobRequestId: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  const row = (k: string, v: string, strong = false) => (
    <tr><td style={{ padding: "6px 0", borderBottom: `1px dashed ${C.line}`, color: C.muted }}>{k}</td>
      <td style={{ padding: "6px 0", borderBottom: `1px dashed ${C.line}`, textAlign: "right", fontFamily: "ui-monospace, monospace", fontVariantNumeric: "tabular-nums", color: strong ? C.pass : C.fg, fontWeight: strong ? 700 : 400 }}>{v}</td></tr>
  );
  const H = ({ t }: { t: string }) => <h2 style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.muted, borderBottom: `1px solid ${C.line}`, paddingBottom: 6, margin: "24px 0 8px" }}>{t}</h2>;
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
          <h1 style={{ fontSize: 19, margin: 0 }}>Transaction audit report</h1>
          <div style={{ color: C.muted, fontSize: 13 }}>{job?.title ?? "Staffing request"} · {job?.number ?? jobRequestId}</div>
        </div>
        <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.5, padding: "5px 12px", borderRadius: 7,
          background: closed ? "rgba(54,196,142,.15)" : "rgba(242,185,73,.15)", color: closed ? C.pass : C.hold,
          border: `1px solid ${closed ? "rgba(54,196,142,.35)" : "rgba(242,185,73,.35)"}` }}>
          {closed ? "CLOSED · $0.00" : "IN PROGRESS"}
        </span>
        <button className="noprint" onClick={() => window.print()}
          style={{ padding: "8px 13px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel2, color: C.fg, cursor: "pointer", fontWeight: 600 }}>
          ⎙ Print / Save PDF
        </button>
      </div>

      <H t="Transaction details" />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
        {row("Report generated", stamp)}
        {row("Job request", `${job?.number ?? jobRequestId}`)}
        {row("Title", job?.title ?? "—")}
        {row("Status", (job?.status ?? "—").toString().toUpperCase())}
        {row("Shift start", dt(job?.startAt ?? null))}
        {row("Shift end", dt(job?.endAt ?? null))}
        {row("Headcount", job?.workers != null ? `${job.workers} worker(s)` : "—")}
        {row("Hours", job?.hours != null ? `${job.hours}h` : "—")}
      </tbody></table>

      {d.ledger ? (<>
        <H t="Pricing (real @rwos/shared engine · 20% margin)" />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
          {row("Employer rate / hr", money(L.employerRateMinor))}
          {row("Worker rate / hr (E − margin)", money(L.workerRateMinor))}
          {row("Platform margin / hr", money(L.platformRateMinor))}
          {row("Billable hours (6h floor)", `${L.billableHours ?? "—"}h`)}
          {row("Workers", `${L.workers ?? "—"}`)}
          {row("Rate source", (L.rateSource ?? "—").toString())}
        </tbody></table>

        <H t="Settlement ledger (final)" />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
          {row("Employer pays in (invoice)", money(L.invoiceMinor))}
          {row("Workers — net total", money(L.workersNetMinor))}
          {row("  worker net, each", money(L.workerNetEachMinor))}
          {row("Payroll remittances", money(L.remittancesMinor))}
          {row("Government GST + QST", money(Number(L.gstMinor) + Number(L.qstMinor)))}
          {row("Card processing fee", money(L.cardFeeMinor))}
          {row("Platform net margin (kept)", money(L.platformNetMinor))}
          {row("SETTLEMENT BALANCE", money(L.balanceMinor), true)}
        </tbody></table>
      </>) : (
        <p style={{ color: C.faint, fontSize: 13, marginTop: 16 }}>No priced ledger yet for this transaction (needs a start/end window and headcount).</p>
      )}

      {Array.isArray(d.stages) && d.stages.length > 0 && (<>
        <H t="Lifecycle audit log" />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
          {d.stages.map((s) => (
            <tr key={s.n}>
              <td style={{ padding: "6px 0", borderBottom: `1px dashed ${C.line}`, color: C.fg }}>{s.n}. {s.name}</td>
              <td style={{ padding: "6px 0", borderBottom: `1px dashed ${C.line}`, textAlign: "right", fontWeight: 700, fontSize: 11, letterSpacing: 0.5,
                color: s.state === "done" ? C.pass : s.state === "current" ? C.accent : C.faint }}>{s.state.toUpperCase()}</td>
            </tr>
          ))}
        </tbody></table>
      </>)}

      {Array.isArray(d.checks) && d.checks.length > 0 && (<>
        <H t="Governance checks" />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
          {d.checks.map((c, i) => (
            <tr key={i}>
              <td style={{ padding: "6px 0", borderBottom: `1px dashed ${C.line}`, color: C.fg }}>{c.label}</td>
              <td style={{ padding: "6px 0", borderBottom: `1px dashed ${C.line}`, textAlign: "right", fontWeight: 700, fontSize: 11, letterSpacing: 0.5,
                color: c.state === "pass" ? C.pass : C.hold }}>{c.state.toUpperCase()}</td>
            </tr>
          ))}
        </tbody></table>
      </>)}

      <p style={{ color: C.faint, fontSize: 11, marginTop: 22, borderTop: `1px solid ${C.line}`, paddingTop: 12, lineHeight: 1.6 }}>
        Prepared by the Financial Controller function. Pricing & splits computed by the real @rwos/shared
        engine (20% platform margin, 6-hour minimum). Pricing snapshot immutable at approval; an unpriced
        request can never be approved. Figures are test-mode until a payment provider is bound for an
        activated country; tax &amp; payroll deductions illustrative. Settlement balance {money(L.balanceMinor)}.
      </p>
    </main>
  );
}
