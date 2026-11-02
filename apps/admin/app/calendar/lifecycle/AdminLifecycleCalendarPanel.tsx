"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { parseAdminCalendarList, type AdminCalendarDto } from "@rwos/shared";

// Admin full-lifecycle calendar: every non-draft request across organizations, placed on a month
// grid by its shift date and coloured by lifecycle status (submitted → under review → published →
// assigned → in progress → completed / cancelled). Unlike the review calendar, which shows only the
// intake queue, this spans a request from submission through to closure. Read-only, admin-gated.

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "denied" | "error" }
  | { status: "ready"; data: readonly AdminCalendarDto[] };

function statusTone(status: AdminCalendarDto["status"]): { bg: string; fg: string } {
  switch (status) {
    case "completed":
      return { bg: "#143d2b", fg: "#9fe1cb" };
    case "assigned":
    case "in_progress":
      return { bg: "#0f3d31", fg: "#5dcaa5" };
    case "published":
      return { bg: "#10324f", fg: "#b5d4f4" };
    case "under_review":
      return { bg: "#3f2a08", fg: "#fac775" };
    case "cancelled":
      return { bg: "#3f1414", fg: "#f7c1c1" };
    default:
      return { bg: "#26262a", fg: "#d3d1c7" };
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MAX_CHIPS_PER_DAY = 3;

export function AdminLifecycleCalendarPanel() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [expandedDays, setExpandedDays] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/calendar/lifecycle", { cache: "no-store" });
        if (!response.ok) {
          if (active) setState({ status: response.status === 401 ? "denied" : "error" });
          return;
        }
        const payload = await response.json();
        const data = parseAdminCalendarList(payload);
        if (active) setState({ status: "ready", data });
      } catch {
        if (active) setState({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, AdminCalendarDto[]>();
    if (state.status !== "ready") return map;
    for (const request of state.data) {
      const parsed = new Date(request.startAt);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = isoDay(parsed);
      const list = map.get(key) ?? [];
      list.push(request);
      map.set(key, list);
    }
    return map;
  }, [state]);

  if (state.status === "loading") return <p style={styles.state}>Loading lifecycle calendar…</p>;
  if (state.status === "denied") return <p style={styles.state}>An authenticated administrator session is required.</p>;
  if (state.status === "error") return <p style={styles.state}>The lifecycle calendar could not be loaded.</p>;

  const first = new Date(view.year, view.month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const monthTitle = first.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  const todayKey = isoDay(today);

  const prev = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const next = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  return (
    <section aria-labelledby="lifecycle-calendar-title" style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h2 id="lifecycle-calendar-title" style={styles.h2}>Lifecycle calendar</h2>
          <p style={styles.help}>
            Every non-draft request across organizations, placed on its shift date and coloured by
            status — from submission through to closure. Read only.
          </p>
        </div>
        <span style={styles.badge}>Read only</span>
      </div>

      <div style={styles.monthBar}>
        <button aria-label="Previous month" onClick={prev} style={styles.navButton} type="button">←</button>
        <strong style={styles.monthTitle}>{monthTitle}</strong>
        <button aria-label="Next month" onClick={next} style={styles.navButton} type="button">→</button>
      </div>

      <div style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <span key={w} style={styles.weekday}>{w}</span>
        ))}
      </div>

      <div style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} style={styles.emptyCell} />;
          const key = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayRequests = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={key} style={{ ...styles.dayCell, ...(isToday ? styles.dayCellToday : {}) }}>
              <span style={styles.dayNumber}>{day}</span>
              <div style={styles.dayRequests}>
                {(() => {
                  const expanded = expandedDays.has(key);
                  const visible = expanded ? dayRequests : dayRequests.slice(0, MAX_CHIPS_PER_DAY);
                  const hidden = dayRequests.length - visible.length;
                  return (
                    <>
                      {visible.map((request) => {
                        const tone = statusTone(request.status);
                        return (
                          <a
                            key={request.id}
                            href={`/calendar/request?request=${encodeURIComponent(request.requestNumber)}`}
                            style={{ ...styles.chip, background: tone.bg, color: tone.fg }}
                            title={`${request.title} · ${request.status.replaceAll("_", " ")}`}
                          >
                            <span style={styles.chipTitle}>{request.title}</span>
                            <span style={styles.chipStatus}>{request.status.replaceAll("_", " ")}</span>
                          </a>
                        );
                      })}
                      {hidden > 0 ? (
                        <button
                          onClick={() => setExpandedDays((prev) => new Set(prev).add(key))}
                          style={styles.moreButton}
                          type="button"
                        >
                          +{hidden} more
                        </button>
                      ) : null}
                      {expanded && dayRequests.length > MAX_CHIPS_PER_DAY ? (
                        <button
                          onClick={() =>
                            setExpandedDays((prev) => {
                              const n = new Set(prev);
                              n.delete(key);
                              return n;
                            })
                          }
                          style={styles.moreButton}
                          type="button"
                        >
                          Show less
                        </button>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.legend}>
        {([
          ["submitted", "Submitted"],
          ["under_review", "Under review"],
          ["published", "Published"],
          ["assigned", "Assigned / in progress"],
          ["completed", "Completed"],
          ["cancelled", "Cancelled"]
        ] as const).map(([status, label]) => {
          const tone = statusTone(status);
          return (
            <span key={status} style={styles.legendItem}>
              <span style={{ ...styles.legendSwatch, background: tone.bg, border: `1px solid ${tone.fg}` }} />
              {label}
            </span>
          );
        })}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: { background: "#000000", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, marginTop: 18, padding: 18 },
  header: { alignItems: "start", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#f4efe4", fontSize: 21, margin: 0 },
  help: { color: "#b4b2a9", fontSize: 13, lineHeight: 1.55, margin: "6px 0 0" },
  badge: { background: "#000000", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 12, fontWeight: 900, padding: "7px 10px" },
  state: { background: "#0c0c0c", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 14, marginTop: 16, padding: 16 },
  monthBar: { alignItems: "center", display: "flex", gap: 14, justifyContent: "center", margin: "16px 0 12px" },
  monthTitle: { color: "#f4efe4", fontSize: 18, minWidth: 180, textAlign: "center" },
  navButton: { background: "#171511", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 16, minHeight: 36, minWidth: 44, padding: "0 10px" },
  weekRow: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 },
  weekday: { color: "#b4b2a9", fontSize: 12, fontWeight: 800, textAlign: "center" },
  grid: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, 1fr)" },
  emptyCell: { borderRadius: 8, minHeight: 92 },
  dayCell: { background: "#0c0c0c", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4, minHeight: 92, padding: 6 },
  dayCellToday: { border: "1px solid #ba9044" },
  dayNumber: { color: "#f4efe4", fontSize: 12, fontWeight: 800 },
  dayRequests: { display: "flex", flexDirection: "column", gap: 4 },
  chip: { borderRadius: 6, display: "grid", gap: 1, padding: "4px 6px", textDecoration: "none" },
  chipTitle: { fontSize: 11, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chipStatus: { fontSize: 10, fontWeight: 600, textTransform: "capitalize" },
  moreButton: { background: "transparent", border: "1px solid rgba(201, 162, 75, 0.3)", borderRadius: 6, color: "#f4efe4", cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "3px 6px", textAlign: "left" },
  legend: { display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 },
  legendItem: { alignItems: "center", color: "#b4b2a9", display: "inline-flex", fontSize: 12, gap: 6 },
  legendSwatch: { borderRadius: 3, display: "inline-block", height: 12, width: 12 }
};
