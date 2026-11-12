"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fmtLocale, useLocale, useT } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";
import {
  dayKey,
  gridRange,
  groupByDay,
  hrefFor,
  hubColors,
  hubLayers,
  isCancelled,
  layerOf,
  monthGrid,
  parseHubPayload,
  toneColor,
  toneLabelKey,
  toneOf,
  type HubItem,
  type HubLayer,
  type HubSeverity,
  type HubTodayItem,
  type HubTone
} from "./hubCalendar";

type State =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "ready"; items: readonly HubItem[]; today: readonly HubTodayItem[] };

const layerKey: Readonly<Record<HubLayer, MessageKey>> = {
  jobs: "hub.filter.jobs",
  bonus: "hub.filter.bonus",
  invoices: "hub.filter.invoices",
  cancelled: "hub.filter.cancelled"
};

const severityKey: Readonly<Record<HubSeverity, MessageKey>> = {
  urgent: "hub.severity.urgent",
  attention: "hub.severity.attention",
  info: "hub.severity.info"
};

const severityColor: Readonly<Record<HubSeverity, string>> = {
  urgent: hubColors.red,
  attention: hubColors.gold,
  info: hubColors.cream
};

const legendTones: readonly HubTone[] = ["review", "open", "partly", "full", "bonus", "invoice", "cancelled"];
const MAX_DOTS = 3;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Calendar hub for employers: Today panel, filter chips, a Monday-first month grid, the chosen
// day's cards and a legend. Data comes from GET /api/calendar-hub (the employer's organization only).
export function MyCalendarPanel() {
  const t = useT();
  const uiLocale = useLocale();
  const locale = fmtLocale(uiLocale);
  const rtl = uiLocale === "ar";
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [layers, setLayers] = useState<ReadonlySet<HubLayer>>(() => new Set(hubLayers));
  const [state, setState] = useState<State>({ status: "loading" });
  const generation = useRef(0);

  const load = useCallback(async (forMonth: Date) => {
    const current = ++generation.current;
    setState((previous) => (previous.status === "ready" ? previous : { status: "loading" }));
    const { from, to } = gridRange(forMonth);
    try {
      const response = await fetch(
        `/api/calendar-hub?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" }
      );
      if (current !== generation.current) return;
      if (response.status === 401) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const parsed = parseHubPayload(await response.json().catch(() => null));
      if (current !== generation.current) return;
      setState(parsed ? { status: "ready", items: parsed.items, today: parsed.today } : { status: "error" });
    } catch {
      if (current === generation.current) setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [load, month]);

  const goToMonth = (next: Date) => {
    const target = startOfMonth(next);
    setMonth(target);
    const now = new Date();
    setSelected(
      target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth()
        ? dayKey(now)
        : dayKey(target)
    );
  };

  const toggleLayer = (layer: HubLayer) =>
    setLayers((previous) => {
      const next = new Set(previous);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });

  const items = state.status === "ready" ? state.items : [];
  const visibleItems = useMemo(() => items.filter((item) => layers.has(layerOf(item))), [items, layers]);
  const byDay = useMemo(() => groupByDay(visibleItems), [visibleItems]);
  const days = useMemo(() => monthGrid(month), [month]);
  const todayKey = dayKey(new Date());

  const money = (minor: number) =>
    (minor / 100).toLocaleString(locale, { style: "currency", currency: "CAD" });
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });

  const header = (
    <header style={look.header}>
      <p style={look.eyebrow}>{t("hub.eyebrow")}</p>
      <h1 style={look.title}>{t("hub.title")}</h1>
      <p style={look.lede}>{t("hub.lede")}</p>
    </header>
  );

  if (state.status === "denied") {
    return (
      <section style={look.page}>
        {header}
        <article style={look.notice}>
          <p style={look.noticeText}>{t("hub.signin")}</p>
          <a href="/signin" style={look.goldButton}>{t("hub.signinButton")}</a>
        </article>
      </section>
    );
  }

  const monthLabel = month.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = days.slice(0, 7).map((d) => d.toLocaleDateString(locale, { weekday: "short" }));
  const selectedItems = byDay.get(selected) ?? [];
  const selectedDate = days.find((d) => dayKey(d) === selected) ?? null;

  return (
    <section style={look.page}>
      {header}

      <section aria-labelledby="hub-today-title" style={look.todayPanel}>
        <h2 id="hub-today-title" style={look.todayTitle}>{t("hub.today.title")}</h2>
        {state.status === "loading" ? (
          <p aria-live="polite" style={look.muted}>{t("hub.loading")}</p>
        ) : state.status === "error" ? (
          <div aria-live="polite" style={look.inline}>
            <p style={look.muted}>{t("hub.error")}</p>
            <button onClick={() => void load(month)} style={look.ghostButton} type="button">
              {t("hub.retry")}
            </button>
          </div>
        ) : state.today.length === 0 ? (
          <p style={look.muted}>{t("hub.today.empty")}</p>
        ) : (
          <ul style={look.todayList}>
            {state.today.map((entry, index) => {
              const href = hrefFor(entry);
              const body = (
                <>
                  <span style={{ ...look.severity, background: severityColor[entry.severity] }}>
                    {t(severityKey[entry.severity])}
                  </span>
                  <strong style={look.todayItemTitle}>{entry.title}</strong>
                  {entry.detail ? <span style={look.todayDetail}>{entry.detail}</span> : null}
                </>
              );
              const box: CSSProperties = { ...look.todayItem, borderInlineStartColor: severityColor[entry.severity] };
              return (
                <li key={`${entry.type}-${entry.refId ?? entry.jobRequestId ?? index}-${index}`}>
                  {href ? <a href={href} style={box}>{body}</a> : <div style={box}>{body}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div aria-label={t("hub.filter.label")} role="group" style={look.chips}>
        {hubLayers.map((layer) => {
          const on = layers.has(layer);
          return (
            <button
              aria-pressed={on}
              key={layer}
              onClick={() => toggleLayer(layer)}
              style={on ? look.chipOn : look.chip}
              type="button"
            >
              {layer === "bonus" ? "★ " : layer === "invoices" ? "$ " : ""}
              {t(layerKey[layer])}
            </button>
          );
        })}
      </div>

      <div style={look.monthBar}>
        <button
          aria-label={t("hub.prevMonth")}
          onClick={() => goToMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          style={look.navButton}
          type="button"
        >
          {rtl ? "›" : "‹"}
        </button>
        <strong aria-live="polite" style={look.monthLabel}>{monthLabel}</strong>
        <button
          aria-label={t("hub.nextMonth")}
          onClick={() => goToMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          style={look.navButton}
          type="button"
        >
          {rtl ? "‹" : "›"}
        </button>
        <button onClick={() => goToMonth(new Date())} style={look.ghostButton} type="button">
          {t("hub.goToday")}
        </button>
      </div>

      <div aria-hidden="true" style={look.weekRow}>
        {weekdays.map((label, index) => (
          <span key={`wd-${index}`} style={look.weekday}>{label}</span>
        ))}
      </div>
      <div style={look.grid}>
        {days.map((day) => {
          const key = dayKey(day);
          const list = byDay.get(key) ?? [];
          const inMonth = day.getMonth() === month.getMonth();
          const isSelected = key === selected;
          const hasBonus = list.some((item) => item.type === "bonus_offer" || item.bonus !== null);
          const hasInvoice = list.some((item) => item.type === "invoice_due");
          const dots = list.filter((item) => item.type !== "bonus_offer" && item.type !== "invoice_due");
          const dateLabel = day.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
          return (
            <button
              aria-label={list.length ? `${dateLabel}, ${t("hub.day.count", { count: list.length })}` : dateLabel}
              aria-pressed={isSelected}
              key={key}
              onClick={() => setSelected(key)}
              style={{
                ...look.cell,
                ...(inMonth ? null : look.cellOutside),
                ...(key === todayKey ? look.cellToday : null),
                ...(isSelected ? look.cellSelected : null)
              }}
              type="button"
            >
              <span style={look.cellNumber}>{day.getDate()}</span>
              <span style={look.marks}>
                {dots.slice(0, MAX_DOTS).map((item) => (
                  <span key={item.id} style={{ ...look.dot, background: toneColor[toneOf(item)] }} />
                ))}
                {dots.length > MAX_DOTS ? <span style={look.more}>+{dots.length - MAX_DOTS}</span> : null}
              </span>
              <span style={look.marks}>
                {hasBonus ? <span style={look.star}>★</span> : null}
                {hasInvoice ? <span style={look.dollar}>$</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      <section aria-labelledby="hub-day-title" style={look.dayPanel}>
        <h2 id="hub-day-title" style={look.dayTitle}>
          {selectedDate
            ? selectedDate.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
            : ""}
        </h2>
        {state.status === "ready" && visibleItems.length === 0 ? (
          <p style={look.muted}>{t("hub.empty")}</p>
        ) : null}
        {selectedItems.length === 0 ? (
          <p style={look.muted}>{t("hub.day.empty")}</p>
        ) : (
          <ul style={look.cardList}>
            {selectedItems.map((item) => (
              <li key={item.id}>
                <HubCard item={item} money={money} time={time} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="hub-legend-title" style={look.legend}>
        <h2 id="hub-legend-title" style={look.legendTitle}>{t("hub.legend.title")}</h2>
        <ul style={look.legendList}>
          {legendTones.map((tone) => (
            <li key={tone} style={look.legendItem}>
              {tone === "bonus" ? (
                <span style={look.star}>★</span>
              ) : tone === "invoice" ? (
                <span style={look.dollar}>$</span>
              ) : (
                <span style={{ ...look.dot, background: toneColor[tone] }} />
              )}
              <span style={tone === "cancelled" ? look.struck : undefined}>{t(toneLabelKey[tone])}</span>
            </li>
          ))}
        </ul>
        <a href="/employer/calendar" style={look.textLink}>{t("hub.listView")}</a>
      </section>
    </section>
  );
}

function HubCard({
  item,
  money,
  time
}: Readonly<{ item: HubItem; money: (minor: number) => string; time: (iso: string) => string }>) {
  const t = useT();
  const tone = toneOf(item);
  const cancelled = isCancelled(item);
  const href = hrefFor(item);
  const lines: string[] = [];
  const when = item.endAt ? `${time(item.startAt)}–${time(item.endAt)}` : time(item.startAt);

  if (item.type === "invoice_due") {
    if (item.amountMinor !== null) lines.push(t("hub.invoice.amount", { amount: money(item.amountMinor) }));
  } else if (item.type === "bonus_offer") {
    const bonus = item.bonus ?? (item.amountMinor !== null ? { kind: "one_time" as const, amountMinor: item.amountMinor } : null);
    if (bonus) lines.push(bonusText(t, bonus.kind, money(bonus.amountMinor)));
    lines.push(t("hub.bonus.answer"));
  } else {
    if (item.placesAsked !== null) {
      lines.push(t("hub.places", { taken: item.placesTaken ?? 0, asked: item.placesAsked }));
    }
    if (item.subtitle) lines.push(t("hub.coming", { names: item.subtitle }));
    if (item.amountMinor !== null) lines.push(t("hub.rate", { amount: money(item.amountMinor) }));
    if (item.bonus) lines.push(`★ ${bonusText(t, item.bonus.kind, money(item.bonus.amountMinor))}`);
  }

  const body = (
    <>
      <span style={look.cardTop}>
        <span style={{ ...look.pill, background: toneColor[tone] }}>
          {tone === "bonus" ? "★ " : tone === "invoice" ? "$ " : ""}
          {t(toneLabelKey[tone])}
        </span>
        <span style={look.cardTime}>{when}</span>
      </span>
      <strong style={cancelled ? { ...look.cardTitle, ...look.struck } : look.cardTitle}>
        {item.title || t(toneLabelKey[tone])}
      </strong>
      {lines.map((line) => (
        <span key={line} style={look.cardLine}>{line}</span>
      ))}
    </>
  );
  const box: CSSProperties = { ...look.card, borderInlineStartColor: toneColor[tone] };
  return href ? <a href={href} style={box}>{body}</a> : <div style={box}>{body}</div>;
}

function bonusText(t: ReturnType<typeof useT>, kind: "hourly" | "transport" | "one_time", amount: string): string {
  return t(kind === "hourly" ? "hub.bonus.hourly" : kind === "transport" ? "hub.bonus.transport" : "hub.bonus.oneTime", { amount });
}

const ink = "#15110b";

const look: Record<string, CSSProperties> = {
  page: { display: "grid", gap: 18, margin: "0 auto", maxWidth: 980, padding: "20px 16px 40px" },
  header: { display: "grid", gap: 6 },
  eyebrow: { color: hubColors.gold, fontSize: 12, fontWeight: 900, letterSpacing: 0, margin: 0, textTransform: "uppercase" },
  title: { color: hubColors.cream, fontSize: "clamp(26px, 6vw, 40px)", lineHeight: 1.1, margin: 0 },
  lede: { color: "#d8d0bf", fontSize: 15, lineHeight: 1.5, margin: 0, maxWidth: 720 },
  notice: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.3)", borderRadius: 12, display: "grid", gap: 12, padding: 18 },
  noticeText: { color: hubColors.cream, margin: 0 },
  goldButton: { background: hubColors.gold, borderRadius: 999, color: ink, display: "inline-flex", fontWeight: 800, justifySelf: "start", minHeight: 44, alignItems: "center", padding: "0 20px", textDecoration: "none" },
  ghostButton: { background: "transparent", border: "1px solid rgba(248, 184, 8, 0.45)", borderRadius: 999, color: hubColors.cream, cursor: "pointer", fontSize: 14, fontWeight: 700, minHeight: 40, padding: "0 16px" },
  todayPanel: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.35)", borderRadius: 14, display: "grid", gap: 10, padding: 14 },
  todayTitle: { color: hubColors.gold, fontSize: 18, margin: 0 },
  todayList: { display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 },
  todayItem: { background: "#ffffff", borderInlineStart: "6px solid", borderRadius: 10, color: ink, display: "grid", gap: 4, padding: "10px 12px", textDecoration: "none" },
  todayItemTitle: { fontSize: 15 },
  todayDetail: { color: "#4a4334", fontSize: 13 },
  severity: { borderRadius: 999, color: ink, fontSize: 11, fontWeight: 800, justifySelf: "start", padding: "2px 8px" },
  muted: { color: "#d8d0bf", fontSize: 14, margin: 0 },
  inline: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { background: "transparent", border: "1px solid rgba(244, 239, 228, 0.35)", borderRadius: 999, color: "#d8d0bf", cursor: "pointer", fontSize: 13, fontWeight: 700, minHeight: 40, padding: "0 14px", textDecoration: "line-through" },
  chipOn: { background: hubColors.gold, border: `1px solid ${hubColors.gold}`, borderRadius: 999, color: ink, cursor: "pointer", fontSize: 13, fontWeight: 800, minHeight: 40, padding: "0 14px" },
  monthBar: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  monthLabel: { color: hubColors.cream, fontSize: 18, minWidth: 150, textAlign: "center", textTransform: "capitalize" },
  navButton: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.35)", borderRadius: 10, color: hubColors.cream, cursor: "pointer", fontSize: 20, minHeight: 44, minWidth: 44 },
  weekRow: { display: "grid", gap: 4, gridTemplateColumns: "repeat(7, minmax(0, 1fr))" },
  weekday: { color: "#bfb6a3", fontSize: 11, fontWeight: 800, textAlign: "center", textTransform: "uppercase" },
  grid: { display: "grid", gap: 4, gridTemplateColumns: "repeat(7, minmax(0, 1fr))" },
  cell: { alignContent: "start", background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: hubColors.cream, cursor: "pointer", display: "grid", gap: 3, justifyItems: "center", minHeight: 58, minWidth: 0, padding: "5px 2px" },
  cellOutside: { opacity: 0.45 },
  cellToday: { border: `2px solid ${hubColors.gold}` },
  cellSelected: { background: "#2a2114", boxShadow: `inset 0 0 0 2px ${hubColors.cream}` },
  cellNumber: { fontSize: 13, fontWeight: 800 },
  marks: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", minHeight: 10 },
  dot: { borderRadius: 999, display: "inline-block", height: 8, width: 8 },
  more: { color: "#d8d0bf", fontSize: 9, fontWeight: 800 },
  star: { color: hubColors.gold, fontSize: 12, fontWeight: 900, lineHeight: 1 },
  dollar: { background: hubColors.cream, borderRadius: 999, color: ink, fontSize: 10, fontWeight: 900, lineHeight: "14px", minWidth: 14, textAlign: "center" },
  dayPanel: { display: "grid", gap: 10 },
  dayTitle: { color: hubColors.cream, fontSize: 18, margin: 0, textTransform: "capitalize" },
  cardList: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", listStyle: "none", margin: 0, padding: 0 },
  card: { background: "#ffffff", borderInlineStart: "6px solid", borderRadius: 12, color: ink, display: "grid", gap: 5, height: "100%", padding: "12px 14px", textDecoration: "none" },
  cardTop: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  pill: { borderRadius: 999, color: ink, fontSize: 11, fontWeight: 800, padding: "2px 8px" },
  cardTime: { color: "#4a4334", fontSize: 12, fontWeight: 700 },
  cardTitle: { fontSize: 16 },
  cardLine: { color: "#3a3326", fontSize: 13, lineHeight: 1.4 },
  struck: { textDecoration: "line-through" },
  legend: { borderTop: "1px solid rgba(248, 184, 8, 0.2)", display: "grid", gap: 8, paddingTop: 12 },
  legendTitle: { color: "#bfb6a3", fontSize: 13, fontWeight: 800, margin: 0 },
  legendList: { display: "flex", flexWrap: "wrap", gap: "6px 14px", listStyle: "none", margin: 0, padding: 0 },
  legendItem: { alignItems: "center", color: "#d8d0bf", display: "inline-flex", fontSize: 12, gap: 6 },
  textLink: { color: hubColors.gold, fontSize: 14, fontWeight: 700, justifySelf: "start" }
};
