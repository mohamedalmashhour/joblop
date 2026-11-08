"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageText } from "../../i18n/pageText";
import { BonusSection, bonusAmountLabel, isActiveBonus, type BonusSuggestion, type JobBonus } from "./BonusSection";
import { coverageText } from "./text";

type Coverage = "open" | "partly_filled" | "full" | "not_open";

type CoverageJob = {
  jobRequestId: string;
  jobCode: string;
  role: string;
  employer: string | null;
  areaLabel: string;
  status: string;
  openClaim: boolean;
  startAt: string;
  endAt: string;
  urgency: string | null;
  placesAsked: number;
  placesTaken: number;
  placesLeft: number;
  coverage: Coverage;
  workers: { name: string; status: string }[];
  workerRateMinor: number | null;
  employerRateMinor: number | null;
  bonus?: JobBonus | null;
  bonusSuggestion?: BonusSuggestion | null;
};

type State =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "ready"; jobs: readonly CoverageJob[] };

const COVERAGE_ORDER: readonly Coverage[] = ["open", "partly_filled", "full", "not_open"];
const COVERAGE_COLOR: Readonly<Record<Coverage, { bg: string; fg: string }>> = {
  full: { bg: "#2e9d5b", fg: "#ffffff" },
  partly_filled: { bg: "#F8B808", fg: "#000000" },
  open: { bg: "#d64545", fg: "#ffffff" },
  not_open: { bg: "#6b6b6b", fg: "#ffffff" }
};
const MAX_CHIPS = 4;
const BONUS_GOLD = "#F8B808";
const NEEDS_WORKERS_WINDOW_MS = 48 * 3_600_000;

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

// Six Monday-first weeks covering the given month.
function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function rate(minor: number | null, notSet: string, perHour: string): string {
  if (minor === null || minor === undefined) return notSet;
  return `${new Intl.NumberFormat(undefined, { style: "currency", currency: "CAD" }).format(minor / 100)} ${perHour}`;
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function needsWorkers(job: CoverageJob, now: number): boolean {
  if (job.coverage !== "open" && job.coverage !== "partly_filled") return false;
  const start = Date.parse(job.startAt);
  return start >= now && start - now <= NEEDS_WORKERS_WINDOW_MS;
}

export function CoverageCalendarPanel() {
  const t = usePageText(coverageText);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(() => dayKey(new Date()));
  const [state, setState] = useState<State>({ status: "loading" });
  const [now, setNow] = useState(() => Date.now());

  const grid = useMemo(() => monthGrid(month), [month]);

  // `silent` keeps the current calendar on screen while it refreshes (after a bonus action).
  const load = useCallback(async (silent = false) => {
    if (!silent) setState({ status: "loading" });
    const from = grid[0]!;
    const last = grid[grid.length - 1]!;
    const to = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    try {
      const response = await fetch(`/api/calendar/job-coverage?${query.toString()}`, { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { jobs?: CoverageJob[] };
      setNow(Date.now());
      setState({ status: "ready", jobs: Array.isArray(payload.jobs) ? payload.jobs : [] });
    } catch {
      setState({ status: "error" });
    }
  }, [grid]);

  useEffect(() => { void load(); }, [load]);
  const reloadQuietly = useCallback(() => { void load(true); }, [load]);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, CoverageJob[]>();
    if (state.status !== "ready") return map;
    for (const job of state.jobs) {
      const key = dayKey(new Date(job.startAt));
      const list = map.get(key) ?? [];
      list.push(job);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    return map;
  }, [state]);

  const urgentCount = state.status === "ready" ? state.jobs.filter((job) => needsWorkers(job, now)).length : 0;
  const todayKey = dayKey(new Date());
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedJobs = selected ? jobsByDay.get(selected) ?? [] : [];
  const selectedLabel = selected
    ? new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "full" })
    : "";

  const shiftMonth = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  const goToday = () => {
    const today = new Date();
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(dayKey(today));
  };

  return (
    <section style={styles.wrap}>
      <div style={styles.toolbar}>
        <button aria-label={t.previous} onClick={() => shiftMonth(-1)} style={styles.navButton} type="button">
          <span aria-hidden="true">‹</span>
        </button>
        <h2 aria-live="polite" style={styles.month}>{monthLabel}</h2>
        <button aria-label={t.next} onClick={() => shiftMonth(1)} style={styles.navButton} type="button">
          <span aria-hidden="true">›</span>
        </button>
        <button onClick={goToday} style={styles.todayButton} type="button">{t.today}</button>
      </div>

      <div aria-label={t.legendTitle} role="list" style={styles.legend}>
        {COVERAGE_ORDER.map((coverage) => (
          <span key={coverage} role="listitem" style={styles.legendItem}>
            <span aria-hidden="true" style={{ ...styles.swatch, background: COVERAGE_COLOR[coverage].bg }} />
            {t.coverage[coverage]}
          </span>
        ))}
        <span role="listitem" style={styles.legendItem}>
          <span aria-hidden="true" style={styles.bonusChip}>★ {t.bonusChip}</span>
          {t.bonusLegend}
        </span>
      </div>

      {state.status === "loading" ? <p style={styles.text}>{t.loading}</p> : null}
      {state.status === "denied" ? <p style={styles.text}>{t.denied}</p> : null}
      {state.status === "error" ? <p style={styles.text}>{t.error}</p> : null}
      {urgentCount > 0 ? (
        <p role="status" style={styles.alert}>{t.needsWorkersSummary(urgentCount)}</p>
      ) : null}

      <div style={styles.gridScroll}>
        <div aria-label={monthLabel} role="group" style={styles.grid}>
          {t.weekdays.map((name) => (
            <div key={name} aria-hidden="true" style={styles.weekday}>{name}</div>
          ))}
          {grid.map((date) => {
            const key = dayKey(date);
            const jobs = jobsByDay.get(key) ?? [];
            const inMonth = date.getMonth() === month.getMonth();
            const isSelected = key === selected;
            const hasUrgent = jobs.some((job) => needsWorkers(job, now));
            const hasBonus = jobs.some((job) => isActiveBonus(job.bonus));
            return (
              <button
                aria-label={`${date.toLocaleDateString(undefined, { dateStyle: "long" })}, ${t.dayJobs(jobs.length)}${hasBonus ? `, ${t.bonusLegend}` : ""}`}
                aria-pressed={isSelected}
                key={key}
                onClick={() => setSelected(key)}
                style={{
                  ...styles.cell,
                  opacity: inMonth ? 1 : 0.45,
                  borderColor: isSelected ? "#fff1a8" : hasUrgent ? "#d64545" : "#3a3a3a",
                  boxShadow: isSelected ? "0 0 0 1px #fff1a8 inset" : "none"
                }}
                type="button"
              >
                <span style={styles.dayHead}>
                  <span style={{ ...styles.dayNumber, ...(key === todayKey ? styles.todayNumber : null) }}>{date.getDate()}</span>
                  {hasBonus ? <span aria-hidden="true" style={styles.bonusChip}>★ {t.bonusChip}</span> : null}
                </span>
                <span style={styles.chips}>
                  {jobs.slice(0, MAX_CHIPS).map((job) => (
                    <span
                      key={job.jobRequestId}
                      style={{ ...styles.chip, background: COVERAGE_COLOR[job.coverage]?.bg ?? "#6b6b6b", color: COVERAGE_COLOR[job.coverage]?.fg ?? "#fff" }}
                      title={`${job.role} · ${t.coverage[job.coverage] ?? job.coverage}${isActiveBonus(job.bonus) ? ` · ${t.bonusChip}` : ""}`}
                    >
                      {isActiveBonus(job.bonus) ? "★ " : ""}{job.placesTaken}/{job.placesAsked} {job.role}
                    </span>
                  ))}
                  {jobs.length > MAX_CHIPS ? <span style={styles.more}>{t.moreJobs(jobs.length - MAX_CHIPS)}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section aria-live="polite" style={styles.dayPanel}>
        {selected ? <h2 style={styles.dayTitle}>{selectedLabel}</h2> : null}
        {!selected ? <p style={styles.text}>{t.selectDay}</p> : null}
        {selected && state.status === "ready" && selectedJobs.length === 0 ? <p style={styles.text}>{t.noJobs}</p> : null}
        {selectedJobs.map((job) => {
          const urgent = needsWorkers(job, now);
          const color = COVERAGE_COLOR[job.coverage] ?? COVERAGE_COLOR.not_open;
          return (
            <article
              key={job.jobRequestId}
              style={{ ...styles.card, borderColor: urgent ? "#d64545" : "#3a3a3a", borderInlineStartColor: color.bg }}
            >
              <div style={styles.cardHead}>
                <h3 style={styles.heading}>{job.role}</h3>
                <span style={{ ...styles.badge, background: color.bg, color: color.fg }}>{t.coverage[job.coverage] ?? job.coverage}</span>
                {urgent ? <span style={styles.urgent}>{t.needsWorkers}</span> : null}
                {isActiveBonus(job.bonus) && job.bonus ? (
                  <span style={styles.bonusBadge}>★ {t.bonusChip} {bonusAmountLabel(job.bonus.kind, job.bonus.amountMinor, t)}</span>
                ) : null}
              </div>
              <p style={styles.meta}>
                {job.employer ?? t.employerFallback}
                {job.areaLabel ? ` · ${job.areaLabel}` : ""} · {time(job.startAt)}–{time(job.endAt)}
              </p>
              <p style={styles.meta}>
                <strong style={styles.strong}>{t.places(job.placesTaken, job.placesAsked)}</strong> · {t.placesLeft(job.placesLeft)}
              </p>
              <p style={styles.meta}>
                {t.workerPay}: {rate(job.workerRateMinor, t.notSet, t.perHour)} · {t.employerRate}: {rate(job.employerRateMinor, t.notSet, t.perHour)}
              </p>
              <div>
                <p style={styles.label}>{t.workers}</p>
                {job.workers.length === 0 ? (
                  <p style={styles.meta}>{t.noWorkers}</p>
                ) : (
                  <ul style={styles.workerList}>
                    {job.workers.map((worker, index) => (
                      <li key={`${worker.name}-${index}`}>{worker.name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <BonusSection
                bonus={job.bonus ?? null}
                canAdd={job.coverage === "open" || job.coverage === "partly_filled"}
                initialSuggestion={job.bonusSuggestion ?? null}
                jobRequestId={job.jobRequestId}
                onChanged={reloadQuietly}
                t={t}
              />
              <a
                aria-label={`${t.openJob} ${job.jobCode}`}
                href={`/calendar/request?request=${encodeURIComponent(job.jobRequestId)}`}
                style={styles.link}
              >
                {job.jobCode}
              </a>
            </article>
          );
        })}
      </section>
    </section>
  );
}

const styles = {
  wrap: { display: "grid", gap: 16, padding: "0 clamp(16px, 5vw, 64px) 64px" },
  toolbar: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 10 },
  month: { color: "#fff", fontSize: 24, margin: 0, minWidth: 200, textAlign: "center" as const, textTransform: "capitalize" as const },
  navButton: { background: "#141414", border: "1px solid #3a3a3a", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "6px 14px" },
  todayButton: { background: "#fff1a8", border: 0, borderRadius: 6, color: "#000000", cursor: "pointer", fontWeight: 800, padding: "10px 16px" },
  legend: { display: "flex", flexWrap: "wrap" as const, gap: 16 },
  legendItem: { alignItems: "center", color: "#d8d2c4", display: "inline-flex", fontSize: 14, gap: 6 },
  swatch: { borderRadius: 3, display: "inline-block", height: 12, width: 12 },
  alert: { background: "#3a1414", border: "1px solid #d64545", borderRadius: 8, color: "#ffd9d9", fontWeight: 700, margin: 0, padding: "10px 14px" },
  gridScroll: { overflowX: "auto" as const },
  grid: { display: "grid", gap: 4, gridTemplateColumns: "repeat(7, minmax(44px, 1fr))", minWidth: 0 },
  weekday: { color: "#d8d2c4", fontSize: 12, fontWeight: 800, padding: "4px 2px", textAlign: "center" as const, textTransform: "uppercase" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  cell: { alignItems: "stretch", background: "#141414", border: "1px solid #3a3a3a", borderRadius: 6, color: "#f4efe4", cursor: "pointer", display: "flex", flexDirection: "column" as const, gap: 4, minHeight: 92, minWidth: 0, padding: 4, textAlign: "start" as const },
  dayHead: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 4, justifyContent: "space-between" },
  dayNumber: { fontSize: 13, fontWeight: 700 },
  bonusChip: { background: BONUS_GOLD, borderRadius: 4, color: "#000", fontSize: 10, fontWeight: 900, padding: "0 4px", whiteSpace: "nowrap" as const },
  bonusBadge: { background: BONUS_GOLD, borderRadius: 999, color: "#000", fontSize: 12, fontWeight: 900, padding: "2px 10px" },
  todayNumber: { background: "#fff1a8", borderRadius: 10, color: "#000", padding: "0 6px", alignSelf: "flex-start" },
  chips: { display: "flex", flexDirection: "column" as const, gap: 2, minWidth: 0 },
  chip: { borderRadius: 4, fontSize: 11, fontWeight: 700, overflow: "hidden", padding: "1px 4px", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  more: { color: "#d8d2c4", fontSize: 11 },
  dayPanel: { display: "grid", gap: 12, maxWidth: 820 },
  dayTitle: { color: "#fff", fontSize: 20, margin: "8px 0 0" },
  card: { background: "#141414", border: "1px solid #3a3a3a", borderInlineStartWidth: 6, borderRadius: 8, display: "grid", gap: 8, padding: 20 },
  cardHead: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 8 },
  heading: { color: "#fff", fontSize: 20, margin: 0 },
  badge: { borderRadius: 999, fontSize: 12, fontWeight: 800, padding: "2px 10px" },
  urgent: { background: "#d64545", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 900, padding: "2px 10px", textTransform: "uppercase" as const },
  meta: { color: "#d8d2c4", fontSize: 14, margin: 0 },
  strong: { color: "#fff" },
  label: { color: "#fff1a8", fontSize: 12, fontWeight: 800, margin: "0 0 4px", textTransform: "uppercase" as const },
  workerList: { color: "#f4efe4", fontSize: 14, margin: 0, paddingInlineStart: 18 },
  link: { color: "#fff1a8", fontWeight: 800, justifySelf: "start" },
  text: { color: "#faf6ec", fontSize: 16, lineHeight: 1.5, margin: 0 }
} as const;
