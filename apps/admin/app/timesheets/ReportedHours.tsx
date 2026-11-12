"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

// "Reported hours": a worker worked a shift but never checked in, and reported the arrival and
// departure times. Staff check them (and edit them if needed), then approve, which writes the times
// onto the attendance record and prepares the timesheet the normal way (15-minute margin, capped at
// the scheduled start/end, 6-hour minimum), or reject with a reason the worker is told. No rates here.
// Calls go through the scoped /api/attendance proxy to /platform/attendance/hours-reports.

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

type Draft = { arrival: string; departure: string; rejectReason: string };

const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto" });

/** The body to approve with: only the times staff changed (the API keeps the worker's otherwise). */
export function approveBody(report: Pick<HoursReport, "reportedArrival" | "reportedDeparture">, draft: Pick<Draft, "arrival" | "departure">) {
  const body: { arrivalTime?: string; departureTime?: string } = {};
  if (draft.arrival && draft.arrival !== report.reportedArrival) body.arrivalTime = draft.arrival;
  if (draft.departure && draft.departure !== report.reportedDeparture) body.departureTime = draft.departure;
  return body;
}

export function ReportedHours({ onDecided }: { onDecided: () => void }) {
  const [reports, setReports] = useState<readonly HoursReport[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/attendance/hours-reports?status=pending", { cache: "no-store" });
    if (!r.ok) { setReports([]); return; }
    const body = (await r.json()) as { reports?: HoursReport[] };
    setReports(body.reports ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const draftFor = (report: HoursReport): Draft =>
    drafts[report.id] ?? { arrival: report.reportedArrival, departure: report.reportedDeparture, rejectReason: "" };
  const setDraft = (report: HoursReport, patch: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [report.id]: { ...draftFor(report), ...patch } }));

  const decide = useCallback(async (report: HoursReport, action: "approve" | "reject", body: unknown) => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/attendance/hours-reports/${encodeURIComponent(report.id)}/${action}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      });
      setNotice(
        r.ok
          ? action === "approve" ? "Hours approved. The timesheet is prepared and goes to the worker to confirm." : "Report rejected. The worker has been told."
          : r.status === 409 ? "This report or shift changed (already decided, or the shift was cancelled). The list has been refreshed."
            : "That could not be done. Check the times: departure after arrival, on the shift day, not in the future."
      );
      await load();
      onDecided();
    } finally {
      setBusy(false);
    }
  }, [load, onDecided]);

  if (reports === null || reports.length === 0) {
    return (
      <section aria-labelledby="reported-h" style={s.panel}>
        <h2 id="reported-h" style={s.h2}>Reported hours (0)</h2>
        <p style={s.muted}>{reports === null ? "Loading…" : "No worker is waiting for reported hours to be approved."}</p>
        {notice ? <p role="status" style={s.notice}>{notice}</p> : null}
      </section>
    );
  }

  return (
    <section aria-labelledby="reported-h" style={s.panel}>
      <h2 id="reported-h" style={s.h2}>Reported hours ({reports.length})</h2>
      <p style={s.muted}>Shifts worked with no check-in. Check the times with the employer if needed, edit them, then approve or reject.</p>
      {notice ? <p role="status" style={s.notice}>{notice}</p> : null}
      {reports.map((report) => {
        const draft = draftFor(report);
        return (
          <article key={report.id} style={s.row}>
            <div style={{ flex: "1 1 320px" }}>
              <strong>{report.workerName ?? "Unnamed worker"}</strong> · {report.employerName} · {report.jobRequestNumber}
              <div style={s.muted}>{report.title} · {report.shiftDay} · scheduled {report.scheduledArrival}–{report.scheduledDeparture} (Eastern time)</div>
              <div>Reported: <strong>{report.reportedArrival}–{report.reportedDeparture}</strong></div>
              <div style={s.muted}>Worker's reason: {report.reason}</div>
              <div style={s.muted}>Sent {when(report.submittedAt)}</div>
            </div>
            <div style={s.actions}>
              <label style={s.label}>Arrival
                <input type="time" aria-label="Arrival time" style={s.input} value={draft.arrival} onChange={(e) => setDraft(report, { arrival: e.target.value })} />
              </label>
              <label style={s.label}>Departure
                <input type="time" aria-label="Departure time" style={s.input} value={draft.departure} onChange={(e) => setDraft(report, { departure: e.target.value })} />
              </label>
              <button type="button" disabled={busy || !draft.arrival || !draft.departure} style={s.btn} onClick={() => void decide(report, "approve", approveBody(report, draft))}>
                Approve hours
              </button>
            </div>
            <div style={s.actions}>
              <input aria-label="Reason for rejecting (the worker sees this)" placeholder="Reason for rejecting (the worker sees this)" style={{ ...s.input, minWidth: 260 }} value={draft.rejectReason} onChange={(e) => setDraft(report, { rejectReason: e.target.value })} />
              <button type="button" disabled={busy || draft.rejectReason.trim().length < 3} style={s.ghost} onClick={() => void decide(report, "reject", { reason: draft.rejectReason.trim() })}>
                Reject
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

const s: Record<string, CSSProperties> = {
  h2: { fontSize: 18, margin: "0 0 12px" },
  panel: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8,.3)", borderRadius: 12, marginTop: 20, padding: 18 },
  row: { alignItems: "center", borderTop: "1px solid rgba(248, 184, 8,.16)", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", padding: "12px 0" },
  muted: { color: "#c9c2b4", fontSize: 14, margin: "4px 0 0" },
  notice: { color: "#f0d089", fontWeight: 700 },
  actions: { alignItems: "flex-end", display: "flex", flexWrap: "wrap", gap: 8 },
  label: { color: "#c9c2b4", display: "grid", fontSize: 13, gap: 4 },
  input: { background: "#000", border: "1px solid #444", borderRadius: 8, color: "#f4efe4", minHeight: 40, padding: "0 10px" },
  btn: { background: "#f8b808", border: 0, borderRadius: 8, color: "#000", cursor: "pointer", fontWeight: 800, minHeight: 40, padding: "0 14px" },
  ghost: { background: "transparent", border: "1px solid #f8b808", borderRadius: 8, color: "#f8b808", cursor: "pointer", fontWeight: 800, minHeight: 40, padding: "0 14px" }
};
