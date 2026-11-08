"use client";

import { SEVERITY_STYLE, detailHref, type TodayItem } from "./hub";
import type { CoverageText } from "./text";

// "Today" panel: what needs staff attention now (next 48 h + pending decisions), urgent first.
export function TodayPanel({
  items,
  status,
  t,
  onPickDay
}: Readonly<{
  items: readonly TodayItem[];
  status: "loading" | "ready" | "error";
  t: CoverageText;
  onPickDay: (iso: string) => void;
}>) {
  return (
    <section aria-labelledby="staff-today-title" style={styles.panel}>
      <h2 id="staff-today-title" style={styles.title}>{t.todayTitle}</h2>
      {status === "loading" ? <p style={styles.text}>{t.todayLoading}</p> : null}
      {status === "error" ? <p style={styles.text}>{t.hubError}</p> : null}
      {status === "ready" && items.length === 0 ? <p style={styles.text}>{t.todayEmpty}</p> : null}
      {items.length > 0 ? (
        <ul style={styles.list}>
          {items.map((item, index) => {
            const tone = SEVERITY_STYLE[item.severity];
            const href = detailHref(item.type, item.jobRequestId);
            const when = item.startAt && !Number.isNaN(Date.parse(item.startAt))
              ? new Date(item.startAt).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })
              : null;
            return (
              <li key={`${item.type}-${item.refId ?? item.jobRequestId ?? index}-${index}`} style={{ ...styles.item, borderInlineStartColor: tone.bg }}>
                <div style={styles.head}>
                  <span style={{ ...styles.badge, background: tone.bg, color: tone.fg }}>{t.severity[item.severity] ?? item.severity}</span>
                  <strong style={styles.itemTitle}>{item.title}</strong>
                </div>
                {item.detail ? <p style={styles.detail}>{item.detail}</p> : null}
                <div style={styles.actions}>
                  {when && item.startAt ? (
                    <button onClick={() => onPickDay(item.startAt as string)} style={styles.dayButton} type="button">{when}</button>
                  ) : null}
                  {href ? <a href={href} style={styles.link}>{t.open}</a> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

const styles = {
  panel: { background: "#141414", border: "1px solid #3a3a3a", borderRadius: 10, display: "grid", gap: 10, padding: 16 },
  title: { color: "#fff1a8", fontSize: 18, margin: 0 },
  text: { color: "#faf6ec", fontSize: 15, lineHeight: 1.5, margin: 0 },
  list: { display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 },
  item: { background: "#ffffff", borderInlineStart: "6px solid", borderRadius: 8, color: "#1a1a1a", display: "grid", gap: 4, padding: "10px 12px" },
  head: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 8 },
  badge: { borderRadius: 999, fontSize: 11, fontWeight: 900, padding: "2px 8px", textTransform: "uppercase" as const },
  itemTitle: { fontSize: 15, overflowWrap: "anywhere" as const },
  detail: { color: "#3a3a3a", fontSize: 14, margin: 0, overflowWrap: "anywhere" as const },
  actions: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 12 },
  dayButton: { background: "transparent", border: "1px solid #8f8574", borderRadius: 6, color: "#1a1a1a", cursor: "pointer", fontSize: 13, padding: "4px 10px" },
  link: { color: "#000000", fontSize: 14, fontWeight: 800 }
} as const;
