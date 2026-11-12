"use client";

import { useCallback, useEffect, useState } from "react";
import { calendarDayKey } from "@rwos/shared";
import { appendUnique, nextCursorOf } from "../pagination";
import { useLocale, useT, fmtLocale } from "../i18n/LocaleProvider";
import type { RwosLocale } from "../i18n/config";
import type { MessageKey } from "../i18n/messages";
import type { Translate } from "../i18n/LocaleProvider";
import { resolveDeniedKind } from "../resolveDenied";
import { ShiftAddressMap } from "../ShiftAddressMap";
import { checkInOpensAt, isCheckInOpen } from "../shiftLocation";

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
  /** The job (e.g. "Farm worker"); shown as the card title, with the company under it. */
  roleLabel?: string | null;
  areaLabel: string | null;
  worksiteAddress: string | null;
  safetyNotes: string | null;
  // Long-term job (employer plans flag): false = no check-in / check-out (the employer pays directly).
  clockInAllowed?: boolean;
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
  // "Load more": older shifts come 25 at a time (the API's next-page cursor).
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/attendance?limit=25", { cache: "no-store" });
      if (r.status === 403) return setState({ status: "error" });
      if (r.status === 401) return setState({ status: await resolveDeniedKind() });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { items: Shift[]; nextCursor?: string | null };
      setState({ status: "ready", items: payload.items });
      setCursor(nextCursorOf(payload));
    } catch {
      setState({ status: "error" });
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (cursor === null) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/attendance?limit=25&cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      if (!r.ok) return;
      const payload = (await r.json()) as { items: Shift[]; nextCursor?: string | null };
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", items: appendUnique(current.items, payload.items ?? [], (s) => s.attendanceRecordId) }
          : current
      );
      setCursor(nextCursorOf(payload));
    } catch {
      /* keep what is shown; the button stays so the worker can try again */
    } finally {
      setLoadingMore(false);
    }
  }, [cursor]);

  // Accepted jobs waiting for Joblop to confirm, so a worker sees them straight after accepting.
  useEffect(() => {
    fetch("/api/offers?status=accepted", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { workerOffers?: PendingOffer[] } | null) => setPending(p?.workerOffers ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Re-render every 30 s so "Check in" turns on by itself when check-in opens.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const act = useCallback(async (shift: Shift, action: "check-in" | "check-out") => {
    setBusy(shift.attendanceRecordId);
    setNotice(null);
    try {
      const r = await fetch(`/api/attendance/${encodeURIComponent(shift.attendanceRecordId)}/${action}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: shift.version })
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { error?: string; opensAt?: string } | null;
        if (body?.error === "RWOS_CHECK_IN_TOO_EARLY") {
          const opens = body.opensAt ?? checkInOpensAt(shift.scheduledStartAt).toISOString();
          setNotice(t("sched.checkInTooEarly", { time: formatClock(opens, shift.timezone, locale) }));
          return;
        }
        setNotice(r.status === 409 ? t("sched.changed") : t("sched.actionFailed"));
        return;
      }
      setNotice(action === "check-in" ? t("sched.checkedInNotice") : t("sched.checkedOutNotice"));
      await load();
    } finally {
      setBusy(null);
    }
  }, [load, t, locale]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out") return <div className="state">{t("sched.signInPrompt")}<div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div></div>;
  if (state.status === "needs_setup") return <div className="state">{t("common.needsWorkerSetup")}<div style={{ marginTop: 12 }}><a className="btn" href="/onboarding">{t("common.setUpWorker")}</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("sched.loadError")}</div>;

  const { upcoming, past, waiting } = splitSchedule(state.items, pending, Date.now());

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
              {o.startAt ? <div className="when">{formatShiftStart(o.startAt, locale)}</div> : null}
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
      {cursor !== null && state.items.length > 0 ? (
        <button type="button" className="btn ghost" style={{ marginBottom: 16 }} onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? t("common.loading") : t("common.loadMore")}
        </button>
      ) : null}
      <div style={{ display: "grid", gap: 10, justifyItems: "start", margin: "8px 0 32px" }}>
        <p className="notice" style={{ margin: 0 }}>{t("sched.footer")}</p>
        <a className="btn" href="/timesheets">{t("ts.title")}</a>
      </div>
    </>
  );
}

function ShiftCard({ s, busy, onAct, history, t, locale }: { s: Shift; busy: boolean; onAct: (s: Shift, a: "check-in" | "check-out") => void; history?: boolean; t: Translate; locale: RwosLocale }) {
  const noClock = s.clockInAllowed === false;
  const canCheckIn = !noClock && s.status === "pending_start";
  const canCheckOut = !noClock && s.status === "checked_in";
  // Check-in opens 30 minutes before the start (the API refuses earlier ones too).
  const checkInOpen = isCheckInOpen(s.scheduledStartAt);
  const opensAtLabel = formatClock(checkInOpensAt(s.scheduledStartAt).toISOString(), s.timezone, locale);
  const inTime = s.checkInAt ? formatClock(s.checkInAt, s.timezone, locale) : null;
  const outTime = s.checkOutAt ? formatClock(s.checkOutAt, s.timezone, locale) : null;
  const title = s.roleLabel?.trim() || s.employerName;
  return (
    <article className="card">
      <div className="role">{title}</div>
      {title !== s.employerName ? <div className="employer">{s.employerName}</div> : null}
      <div className="chips">
        <span className={`chip status-${badgeClass(s.status)}`}>{t(STATUS_COPY_KEY[s.status] ?? "sched.statusScheduled")}</span>
        {s.areaLabel ? <span className="chip">{s.areaLabel}</span> : null}
        {s.exceptionCategory ? <span className="chip status-rejected">{s.exceptionCategory.replaceAll("_", " ")}</span> : null}
      </div>
      <div className="when">{formatShift(s.scheduledStartAt, s.scheduledEndAt, s.timezone, locale, t("sched.easternTime"))}</div>
      {s.worksiteAddress ? <div className="when">{t("sched.address", { address: s.worksiteAddress })}</div> : null}
      {/* The exact address only comes for a confirmed shift that is not over (worksiteAddress.ts). */}
      {!history && s.worksiteAddress ? <ShiftAddressMap address={s.worksiteAddress} /> : null}
      {s.safetyNotes ? <div className="when">{t("sched.safetyNotes", { notes: s.safetyNotes })}</div> : null}
      <a
        className="sched-ask"
        href={`/contact?topic=shift&relatedType=assignment&relatedId=${encodeURIComponent(s.assignmentId)}`}
      >
        {t("sched.askJoblop")}
      </a>
      {inTime ? <div className="when">{outTime ? t("sched.inOut", { inTime, outTime }) : t("sched.in", { time: inTime })}</div> : null}
      {s.checkInAt && s.checkOutAt ? <div className="when"><strong>{t("sched.worked", { duration: workedDuration(s.checkInAt, s.checkOutAt, t) })}</strong></div> : null}
      {noClock ? <p className="notice" style={{ margin: 0 }}>{t("sched.longTermNoClockIn")}</p> : null}
      {!history && canCheckIn && !checkInOpen ? (
        <button className="btn" type="button" style={{ alignSelf: "flex-start" }} disabled aria-disabled="true">
          {t("sched.checkInOpensAt", { time: opensAtLabel })}
        </button>
      ) : null}
      {!history && ((canCheckIn && checkInOpen) || canCheckOut) ? (
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
function formatClock(at: string, tz: string, locale: RwosLocale): string {
  try {
    return new Date(at).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: tz });
  } catch {
    return new Date(at).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }
}
// Québec shifts are on Eastern time: say so in plain words instead of "(America/Toronto)".
const EASTERN_ZONES = new Set(["America/Toronto", "America/Montreal", "America/Nipigon", "America/Thunder_Bay", "America/Iqaluit", "America/New_York"]);
function formatShift(startAt: string, endAt: string, tz: string, locale: RwosLocale, easternLabel: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz };
  const start = new Date(startAt).toLocaleString(locale, opts);
  const end = new Date(endAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: tz });
  return EASTERN_ZONES.has(tz) ? `${start} – ${end} (${easternLabel})` : `${start} – ${end}`;
}


/**
 * Upcoming shifts soonest first (the API sends newest first), past shifts most recent first, and the
 * accepted offers still waiting for Joblop: an offer leaves that list once a shift with the same start
 * exists (it used to show only while the worker had no shift at all).
 */
export function splitSchedule<S extends { scheduledStartAt: string; scheduledEndAt: string }, O extends { startAt: string | null }>(
  items: readonly S[],
  pending: readonly O[],
  now: number
): { upcoming: S[]; past: S[]; waiting: O[] } {
  const time = (iso: string) => new Date(iso).getTime();
  const upcoming = items.filter((s) => time(s.scheduledEndAt) >= now).sort((a, b) => time(a.scheduledStartAt) - time(b.scheduledStartAt));
  const past = items.filter((s) => time(s.scheduledEndAt) < now).sort((a, b) => time(b.scheduledStartAt) - time(a.scheduledStartAt));
  const starts = new Set(items.map((s) => time(s.scheduledStartAt)));
  const waiting = pending.filter((o) => !(o.startAt && starts.has(time(o.startAt))));
  return { upcoming, past, waiting };
}

function formatShiftStart(at: string, locale: RwosLocale): string {
  return new Date(at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" });
}

// Day keys follow the Québec (America/Toronto) day, so a late shift never lands on the next day for a
// device in another time zone. Format: year-monthIndex-day, like the grid cells.
function dayKeyOf(iso: string): string {
  const [y, mo, d] = calendarDayKey(iso).split("-").map(Number);
  return `${y}-${(mo ?? 1) - 1}-${d}`;
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
    const k = dayKeyOf(s.scheduledStartAt);
    if (k.startsWith(`${year}-${m}-`)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const monthLabel = new Date(year, m, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: "narrow" }));
  const cells: (number | null)[] = [...Array<null>(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = dayKeyOf(new Date().toISOString());
  const dayShifts = selected ? items.filter((s) => dayKeyOf(s.scheduledStartAt) === selected) : [];
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
