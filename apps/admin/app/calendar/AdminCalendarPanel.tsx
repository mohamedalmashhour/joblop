"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  clearWebCalendarSession,
  formatRwosDateTime,
  parseAdminCalendarList,
  type AdminCalendarDto,
  type AuthenticatedViewState
} from "@rwos/shared";

export function AdminCalendarPanel() {
  const [state, setState] = useState<AuthenticatedViewState<readonly AdminCalendarDto[]>>({
    status: "loading"
  });
  const requestGeneration = useRef(0);
  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/calendar/requests", { cache: "no-store" });
      if (generation !== requestGeneration.current) return;
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = await response.json();
      if (generation === requestGeneration.current) {
        setState(calendarListState(parseAdminCalendarList(payload)));
      }
    } catch {
      if (generation === requestGeneration.current) setState({ status: "error" });
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);

  if (state.status === "denied") return <AdminSignIn />;
  if (state.status === "loading")
    return <StateCard title="Loading review calendar" message="Checking platform authorization." />;
  if (state.status === "empty")
    return (
      <>
        <SessionAction />
        <StateCard title="No persisted requests" message="The governed review queue is empty." />
      </>
    );
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <StateCard
        title={
          state.status === "unavailable"
            ? "Review calendar unavailable"
            : "Review calendar could not be loaded"
        }
        message="No fixture requests are substituted for persisted records."
        onRetry={load}
      />
    );
  }
  return (
    <>
      <SessionAction />
      {state.status === "partial" ? (
        <StateCard
          title="Some reviews could not be shown"
          message="The records below passed the administrator privacy whitelist. Retry to check for the remaining records."
          onRetry={load}
        />
      ) : null}
      <section style={styles.grid}>
        {state.data.map((request) => (
          <article key={request.id} style={styles.card}>
            <span style={badgeStyle(request.status)}>{request.status.replaceAll("_", " ")}</span>
            <h2 style={styles.h2}>{request.title}</h2>
            <p style={styles.reference}>Organization reference: {request.organizationId}</p>
            <p>{formatWindow(request)}</p>
            <a
              href={`/calendar/request?request=${encodeURIComponent(request.requestNumber)}`}
              style={styles.button}
            >
              Open review detail
            </a>
          </article>
        ))}
      </section>
    </>
  );
}

function SessionAction() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Authenticated administrator calendar session.");
  const signOut = async () => {
    setSubmitting(true);
    try {
      const cleared = await clearWebCalendarSession(fetch);
      if (!cleared) return setMessage("Session could not be cleared. Try again.");
      window.location.assign("/signin");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section aria-busy={submitting} aria-live="polite" style={styles.stateCard}>
      <p>{message}</p>
      <button
        disabled={submitting}
        onClick={() => void signOut()}
        style={styles.retry}
        type="button"
      >
        {submitting ? "Signing out…" : "Switch administrator account"}
      </button>
    </section>
  );
}

// Staff sign in with a mobile number and a texted code on the sign-in page.
function AdminSignIn() {
  return (
    <section style={styles.stateCard} aria-live="polite">
      <h2 style={styles.h2}>Administrator sign-in required</h2>
      <p>Sign in with your staff mobile number and a texted code.</p>
      <a href="/signin" style={styles.button}>
        Sign in
      </a>
    </section>
  );
}

function StateCard({
  title,
  message,
  onRetry
}: Readonly<{ title: string; message: string; onRetry?: () => Promise<void> }>) {
  return (
    <section style={styles.stateCard} aria-live="polite">
      <h2 style={styles.h2}>{title}</h2>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={() => void onRetry()} style={styles.retry}>
          Retry
        </button>
      ) : null}
    </section>
  );
}

function formatWindow(request: AdminCalendarDto) {
  return formatRwosDateTime(request.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone
  });
}

function badgeStyle(status: string) {
  const danger = status === "cancelled" || status === "rejected";
  const warning = status === "under_review" || status === "paused" || status === "returned";
  const positive = status === "assigned" || status === "in_progress" || status === "completed";
  const informational = status === "submitted" || status === "published" || status === "approved";
  return {
    ...styles.badge,
    background: danger
      ? "#fdecec"
      : warning
        ? "#fff8d8"
        : positive
          ? "#faf6ec"
          : informational
            ? "#fbf9f4"
            : "#fbf9f4",
    color: danger
      ? "#8a1c1c"
      : warning
        ? "#725000"
        : positive
          ? "#171511"
          : informational
            ? "#171511"
            : "#171511"
  };
}

const styles = {
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "32px clamp(18px, 5vw, 64px)"
  },
  card: {
    background: "#0c0c0c",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 14,
    boxShadow: "0 12px 30px rgba(0,0,0,.4)",
    overflowWrap: "anywhere" as const,
    padding: 22
  },
  h2: { color: "#f4efe4", fontSize: 24 },
  badge: {
    borderRadius: 99,
    display: "inline-block",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px",
    textTransform: "uppercase" as const
  },
  button: {
    alignItems: "center",
    background: "#171511",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 800,
    marginTop: 12,
    minHeight: 44,
    padding: "0 16px",
    textDecoration: "none"
  },
  reference: { overflowWrap: "anywhere" as const },
  stateCard: {
    background: "#0c0c0c",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 14,
    display: "grid",
    gap: 12,
    margin: "32px clamp(18px, 5vw, 64px)",
    maxWidth: 720,
    padding: 24
  },
  label: { display: "grid", fontWeight: 800, gap: 6 },
  input: {
    background: "#0c0c0c",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    color: "#f4efe4",
    font: "inherit",
    minHeight: 44,
    padding: "0 12px"
  },
  retry: {
    background: "#0c0c0c",
    border: "1px solid rgba(201, 162, 75, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 16px"
  }
} as const;
