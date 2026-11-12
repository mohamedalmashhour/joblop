"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { usePageText } from "../i18n/pageText";
import { fill, reportedHoursText } from "./reportedHoursText";

// "Reported hours": a worker worked a shift but never checked in, and reported the arrival and
// departure times within 12 hours of the end. Staff check them (and edit them if needed), then
// approve, which writes the times onto the attendance record and prepares the timesheet the normal
// way (15-minute margin, capped at the scheduled start/end, 6-hour minimum), or reject with a reason
// the worker is told. "Enter hours for a shift" is the staff override for a no-check-in shift with no
// report (e.g. after the 12-hour window): a required reason, audited, the same approve path.
// No rates here. Calls go through the scoped /api/attendance proxy to /platform/attendance/hours-reports.

export type HoursReport = Readonly<{
  id: string;
  status: string;
  jobRequestNumber: string;
  title: string;
  employerName: string;
  workerName: string | null;
  shiftDay: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  reportedArrival: string;
  reportedDeparture: string;
  reason: string;
  submittedAt: string;
}>;

export type NoCheckInShift = Readonly<{
  attendanceRecordId: string;
  jobRequestNumber: string;
  title: string;
  employerName: string;
  workerName: string | null;
  shiftDay: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  reportDeadline: string;
  workerWindowOpen: boolean;
}>;

type Draft = { arrival: string; departure: string; reason: string };

const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" });

/** The body to approve with: only the times staff changed (the API keeps the worker's otherwise). */
export function approveBody(report: Pick<HoursReport, "reportedArrival" | "reportedDeparture">, draft: Pick<Draft, "arrival" | "departure">) {
  const body: { arrivalTime?: string; departureTime?: string } = {};
  if (draft.arrival && draft.arrival !== report.reportedArrival) body.arrivalTime = draft.arrival;
  if (draft.departure && draft.departure !== report.reportedDeparture) body.departureTime = draft.departure;
  return body;
}

export function ReportedHours({ onDecided }: { onDecided: () => void }) {
  const text = usePageText(reportedHoursText);
  const [reports, setReports] = useState<readonly HoursReport[] | null>(null);
  const [shifts, setShifts] = useState<readonly NoCheckInShift[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, n] = await Promise.all([
      fetch("/api/attendance/hours-reports?status=pending", { cache: "no-store" }),
      fetch("/api/attendance/hours-reports/no-check-in", { cache: "no-store" })
    ]);
    setReports(r.ok ? (((await r.json()) as { reports?: HoursReport[] }).reports ?? []) : []);
    setShifts(n.ok ? (((await n.json()) as { shifts?: NoCheckInShift[] }).shifts ?? []) : []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const draftOf = (id: string, arrival: string, departure: string): Draft => drafts[id] ?? { arrival, departure, reason: "" };
  const setDraft = (id: string, base: Draft, patch: Partial<Draft>) => setDrafts((current) => ({ ...current, [id]: { ...base, ...patch } }));

  const send = useCallback(async (path: string, body: unknown, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/attendance/hours-reports/${path}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      });
      setNotice(r.ok ? done : r.status === 409 ? text.changed : text.failed);
      await load();
      onDecided();
    } finally {
      setBusy(false);
    }
  }, [load, onDecided, text]);

  const list = reports ?? [];
  return (
    <>
      <section aria-labelledby="reported-h" style={s.panel}>
        <h2 id="reported-h" style={s.h2}>{fill(text.title, { count: list.length })}</h2>
        <p style={s.muted}>{reports === null ? text.loading : list.length === 0 ? text.empty : text.lede}</p>
        {notice ? <p role="status" style={s.notice}>{notice}</p> : null}
        {list.map((report) => {
          const draft = draftOf(report.id, report.reportedArrival, report.reportedDeparture);
          return (
            <article key={report.id} style={s.row}>
              <div style={{ flex: "1 1 320px" }}>
                <strong>{report.workerName ?? text.unnamedWorker}</strong> · {report.employerName} · {report.jobRequestNumber}
                <div style={s.muted}>{report.title} · {report.shiftDay} · {fill(text.scheduled, { from: report.scheduledArrival, to: report.scheduledDeparture })}</div>
                <div>{text.reported} <strong>{report.reportedArrival}–{report.reportedDeparture}</strong></div>
                <div style={s.muted}>{text.workerReason} {report.reason}</div>
                <div style={s.muted}>{fill(text.sent, { when: when(report.submittedAt) })}</div>
              </div>
              <div style={s.actions}>
                <label style={s.label}>{text.arrival}
                  <input type="time" style={s.input} value={draft.arrival} onChange={(e) => setDraft(report.id, draft, { arrival: e.target.value })} />
                </label>
                <label style={s.label}>{text.departure}
                  <input type="time" style={s.input} value={draft.departure} onChange={(e) => setDraft(report.id, draft, { departure: e.target.value })} />
                </label>
                <button type="button" disabled={busy || !draft.arrival || !draft.departure} style={s.btn} onClick={() => void send(`${encodeURIComponent(report.id)}/approve`, approveBody(report, draft), text.approved)}>
                  {text.approve}
                </button>
              </div>
              <div style={s.actions}>
                <input aria-label={text.rejectPlaceholder} placeholder={text.rejectPlaceholder} style={{ ...s.input, minWidth: 260 }} value={draft.reason} onChange={(e) => setDraft(report.id, draft, { reason: e.target.value })} />
                <button type="button" disabled={busy || draft.reason.trim().length < 3} style={s.ghost} onClick={() => void send(`${encodeURIComponent(report.id)}/reject`, { reason: draft.reason.trim() }, text.rejected)}>
                  {text.reject}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section aria-labelledby="enter-h" style={s.panel}>
        <h2 id="enter-h" style={s.h2}>{fill(text.overrideTitle, { count: shifts.length })}</h2>
        <p style={s.muted}>{shifts.length === 0 ? text.overrideEmpty : text.overrideLede}</p>
        {shifts.map((shift) => {
          const draft = draftOf(`entry:${shift.attendanceRecordId}`, shift.scheduledArrival, shift.scheduledDeparture);
          const key = `entry:${shift.attendanceRecordId}`;
          return (
            <article key={key} style={s.row}>
              <div style={{ flex: "1 1 320px" }}>
                <strong>{shift.workerName ?? text.unnamedWorker}</strong> · {shift.employerName} · {shift.jobRequestNumber}
                <div style={s.muted}>{shift.title} · {shift.shiftDay} · {fill(text.scheduled, { from: shift.scheduledArrival, to: shift.scheduledDeparture })}</div>
                <div style={shift.workerWindowOpen ? s.muted : s.warn}>{fill(shift.workerWindowOpen ? text.windowOpen : text.windowClosed, { when: when(shift.reportDeadline) })}</div>
              </div>
              <div style={s.actions}>
                <label style={s.label}>{text.arrival}
                  <input type="time" style={s.input} value={draft.arrival} onChange={(e) => setDraft(key, draft, { arrival: e.target.value })} />
                </label>
                <label style={s.label}>{text.departure}
                  <input type="time" style={s.input} value={draft.departure} onChange={(e) => setDraft(key, draft, { departure: e.target.value })} />
                </label>
                <input aria-label={text.overrideReasonPlaceholder} placeholder={text.overrideReasonPlaceholder} style={{ ...s.input, minWidth: 260 }} value={draft.reason} onChange={(e) => setDraft(key, draft, { reason: e.target.value })} />
                <button
                  type="button"
                  disabled={busy || !draft.arrival || !draft.departure || draft.reason.trim().length < 3}
                  style={s.btn}
                  onClick={() => void send("staff-entry", { attendanceRecordId: shift.attendanceRecordId, arrivalTime: draft.arrival, departureTime: draft.departure, reason: draft.reason.trim() }, text.overrideDone)}
                >
                  {text.overrideSubmit}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

const s: Record<string, CSSProperties> = {
  h2: { fontSize: 18, margin: "0 0 12px" },
  panel: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8,.3)", borderRadius: 12, marginTop: 20, padding: 18 },
  row: { alignItems: "center", borderTop: "1px solid rgba(248, 184, 8,.16)", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", padding: "12px 0" },
  muted: { color: "#c9c2b4", fontSize: 14, margin: "4px 0 0" },
  warn: { color: "#f0d089", fontSize: 14, margin: "4px 0 0" },
  notice: { color: "#f0d089", fontWeight: 700 },
  actions: { alignItems: "flex-end", display: "flex", flexWrap: "wrap", gap: 8 },
  label: { color: "#c9c2b4", display: "grid", fontSize: 13, gap: 4 },
  input: { background: "#000", border: "1px solid #444", borderRadius: 8, color: "#f4efe4", minHeight: 40, padding: "0 10px" },
  btn: { background: "#f8b808", border: 0, borderRadius: 8, color: "#000", cursor: "pointer", fontWeight: 800, minHeight: 40, padding: "0 14px" },
  ghost: { background: "transparent", border: "1px solid #f8b808", borderRadius: 8, color: "#f8b808", cursor: "pointer", fontWeight: 800, minHeight: 40, padding: "0 14px" }
};
