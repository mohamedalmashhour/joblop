"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { usePageText } from "../i18n/pageText";
import { calendarText } from "./text";

// Shared month-grid calendar used by the admin lifecycle calendar and the finance billing calendar
// (and available for any other dated-record view). It owns the month navigation, the day grid, the
// "today" marker, chip stacking with a "+N more" expander for busy days, and the legend. Callers map
// their domain records to CalendarEntry[] and supply the status legend; this component is presentation
// only and performs no data access.

export type CalendarTone = Readonly<{ bg: string; fg: string }>;

export type CalendarEntry = Readonly<{
  id: string;
  // Anchor date; the entry lands on this calendar day. Accepts a Date or an ISO string.
  date: Date | string;
  tone: CalendarTone;
  primary: string;
  secondary: string;
  href?: string;
  title?: string;
}>;

export type CalendarLegendItem = Readonly<{ label: string; tone: CalendarTone }>;

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDate(value: Date | string): Date | null {
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

export function MonthCalendar({
  entries,
  legend,
  maxChipsPerDay = 3
}: Readonly<{
  entries: readonly CalendarEntry[];
  legend: readonly CalendarLegendItem[];
  maxChipsPerDay?: number;
}>) {
  const t = usePageText(calendarText).month;
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [expandedDays, setExpandedDays] = useState<ReadonlySet<string>>(new Set());

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const d = toDate(entry.date);
      if (!d) continue;
      const key = isoDay(d);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const first = new Date(view.year, view.month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthTitle = first.toLocaleDateString(t.dateLocale, { month: "long", year: "numeric" });
  const todayKey = isoDay(today);
  const prev = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const next = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  return (
    <div>
      <div style={styles.monthBar}>
        <button aria-label={t.previousMonth} onClick={prev} style={styles.navButton} type="button">←</button>
        <strong style={styles.monthTitle}>{monthTitle}</strong>
        <button aria-label={t.nextMonth} onClick={next} style={styles.navButton} type="button">→</button>
      </div>

      <div style={styles.weekRow}>
        {t.weekdays.map((w) => (
          <span key={w} style={styles.weekday}>{w}</span>
        ))}
      </div>

      <div style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} style={styles.emptyCell} />;
          const key = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const expanded = expandedDays.has(key);
          const visible = expanded ? dayEntries : dayEntries.slice(0, maxChipsPerDay);
          const hidden = dayEntries.length - visible.length;
          return (
            <div key={key} style={{ ...styles.dayCell, ...(isToday ? styles.dayCellToday : {}) }}>
              <span style={styles.dayNumber}>{day}</span>
              <div style={styles.dayEntries}>
                {visible.map((entry) => {
                  const chipStyle: CSSProperties = { ...styles.chip, background: entry.tone.bg, color: entry.tone.fg };
                  const inner = (
                    <>
                      <span style={styles.chipPrimary}>{entry.primary}</span>
                      <span style={styles.chipSecondary}>{entry.secondary}</span>
                    </>
                  );
                  return entry.href ? (
                    <a key={entry.id} href={entry.href} style={chipStyle} title={entry.title ?? `${entry.primary} · ${entry.secondary}`}>
                      {inner}
                    </a>
                  ) : (
                    <div key={entry.id} style={chipStyle} title={entry.title ?? `${entry.primary} · ${entry.secondary}`}>
                      {inner}
                    </div>
                  );
                })}
                {hidden > 0 ? (
                  <button onClick={() => setExpandedDays((p) => new Set(p).add(key))} style={styles.moreButton} type="button">
                    {t.more(hidden)}
                  </button>
                ) : null}
                {expanded && dayEntries.length > maxChipsPerDay ? (
                  <button
                    onClick={() => setExpandedDays((p) => { const n = new Set(p); n.delete(key); return n; })}
                    style={styles.moreButton}
                    type="button"
                  >
                    {t.showLess}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {legend.length > 0 ? (
        <div style={styles.legend}>
          {legend.map((item) => (
            <span key={item.label} style={styles.legendItem}>
              <span style={{ ...styles.legendSwatch, background: item.tone.bg, border: `1px solid ${item.tone.fg}` }} />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  monthBar: { alignItems: "center", display: "flex", gap: 14, justifyContent: "center", margin: "16px 0 12px" },
  monthTitle: { color: "#f4efe4", fontSize: 18, minWidth: 180, textAlign: "center" },
  navButton: { background: "#171511", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 16, minHeight: 36, minWidth: 44, padding: "0 10px" },
  weekRow: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 },
  weekday: { color: "#b4b2a9", fontSize: 12, fontWeight: 800, textAlign: "center" },
  grid: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, 1fr)" },
  emptyCell: { borderRadius: 8, minHeight: 92 },
  dayCell: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4, minHeight: 92, padding: 6 },
  dayCellToday: { border: "1px solid #ba9044" },
  dayNumber: { color: "#f4efe4", fontSize: 12, fontWeight: 800 },
  dayEntries: { display: "flex", flexDirection: "column", gap: 4 },
  chip: { borderRadius: 6, display: "grid", gap: 1, padding: "4px 6px", textDecoration: "none" },
  chipPrimary: { fontSize: 11, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chipSecondary: { fontSize: 10, fontWeight: 600, textTransform: "capitalize" },
  moreButton: { background: "transparent", border: "1px solid rgba(248, 184, 8, 0.3)", borderRadius: 6, color: "#f4efe4", cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "3px 6px", textAlign: "left" },
  legend: { display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 },
  legendItem: { alignItems: "center", color: "#b4b2a9", display: "inline-flex", fontSize: 12, gap: 6 },
  legendSwatch: { borderRadius: 3, display: "inline-block", height: 12, width: 12 }
};
