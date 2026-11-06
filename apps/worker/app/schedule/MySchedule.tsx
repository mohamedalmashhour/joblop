"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT, fmtLocale } from "../i18n/LocaleProvider";
import type { RwosLocale } from "../i18n/config";
import type { MessageKey } from "../i18n/messages";
import type { Translate } from "../i18n/LocaleProvider";
import { resolveDeniedKind } from "../resolveDenied";

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
  worksiteAddress: string | null;
}>;
type PendingOffer = Readonly<{ workerOfferId: string; jobRequestId: string; title: string | null; startAt: string | null }>;
type State = { status: "loading" } | { status: "signed_out" } | { status: "needs_setup" } | { status: "error" } | { status: "ready"; items: readonly Shift[] };

const STATUS_COPY_KEY: Record<string, MessageKey> = {
  pending_start: "sched.statusScheduled",
  checked_in: "sched.statusCheckedIn",
  checked_out: "sched.statusCheckedOut",
  completed: "sched.statusCompleted",
  missed: "sched.statusMissed",
  cancelled: "sched.statusCancelled",
  exception: "sched.statusException"
};

export function MySchedule() {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [state, setState] = useState<State>({ status: "loading" });
  const [pending, setPending] = useState<readonly PendingOffer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/attendance?limit=25", { cache: "no-store" });
      if (r.status === 403) return setState({ status: "error" });
      if (r.status === 401) return setState({ status: await resolveDeniedKind() });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { items: Shift[] };
      setState({ status: "ready", items: payload.items });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  // Accepted jobs waiting for Joblop to confirm, so a worker sees them straight after accepting.
  useEffect(() => {
    fetch("/api/offers?status=accepted", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { workerOffers?: PendingOffer[] } | null) => setPending(p?.workerOffers ?? []))
      .catch(() => undefined);
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
        setNotice(r.status === 409 ? t("sched.changed") : t("sched.actionFailed"));
        return;
      }
      setNotice(action === "check-in" ? t("sched.checkedInNotice") : t("sched.checkedOutNotice"));
      await load();
    } finally {
      setBusy(null);
    }
  }, [load, t]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out") return <div className="state">{t("sched.signInPrompt")}<div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div></div>;
  if (state.status === "needs_setup") return <div className="state">{t("common.needsWorkerSetup")}<div style={{ marginTop: 12 }}><a className="btn" href="/onboarding">{t("common.setUpWorker")}</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("sched.loadError")}</div>;

  const now = Date.now();
  const upcoming = state.items.filter((s) => new Date(s.scheduledEndAt).getTime() >= now);
  const past = state.items.filter((s) => new Date(s.scheduledEndAt).getTime() < now);

  const assignedJobs = new Set(state.items.map((item) => item.assignmentId));
  const waiting = assignedJobs.size === 0 ? pending : [];

  return (
    <>
      <section className="hero">
        <h1>{t("nav.schedule")}</h1>
        <p>{t("sched.intro")}</p>
      </section>
      <GoogleCalendarConnect />
      {notice ? <p className="notice" style={{ color: "var(--accent)" }}>{notice}</p> : null}

      {waiting.length > 0 ? (
        <div className="results" style={{ marginBottom: 16 }}>
          {waiting.map((o) => (
            <article key={o.workerOfferId} className="card">
              <div className="role">{o.title ?? t("offers.shiftOffer")}</div>
              <div className="chips"><span className="chip status-pending">{t("sched.waitingConfirm")}</span></div>
              {o.startAt ? <div className="when">{new Date(o.startAt).toLocaleString(locale)}</div> : null}
              <p className="notice" style={{ margin: 0 }}>{t("sched.waitingBody")}</p>
            </article>
          ))}
        </div>
      ) : null}

      {state.items.length > 0 ? (
        <div className="chips" style={{ marginBottom: 12 }}>
          <button type="button" className={`chip ${view === "list" ? "status-verified" : ""}`} onClick={() => setView("list")}>{t("sched.viewList")}</button>
          <button type="button" className={`chip ${view === "calendar" ? "status-verified" : ""}`} onClick={() => setView("calendar")}>{t("sched.viewCalendar")}</button>
        </div>
      ) : null}

      {state.items.length === 0 ? (
        waiting.length > 0 ? null : <div className="state">{t("sched.none")}</div>
      ) : view === "calendar" ? (
        <CalendarView
          items={state.items}
          month={month}
          onPrev={() => setMonth((mo) => new Date(mo.getFullYear(), mo.getMonth() - 1, 1))}
          onNext={() => setMonth((mo) => new Date(mo.getFullYear(), mo.getMonth() + 1, 1))}
          selected={selectedDay}
          onSelect={setSelectedDay}
          busy={busy}
          onAct={act}
          locale={locale}
          t={t}
        />
      ) : (
        <>
          {upcoming.length > 0 ? <div className="role" style={{ marginBottom: 6 }}>{t("sched.upcoming")}</div> : null}
          <div className="results" style={{ marginBottom: 24 }}>
            {upcoming.map((s) => <ShiftCard key={s.attendanceRecordId} s={s} busy={busy === s.attendanceRecordId} onAct={act} t={t} locale={locale} />)}
          </div>
          {past.length > 0 ? (
            <>
              <div className="role" style={{ marginBottom: 6 }}>{t("sched.history")}</div>
              <div className="results" style={{ paddingBottom: 48 }}>
                {past.map((s) => <ShiftCard key={s.attendanceRecordId} s={s} busy={false} onAct={act} history t={t} locale={locale} />)}
              </div>
            </>
          ) : null}
        </>
      )}
      <p className="notice"><a href="/timesheets">{t("ts.title")}</a></p>
      <p className="notice">{t("sched.footer")}</p>
    </>
  );
}

function ShiftCard({ s, busy, onAct, history, t, locale }: { s: Shift; busy: boolean; onAct: (s: Shift, a: "check-in" | "check-out") => void; history?: boolean; t: Translate; locale: RwosLocale }) {
  const canCheckIn = s.status === "pending_start";
  const canCheckOut = s.status === "checked_in";
  const inTime = s.checkInAt ? new Date(s.checkInAt).toLocaleTimeString(locale) : null;
  const outTime = s.checkOutAt ? new Date(s.checkOutAt).toLocaleTimeString(locale) : null;
  return (
    <article className="card">
      <div className="role">{s.employerName}</div>
      <div className="chips">
        <span className={`chip status-${badgeClass(s.status)}`}>{t(STATUS_COPY_KEY[s.status] ?? "sched.statusScheduled")}</span>
        {s.areaLabel ? <span className="chip">{s.areaLabel}</span> : null}
        {s.exceptionCategory ? <span className="chip status-rejected">{s.exceptionCategory.replaceAll("_", " ")}</span> : null}
      </div>
      <div className="when">{formatShift(s.scheduledStartAt, s.scheduledEndAt, s.timezone, locale)}</div>
      {s.worksiteAddress ? <div className="when">{t("sched.address", { address: s.worksiteAddress })}</div> : null}
      {inTime ? <div className="when">{outTime ? t("sched.inOut", { inTime, outTime }) : t("sched.in", { time: inTime })}</div> : null}
      {s.checkInAt && s.checkOutAt ? <div className="when"><strong>{t("sched.worked", { duration: workedDuration(s.checkInAt, s.checkOutAt, t) })}</strong></div> : null}
      {!history && (canCheckIn || canCheckOut) ? (
        <button className="btn" type="button" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => onAct(s, canCheckIn ? "check-in" : "check-out")}>
          {busy ? "…" : canCheckIn ? t("sched.checkIn") : t("sched.checkOut")}
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
function workedDuration(checkInAt: string, checkOutAt: string, t: Translate): string {
  const ms = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  const totalMin = Math.max(0, Math.round(ms / 60000));
  return t("sched.durationHm", { h: Math.floor(totalMin / 60), m: totalMin % 60 });
}
function formatShift(startAt: string, endAt: string, tz: string, locale: RwosLocale): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz };
  const start = new Date(startAt).toLocaleString(locale, opts);
  const end = new Date(endAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: tz });
  return `${start} – ${end} (${tz})`;
}


function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function CalendarView({ items, month, onPrev, onNext, selected, onSelect, busy, onAct, locale, t }: {
  items: readonly Shift[];
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  selected: string | null;
  onSelect: (k: string | null) => void;
  busy: string | null;
  onAct: (s: Shift, a: "check-in" | "check-out") => void;
  locale: RwosLocale;
  t: Translate;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const startWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const counts = new Map<string, number>();
  for (const s of items) {
    const d = new Date(s.scheduledStartAt);
    if (d.getFullYear() === year && d.getMonth() === m) {
      const k = dayKey(d);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const monthLabel = new Date(year, m, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: "narrow" }));
  const cells: (number | null)[] = [...Array<null>(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = dayKey(new Date());
  const dayShifts = selected ? items.filter((s) => dayKey(new Date(s.scheduledStartAt)) === selected) : [];
  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="chips" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="chip" onClick={onPrev} aria-label={t("sched.prevMonth")}>&#8249;</button>
          <div className="role">{monthLabel}</div>
          <button type="button" className="chip" onClick={onNext} aria-label={t("sched.nextMonth")}>&#8250;</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginTop: 10 }}>
          {weekdays.map((w, i) => (
            <div key={`wd-${i}`} style={{ textAlign: "center", fontSize: 12, opacity: 0.7 }}>{w}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`b-${i}`} />;
            const k = `${year}-${m}-${day}`;
            const count = counts.get(k) ?? 0;
            const isToday = k === todayKey;
            const isSel = k === selected;
            return (
              <button
                key={`d-${day}`}
                type="button"
                onClick={() => onSelect(isSel ? null : k)}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 8,
                  border: isToday ? "2px solid var(--accent)" : "1px solid var(--border, rgba(127,127,127,0.3))",
                  background: isSel ? "var(--accent)" : count > 0 ? "var(--accent-soft, rgba(127,127,127,0.12))" : "transparent",
                  color: isSel ? "#fff" : "inherit",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13
                }}
              >
                <span>{day}</span>
                {count > 0 ? <span style={{ fontSize: 10, marginTop: 2 }}>&#9679;{count > 1 ? ` ${count}` : ""}</span> : null}
              </button>
            );
          })}
        </div>
      </section>
      {selected ? (
        dayShifts.length > 0 ? (
          <div className="results" style={{ paddingBottom: 48 }}>
            {dayShifts.map((s) => (
              <ShiftCard key={s.attendanceRecordId} s={s} busy={busy === s.attendanceRecordId} onAct={onAct} t={t} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="state">{t("sched.noShiftsDay")}</div>
        )
      ) : (
        <p className="notice">{t("sched.pickDay")}</p>
      )}
    </>
  );
}

// Opt-in Google Calendar sync. Shown only when the API reports calendar sync is enabled. Links to
// the Google start route with calendar=1; when already signed in, the callback links the calendar
// grant to the current account (no new session) and returns here with ?calendar=connected.
function GoogleCalendarConnect() {
  const t = useT();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<"idle" | "connected" | "error">("idle");
  useEffect(() => {
    let active = true;
    fetch("/api/auth/google/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { calendarSync?: boolean } | null) => {
        if (active && d?.calendarSync) setEnabled(true);
      })
      .catch(() => {});
    try {
      const p = new URLSearchParams(window.location.search).get("calendar");
      if (p === "connected") setStatus("connected");
      else if (p === "error") setStatus("error");
    } catch {
      /* ignore */
    }
    return () => {
      active = false;
    };
  }, []);
  if (!enabled) return null;
  if (status === "connected") {
    return <p className="notice" style={{ color: "var(--accent)" }}>{t("sched.calendarConnected")}</p>;
  }
  return (
    <div className="state" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <span>{t("sched.calendarSyncHint")}</span>
      <a className="btn ghost" href="/api/auth/google/start?calendar=1">{t("sched.connectGoogleCalendar")}</a>
      {status === "error" ? <span className="error" role="alert">{t("sched.calendarConnectError")}</span> : null}
    </div>
  );
}
