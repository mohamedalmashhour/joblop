"use client";

import { useCallback, useEffect, useState } from "react";

type Entry = Readonly<{
  subjectType: "worker" | "employer";
  id: string;
  subjectId: string;
  verificationType: string | null;
  status: string;
  provider: string | null;
  requestedAt: string | null;
  expiresAt: string | null;
}>;

type State =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "ready"; queue: readonly Entry[] };

const FILTERS = [
  { value: "pending,review,review_required", label: "Needs action" },
  { value: "pending", label: "Pending" },
  { value: "review,review_required", label: "Review required" },
  { value: "verified,business_verified", label: "Verified" },
  { value: "expired", label: "Expiring/expired" },
  { value: "rejected,suspended", label: "Rejected/suspended" },
  { value: "all", label: "All" }
] as const;

const WORKER_DECISIONS = [
  { value: "verified", label: "Verify" },
  { value: "review", label: "Mark review" },
  { value: "rejected", label: "Reject" }
] as const;
const EMPLOYER_DECISIONS = [
  { value: "business_verified", label: "Verify business" },
  { value: "review_required", label: "Mark review" },
  { value: "suspended", label: "Suspend" }
] as const;

export function VerificationQueuePanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [filter, setFilter] = useState<string>(FILTERS[0].value);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (f: string) => {
    setState({ status: "loading" });
    try {
      const r = await fetch(`/api/verification/queue?status=${encodeURIComponent(f)}`, { cache: "no-store" });
      if (!r.ok) return setState({ status: r.status === 401 || r.status === 403 ? "denied" : "unavailable" });
      const payload = (await r.json()) as { queue: Entry[] };
      setState({ status: "ready", queue: payload.queue });
    } catch {
      setState({ status: "unavailable" });
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [load, filter]);

  const review = useCallback(async (entry: Entry, decision: string) => {
    setBusy(entry.id);
    setNotice(null);
    try {
      const r = await fetch("/api/verification/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subjectType: entry.subjectType, verificationId: entry.id, decision })
      });
      if (!r.ok) {
        setNotice(r.status === 401 || r.status === 403 ? "Administrator authorization is required." : "That decision could not be recorded.");
        return;
      }
      await load(filter);
    } finally {
      setBusy(null);
    }
  }, [filter, load]);

  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Resident Workforce OS / Verification</p>
        <h1 style={styles.title}>Verification queue</h1>
        <p style={styles.lede}>Governed trust decisions for workers and employers. Every decision is audited. Badges and eligibility read these states — never an account, contract, or payment.</p>
      </header>
      <div style={styles.filters} role="tablist" aria-label="Verification filters">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" role="tab" aria-selected={filter === f.value} style={filter === f.value ? styles.filterActive : styles.filter} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      {notice ? <p role="alert" style={styles.alert}>{notice}</p> : null}
      {state.status === "loading" ? (
        <p aria-live="polite">Loading verification queue…</p>
      ) : state.status === "denied" ? (
        <p>Administrator authorization is required.</p>
      ) : state.status === "unavailable" ? (
        <p>Verification queue is unavailable. <button type="button" style={styles.button} onClick={() => void load(filter)}>Retry</button></p>
      ) : state.queue.length === 0 ? (
        <p style={styles.muted}>Nothing in this view.</p>
      ) : (
        <ul style={styles.list}>
          {state.queue.map((entry) => {
            const decisions = entry.subjectType === "employer" ? EMPLOYER_DECISIONS : WORKER_DECISIONS;
            return (
              <li key={entry.id} style={styles.item}>
                <div style={styles.itemHead}>
                  <strong>{entry.subjectType === "employer" ? "Employer" : "Worker"}{entry.verificationType ? ` · ${entry.verificationType.replaceAll("_", " ")}` : ""}</strong>
                  <span style={styles.statusBadge}>{entry.status.replaceAll("_", " ")}</span>
                </div>
                <div style={styles.dim}>
                  {entry.subjectId} · {entry.provider ?? "—"}{entry.requestedAt ? ` · requested ${new Date(entry.requestedAt).toLocaleString()}` : ""}
                </div>
                <div style={styles.actions}>
                  {decisions.map((d) => (
                    <button key={d.value} type="button" style={d.value === "rejected" || d.value === "suspended" ? styles.buttonGhost : styles.button} disabled={busy === entry.id} onClick={() => void review(entry, d.value)}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "clamp(16px, 3vw, 32px)", fontFamily: "Inter, system-ui, sans-serif", color: "#f4efe4" },
  hero: { marginBottom: 16 },
  eyebrow: { color: "#f4efe4", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 },
  title: { fontSize: "clamp(24px, 4vw, 34px)", margin: "4px 0" },
  lede: { color: "#f4efe4", maxWidth: 720, margin: 0 },
  filters: { display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" },
  filter: { border: "1px solid rgba(201, 162, 75, 0.16)", background: "transparent", color: "#f4efe4", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  filterActive: { border: "1px solid rgba(201, 162, 75, 0.16)", background: "#171511", color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 },
  item: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8, background: "#0c0c0c" },
  itemHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  statusBadge: { background: "#000000", color: "#f4efe4", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 },
  dim: { color: "#ece3d2", fontSize: 12 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8 },
  muted: { color: "#b3a894" },
  button: { border: "1px solid rgba(201, 162, 75, 0.16)", background: "#171511", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  buttonGhost: { border: "1px solid rgba(201, 162, 75, 0.16)", background: "transparent", color: "#f4efe4", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  alert: { color: "#b91c1c", fontSize: 13 }
};
