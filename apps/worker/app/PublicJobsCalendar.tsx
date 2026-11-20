"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PUBLIC_LANDING_COPY,
  currentCalendarMonth,
  groupPublicJobsByDay,
  publicCalendarDayTitle,
  publicCalendarJobTime,
  publicCalendarMonthTitle,
  publicCalendarWeekdays,
  publicCalendarWeeks,
  publicCalendarWindow,
  publicCountLabel,
  publicLandingIntlLocale,
  publicLandingLang,
  shiftCalendarMonth,
  calendarDayKey,
  type PublicCalendarJob
} from "@rwos/shared";
import { withBrand } from "./Brand";
import { useLocale, useT } from "./i18n/LocaleProvider";
import { publicJobPath } from "./safeReturnPath";
import { workerPayLabel } from "./workerPayLabel";
import { nearestDayWithJobs } from "./calendarDays";
import { JoblopJobBadge } from "./JobSourceBadge";

// Signed-out front door, section 2: a month calendar of Joblop's open jobs, public with no account.
// Every day with jobs shows a gold dot and its count; tapping a day lists that day's jobs (role, city
// and province, time, places left and the worker's own pay), or says "No jobs on this day" with a link
// to the nearest day that has jobs. Tapping a job opens its public page /job/<code>, which has
// "Create an account to take this job". The phone app draws the same calendar with the same words.

type Load = { status: "loading" } | { status: "ready"; jobs: readonly PublicCalendarJob[] } | { status: "error" };

/** How many months ahead a visitor can page (open jobs are rarely posted further out). */
const MONTHS_AHEAD = 2;

const monthKey = (year: number, month: number) => `${year}-${`${month + 1}`.padStart(2, "0")}`;

export function PublicJobsCalendar({
  onCreateAccount,
  matches
}: {
  onCreateAccount: () => void;
  /** The Find work filters (what work + city); only matching jobs show. */
  matches?: (job: PublicCalendarJob) => boolean;
}) {
  const locale = useLocale();
  const tr = useT();
  const lang = publicLandingLang(locale);
  const t = PUBLIC_LANDING_COPY[lang];
  const today = useMemo(() => currentCalendarMonth(), []);
  const todayKey = useMemo(() => calendarDayKey(new Date()), []);
  const [view, setView] = useState(today);
  // Every month a visitor can page to is loaded once, so "nearest day with jobs" can look past this month.
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const pendingSelect = useRef<string | null>(null);

  const fetchMonth = useCallback(async (year: number, month: number) => {
    const key = monthKey(year, month);
    setLoads((prev) => ({ ...prev, [key]: { status: "loading" } }));
    const { from, to } = publicCalendarWindow(year, month);
    try {
      const res = await fetch(`/api/public/jobs/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
      const payload = (await res.json()) as { jobs?: unknown; error?: string };
      if (!res.ok || payload.error || !Array.isArray(payload.jobs)) {
        setLoads((prev) => ({ ...prev, [key]: { status: "error" } }));
        return;
      }
      setLoads((prev) => ({ ...prev, [key]: { status: "ready", jobs: payload.jobs as PublicCalendarJob[] } }));
    } catch {
      setLoads((prev) => ({ ...prev, [key]: { status: "error" } }));
    }
  }, []);

  useEffect(() => {
    for (let i = 0; i <= MONTHS_AHEAD; i++) {
      const m = shiftCalendarMonth(today.year, today.month, i);
      void fetchMonth(m.year, m.month);
    }
  }, [fetchMonth, today]);

  // Each loaded month, filtered and grouped by day (only that month's days: the request has a day of
  // slack on each side).
  const byMonth = useMemo(() => {
    const out = new Map<string, Map<string, PublicCalendarJob[]>>();
    for (const [key, l] of Object.entries(loads)) {
      if (l.status !== "ready") continue;
      const jobs = matches ? l.jobs.filter(matches) : l.jobs;
      out.set(key, new Map([...groupPublicJobsByDay(jobs)].filter(([day]) => day.startsWith(`${key}-`))));
    }
    return out;
  }, [loads, matches]);
  const viewKey = monthKey(view.year, view.month);
  const load: Load = loads[viewKey] ?? { status: "loading" };
  const byDay = useMemo(() => byMonth.get(viewKey) ?? new Map<string, PublicCalendarJob[]>(), [byMonth, viewKey]);
  const allDaysWithJobs = useMemo(() => {
    const days: string[] = [];
    for (const month of byMonth.values()) for (const [day, list] of month) if (list.length > 0) days.push(day);
    return days;
  }, [byMonth]);
  const weeks = useMemo(() => publicCalendarWeeks(view.year, view.month), [view]);
  const weekdays = useMemo(() => publicCalendarWeekdays(lang), [lang]);
  const monthHasJobs = weeks.some((w) => w.some((c) => c.inMonth && (byDay.get(c.key)?.length ?? 0) > 0));

  // Open on the day asked for ("nearest day with jobs"), else the first day with jobs, so a visitor
  // sees real jobs straight away.
  useEffect(() => {
    if (load.status !== "ready") return;
    if (pendingSelect.current?.startsWith(`${viewKey}-`)) {
      setSelected(pendingSelect.current);
      pendingSelect.current = null;
      return;
    }
    const firstDay = weeks.flat().find((c) => c.inMonth && (byDay.get(c.key)?.length ?? 0) > 0);
    setSelected(firstDay?.key ?? null);
  }, [load, weeks, byDay, viewKey]);

  const goToDay = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    if (!y || !m) return;
    if (y === view.year && m - 1 === view.month) {
      setSelected(key);
      return;
    }
    pendingSelect.current = key;
    setView({ year: y, month: m - 1 });
  };

  const isFirstMonth = view.year === today.year && view.month === today.month;
  const lastMonth = shiftCalendarMonth(today.year, today.month, MONTHS_AHEAD);
  const isLastMonth = view.year === lastMonth.year && view.month === lastMonth.month;
  const dayJobs = selected ? (byDay.get(selected) ?? []) : [];
  const nearest = selected && dayJobs.length === 0 ? nearestDayWithJobs(allDaysWithJobs, selected) : null;
  const moneyLocale = publicLandingIntlLocale(lang);
  const payCopy = { paidByEmployer: t.paidByEmployer, employerPaysDirectly: t.employerPaysDirectly, pending: t.payPending };

  return (
    <section className="pcal" id="jobs-calendar" data-section="calendar" aria-labelledby="pcal-title">
      <span className="pcal-eyebrow">{t.calendarEyebrow}</span>
      <h2 id="pcal-title">{withBrand(t.calendarTitle)}</h2>
      <p className="pcal-sub">{t.calendarSub}</p>

      <div className="pcal-head">
        <button type="button" className="pcal-nav" onClick={() => setView(shiftCalendarMonth(view.year, view.month, -1))} disabled={isFirstMonth} aria-label={t.prevMonth}>
          <span aria-hidden="true">{lang === "ar" ? "›" : "‹"}</span>
        </button>
        <strong className="pcal-month" aria-live="polite">{publicCalendarMonthTitle(view.year, view.month, lang)}</strong>
        <button type="button" className="pcal-nav" onClick={() => setView(shiftCalendarMonth(view.year, view.month, 1))} disabled={isLastMonth} aria-label={t.nextMonth}>
          <span aria-hidden="true">{lang === "ar" ? "‹" : "›"}</span>
        </button>
      </div>

      <div className="pcal-grid" role="grid" aria-labelledby="pcal-title">
        <div className="pcal-row" role="row">
          {weekdays.map((d) => (
            <span key={d} className="pcal-wd" role="columnheader">{d}</span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]!.key} className="pcal-row" role="row">
            {week.map((cell) => {
              const count = cell.inMonth ? (byDay.get(cell.key)?.length ?? 0) : 0;
              const label = count > 0 ? `${publicCalendarDayTitle(cell.key, lang)}: ${publicCountLabel(count, t.dayJobsOne, t.dayJobsMany)}` : `${publicCalendarDayTitle(cell.key, lang)}: ${tr("cal.noJobsDay")}`;
              return (
                <button
                  key={cell.key}
                  type="button"
                  role="gridcell"
                  className={`pcal-day${cell.inMonth ? "" : " out"}${count > 0 ? " has" : ""}${selected === cell.key ? " on" : ""}${cell.key === todayKey ? " today" : ""}`}
                  disabled={!cell.inMonth}
                  aria-selected={selected === cell.key}
                  aria-label={label}
                  onClick={() => setSelected(cell.key)}
                >
                  {count > 0 ? <span className="pcal-dot" aria-hidden="true" /> : null}
                  <span className="pcal-num">{cell.day}</span>
                  {count > 0 ? <span className="pcal-count">{count}</span> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="pcal-legend"><span className="pcal-dot" aria-hidden="true" /> {tr("cal.legendJobs")}</p>

      {load.status === "loading" ? <p className="pcal-note">{t.loading}</p> : null}
      {load.status === "error" ? (
        <p className="pcal-note" role="alert">
          {t.loadError}{" "}
          <button type="button" className="linkbtn pcal-link" onClick={() => void fetchMonth(view.year, view.month)}>{t.retry}</button>
        </p>
      ) : null}
      {load.status === "ready" && !monthHasJobs && !selected ? (
        <div className="pcal-empty">
          <p>{allDaysWithJobs.length > 0 ? t.empty : tr("cal.noJobsSoon")}</p>
          {allDaysWithJobs.length > 0 ? (
            <button type="button" className="btn" onClick={() => goToDay(nearestDayWithJobs(allDaysWithJobs, todayKey) ?? allDaysWithJobs[0]!)}>
              {tr("cal.nearestDay", { day: publicCalendarDayTitle(nearestDayWithJobs(allDaysWithJobs, todayKey) ?? allDaysWithJobs[0]!, lang) })}
            </button>
          ) : (
            <button type="button" className="btn" onClick={onCreateAccount}>{t.createAccount}</button>
          )}
        </div>
      ) : null}

      {load.status === "ready" && (monthHasJobs || selected) ? (
        <div className="pcal-day-list" aria-live="polite">
          {selected ? (
            <>
              <h3>
                {publicCalendarDayTitle(selected, lang)}
                {dayJobs.length > 0 ? <span className="pcal-day-count"> · {publicCountLabel(dayJobs.length, t.dayJobsOne, t.dayJobsMany)}</span> : null}
              </h3>
              {dayJobs.length === 0 ? (
                <div className="pcal-noday">
                  <p>{tr("cal.noJobsDay")}</p>
                  {nearest ? (
                    <button type="button" className="linkbtn pcal-link" onClick={() => goToDay(nearest)}>
                      {tr("cal.nearestDay", { day: publicCalendarDayTitle(nearest, lang) })} {lang === "ar" ? "←" : "→"}
                    </button>
                  ) : (
                    <span className="pcal-note">{tr("cal.noJobsSoon")}</span>
                  )}
                </div>
              ) : null}
              <div className="pjs-grid">
                {dayJobs.map((job) => (
                  <a key={job.jobCode} className="pjs-card pjs-own" href={publicJobPath(job.jobCode)} data-job-code={job.jobCode}>
                    <JoblopJobBadge />
                    <strong>{job.role}</strong>
                    <span className="pjs-meta">📍 <bdi>{job.areaLabel}</bdi></span>
                    <span className="pjs-meta">🕒 <bdi>{publicCalendarJobTime(job, lang)}</bdi></span>
                    <span className="pjs-meta"><bdi>{workerPayLabel(job, moneyLocale, payCopy)}</bdi></span>
                    <span className="pjs-foot">
                      <em>{publicCountLabel(job.placesLeft, t.placesOne, t.placesMany)}</em>
                      <span>{tr("src.applyHere")} {lang === "ar" ? "←" : "→"}</span>
                    </span>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p className="pcal-note">{t.pickDay}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
