"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type StageState = "done" | "current" | "pending";
type Stage = { n: number; name: string; state: StageState };
type Ledger = {
  currency: string; billableHours: number; workers: number;
  employerRateMinor: number; workerRateMinor: number; platformRateMinor: number;
  labourMinor: number; surchargeMinor: number; gstMinor: number; qstMinor: number; invoiceMinor: number;
  workerNetEachMinor: number; workersNetMinor: number; remittancesMinor: number;
  cardFeeMinor: number; platformNetMinor: number; balanceMinor: number;
};
type Check = { label: string; state: "pass" | "pending" | "hold" };
type History = {
  job: { id: string; number: string; title: string; status: string; startAt: string | null; endAt: string | null; workers: number | null; hours: number | null };
  stages: Stage[]; ledger: Ledger | null; checks: Check[];
};

const money = (m: number | null | undefined) =>
  m == null ? "—" : `$${(m / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const C = {
  bg: "#000000", panel: "#0c0c0c", panel2: "#141210", line: "#2a2114", fg: "#fbf9f4",
  muted: "#b3a894", faint: "#6b6356", accent: "#c9a24b", cmd: "#f2b949", pass: "#36c48e", hold: "#f2b949"
};
const mono = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

const STAGE_NOTE: Record<string, string> = {
  Post: "Employer posts the shift; role, headcount and window set.",
  Dispatch: "Admin reviews and locks the pricing snapshot before anything routes.",
  Offer: "Offers extended to workers against the locked snapshot; no worker fee.",
  Accept: "Workers accept; crew assigned.",
  Attendance: "Clock-in / clock-out recorded (6-hour minimum applies).",
  Timesheet: "Hours reviewed and approved for payroll.",
  Payroll: "Governed payroll computed per worker (gross → deductions → net).",
  Invoice: "Employer invoiced for verified hours plus surcharge and tax.",
  Payment: "Employer payment captured and held.",
  Close: "Workers paid, remittances and fee settled, transaction closed."
};

type Overview = {
  jobCode: string;
  client: { name: string };
  acceptedWorkers: string[];
  requestedWorkerCount: number;
  lifecycle: "pending" | "accepted" | "processing" | "finished" | "disputed" | "cancelled";
};
const LIFECYCLE_COLOR: Record<Overview["lifecycle"], string> = {
  pending: "#6b6356", accepted: "#171511", processing: "#f2b949", finished: "#36c48e", disputed: "#f2766b", cancelled: "#6b6356"
};

export function ControlRoom({ jobRequestId }: Readonly<{ jobRequestId: string }>) {
  const [data, setData] = useState<History | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/control-room/${encodeURIComponent(jobRequestId)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 401 ? "Sign in as an administrator to view this transaction." : "This transaction could not be loaded.");
        return (await res.json()) as History;
      })
      .then((h) => { if (live) setData(h); })
      .catch((e) => { if (live) setErr(String(e.message ?? e)); });
    // Order linkage: client name + accepted worker(s) + lifecycle. Additive; failure is non-fatal.
    fetch(`/api/control-room/${encodeURIComponent(jobRequestId)}/overview`, { cache: "no-store" })
      .then(async (res) => (res.ok ? ((await res.json()) as { order: Overview }).order : null))
      .then((o) => { if (live && o) setOverview(o); })
      .catch(() => {});
    return () => { live = false; };
  }, [jobRequestId]);

  if (err) return <Shell><div style={{ color: C.muted, padding: 24 }}>{err}</div></Shell>;
  if (!data) return <Shell><div style={{ color: C.muted, padding: 24 }}>Loading transaction…</div></Shell>;

  const L = data.ledger;
  const closed = !!L && L.balanceMinor === 0 && data.job.status === "archived";
  const allDone = data.stages.every((s) => s.state === "done");

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ fontFamily: mono, fontSize: 12, color: C.accent, background: "#171511", border: `1px solid ${C.line}`, padding: "5px 10px", borderRadius: 999 }}>{data.job.number}</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{data.job.title}</div>
        <div style={{ marginLeft: "auto", fontFamily: mono, fontSize: 12, color: C.muted }}>
          status: <span style={{ color: C.fg }}>{data.job.status}</span>
          {data.job.workers != null && <> · {data.job.workers} worker{data.job.workers === 1 ? "" : "s"}</>}
          {data.job.hours != null && <> · {data.job.hours}h</>}
        </div>
        {overview ? (
          <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 12, letterSpacing: .8, padding: "7px 13px", borderRadius: 999,
            background: LIFECYCLE_COLOR[overview.lifecycle], color: "#06110a", border: `1px solid ${C.line}` }}>
            {overview.lifecycle.toUpperCase()}
          </div>
        ) : (
          <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 12, letterSpacing: .8, padding: "7px 13px", borderRadius: 999,
            background: (closed || allDone) ? C.pass : C.panel, color: (closed || allDone) ? "#06241a" : C.muted, border: `1px solid ${C.line}` }}>
            {closed || allDone ? "CLOSED ✓" : "IN PROGRESS"}
          </div>
        )}
      </div>

      {overview ? (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 14, padding: "10px 14px", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 10 }}>
          <div><span style={{ color: C.muted, fontSize: 11 }}>CLIENT</span><div style={{ color: C.fg, fontWeight: 600 }}>{overview.client.name}</div></div>
          <div><span style={{ color: C.muted, fontSize: 11 }}>ACCEPTED WORKER{overview.acceptedWorkers.length === 1 ? "" : "S"}</span>
            <div style={{ color: C.fg, fontWeight: 600 }}>{overview.acceptedWorkers.length ? overview.acceptedWorkers.join(", ") : `— (0 / ${overview.requestedWorkerCount})`}</div></div>
          <div><span style={{ color: C.muted, fontSize: 11 }}>JOB CODE</span><div style={{ color: C.fg, fontWeight: 600, fontFamily: mono }}>{overview.jobCode}</div></div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, alignItems: "start" }} className="cr-grid">
        {/* lifecycle timeline */}
        <div style={card()}>
          <h3 style={h3()}>Lifecycle — what happened</h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.stages.map((s) => {
              const col = s.state === "done" ? C.pass : s.state === "current" ? C.accent : C.line;
              const txt = s.state === "pending" ? C.faint : C.fg;
              return (
                <div key={s.n} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: `1px dashed ${C.line}` }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center",
                      background: s.state === "done" ? C.pass : "transparent", border: `1px solid ${col}`,
                      color: s.state === "done" ? "#06241a" : col, fontFamily: mono, fontSize: 11, fontWeight: 700 }}>
                      {s.state === "done" ? "✓" : s.n}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: txt, fontSize: 14 }}>
                      {s.name}
                      {s.state === "current" && <span style={{ marginLeft: 8, fontSize: 11, color: C.accent, fontWeight: 700 }}>● CURRENT</span>}
                    </div>
                    <div style={{ color: s.state === "pending" ? C.faint : C.muted, fontSize: 12.5, marginTop: 2 }}>{STAGE_NOTE[s.name]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ledger + checks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={card()}>
            <h3 style={h3()}>Settlement ledger</h3>
            {!L ? (
              <div style={{ color: C.faint, fontSize: 12.5 }}>Figures appear once the request is priced (an active contract rate for the role).</div>
            ) : (
              <>
                <Row label="Employer rate" val={`${money(L.employerRateMinor)}/hr`} />
                <Row label="Worker rate" val={`${money(L.workerRateMinor)}/hr`} />
                <Row label="Platform margin" val={`${money(L.platformRateMinor)}/hr`} />
                <div style={{ height: 8 }} />
                <Row label="Employer invoice" val={money(L.invoiceMinor)} color={C.accent} />
                <Row label={`Workers (net × ${L.workers})`} val={`−${money(L.workersNetMinor)}`} />
                <Row label="Payroll remittances" val={`−${money(L.remittancesMinor)}`} />
                <Row label="Govt GST + QST" val={`−${money(L.gstMinor + L.qstMinor)}`} />
                <Row label="Card fee" val={`−${money(L.cardFeeMinor)}`} />
                <Row label="Platform net margin" val={`−${money(L.platformNetMinor)}`} />
                <div style={{ marginTop: 10, padding: "11px 12px", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: L.balanceMinor === 0 ? "rgba(54,196,142,.13)" : C.panel2, border: `1px solid ${L.balanceMinor === 0 ? "rgba(54,196,142,.4)" : C.line}` }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>BALANCE</span>
                  <span style={{ fontFamily: mono, fontSize: 19, color: L.balanceMinor === 0 ? C.pass : C.fg }}>{money(L.balanceMinor)}</span>
                </div>
              </>
            )}
          </div>

          <div style={card()}>
            <h3 style={h3()}>Governance checks</h3>
            {data.checks.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", fontSize: 12.5 }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, display: "grid", placeItems: "center", fontSize: 10, flex: "none",
                  background: c.state === "pass" ? C.pass : "transparent", border: `1px solid ${c.state === "pass" ? "transparent" : C.line}`,
                  color: c.state === "pass" ? "#06241a" : C.faint }}>{c.state === "pass" ? "✓" : "·"}</span>
                <span style={{ color: c.state === "pass" ? C.fg : C.muted }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ color: C.faint, fontSize: 11, marginTop: 14 }}>
        Read-only audit view. Lifecycle reflects the transaction's current status; settlement figures use the platform pricing engine (20% margin, 6-hour minimum). Tax &amp; payroll deductions illustrative.
      </div>
    </Shell>
  );
}

function Row({ label, val, color }: Readonly<{ label: string; val: string; color?: string }>) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderBottom: `1px dashed ${C.line}`, fontSize: 13 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ fontFamily: mono, fontVariantNumeric: "tabular-nums", color: color ?? C.fg }}>{val}</span>
    </div>
  );
}
function card(): CSSProperties { return { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px" }; }
function h3(): CSSProperties { return { margin: "0 0 10px", fontSize: 12, letterSpacing: 1, color: C.muted, textTransform: "uppercase", fontWeight: 700 }; }

function Shell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main style={{ background: C.bg, color: C.fg, minHeight: "100vh", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>{`.cr-grid{} @media (max-width:820px){.cr-grid{grid-template-columns:1fr !important}}`}</style>
      <div style={{ maxWidth: 1060, margin: "0 auto", paddingBlock: 22, paddingInline: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#c9a24b,#141210)", display: "grid", placeItems: "center", color: "#000000", fontWeight: 700 }}>JL</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: .3 }}>Transaction Control Room</div>
            <div style={{ color: C.muted, fontSize: 12 }}>Open any transaction to see its full lifecycle and settlement</div>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
