"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { aiReviewDisclaimer, aiReviewHeading, aiReviewUnavailableText } from "./payrollContent";

// ── Types (mirror the payroll API serializers) ──
type Period = Readonly<{ id: string; organizationId: string; jurisdiction: { country: string; region: string }; periodStart: string; periodEnd: string; status: string; currency: string; calculationCount?: number }>;
type Calc = Readonly<{
  id: string; revision: number; status: string; workerIdentityId: string; jurisdiction: { country: string; region: string };
  ruleProvider: { key: string; version: string }; currency: string; grossPayMinor: number; totalDeductionsMinor: number; netPayMinor: number;
  totalEmployerCostMinor: number; calculationFingerprint: string; version: number; correctionType: string | null; correctionReason?: string | null;
  previousCalculationId?: string | null; previousFingerprint?: string | null; adjustsCalculationId?: string | null; supersededById?: string | null;
  adjustment?: { netDirection: string; netDeltaMinor: number } | null; calculatedAt?: string; workerClassification?: string;
}>;
type Line = Readonly<{ classification?: string; category?: string; code?: string; description: string; amountMinor: number; currency: string; contractVersion?: string; quantityMinutes?: number | null }>;
type WorkedRef = Readonly<{ timesheetId: string; timesheetVersion: number; timesheetStatus: string; payableMinutes: number; scheduledStartAt: string; scheduledEndAt: string; contractVersion: string; contractEffectiveFrom: string; appliedHourlyRateMinor: number; currency: string }>;
type Detail = Calc & Readonly<{ earningLines: Line[]; deductionLines: Line[]; employerCostLines: Line[]; workedTimeRefs: WorkedRef[] }>;
type AiFinding = Readonly<{ code: string; title: string; explanation: string; severity: string; evidenceRef: string }>;
type AiReview = Readonly<{ status: "ready" | "review_unavailable"; summary: string; findings: AiFinding[]; versioning: { model: string; promptVersion: string; providerKey: string; providerVersion: string }; synthetic: boolean }>;

const money = (minor: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);
const day = (iso: string, tz = "UTC") => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });

async function api(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(`/api/payroll/${path}`, { method, cache: "no-store", ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function PayrollConsole() {
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [calcs, setCalcs] = useState<Calc[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [aiReview, setAiReview] = useState<AiReview | null>(null);
  const [family, setFamily] = useState<Calc[] | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void api("periods?limit=50").then((r) => setPeriods(r.ok ? (r.data.items as Period[]) : [])); }, []);

  const openPeriod = useCallback(async (id: string) => {
    setPeriodId(id); setDetail(null); setFamily(null); setCalcs(null);
    const r = await api(`periods/${id}/calculations?limit=100`);
    setCalcs(r.ok ? (r.data.items as Calc[]) : []);
  }, []);

  const openCalc = useCallback(async (id: string) => {
    setNotice(null); setAiReview(null);
    const [d, f] = await Promise.all([api(`calculations/${id}`), api(`calculations/${id}/family`)]);
    setDetail(d.ok ? (d.data.calculation as Detail) : null);
    setFamily(f.ok ? (f.data.items as Calc[]) : null);
    // Advisory AI review — read-only; failures degrade silently (payroll is unaffected).
    const r = await api(`calculations/${id}/ai-review`);
    setAiReview(r.ok ? (r.data.review as AiReview) : null);
  }, []);

  const refresh = useCallback(async () => { if (detail) await openCalc(detail.id); if (periodId) { const r = await api(`periods/${periodId}/calculations?limit=100`); setCalcs(r.ok ? (r.data.items as Calc[]) : []); } }, [detail, periodId, openCalc]);

  const act = useCallback(async (label: string, path: string, body: unknown, onOk: (data: Record<string, unknown>) => string) => {
    setBusy(true); setNotice(null);
    try {
      const r = await api(path, "POST", body);
      if (!r.ok) {
        const msg = r.status === 409 ? "This calculation changed — reload and try again (stale revision)." : r.status === 403 ? "Payroll authority required." : (r.data.reason as string) ?? "That action could not be completed.";
        setNotice({ tone: "error", text: `${label}: ${msg}` });
        return;
      }
      setNotice({ tone: "info", text: onOk(r.data) });
      await refresh();
    } finally { setBusy(false); }
  }, [refresh]);

  if (periods === null) return <main style={s.page}><p>Loading payroll…</p></main>;

  return (
    <main style={s.page} aria-labelledby="payroll-title">
      <header style={s.header}>
        <div>
          <p style={s.eyebrow}>Administration / Finance & payroll</p>
          <h1 id="payroll-title" style={s.title}>Payroll</h1>
          <p style={s.lede}>Governed payroll calculation review. Inspect authoritative inputs and calculated outputs, replay a calculation, review revision history, and request governed corrections. No money is moved here.</p>
        </div>
        <p role="status" style={s.syntheticBadge}>SYNTHETIC / TEST PAYROLL — a governed calculation only. No money moves; not statutory/tax compliant.</p>
      </header>

      {notice ? <p role="alert" style={notice.tone === "error" ? s.errorNote : s.infoNote}>{notice.text}</p> : null}

      <div style={s.columns}>
        {/* Periods */}
        <section aria-labelledby="periods-h" style={s.panel}>
          <h2 id="periods-h" style={s.h2}>Pay periods</h2>
          {periods.length === 0 ? <p style={s.muted}>No pay periods yet.</p> : (
            <ul style={s.list}>
              {periods.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => openPeriod(p.id)} aria-pressed={p.id === periodId} style={{ ...s.rowBtn, ...(p.id === periodId ? s.rowBtnActive : {}) }}>
                    <span>{day(p.periodStart)} – {day(p.periodEnd)}</span>
                    <span style={s.rowMeta}>{p.jurisdiction.country}/{p.jurisdiction.region} · {p.status} · {p.calculationCount ?? 0} calc</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Review queue */}
        <section aria-labelledby="queue-h" style={s.panel}>
          <h2 id="queue-h" style={s.h2}>Review queue</h2>
          {!periodId ? <p style={s.muted}>Select a pay period.</p> : calcs === null ? <p style={s.muted}>Loading…</p> : calcs.length === 0 ? <p style={s.muted}>No calculations in this period.</p> : (
            <ul style={s.list}>
              {calcs.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => openCalc(c.id)} aria-pressed={c.id === detail?.id} style={{ ...s.rowBtn, ...(c.id === detail?.id ? s.rowBtnActive : {}) }}>
                    <span>rev {c.revision} · {money(c.netPayMinor, c.currency)} net {statusChip(c.status)}{c.correctionType ? <span style={s.correctChip}>{c.correctionType === "post_lock_adjustment" ? "adjustment" : "correction"}</span> : null}</span>
                    <span style={s.rowMeta}>worker {c.workerIdentityId.slice(0, 8)} · {c.ruleProvider.key}@{c.ruleProvider.version}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Detail */}
      {detail ? (
        <section aria-labelledby="detail-h" style={s.detail}>
          <h2 id="detail-h" style={s.h2}>Calculation rev {detail.revision} <span style={s.mono}>({detail.id.slice(0, 8)})</span> {statusChip(detail.status)}</h2>

          <div style={s.detailCols}>
            <div>
              <h3 style={s.h3}>Authoritative input snapshots</h3>
              <dl style={s.dl}>
                <Row k="Worker" v={detail.workerIdentityId} />
                <Row k="Jurisdiction (worksite-derived)" v={`${detail.jurisdiction.country}/${detail.jurisdiction.region}`} />
                <Row k="Rule provider" v={`${detail.ruleProvider.key}@${detail.ruleProvider.version}`} />
                <Row k="Worker classification" v={detail.workerClassification ?? "employee"} />
                <Row k="Currency" v={detail.currency} />
              </dl>
              <table style={s.table}>
                <caption style={s.caption}>Approved worked-time + applied contract rate snapshots</caption>
                <thead><tr><th scope="col" style={s.th}>Timesheet</th><th scope="col" style={s.th}>Shift</th><th scope="col" style={s.th}>Minutes</th><th scope="col" style={s.th}>Contract</th><th scope="col" style={s.th}>Rate</th></tr></thead>
                <tbody>
                  {detail.workedTimeRefs.map((w) => (
                    <tr key={w.timesheetId}>
                      <td style={s.td}>{w.timesheetId.slice(0, 8)} v{w.timesheetVersion} <span style={s.muted}>({w.timesheetStatus})</span></td>
                      <td style={s.td}>{day(w.scheduledStartAt)} → {day(w.scheduledEndAt)}</td>
                      <td style={s.td}>{w.payableMinutes}</td>
                      <td style={s.td}>{w.contractVersion} <span style={s.muted}>eff {day(w.contractEffectiveFrom)}</span></td>
                      <td style={s.td}>{money(w.appliedHourlyRateMinor, w.currency)}/h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 style={s.h3}>Calculated outputs</h3>
              <LineTable title="Earnings" lines={detail.earningLines} currency={detail.currency} />
              <LineTable title="Deductions" lines={detail.deductionLines} currency={detail.currency} />
              <LineTable title="Employer costs" lines={detail.employerCostLines} currency={detail.currency} />
              <dl style={s.dl}>
                <Row k="Gross" v={money(detail.grossPayMinor, detail.currency)} />
                <Row k="Deductions" v={`− ${money(detail.totalDeductionsMinor, detail.currency)}`} />
                <Row k="Net" v={money(detail.netPayMinor, detail.currency)} strong />
                <Row k="Employer cost (separate)" v={money(detail.totalEmployerCostMinor, detail.currency)} />
                <Row k="Fingerprint" v={detail.calculationFingerprint.slice(0, 16) + "…"} mono />
                {detail.calculatedAt ? <Row k="Calculated at" v={day(detail.calculatedAt)} /> : null}
              </dl>
            </div>
          </div>

          {detail.correctionType === "post_lock_adjustment" && detail.adjustment ? (
            <div style={s.adjBox} role="note">
              <strong>Post-lock adjustment</strong> — links to locked original <span style={s.mono}>{detail.adjustsCalculationId?.slice(0, 8)}</span>.
              Net delta: <strong>{detail.adjustment.netDirection.toUpperCase()} {money(detail.adjustment.netDeltaMinor, detail.currency)}</strong>. Reason: {detail.correctionReason}.
              <span style={s.muted}> A calculation artifact only — no money has been paid.</span>
            </div>
          ) : null}

          {/* AI review — ADVISORY assistance only; never authoritative payroll state. */}
          <section aria-labelledby="ai-review-h" style={s.aiPanel} role="note">
            <div style={s.aiHead}>
              <h3 id="ai-review-h" style={s.h3}>{aiReviewHeading}</h3>
              <span style={s.aiBadge}>ADVISORY · not payroll state</span>
            </div>
            <p style={s.aiDisclaimer}>{aiReviewDisclaimer}</p>
            {aiReview === null ? (
              <p style={s.muted}>Loading advisory review…</p>
            ) : aiReview.status === "review_unavailable" ? (
              <p role="status" style={s.aiUnavailable}>{aiReviewUnavailableText}</p>
            ) : (
              <>
                <p style={s.aiSummary}>{aiReview.summary}</p>
                {aiReview.findings.length > 0 ? (
                  <ul style={s.aiList}>
                    {aiReview.findings.map((f, i) => (
                      <li key={i} style={s.aiFinding}>
                        <span style={{ ...s.aiSeverity, ...severityStyle(f.severity) }}>{f.severity}</span>
                        <span><strong>{f.title}</strong> <span style={s.muted}>({f.code})</span><br />{f.explanation}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p style={s.muted}>No advisory findings for this revision.</p>}
                <p style={s.aiMeta}>{aiReview.synthetic ? "Synthetic (offline) reviewer" : "Reviewer"} · {aiReview.versioning.model} · prompt {aiReview.versioning.promptVersion}</p>
              </>
            )}
          </section>

          {/* Actions */}
          <div style={s.actions}>
            <button type="button" disabled={busy} style={s.btn} onClick={() => act("Verify", `calculations/${detail.id}/verify`, {}, (d) => (d.ok ? "VERIFIED — recomputed from the stored snapshot + exact provider version; identical." : `MISMATCH — recomputed ${String(d.recomputedFingerprint).slice(0, 12)} ≠ stored.`))}>Verify / replay</button>
            {(detail.status === "calculated" || detail.status === "in_review") ? <button type="button" disabled={busy} style={s.btn} onClick={() => act("Approve", `calculations/${detail.id}/transition`, { action: "approve", expectedVersion: detail.version }, () => "Approved this exact revision.")}>Approve</button> : null}
            {detail.status === "approved" ? <button type="button" disabled={busy} style={s.btn} onClick={() => act("Lock", `calculations/${detail.id}/transition`, { action: "lock", expectedVersion: detail.version }, () => "Locked — this revision is now immutable history.")}>Lock</button> : null}
            {(detail.status === "calculated" || detail.status === "in_review") ? <button type="button" disabled={busy} style={s.btnGhost} onClick={() => act("Reject", `calculations/${detail.id}/transition`, { action: "reject", expectedVersion: detail.version }, () => "Rejected.")}>Reject</button> : null}
          </div>

          {/* Correction — recompute from authoritative inputs only; never accepts amounts */}
          <form style={s.correctForm} onSubmit={(e) => { e.preventDefault(); if (reason.trim()) void act("Correction", `calculations/${detail.id}/correct`, { expectedVersion: detail.version, reason }, (d) => d.outcome === "no_change" ? "No change — inputs identical, no new revision." : d.outcome === "duplicate" ? "Duplicate — already applied." : `Correction created (${(d.calculation as { correctionType?: string })?.correctionType ?? "revision"}).`); }}>
            <label htmlFor="correction-reason" style={s.label}>Request a governed correction (recomputes from authoritative inputs — correct the upstream contract/worked-time/jurisdiction first; amounts are never entered here)</label>
            <div style={s.correctRow}>
              <input id="correction-reason" style={s.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for correction" />
              <button type="submit" disabled={busy || !reason.trim()} style={s.btn}>Request correction</button>
            </div>
          </form>

          {/* Revision history */}
          {family && family.length > 0 ? (
            <div>
              <h3 style={s.h3}>Revision history (immutable)</h3>
              <ol style={s.history}>
                {family.map((r) => (
                  <li key={r.id} style={r.id === detail.id ? s.historyActive : s.historyItem}>
                    <button type="button" onClick={() => openCalc(r.id)} style={s.historyBtn}>
                      rev {r.revision} {statusChip(r.status)} {r.correctionType ? <span style={s.correctChip}>{r.correctionType}</span> : null}
                      <span style={s.rowMeta}> net {money(r.netPayMinor, r.currency)} · fp {r.calculationFingerprint.slice(0, 8)}{r.correctionReason ? ` · ${r.correctionReason}` : ""}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function Row({ k, v, strong, mono }: { k: string; v: string; strong?: boolean; mono?: boolean }) {
  return (<><dt style={s.dt}>{k}</dt><dd style={{ ...s.dd, ...(strong ? { fontWeight: 700 } : {}), ...(mono ? s.mono : {}) }}>{v}</dd></>);
}
function LineTable({ title, lines, currency }: { title: string; lines: Line[]; currency: string }) {
  if (!lines || lines.length === 0) return null;
  return (
    <table style={s.table}>
      <caption style={s.caption}>{title}</caption>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i}>
            <td style={s.td}>{l.description}{l.contractVersion ? <span style={s.muted}> · {l.contractVersion}</span> : null}{l.category ? <span style={s.muted}> · {l.category}</span> : null}</td>
            <td style={{ ...s.td, textAlign: "right" }}>{money(l.amountMinor, l.currency ?? currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function severityStyle(severity: string): CSSProperties {
  const tone = severity === "high" ? "#8a2f20" : severity === "medium" ? "#8a5340" : severity === "low" ? "#171511" : "#555";
  return { color: tone, borderColor: tone };
}
function statusChip(status: string) {
  const tone = status === "locked" ? "#1f6f43" : status === "approved" ? "#171511" : status === "superseded" || status === "rejected" ? "#8a5340" : "#555";
  return <span style={{ ...s.chip, color: tone, borderColor: tone }}>{status}</span>;
}

const s: Record<string, CSSProperties> = {
  page: { padding: "24px 32px", maxWidth: 1200, margin: "0 auto", color: "#1a1a1a" },
  header: { display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", alignItems: "flex-start" },
  eyebrow: { textTransform: "uppercase", letterSpacing: 1, fontSize: 12, color: "#666", margin: 0 },
  title: { fontSize: 28, margin: "4px 0" },
  lede: { color: "#444", maxWidth: 640, margin: 0 },
  syntheticBadge: { background: "#000000", border: "1px solid #d99a3d", color: "#7a4b12", padding: "8px 12px", borderRadius: 8, maxWidth: 320, fontSize: 13, fontWeight: 600 },
  infoNote: { background: "#e8f4ea", border: "1px solid #3f9b5c", color: "#1f6f43", padding: "8px 12px", borderRadius: 6, marginTop: 12 },
  errorNote: { background: "#fce8e6", border: "1px solid #c5533f", color: "#8a2f20", padding: "8px 12px", borderRadius: 6, marginTop: 12 },
  columns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 },
  panel: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 10, padding: 16, background: "#fff" },
  h2: { fontSize: 18, marginTop: 0 },
  h3: { fontSize: 15, margin: "16px 0 6px" },
  muted: { color: "#777", fontSize: 13 },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 },
  rowBtn: { width: "100%", textAlign: "left", background: "#000000", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 },
  rowBtnActive: { background: "#000000", borderColor: "rgba(201, 162, 75, 0.16)" },
  rowMeta: { fontSize: 12, color: "#777" },
  detail: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 10, padding: 20, background: "#fff", marginTop: 20 },
  detailCols: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  dl: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", margin: "8px 0" },
  dt: { color: "#666", fontSize: 13 },
  dd: { margin: 0, fontSize: 13 },
  table: { width: "100%", borderCollapse: "collapse", margin: "8px 0", fontSize: 13 },
  caption: { textAlign: "left", fontWeight: 600, fontSize: 13, padding: "4px 0" },
  th: { textAlign: "left", borderBottom: "1px solid #ddd", padding: "4px 6px", fontSize: 12, color: "#555" },
  td: { borderBottom: "1px solid rgba(201, 162, 75, 0.16)", padding: "4px 6px", verticalAlign: "top" },
  chip: { border: "1px solid", borderRadius: 999, padding: "1px 8px", fontSize: 11, marginLeft: 6 },
  correctChip: { background: "#f0e8fb", color: "#5a3a8a", borderRadius: 999, padding: "1px 8px", fontSize: 11, marginLeft: 6 },
  adjBox: { background: "#000000", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, padding: 12, margin: "12px 0", fontSize: 13 },
  actions: { display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" },
  btn: { background: "#171511", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 },
  btnGhost: { background: "#fff", color: "#8a5340", border: "1px solid #8a5340", borderRadius: 8, padding: "8px 14px", cursor: "pointer" },
  correctForm: { border: "1px dashed #bbb", borderRadius: 8, padding: 12, margin: "8px 0 16px" },
  label: { display: "block", fontSize: 13, color: "#444", marginBottom: 6 },
  correctRow: { display: "flex", gap: 8 },
  input: { flex: 1, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 8 },
  history: { paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 4 },
  historyItem: { fontSize: 13 },
  historyActive: { fontSize: 13, fontWeight: 700 },
  historyBtn: { background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#1a1a1a" },
  mono: { fontFamily: "ui-monospace, monospace" },
  // AI advisory panel — visually distinct (purple/note), clearly not an authoritative control.
  aiPanel: { background: "#faf7ff", border: "1px solid #b9a3e0", borderRadius: 8, padding: 14, margin: "16px 0" },
  aiHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  aiBadge: { background: "#efe6fb", color: "#5a3a8a", border: "1px solid #b9a3e0", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 },
  aiDisclaimer: { color: "#5a3a8a", fontSize: 12, margin: "4px 0 10px" },
  aiSummary: { fontSize: 14, margin: "6px 0" },
  aiList: { listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 8 },
  aiFinding: { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13 },
  aiSeverity: { border: "1px solid", borderRadius: 999, padding: "1px 8px", fontSize: 11, whiteSpace: "nowrap", height: "fit-content" },
  aiUnavailable: { background: "#f3f0f8", border: "1px solid #b9a3e0", color: "#5a3a8a", borderRadius: 6, padding: "8px 10px", fontSize: 13 },
  aiMeta: { color: "#888", fontSize: 11, marginTop: 10 }
};
