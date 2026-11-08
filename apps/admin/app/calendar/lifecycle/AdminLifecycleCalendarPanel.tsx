"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { parseAdminCalendarList, type AdminCalendarDto } from "@rwos/shared";
import { usePageText } from "../../i18n/pageText";
import { calendarText } from "../text";
import { MonthCalendar, type CalendarEntry, type CalendarLegendItem, type CalendarTone } from "../MonthCalendar";

// Admin full-lifecycle calendar: every non-draft request across organizations, placed on a month
// grid by its shift date and coloured by lifecycle status (submitted → under review → published →
// assigned → in progress → completed / cancelled). Unlike the review calendar, which shows only the
// intake queue, this spans a request from submission through to closure. Read-only, admin-gated.
// Presentation is delegated to the shared MonthCalendar; this panel only fetches and maps.

type LoadState =
  | { status: "loading" }
  | { status: "denied" | "error" }
  | { status: "ready"; data: readonly AdminCalendarDto[] };

function statusTone(status: AdminCalendarDto["status"]): CalendarTone {
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

function legendFor(labels: typeof calendarText.en.lifecycle.legend): readonly CalendarLegendItem[] {
  return [
    { label: labels.submitted, tone: statusTone("submitted") },
    { label: labels.underReview, tone: statusTone("under_review") },
    { label: labels.published, tone: statusTone("published") },
    { label: labels.assigned, tone: statusTone("assigned") },
    { label: labels.completed, tone: statusTone("completed") },
    { label: labels.cancelled, tone: statusTone("cancelled") }
  ];
}

export function AdminLifecycleCalendarPanel() {
  const t = usePageText(calendarText).lifecycle;
  const legend = useMemo(() => legendFor(t.legend), [t]);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/calendar/lifecycle", { cache: "no-store" });
        if (!response.ok) {
          if (active) setState({ status: response.status === 401 ? "denied" : "error" });
          return;
        }
        const data = parseAdminCalendarList(await response.json());
        if (active) setState({ status: "ready", data });
      } catch {
        if (active) setState({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const entries = useMemo<readonly CalendarEntry[]>(() => {
    if (state.status !== "ready") return [];
    return state.data.map((request) => ({
      id: request.id,
      date: request.startAt,
      tone: statusTone(request.status),
      primary: request.title,
      secondary: request.status.replaceAll("_", " "),
      href: `/calendar/request?request=${encodeURIComponent(request.requestNumber)}`,
      title: `${request.title} · ${request.status.replaceAll("_", " ")}`
    }));
  }, [state]);

  return (
    <section aria-labelledby="lifecycle-calendar-title" style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h2 id="lifecycle-calendar-title" style={styles.h2}>{t.title}</h2>
          <p style={styles.help}>{t.help}</p>
        </div>
        <span style={styles.badge}>{t.readOnly}</span>
      </div>

      {state.status === "loading" ? <p style={styles.state}>{t.loading}</p> : null}
      {state.status === "denied" ? <p style={styles.state}>{t.denied}</p> : null}
      {state.status === "error" ? <p style={styles.state}>{t.error}</p> : null}
      {state.status === "ready" ? <MonthCalendar entries={entries} legend={legend} /> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, marginTop: 18, padding: 18 },
  header: { alignItems: "start", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#f4efe4", fontSize: 21, margin: 0 },
  help: { color: "#b4b2a9", fontSize: 13, lineHeight: 1.55, margin: "6px 0 0" },
  badge: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 12, fontWeight: 900, padding: "7px 10px" },
  state: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 14, marginTop: 16, padding: 16 }
};
