"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

type Ready = Readonly<{
  attendanceRecordId: string;
  status: string;
  employerName: string;
  workerName: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
}>;
type Sheet = Readonly<{
  id: string;
  status: string;
  version: number;
  employerName: string;
  workerName: string | null;
  scheduledStartAt: string;
  payableMinutes: number | null;
  exceptionSummary: string | null;
}>;
type Queue = Readonly<{ ready: readonly Ready[]; timesheets: readonly Sheet[] }>;

const WAITING: Record<string, string> = {
  draft: "Not calculated yet",
  worker_review: "Waiting for the worker to confirm",
  employer_review: "Waiting for the employer to confirm",
  locked: "Locked. Ready for payroll",
  rejected: "Rejected",
  cancelled: "Cancelled"
};

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");
const hours = (minutes: number | null) =>
  minutes === null ? "—" : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

export function TimesheetsConsole() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const r = await fetch("/api/timesheets/queue", { cache: "no-store" });
    if (!r.ok) { setDenied(r.status === 401 || r.status === 403); setQueue({ ready: [], timesheets: [] }); return; }
    setQueue((await r.json()) as Queue);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const post = useCallback(async (path: string, body: unknown, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/timesheets/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      setNotice(r.ok ? done : r.status === 409 ? "This timesheet changed. It has been refreshed, so please review it again." : "That action could not be completed.");
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (!queue) return <main style={s.page}><p>Loading timesheets…</p></main>;
  if (denied) return <main style={s.page}><p>Timesheet authority is required to view this page.</p></main>;

  return (
    <main style={s.page}>
      <h1 style={s.h1}>Timesheets</h1>
      <p style={s.muted}>Take each finished shift through review to a locked timesheet, ready for payroll.</p>
      {notice ? <p role="status" style={s.notice}>{notice}</p> : null}

      <section aria-labelledby="ready-h" style={s.panel}>
        <h2 id="ready-h" style={s.h2}>Finished shifts ({queue.ready.length})</h2>
        {queue.ready.length === 0 ? <p style={s.muted}>No shifts are waiting for a timesheet.</p> : queue.ready.map((r) => (
          <article key={r.attendanceRecordId} style={s.row}>
            <div>
              <strong>{r.workerName ?? "Unnamed worker"}</strong> · {r.employerName}
              <div style={s.muted}>In {when(r.checkInAt)} · Out {when(r.checkOutAt)}</div>
            </div>
            <button type="button" disabled={busy} style={s.btn} onClick={() => void post("prepare", { attendanceRecordId: r.attendanceRecordId }, "Timesheet prepared.")}>Prepare timesheet</button>
          </article>
        ))}
      </section>

      <section aria-labelledby="sheets-h" style={s.panel}>
        <h2 id="sheets-h" style={s.h2}>Timesheets ({queue.timesheets.length})</h2>
        {queue.timesheets.length === 0 ? <p style={s.muted}>No timesheets yet.</p> : queue.timesheets.map((t) => (
          <article key={t.id} style={s.row}>
            <div style={{ flex: "1 1 260px" }}>
              <strong>{t.workerName ?? "Unnamed worker"}</strong> · {t.employerName}
              <div style={s.muted}>{when(t.scheduledStartAt)} · Payable {hours(t.payableMinutes)}</div>
              {t.exceptionSummary ? <div style={s.warn}>Needs a look: {t.exceptionSummary.replaceAll("_", " ")}</div> : null}
              <div style={s.muted}>{WAITING[t.status] ?? t.status.replaceAll("_", " ")}</div>
            </div>
            {t.status === "review_required" ? (
              <div style={s.actions}>
                <input aria-label="Reason for accepting" placeholder="Reason for accepting" style={s.input} value={reasons[t.id] ?? ""} onChange={(e) => setReasons((v) => ({ ...v, [t.id]: e.target.value }))} />
                <button type="button" disabled={busy || !reasons[t.id]?.trim()} style={s.btn} onClick={() => void post(`${t.id}/override-exceptions`, { expectedVersion: t.version, reason: reasons[t.id] }, "Sent to the worker to confirm.")}>Accept and send to worker</button>
              </div>
            ) : null}
            {t.status === "platform_review" ? <button type="button" disabled={busy} style={s.btn} onClick={() => void post(`${t.id}/approve`, { expectedVersion: t.version }, "Timesheet approved.")}>Approve</button> : null}
            {t.status === "approved" ? <button type="button" disabled={busy} style={s.btn} onClick={() => void post(`${t.id}/lock`, { expectedVersion: t.version }, "Timesheet locked. Ready for payroll.")}>Lock for payroll</button> : null}
          </article>
        ))}
      </section>
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  page: { color: "#f4efe4", margin: "0 auto", maxWidth: 980, padding: "32px 20px" },
  h1: { fontSize: 32, margin: "0 0 8px" },
  h2: { fontSize: 18, margin: "0 0 12px" },
  panel: { background: "#0c0c0c", border: "1px solid rgba(201,162,75,.3)", borderRadius: 12, marginTop: 20, padding: 18 },
  row: { alignItems: "center", borderTop: "1px solid rgba(201,162,75,.16)", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", padding: "12px 0" },
  muted: { color: "#c9c2b4", fontSize: 14, margin: "4px 0 0" },
  warn: { color: "#f0d089", fontSize: 14, marginTop: 4 },
  notice: { color: "#f0d089", fontWeight: 700 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  input: { background: "#000", border: "1px solid #444", borderRadius: 8, color: "#f4efe4", minHeight: 40, padding: "0 10px" },
  btn: { background: "#c9a24b", border: 0, borderRadius: 8, color: "#000", cursor: "pointer", fontWeight: 800, minHeight: 40, padding: "0 14px" }
};
