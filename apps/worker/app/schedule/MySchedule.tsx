"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "../i18n/LocaleProvider";
import type { RwosLocale } from "../i18n/config";
import type { MessageKey } from "../i18n/messages";
import type { Translate } from "../i18n/LocaleProvider";

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
  const locale = useLocale();
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
  if (state.status === "error") return <div className="state error" role="alert">{t("sched.loadError")}</div>;

  const now = Date.now();
  const upcoming = state.items.filter((s) => new Date(s.scheduledEndAt).getTime() >= now);
  const past = state.items.filter((s) => new Date(s.scheduledEndAt).getTime() < now);

  return (
    <>
      <section className="hero">
        <h1>{t("nav.schedule")}</h1>
        <p>{t("sched.intro")}</p>
      </section>
      {notice ? <p className="notice" style={{ color: "var(--accent)" }}>{notice}</p> : null}

      {state.items.length === 0 ? (
        <div className="state">{t("sched.none")}</div>
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
