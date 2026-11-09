"use client";

import { useEffect, useState } from "react";
import { usePageText } from "../i18n/pageText";
import { unfilledShiftsText } from "./text";

// Staff list of approved short-term shifts starting within 24 h that still have open places, with
// the warnings already sent (under 24 h, under 4 h). Read-only; refreshes every minute.

type Shift = {
  jobRequestId: string;
  jobRequestNumber: string;
  title: string;
  role: string;
  employer: string;
  city: string | null;
  startAt: string;
  timezone: string;
  openings: number;
  filled: number;
  warnings: { thresholdHours: number; warnedAt: string; emailed: boolean }[];
};

type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; shifts: Shift[] };

const when = (iso: string, timeZone: string) => {
  try {
    return new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone });
  } catch {
    return new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
  }
};

export function UnfilledShiftsPanel() {
  const copy = usePageText(unfilledShiftsText);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const response = await fetch("/api/unfilled-shifts", { cache: "no-store" });
        if (!live) return;
        if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
        if (!response.ok) return setState({ status: "error" });
        const payload = (await response.json()) as { shifts?: Shift[] };
        setState({ status: "ready", shifts: payload.shifts ?? [] });
      } catch {
        if (live) setState({ status: "error" });
      }
    };
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  if (state.status === "loading") return <p style={styles.note}>{copy.loading}</p>;
  if (state.status === "denied") return <p style={styles.note}>{copy.denied}</p>;
  if (state.status === "error") return <p style={styles.note} role="alert">{copy.error}</p>;
  if (state.shifts.length === 0) return <p style={styles.note}>{copy.empty}</p>;

  const now = Date.now();
  return (
    <section style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {[copy.colJob, copy.colEmployer, copy.colStart, copy.colFilled, copy.colWarnings, ""].map((h, i) => (
              <th key={`${h}-${i}`} style={styles.th} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.shifts.map((s) => {
            const hours = Math.max(0, (Date.parse(s.startAt) - now) / 3_600_000);
            return (
              <tr key={s.jobRequestId} style={hours <= 4 ? styles.urgent : undefined}>
                <td style={styles.td}>{s.role} <span style={styles.muted}>({s.jobRequestNumber})</span></td>
                <td style={styles.td}>{s.employer}{s.city ? <span style={styles.muted}> · {s.city}</span> : null}</td>
                <td style={styles.td}>
                  {when(s.startAt, s.timezone)} <span style={styles.muted}>{copy.hoursLeft.replace("{h}", hours.toFixed(1))}</span>
                </td>
                <td style={styles.td}>{s.filled}/{s.openings}</td>
                <td style={styles.td}>
                  {s.warnings.length === 0
                    ? "—"
                    : s.warnings
                        .sort((a, b) => b.thresholdHours - a.thresholdHours)
                        .map((w) => `${copy.warned.replace("{t}", String(w.thresholdHours))}${w.emailed ? "" : ` (${copy.notEmailed})`}`)
                        .join(" · ")}
                </td>
                <td style={styles.td}>
                  <a href={`/calendar/request?request=${encodeURIComponent(s.jobRequestNumber)}`} style={styles.link}>{copy.open}</a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

const styles = {
  wrap: { padding: "16px clamp(18px, 5vw, 64px) 48px", overflowX: "auto" as const },
  note: { padding: "16px clamp(18px, 5vw, 64px)", color: "#faf6ec" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 14 },
  th: { textAlign: "start" as const, padding: "8px 10px", borderBottom: "1px solid #3a3a3a", color: "#fff1a8" },
  td: { padding: "8px 10px", borderBottom: "1px solid #222", verticalAlign: "top" as const },
  urgent: { background: "rgba(220, 38, 38, 0.12)" },
  muted: { color: "#b9b2a3" },
  link: { color: "#F8B808" }
} as const;
