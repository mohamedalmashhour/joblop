"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminWorksiteMap, type WorksitePoint } from "./AdminWorksiteMap";
import { SignedOut } from "../../shared/SignedOut";

// Two separate maps for the admin:
//   1) Contract — where the contract worksite is.
//   2) Workers by day — for a selected day, the worksite where each assigned worker is
//      scheduled (worker pin = the contract worksite for that day; never a home location).
// Provider-neutral rendering (AdminWorksiteMap); authoritative internal view (exact worksite).

type Worksite = Readonly<{
  label: string;
  city: string | null;
  province: string | null;
  addressLine1: string | null;
  latitude: number | null;
  longitude: number | null;
}>;
type DayWorker = Readonly<{ displayName: string | null; status: string; startAt: string; endAt: string }>;
type Day = Readonly<{ date: string; worksite: { label: string; latitude: number | null; longitude: number | null }; workers: readonly DayWorker[] }>;
type Schedule = Readonly<{
  contract: { jobTitle: string; timezone: string; startAt: string; endAt: string; worksite: Worksite };
  days: readonly Day[];
}>;

type State = { status: "loading" | "denied" | "unavailable" } | { status: "ready"; schedule: Schedule };

export function WorksiteMapsPanel({ dispatchReviewId }: Readonly<{ dispatchReviewId: string }>) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}/worksite-schedule`, { cache: "no-store" });
      if (!res.ok) return setState({ status: res.status === 401 || res.status === 403 ? "denied" : "unavailable" });
      const schedule = (await res.json()) as Schedule;
      setState({ status: "ready", schedule });
      setSelectedDate(schedule.days[0]?.date ?? null);
    } catch {
      setState({ status: "unavailable" });
    }
  }, [dispatchReviewId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeDay = useMemo(() => {
    if (state.status !== "ready") return null;
    return state.schedule.days.find((d) => d.date === selectedDate) ?? state.schedule.days[0] ?? null;
  }, [state, selectedDate]);

  if (state.status === "denied") return <SignedOut compact />;
  if (state.status !== "ready") {
    return (
      <div>
        <h2>Worksite maps</h2>
        <p aria-live="polite">
          {state.status === "loading" ? "Loading worksite maps…" : "Worksite maps are unavailable."}
        </p>
        {state.status !== "loading" ? (
          <button type="button" style={styles.button} onClick={() => void load()}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  const { contract, days } = state.schedule;
  const contractPoint: WorksitePoint = {
    id: "contract",
    label: contract.worksite.label,
    latitude: contract.worksite.latitude,
    longitude: contract.worksite.longitude,
    detail: [contract.worksite.city, contract.worksite.province].filter(Boolean).join(", ") || null
  };
  const dayPoint: WorksitePoint[] = activeDay
    ? [{ id: "day", label: activeDay.worksite.label, latitude: activeDay.worksite.latitude, longitude: activeDay.worksite.longitude, detail: `${activeDay.workers.length} worker${activeDay.workers.length === 1 ? "" : "s"}` }]
    : [];

  return (
    <div>
      <h2>Worksite maps</h2>
      <p style={styles.muted}>
        Authoritative internal view. The worker map shows the contract worksite where each assigned
        worker is scheduled that day — never a worker&apos;s home or personal location.
      </p>
      <div style={styles.grid}>
        <section style={styles.mapCard}>
          <h3 style={styles.h3}>Contract worksite</h3>
          <AdminWorksiteMap points={[contractPoint]} emptyLabel="This worksite has not been geocoded yet." />
          <p style={styles.caption}>
            <strong>{contract.jobTitle}</strong>
            <br />
            {contract.worksite.addressLine1 ? `${contract.worksite.addressLine1} · ` : ""}
            {[contract.worksite.city, contract.worksite.province].filter(Boolean).join(", ") || "Location pending"}
          </p>
        </section>

        <section style={styles.mapCard}>
          <h3 style={styles.h3}>Workers by day</h3>
          {days.length === 0 ? (
            <div style={styles.emptyDays}>No workers are assigned to this job yet.</div>
          ) : (
            <>
              <div style={styles.dayTabs} role="tablist" aria-label="Assigned days">
                {days.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    role="tab"
                    aria-selected={d.date === (activeDay?.date ?? "")}
                    style={d.date === (activeDay?.date ?? "") ? styles.dayTabActive : styles.dayTab}
                    onClick={() => setSelectedDate(d.date)}
                  >
                    {formatDay(d.date)}
                  </button>
                ))}
              </div>
              <AdminWorksiteMap points={dayPoint} emptyLabel="This worksite has not been geocoded yet." />
              <ul style={styles.roster}>
                {(activeDay?.workers ?? []).map((w, i) => (
                  <li key={i} style={styles.rosterItem}>
                    <strong>{w.displayName ?? "Worker"}</strong>
                    <span style={styles.dim}>
                      {w.status.replaceAll("_", " ")} · {formatTime(w.startAt)}–{formatTime(w.endAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function formatDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" });
}

const styles: Record<string, React.CSSProperties> = {
  muted: { color: "#b3a894", fontSize: 13, lineHeight: 1.5 },
  dim: { color: "#ece3d2", fontSize: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 8 },
  mapCard: { display: "flex", flexDirection: "column", gap: 8 },
  h3: { fontSize: 14, margin: 0 },
  caption: { fontSize: 13, color: "#f4efe4", margin: 0, lineHeight: 1.5 },
  dayTabs: { display: "flex", flexWrap: "wrap", gap: 6 },
  dayTab: { border: "1px solid rgba(248, 184, 8, 0.16)", background: "transparent", color: "#f4efe4", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  dayTabActive: { border: "1px solid rgba(248, 184, 8, 0.16)", background: "#171511", color: "#fff", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  roster: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 },
  rosterItem: { display: "flex", justifyContent: "space-between", gap: 8, borderBottom: "1px solid rgba(248, 184, 8, 0.16)", paddingBottom: 5 },
  emptyDays: { color: "#b3a894", fontSize: 13, border: "1px dashed rgba(248, 184, 8, 0.16)", borderRadius: 10, padding: 20, textAlign: "center" },
  button: { border: "1px solid rgba(248, 184, 8, 0.16)", background: "#171511", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }
};
