"use client";

import { useCallback, useEffect, useState } from "react";

type Shift = Readonly<{
  attendanceRecordId: string;
  assignmentId: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  exceptionCategory: string | null;
  version: number;
  employerName: string;
  areaLabel: string | null;
}>;
type State = { status: "loading" } | { status: "signed_out" } | { status: "error" } | { status: "ready"; items: readonly Shift[] };

const STATUS_COPY: Record<string, string> = {
  pending_start: "Scheduled",
  checked_in: "Checked in",
  checked_out: "Checked out",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
  exception: "Needs attention"
};

export function MySchedule() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/attendance?limit=25", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) return setState({ status: r.status === 401 ? "signed_out" : "error" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { items: Shift[] };
      setState({ status: "ready", items: payload.items });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = useCallback(async (shift: Shift, action: "check-in" | "check-out") => {
    setBusy(shift.attendanceRecordId);
    setNotice(null);
    try {
      const r = await fetch(`/api/attendance/${encodeURIComponent(shift.attendanceRecordId)}/${action}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: shift.version })
      });
      if (!r.ok) {
        setNotice(r.status === 409 ? "This shift changed — refresh and try again." : "That couldn't be completed. Check you're within the shift window.");
        return;
      }
      setNotice(action === "check-in" ? "Checked in — the time is recorded by JobLop." : "Checked out.");
      await load();
    } finally {
      setBusy(null);
    }
  }, [load]);

  if (state.status === "loading") return <div className="state">Loading…</div>;
  if (state.status === "signed_out") return <div className="state">Please sign in to see your schedule.<div style={{ marginTop: 12 }}><a className="btn" href="/">Go to search</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">We couldn&apos;t load your schedule.</div>;

  const now = Date.now();
  const upcoming = state.items.filter((s) => new Date(s.scheduledEndAt).getTime() >= now);
  const past = state.items.filter((s) => new Date(s.scheduledEndAt).getTime() < now);

  return (
    <>
      <section className="hero">
        <h1>My schedule</h1>
        <p>Your assigned shifts. Check in and out — JobLop records the authoritative time.</p>
      </section>
      {notice ? <p className="notice" style={{ color: "var(--accent)" }}>{notice}</p> : null}

      {state.items.length === 0 ? (
        <div className="state">No assigned shifts yet. Shifts appear here once you&apos;re assigned.</div>
      ) : (
        <>
          {upcoming.length > 0 ? <div className="role" style={{ marginBottom: 6 }}>Upcoming & active</div> : null}
          <div className="results" style={{ marginBottom: 24 }}>
            {upcoming.map((s) => <ShiftCard key={s.attendanceRecordId} s={s} busy={busy === s.attendanceRecordId} onAct={act} />)}
          </div>
          {past.length > 0 ? (
            <>
              <div className="role" style={{ marginBottom: 6 }}>History</div>
              <div className="results" style={{ paddingBottom: 48 }}>
                {past.map((s) => <ShiftCard key={s.attendanceRecordId} s={s} busy={false} onAct={act} history />)}
              </div>
            </>
          ) : null}
        </>
      )}
      <p className="notice">Only your own shifts appear here. Your check-in/out times are set by JobLop&apos;s server, not your device.</p>
    </>
  );
}

function ShiftCard({ s, busy, onAct, history }: { s: Shift; busy: boolean; onAct: (s: Shift, a: "check-in" | "check-out") => void; history?: boolean }) {
  const canCheckIn = s.status === "pending_start";
  const canCheckOut = s.status === "checked_in";
  return (
    <article className="card">
      <div className="role">{s.employerName}</div>
      <div className="chips">
        <span className={`chip status-${badgeClass(s.status)}`}>{STATUS_COPY[s.status] ?? s.status}</span>
        {s.areaLabel ? <span className="chip">{s.areaLabel}</span> : null}
        {s.exceptionCategory ? <span className="chip status-rejected">{s.exceptionCategory.replaceAll("_", " ")}</span> : null}
      </div>
      <div className="when">{formatShift(s.scheduledStartAt, s.scheduledEndAt, s.timezone)}</div>
      {s.checkInAt ? <div className="when">In: {new Date(s.checkInAt).toLocaleTimeString()}{s.checkOutAt ? ` · Out: ${new Date(s.checkOutAt).toLocaleTimeString()}` : ""}</div> : null}
      {!history && (canCheckIn || canCheckOut) ? (
        <button className="btn" type="button" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => onAct(s, canCheckIn ? "check-in" : "check-out")}>
          {busy ? "…" : canCheckIn ? "Check in" : "Check out"}
        </button>
      ) : null}
    </article>
  );
}

function badgeClass(status: string): string {
  if (status === "checked_in" || status === "completed" || status === "checked_out") return "verified";
  if (status === "pending_start") return "pending";
  if (status === "missed" || status === "exception" || status === "cancelled") return "rejected";
  return "unverified";
}
function formatShift(startAt: string, endAt: string, tz: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz };
  const start = new Date(startAt).toLocaleString(undefined, opts);
  const end = new Date(endAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz });
  return `${start} – ${end} (${tz})`;
}
