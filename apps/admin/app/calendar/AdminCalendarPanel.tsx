"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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

  if (state.status === "denied") return <AdminSignIn onSignedIn={load} />;
  if (state.status === "loading")
    return <StateCard title="Loading review calendar" message="Checking platform authorization." />;
  if (state.status === "empty")
    return (
      <>
        <SessionAction onSignedOut={load} />
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
      <SessionAction onSignedOut={load} />
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

function SessionAction({ onSignedOut }: Readonly<{ onSignedOut: () => Promise<void> }>) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Authenticated administrator calendar session.");
  const signOut = async () => {
    setSubmitting(true);
    try {
      const cleared = await clearWebCalendarSession(fetch);
      if (!cleared) return setMessage("Session could not be cleared. Try again.");
      await onSignedOut();
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

function AdminSignIn({ onSignedIn }: Readonly<{ onSignedIn: () => Promise<void> }>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in with an authorized platform account.");
  const [needsSignOut, setNeedsSignOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setNeedsSignOut(false);
    try {
      const response = await fetch("/api/session/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      setPassword("");
      if (!response.ok) {
        setNeedsSignOut(response.status === 409);
        return setMessage(
          response.status === 409 ? "Sign out before changing accounts." : "Sign-in failed."
        );
      }
      await onSignedIn();
    } catch {
      setMessage("Sign-in service unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  };
  const signOut = async () => {
    setSubmitting(true);
    try {
      const cleared = await clearWebCalendarSession(fetch);
      if (!cleared) return setMessage("Session could not be cleared. Try again.");
      setNeedsSignOut(false);
      setMessage("Local session cleared. Sign in with the intended administrator account.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form aria-busy={submitting} onSubmit={submit} style={styles.stateCard}>
      <h2 style={styles.h2}>Administrator sign-in required</h2>
      <p aria-live="polite">{message}</p>
      <label style={styles.label}>
        Email
        <input
          autoComplete="username"
          disabled={submitting}
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={styles.input}
        />
      </label>
      <label style={styles.label}>
        Password
        <input
          autoComplete="current-password"
          disabled={submitting}
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={styles.input}
        />
      </label>
      <button
        disabled={submitting}
        type="submit"
        style={{ ...styles.button, border: 0, opacity: submitting ? 0.65 : 1 }}
      >
        {submitting ? "Checking account…" : "Sign in securely"}
      </button>
      {needsSignOut ? (
        <button
          disabled={submitting}
          type="button"
          onClick={() => void signOut()}
          style={styles.retry}
        >
          Clear prior session
        </button>
      ) : null}
    </form>
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
    background: "#fff",
    border: "1px solid #faf6ec",
    borderRadius: 14,
    boxShadow: "0 12px 30px rgba(6,27,65,.08)",
    overflowWrap: "anywhere" as const,
    padding: 22
  },
  h2: { color: "#000000", fontSize: 24 },
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
    background: "#fff",
    border: "1px solid #faf6ec",
    borderRadius: 14,
    display: "grid",
    gap: 12,
    margin: "32px clamp(18px, 5vw, 64px)",
    maxWidth: 720,
    padding: 24
  },
  label: { display: "grid", fontWeight: 800, gap: 6 },
  input: {
    border: "1px solid #ece3d2",
    borderRadius: 8,
    font: "inherit",
    minHeight: 44,
    padding: "0 12px"
  },
  retry: {
    background: "#fff",
    border: "1px solid #ece3d2",
    borderRadius: 8,
    color: "#000000",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 16px"
  }
} as const;
