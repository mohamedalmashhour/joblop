"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  clearWebCalendarSession,
  parseClientCalendarList,
  type AuthenticatedViewState,
  type ClientCalendarDto
} from "@rwos/shared";
import { styles } from "../employerStyles";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type ClientCalendarState =
  | AuthenticatedViewState<readonly ClientCalendarDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

export function ClientCalendarPanel() {
  const [state, setState] = useState<ClientCalendarState>({
    status: "loading"
  });
  const requestGeneration = useRef(0);
  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/calendar/requests", { cache: "no-store" });
      if (generation !== requestGeneration.current) return;
      if (response.status === 409) {
        const context = parseOrganizationContext(await response.json().catch(() => null));
        if (generation !== requestGeneration.current) return;
        if (context) return setState(context);
      }
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = await response.json();
      if (generation === requestGeneration.current) {
        setState(calendarListState(parseClientCalendarList(payload)));
      }
    } catch {
      if (generation === requestGeneration.current) setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => { requestGeneration.current += 1; };
  }, [load]);

  if (state.status === "loading") return <CalendarState title="Loading request calendar" message="Checking your authenticated organization context." />;
  if (state.status === "denied") return <ClientSignIn onSignedIn={load} />;
  if (state.status === "organization_required") {
    return <><SessionAction onSignedOut={load} /><OrganizationPicker organizations={state.organizations} onSelected={load} /></>;
  }
  if (state.status === "empty") return <><SessionAction onSignedOut={load} /><CalendarState title="No persisted requests" message="No governed requests exist for this organization. Request creation remains a non-persistent preview." action="/employer/calendar/create" /></>;
  if (state.status !== "ready" && state.status !== "partial") {
    return <CalendarState title={state.status === "unavailable" ? "Calendar unavailable" : state.status === "stale" ? "Calendar changed" : "Calendar could not be loaded"} message="No fixture records are shown as persisted data. Retry when the service is available." onRetry={load} />;
  }

  return (
    <>
      <SessionAction onSignedOut={load} />
      {state.status === "partial"
        ? <CalendarState title="Some requests could not be shown" message="The records below passed the client privacy whitelist. Retry to check for the remaining records." onRetry={load} />
        : null}
      <div style={styles.cardGrid}>
        {state.data.map((request) => (
          <article key={request.id} style={styles.card}>
            <span style={clientStatusStyle(request.status)}>{request.status.replaceAll("_", " ")}</span>
            <h3 style={styles.cardTitle}>{request.title}</h3>
            <p style={styles.cardText}>{formatWindow(request)}</p>
            <p style={styles.cardText}>{request.numberOfWorkers} worker{request.numberOfWorkers === 1 ? "" : "s"} requested</p>
            <a
              href={`/employer/calendar/request?request=${encodeURIComponent(request.requestNumber)}`}
              style={styles.secondaryButton}
            >
              Open request detail
            </a>
          </article>
        ))}
      </div>
    </>
  );
}

function SessionAction({ onSignedOut }: Readonly<{ onSignedOut: () => Promise<void> }>) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Authenticated employer calendar session.");
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
    <div aria-busy={submitting} aria-live="polite" style={{ ...styles.panel, marginBottom: 18 }}>
      <p style={styles.sectionCopy}>{message}</p>
      <button disabled={submitting} onClick={() => void signOut()} style={{ ...styles.secondaryButton, cursor: "pointer" }} type="button">
        {submitting ? "Signing out…" : "Switch employer account"}
      </button>
    </div>
  );
}

function ClientSignIn({ onSignedIn }: Readonly<{ onSignedIn: () => Promise<void> }>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in to load your organization’s persisted request calendar.");
  const [needsSignOut, setNeedsSignOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
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
        return setMessage(response.status === 409 ? "Sign out before changing accounts." : "Sign-in failed.");
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
      setMessage("Local session cleared. Sign in with the intended employer account.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form aria-busy={submitting} onSubmit={submit} style={styles.panel}>
      <h3 style={styles.cardTitle}>Employer sign-in required</h3>
      <p aria-live="polite" style={styles.sectionCopy}>{message}</p>
      <label style={styles.fieldLabel}>Email<input autoComplete="username" disabled={submitting} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={styles.input} /></label>
      <label style={styles.fieldLabel}>Password<input autoComplete="current-password" disabled={submitting} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} style={styles.input} /></label>
      <button disabled={submitting} type="submit" style={{ ...styles.primaryButton, border: 0, opacity: submitting ? 0.65 : 1 }}>{submitting ? "Checking account…" : "Sign in securely"}</button>
      {needsSignOut
        ? <button disabled={submitting} type="button" onClick={() => void signOut()} style={{ ...styles.secondaryButton, cursor: "pointer" }}>Clear prior session</button>
        : null}
    </form>
  );
}

function CalendarState({ title, message, action, onRetry }: Readonly<{ title: string; message: string; action?: string; onRetry?: () => Promise<void> }>) {
  return (
    <article style={styles.panel} aria-live="polite">
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.sectionCopy}>{message}</p>
      {action ? <a href={action} style={styles.primaryButton}>Preview request creation</a> : null}
      {onRetry ? <button type="button" onClick={() => void onRetry()} style={{ ...styles.secondaryButton, cursor: "pointer" }}>Retry</button> : null}
    </article>
  );
}

function OrganizationPicker({ organizations, onSelected }: Readonly<{ organizations: readonly OrganizationChoice[]; onSelected: () => Promise<void> }>) {
  const [message, setMessage] = useState("Choose the organization whose persisted calendar you are authorized to access.");
  const [submitting, setSubmitting] = useState(false);
  const select = async (organizationId: string) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/session/organization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId })
      });
      if (!response.ok) return setMessage("Organization access could not be selected.");
      await onSelected();
    } catch {
      setMessage("Organization selection is unavailable. Try again.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <article aria-busy={submitting} aria-live="polite" style={styles.panel}>
      <h3 style={styles.cardTitle}>Select organization</h3>
      <p style={styles.sectionCopy}>{message}</p>
      {organizations.map((organization) => (
        <button
          disabled={submitting}
          key={organization.id}
          onClick={() => void select(organization.id)}
          style={{ ...styles.secondaryButton, cursor: "pointer", marginRight: 8, maxWidth: "100%", overflowWrap: "anywhere", whiteSpace: "normal" }}
          type="button"
        >
          {organization.displayName} ({organization.publicId})
        </button>
      ))}
    </article>
  );
}

function parseOrganizationContext(input: unknown): Extract<ClientCalendarState, { status: "organization_required" }> | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as { status?: unknown; organizations?: unknown };
  if (record.status !== "organization_required" || !Array.isArray(record.organizations)) return null;
  const organizations = record.organizations.filter((value): value is OrganizationChoice => {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.id === "string" &&
      typeof candidate.publicId === "string" &&
      typeof candidate.displayName === "string";
  });
  return organizations.length ? { status: "organization_required", organizations } : null;
}

function clientStatusStyle(status: ClientCalendarDto["status"]) {
  const tone = status === "cancelled"
    ? ["#fdecec", "#8a1c1c"]
    : status === "under_review"
      ? ["#fff8d8", "#725000"]
      : status === "assigned" || status === "in_progress" || status === "completed"
        ? ["#e8f5f3", "#075e58"]
        : status === "submitted" || status === "published"
          ? ["#eaf2ff", "#174a8b"]
          : ["#eef2f7", "#34445b"];
  return { ...styles.pill, background: tone[0], color: tone[1] };
}

function formatWindow(request: ClientCalendarDto) {
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone
  };
  return `${new Intl.DateTimeFormat("en-CA", options).format(new Date(request.startAt))}–${new Intl.DateTimeFormat("en-CA", { timeStyle: "short", timeZone: request.timezone }).format(new Date(request.endAt))}`;
}
