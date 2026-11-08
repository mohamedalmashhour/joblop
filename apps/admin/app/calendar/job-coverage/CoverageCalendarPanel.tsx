"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageText } from "../../i18n/pageText";
import { BonusSection, bonusAmountLabel, formatMoney, isActiveBonus, type BonusSuggestion, type JobBonus } from "./BonusSection";
import {
  CREAM,
  EXTRA_STYLE,
  GOLD,
  GREEN,
  GREY,
  LAYERS,
  RED,
  detailHref,
  isExtraType,
  jobHref,
  layerForType,
  parseHubPayload,
  type ExtraType,
  type HubItem,
  type Layer,
  type TodayItem
} from "./hub";
import { coverageText } from "./text";
import { TodayPanel } from "./TodayPanel";

// Staff calendar: every job (coverage feed: places, workers, pay, bonus actions) plus the calendar
// hub's cancellations, disputes, payouts and pay runs, with a "Today" panel and layer filters.

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

type ExtraItem = HubItem & { type: ExtraType };

type State =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "ready"; jobs: readonly CoverageJob[] };

type HubState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: readonly ExtraItem[]; today: readonly TodayItem[] };

const COVERAGE_ORDER: readonly Coverage[] = ["open", "partly_filled", "full", "not_open"];
const COVERAGE_COLOR: Readonly<Record<Coverage, { bg: string; fg: string }>> = {
  full: { bg: GREEN, fg: "#000000" },
  partly_filled: { bg: GOLD, fg: "#000000" },
  open: { bg: RED, fg: "#000000" },
  not_open: { bg: GREY, fg: "#000000" }
};
const LEGEND_EXTRAS: readonly ExtraType[] = ["cancellation", "dispute", "payout"];
const MAX_CHIPS = 4;
const NEEDS_WORKERS_WINDOW_MS = 48 * 3_600_000;
const ALL_LAYERS_ON: Readonly<Record<Layer, boolean>> = {
  jobs: true, needsWorkers: true, bonuses: true, cancellations: true, disputes: true, pay: true
};

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
  return `${formatMoney(minor)} ${perHour}`;
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function needsWorkers(job: CoverageJob, now: number): boolean {
  if (job.coverage !== "open" && job.coverage !== "partly_filled") return false;
  const start = Date.parse(job.startAt);
  return start >= now && start - now <= NEEDS_WORKERS_WINDOW_MS;
}

function hasBonus(job: CoverageJob): boolean {
  return Boolean(job.bonus) && job.bonus?.status !== "cancelled";
}

function jobVisible(job: CoverageJob, layers: Readonly<Record<Layer, boolean>>): boolean {
  if (layers.jobs) return true;
  if (layers.needsWorkers && (job.coverage === "open" || job.coverage === "partly_filled")) return true;
  return layers.bonuses && hasBonus(job);
}

function humanize(code: string): string {
  return code.replaceAll("_", " ");
}

function groupByDay<T>(list: readonly T[], startOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const key = dayKey(new Date(startOf(item)));
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }
  for (const bucket of map.values()) bucket.sort((a, b) => Date.parse(startOf(a)) - Date.parse(startOf(b)));
  return map;
}

export function CoverageCalendarPanel() {
  const t = usePageText(coverageText);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(() => dayKey(new Date()));
  const [state, setState] = useState<State>({ status: "loading" });
  const [hub, setHub] = useState<HubState>({ status: "loading" });
  const [layers, setLayers] = useState<Readonly<Record<Layer, boolean>>>(ALL_LAYERS_ON);
  const [now, setNow] = useState(() => Date.now());

  const grid = useMemo(() => monthGrid(month), [month]);

  const loadHub = useCallback(async (query: string) => {
    try {
      const response = await fetch(`/api/calendar-hub?${query}`, { cache: "no-store" });
      if (!response.ok) return setHub({ status: "error" });
      const payload = parseHubPayload(await response.json());
      setHub({
        status: "ready",
        items: payload.items.filter((item): item is ExtraItem => isExtraType(item.type)),
        today: payload.today
      });
    } catch {
      setHub({ status: "error" });
    }
  }, []);

  const loadCoverage = useCallback(async (query: string, silent: boolean) => {
    if (!silent) setState({ status: "loading" });
    try {
      const response = await fetch(`/api/calendar/job-coverage?${query}`, { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { jobs?: CoverageJob[] };
      setNow(Date.now());
      setState({ status: "ready", jobs: Array.isArray(payload.jobs) ? payload.jobs : [] });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  // `silent` keeps the current calendar on screen while it refreshes (after a bonus action).
  const load = useCallback(async (silent = false) => {
    const from = grid[0]!;
    const last = grid[grid.length - 1]!;
    const to = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() }).toString();
    if (!silent) setHub((current) => (current.status === "ready" ? current : { status: "loading" }));
    await Promise.all([loadCoverage(query, silent), loadHub(query)]);
  }, [grid, loadCoverage, loadHub]);

  useEffect(() => { void load(); }, [load]);
  const reloadQuietly = useCallback(() => { void load(true); }, [load]);

  const allJobs = useMemo(() => (state.status === "ready" ? state.jobs : []), [state]);
  const allExtras = useMemo(() => (hub.status === "ready" ? hub.items : []), [hub]);
  const visibleJobs = useMemo(() => allJobs.filter((job) => jobVisible(job, layers)), [allJobs, layers]);
  const visibleExtras = useMemo(() => allExtras.filter((item) => layers[layerForType(item.type)]), [allExtras, layers]);
  const jobsByDay = useMemo(() => groupByDay(visibleJobs, (job) => job.startAt), [visibleJobs]);
  const extrasByDay = useMemo(() => groupByDay(visibleExtras, (item) => item.startAt), [visibleExtras]);
  const allByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of allJobs) counts.set(dayKey(new Date(job.startAt)), (counts.get(dayKey(new Date(job.startAt))) ?? 0) + 1);
    for (const item of allExtras) counts.set(dayKey(new Date(item.startAt)), (counts.get(dayKey(new Date(item.startAt))) ?? 0) + 1);
    return counts;
  }, [allJobs, allExtras]);

  const urgentCount = allJobs.filter((job) => needsWorkers(job, now)).length;
  const todayKey = dayKey(new Date());
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedJobs = selected ? jobsByDay.get(selected) ?? [] : [];
  const selectedExtras = selected ? extrasByDay.get(selected) ?? [] : [];
  const selectedTotal = selected ? allByDay.get(selected) ?? 0 : 0;
  const selectedLabel = selected
    ? new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "full" })
    : "";

  const shiftMonth = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  const goToday = () => {
    const today = new Date();
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(dayKey(today));
  };
  const pickDay = (iso: string) => {
    const date = new Date(iso);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelected(dayKey(date));
  };
  const toggleLayer = (layer: Layer) => setLayers((current) => ({ ...current, [layer]: !current[layer] }));

  return (
    <section style={styles.wrap}>
      <TodayPanel
        items={hub.status === "ready" ? hub.today : []}
        onPickDay={pickDay}
        status={hub.status}
        t={t}
      />

      {urgentCount > 0 && hub.status !== "ready" ? (
        <p role="status" style={styles.alert}>{t.needsWorkersSummary(urgentCount)}</p>
      ) : null}

      <div aria-label={t.filtersTitle} role="group" style={styles.filters}>
        {LAYERS.map((layer) => (
          <button
            aria-pressed={layers[layer]}
            key={layer}
            onClick={() => toggleLayer(layer)}
            style={{ ...styles.filterChip, ...(layers[layer] ? styles.filterChipOn : null) }}
            type="button"
          >
            {layers[layer] ? "✓ " : ""}{t.layers[layer] ?? layer}
          </button>
        ))}
      </div>

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

      {state.status === "loading" ? <p style={styles.text}>{t.loading}</p> : null}
      {state.status === "denied" ? <p style={styles.text}>{t.denied}</p> : null}
      {state.status === "error" ? <p style={styles.text}>{t.error}</p> : null}

      <div style={styles.gridScroll}>
        <div aria-label={monthLabel} role="group" style={styles.grid}>
          {t.weekdays.map((name) => (
            <div key={name} aria-hidden="true" style={styles.weekday}>{name}</div>
          ))}
          {grid.map((date) => {
            const key = dayKey(date);
            const jobs = jobsByDay.get(key) ?? [];
            const extras = extrasByDay.get(key) ?? [];
            const total = jobs.length + extras.length;
            const inMonth = date.getMonth() === month.getMonth();
            const isSelected = key === selected;
            const hasUrgent = jobs.some((job) => needsWorkers(job, now));
            const dayHasBonus = jobs.some((job) => isActiveBonus(job.bonus));
            const shownJobs = jobs.slice(0, MAX_CHIPS);
            const shownExtras = extras.slice(0, Math.max(0, MAX_CHIPS - shownJobs.length));
            return (
              <button
                aria-label={`${date.toLocaleDateString(undefined, { dateStyle: "long" })}, ${t.dayItems(total)}${dayHasBonus ? `, ${t.bonusLegend}` : ""}`}
                aria-pressed={isSelected}
                key={key}
                onClick={() => setSelected(key)}
                style={{
                  ...styles.cell,
                  opacity: inMonth ? 1 : 0.45,
                  borderColor: isSelected ? "#fff1a8" : hasUrgent ? RED : "#3a3a3a",
                  boxShadow: isSelected ? "0 0 0 1px #fff1a8 inset" : "none"
                }}
                type="button"
              >
                <span style={styles.dayHead}>
                  <span style={{ ...styles.dayNumber, ...(key === todayKey ? styles.todayNumber : null) }}>{date.getDate()}</span>
                  {dayHasBonus ? <span aria-hidden="true" style={styles.bonusChip}>★</span> : null}
                </span>
                <span style={styles.chips}>
                  {shownJobs.map((job) => (
                    <span
                      key={job.jobRequestId}
                      style={{ ...styles.chip, background: COVERAGE_COLOR[job.coverage]?.bg ?? GREY, color: COVERAGE_COLOR[job.coverage]?.fg ?? "#000" }}
                      title={`${job.role} · ${t.coverage[job.coverage] ?? job.coverage}${isActiveBonus(job.bonus) ? ` · ${t.bonusChip}` : ""}`}
                    >
                      {isActiveBonus(job.bonus) ? "★ " : ""}{job.placesTaken}/{job.placesAsked} {job.role}
                    </span>
                  ))}
                  {shownExtras.map((item) => {
                    const look = EXTRA_STYLE[item.type];
                    return (
                      <span
                        key={item.id}
                        style={{
                          ...styles.chip,
                          background: look.bg,
                          border: `1px solid ${look.border}`,
                          color: look.fg,
                          textDecoration: look.strike ? "line-through" : "none"
                        }}
                        title={`${t.types[item.type] ?? item.type} · ${item.title}`}
                      >
                        {look.symbol} {item.title || t.types[item.type]}
                      </span>
                    );
                  })}
                  {total > shownJobs.length + shownExtras.length ? (
                    <span style={styles.more}>{t.moreJobs(total - shownJobs.length - shownExtras.length)}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
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
        {LEGEND_EXTRAS.map((type) => {
          const look = EXTRA_STYLE[type];
          return (
            <span key={type} role="listitem" style={styles.legendItem}>
              <span
                aria-hidden="true"
                style={{ ...styles.legendSymbol, background: look.bg, border: `1px solid ${look.border}`, color: look.fg }}
              >
                {look.symbol}
              </span>
              {t.typeLegend[type]}
            </span>
          );
        })}
      </div>

      <section aria-live="polite" style={styles.dayPanel}>
        {selected ? <h2 style={styles.dayTitle}>{selectedLabel}</h2> : null}
        {!selected ? <p style={styles.text}>{t.selectDay}</p> : null}
        {selected && state.status === "ready" && selectedTotal === 0 ? <p style={styles.text}>{t.noItems}</p> : null}
        {selected && selectedTotal > 0 && selectedJobs.length + selectedExtras.length === 0 ? (
          <p style={styles.text}>{t.hiddenByFilters}</p>
        ) : null}
        {selectedJobs.map((job) => {
          const urgent = needsWorkers(job, now);
          const color = COVERAGE_COLOR[job.coverage] ?? COVERAGE_COLOR.not_open;
          return (
            <article
              key={job.jobRequestId}
              style={{ ...styles.card, borderColor: urgent ? RED : "#3a3a3a", borderInlineStartColor: color.bg }}
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
              <a aria-label={`${t.openJob} ${job.jobCode}`} href={jobHref(job.jobRequestId)} style={styles.link}>
                {job.jobCode}
              </a>
            </article>
          );
        })}
        {selectedExtras.map((item) => {
          const look = EXTRA_STYLE[item.type];
          const href = detailHref(item.type, item.jobRequestId);
          return (
            <article key={item.id} style={{ ...styles.extraCard, borderInlineStartColor: look.border }}>
              <div style={styles.cardHead}>
                <span aria-hidden="true" style={{ ...styles.legendSymbol, background: look.bg, border: `1px solid ${look.border}`, color: look.fg }}>
                  {look.symbol}
                </span>
                <span style={styles.extraType}>{t.types[item.type] ?? item.type}</span>
                {item.status ? (
                  <span style={styles.extraStatus}>{t.statuses[item.status] ?? humanize(item.status)}</span>
                ) : null}
              </div>
              <h3 style={{ ...styles.extraHeading, textDecoration: look.strike ? "line-through" : "none" }}>
                {item.title || t.types[item.type]}
              </h3>
              {item.subtitle ? <p style={styles.extraMeta}>{item.subtitle}</p> : null}
              <p style={styles.extraMeta}>
                {time(item.startAt)}
                {item.endAt ? `–${time(item.endAt)}` : ""}
                {item.amountMinor !== null ? ` · ${t.amount}: ${formatMoney(item.amountMinor)}` : ""}
              </p>
              {href ? (
                <a href={href} style={styles.extraLink}>{t.openDetail[item.type] ?? t.open}</a>
              ) : null}
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
  month: { color: "#fff", flex: "1 1 160px", fontSize: 22, margin: 0, minWidth: 0, textAlign: "center" as const, textTransform: "capitalize" as const },
  navButton: { background: "#141414", border: "1px solid #3a3a3a", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "6px 14px" },
  todayButton: { background: "#fff1a8", border: 0, borderRadius: 6, color: "#000000", cursor: "pointer", fontWeight: 800, padding: "10px 16px" },
  filters: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  filterChip: { background: "transparent", border: "1px solid #3a3a3a", borderRadius: 999, color: "#d8d2c4", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "8px 14px" },
  filterChipOn: { background: GOLD, borderColor: GOLD, color: "#000000" },
  legend: { display: "flex", flexWrap: "wrap" as const, gap: 12 },
  legendItem: { alignItems: "center", color: "#d8d2c4", display: "inline-flex", fontSize: 13, gap: 6 },
  legendSymbol: { alignItems: "center", borderRadius: 4, display: "inline-flex", fontSize: 11, fontWeight: 900, height: 16, justifyContent: "center", minWidth: 16, padding: "0 3px" },
  swatch: { borderRadius: 3, display: "inline-block", height: 12, width: 12 },
  alert: { background: "#3a1414", border: `1px solid ${RED}`, borderRadius: 8, color: "#ffd9d9", fontWeight: 700, margin: 0, padding: "10px 14px" },
  gridScroll: { overflowX: "auto" as const },
  grid: { display: "grid", gap: 4, gridTemplateColumns: "repeat(7, minmax(40px, 1fr))", minWidth: 0 },
  weekday: { color: "#d8d2c4", fontSize: 12, fontWeight: 800, padding: "4px 2px", textAlign: "center" as const, textTransform: "uppercase" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  cell: { alignItems: "stretch", background: "#141414", border: "1px solid #3a3a3a", borderRadius: 6, color: CREAM, cursor: "pointer", display: "flex", flexDirection: "column" as const, gap: 4, minHeight: 92, minWidth: 0, padding: 4, textAlign: "start" as const },
  dayHead: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 4, justifyContent: "space-between" },
  dayNumber: { fontSize: 13, fontWeight: 700 },
  bonusChip: { background: GOLD, borderRadius: 4, color: "#000", fontSize: 10, fontWeight: 900, padding: "0 4px", whiteSpace: "nowrap" as const },
  bonusBadge: { background: GOLD, borderRadius: 999, color: "#000", fontSize: 12, fontWeight: 900, padding: "2px 10px" },
  todayNumber: { background: "#fff1a8", borderRadius: 10, color: "#000", padding: "0 6px", alignSelf: "flex-start" },
  chips: { display: "flex", flexDirection: "column" as const, gap: 2, minWidth: 0 },
  chip: { borderRadius: 4, fontSize: 11, fontWeight: 700, overflow: "hidden", padding: "1px 4px", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  more: { color: "#d8d2c4", fontSize: 11 },
  dayPanel: { display: "grid", gap: 12, maxWidth: 820 },
  dayTitle: { color: "#fff", fontSize: 20, margin: "8px 0 0" },
  card: { background: "#141414", border: "1px solid #3a3a3a", borderInlineStartWidth: 6, borderRadius: 8, display: "grid", gap: 8, padding: "16px clamp(12px, 4vw, 20px)" },
  cardHead: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 8 },
  heading: { color: "#fff", fontSize: 20, margin: 0 },
  badge: { borderRadius: 999, fontSize: 12, fontWeight: 800, padding: "2px 10px" },
  urgent: { background: RED, borderRadius: 999, color: "#000", fontSize: 12, fontWeight: 900, padding: "2px 10px", textTransform: "uppercase" as const },
  meta: { color: "#d8d2c4", fontSize: 14, margin: 0 },
  strong: { color: "#fff" },
  label: { color: "#fff1a8", fontSize: 12, fontWeight: 800, margin: "0 0 4px", textTransform: "uppercase" as const },
  workerList: { color: CREAM, fontSize: 14, margin: 0, paddingInlineStart: 18 },
  link: { color: "#fff1a8", fontWeight: 800, justifySelf: "start" },
  extraCard: { background: "#ffffff", borderInlineStart: "6px solid", borderRadius: 8, color: "#1a1a1a", display: "grid", gap: 6, padding: "14px clamp(12px, 4vw, 20px)" },
  extraType: { fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  extraStatus: { background: CREAM, border: `1px solid ${GREY}`, borderRadius: 999, fontSize: 12, fontWeight: 700, padding: "1px 8px" },
  extraHeading: { fontSize: 18, margin: 0, overflowWrap: "anywhere" as const },
  extraMeta: { color: "#3a3a3a", fontSize: 14, margin: 0, overflowWrap: "anywhere" as const },
  extraLink: { color: "#000000", fontWeight: 800, justifySelf: "start" },
  text: { color: "#faf6ec", fontSize: 16, lineHeight: 1.5, margin: 0 }
} as const;
