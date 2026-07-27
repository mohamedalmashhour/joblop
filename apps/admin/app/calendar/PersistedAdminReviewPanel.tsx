"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  parseAdminCalendarDto,
  type AdminCalendarDto,
  type AuthenticatedViewState
} from "@rwos/shared";

export function PersistedAdminReviewPanel({ requestId }: Readonly<{ requestId: string | null }>) {
  const [state, setState] = useState<AuthenticatedViewState<AdminCalendarDto>>({ status: "loading" });
  const requestGeneration = useRef(0);
  const load = useCallback(async () => {
    if (!requestId) return;
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/calendar/requests/${encodeURIComponent(requestId)}`, { cache: "no-store" });
      if (generation !== requestGeneration.current) return;
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = await response.json() as { request?: unknown };
      if (generation !== requestGeneration.current) return;
      setState({ status: "ready", data: parseAdminCalendarDto(payload.request) });
    } catch {
      if (generation !== requestGeneration.current) return;
      setState({ status: "error" });
    }
  }, [requestId]);
  useEffect(() => {
    void load();
    return () => { requestGeneration.current += 1; };
  }, [load]);

  if (!requestId) {
    return <AdminState
      title="Request reference required"
      message="Open a persisted request from the authenticated administrator calendar."
    />;
  }

  if (state.status !== "ready") {
    const copy: readonly [string, string] = state.status === "loading"
      ? ["Loading review detail", "Checking the persisted administrator-authorized record."]
      : state.status === "denied"
        ? ["Administrator access required", "Return to the calendar and sign in with an authorized platform account."]
        : state.status === "unavailable"
          ? ["Review service unavailable", "The persisted record could not be reached. No fixture record is substituted."]
          : state.status === "stale"
            ? ["Review changed", "Refresh the persisted record before continuing."]
            : ["Review detail unavailable", "No fixture record is substituted for a persisted administrator request."];
    return state.status === "denied"
      ? <AdminState message={copy[1]} title={copy[0]} />
      : <AdminState message={copy[1]} onRetry={load} title={copy[0]} />;
  }
  const request = state.data;
  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <div><p style={styles.eyebrow}>Resident Workforce OS / Persisted review</p><h1 style={styles.title}>{request.title}</h1><p style={styles.lede}>{request.requestNumber} · {request.authoritativeStatus.replaceAll("_", " ")}</p></div>
        <div style={styles.actionStack}>
          <a href="/calendar" style={styles.secondaryButton}>Back to admin calendar</a>
          <a href={`/calendar/assignment?request=${encodeURIComponent(request.requestNumber)}`} style={styles.secondaryButton}>Check assignment operations</a>
        </div>
      </header>
      <section style={styles.grid}>
        <article style={styles.panel}>
          <h2 style={styles.h2}>Request readiness</h2>
          {[
            ["Request status", request.status.replaceAll("_", " ")],
            ["Authoritative status", request.authoritativeStatus.replaceAll("_", " ")],
            ["Contract", request.verification.contract],
            ["Payment method", `${request.verification.paymentMethodReadiness} — raw details hidden`],
            ["Location", request.verification.location],
            ["Schedule", formatWindow(request)],
            ["Duties", request.dutiesSummary ?? "Not provided"],
            ["Qualifications", request.qualifications.length ? request.qualifications.join(", ") : "Not provided"],
            ["Workers", String(request.numberOfWorkers)],
            ["Address summary", request.addressSummary ?? "Restricted or not provided"],
            ["Special instructions", request.specialInstructions ?? "Not provided"],
            ["Review reason", request.adminReviewReason ?? "Not provided"]
          ].map(([label, value]) => <div key={label} style={styles.row}><strong>{label}</strong><span>{value}</span></div>)}
        </article>
        <article style={styles.panel}>
          <h2 style={styles.h2}>Economics separation</h2>
          <p>Client economics and worker-offer economics are not included in this calendar persistence DTO.</p>
          <p>Review them only through their separate contract-authoritative sources. No raw payment secrets are available here.</p>
        </article>
      </section>
      <section style={styles.notice}>
        <h2 style={styles.h2}>Review authority not expanded</h2>
        <p>This authenticated detail is read-only. Approve, publish, reject, reprice, notify, payroll, and payment execution are not connected from this screen.</p>
      </section>
    </main>
  );
}

function formatWindow(request: AdminCalendarDto) {
  const start = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone
  }).format(new Date(request.startAt));
  const end = new Intl.DateTimeFormat("en-CA", {
    timeStyle: "short",
    timeZone: request.timezone
  }).format(new Date(request.endAt));
  return `${start}–${end} (${request.timezone})`;
}

function AdminState({ title, message, onRetry }: Readonly<{ title: string; message: string; onRetry?: () => Promise<void> }>) {
  return (
    <main style={styles.page}>
      <header aria-live="polite" style={styles.hero}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.lede}>{message}</p>
        <div style={styles.actionStack}>
          <a href="/calendar" style={styles.secondaryButton}>Back to admin calendar</a>
          {onRetry ? <button onClick={() => void onRetry()} style={styles.retryButton} type="button">Retry</button> : null}
        </div>
      </header>
    </main>
  );
}

const styles = {
  page: { background: "#f4f7fb", color: "#10233f", fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh" },
  hero: { alignItems: "center", background: "#061b41", color: "#fff", display: "flex", flexWrap: "wrap" as const, gap: 24, justifyContent: "space-between", padding: "40px clamp(18px, 5vw, 64px)" },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#d6e5f8", fontSize: 18, lineHeight: 1.6, maxWidth: 760 },
  secondaryButton: { alignItems: "center", background: "#fff", borderRadius: 8, color: "#061b41", display: "inline-flex", fontWeight: 800, minHeight: 44, padding: "0 18px", textDecoration: "none" },
  actionStack: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  retryButton: { background: "#fff", border: "1px solid #91a5bf", borderRadius: 8, color: "#061b41", cursor: "pointer", fontWeight: 800, minHeight: 44, padding: "0 18px" },
  grid: { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", padding: "24px clamp(18px, 5vw, 64px)" },
  panel: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 14, padding: 24 },
  h2: { color: "#061b41", fontSize: 25, margin: "6px 0 14px" },
  row: { alignItems: "center", borderBottom: "1px solid #e7edf5", display: "flex", flexWrap: "wrap" as const, gap: 12, justifyContent: "space-between", padding: "12px 0" },
  notice: { background: "#fff8d8", border: "1px solid #e8d782", borderRadius: 14, margin: "0 clamp(18px, 5vw, 64px) 48px", padding: 24 }
} as const;
