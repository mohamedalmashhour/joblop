"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  calendarPartialState,
  formatRwosDateTime,
  parseEmployerAssignmentList,
  type AuthenticatedViewState,
  type EmployerAssignmentDto
} from "@rwos/shared";
import { styles } from "../employerStyles";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type AssignmentsState =
  | AuthenticatedViewState<readonly EmployerAssignmentDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

// Persisted, org-scoped employer assignments read (GET /api/assignments → /organizations/:id/assignments).
// No fixture records are ever shown as persisted data — the state machine mirrors the request calendar.
export function EmployerAssignmentsPanel() {
  const [state, setState] = useState<AssignmentsState>({ status: "loading" });
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/assignments", { cache: "no-store" });
      if (generation !== generationRef.current) return;
      if (response.status === 409) {
        const body = await response.json().catch(() => null);
        if (generation !== generationRef.current) return;
        if (body && body.status === "organization_required" && Array.isArray(body.organizations)) {
          return setState({ status: "organization_required", organizations: body.organizations });
        }
      }
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = await response.json();
      if (generation !== generationRef.current) return;
      const assignments = parseEmployerAssignmentList(payload);
      setState(assignments.length > 0 ? calendarListState(assignments) : calendarPartialState(assignments));
    } catch {
      if (generation === generationRef.current) setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  if (state.status === "loading") {
    return (
      <AssignmentsMessage
        title="Loading assignments"
        message="Checking your authenticated organization context."
      />
    );
  }
  if (state.status === "denied") {
    return (
      <AssignmentsMessage
        title="Sign in to view assignments"
        message="Assignments are shown only for your authenticated organization."
        action={{ href: "/signin", label: "Go to sign in" }}
      />
    );
  }
  if (state.status === "organization_required") {
    return (
      <AssignmentsMessage
        title="Select your organization"
        message="Choose your organization on the request calendar, then return to view its assignments."
        action={{ href: "/employer/calendar", label: "Open request calendar" }}
      />
    );
  }
  if (state.status === "empty") {
    return (
      <AssignmentsMessage
        title="No assignments yet"
        message="Confirmed assignments for this organization will appear here — no fixture records are shown."
        action={{ href: "/employer/calendar", label: "View request calendar" }}
      />
    );
  }
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <AssignmentsMessage
        title={
          state.status === "unavailable"
            ? "Assignments unavailable"
            : state.status === "stale"
              ? "Assignments changed"
              : "Assignments could not be loaded"
        }
        message="No fixture records are shown as persisted data. Retry when the service is available."
        onRetry={load}
      />
    );
  }

  return (
    <div style={styles.cardGrid}>
      {state.data.map((assignment) => (
        <article key={assignment.assignmentId} style={styles.card}>
          <span style={styles.statusBadge}>{assignment.status.replaceAll("_", " ")}</span>
          <h3 style={styles.cardTitle}>{assignment.title ?? assignment.roleSummary ?? "Assignment"}</h3>
          {assignment.roleSummary ? <p style={styles.cardText}>{assignment.roleSummary}</p> : null}
          {assignment.worksiteSummary ? (
            <p style={styles.cardText}>{assignment.worksiteSummary}</p>
          ) : null}
          <p style={styles.cardText}>{formatAssignmentWindow(assignment)}</p>
          <a
            href={`/employer/assignments/detail?assignment=${encodeURIComponent(assignment.assignmentId)}`}
            style={styles.secondaryButton}
          >
            Open assignment detail
          </a>
        </article>
      ))}
    </div>
  );
}

function formatAssignmentWindow(assignment: EmployerAssignmentDto) {
  const start = formatRwosDateTime(assignment.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: assignment.timezone
  });
  const end = formatRwosDateTime(assignment.endAt, {
    timeStyle: "short",
    timeZone: assignment.timezone
  });
  return `${start} — ${end}`;
}

function AssignmentsMessage({
  title,
  message,
  action,
  onRetry
}: Readonly<{
  title: string;
  message: string;
  action?: Readonly<{ href: string; label: string }>;
  onRetry?: () => void;
}>) {
  return (
    <div aria-live="polite" style={styles.panel}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <p style={styles.sectionCopy}>{message}</p>
      {action ? (
        <a href={action.href} style={styles.primaryButton}>
          {action.label}
        </a>
      ) : null}
      {onRetry ? (
        <button
          onClick={onRetry}
          style={{ ...styles.secondaryButton, cursor: "pointer" }}
          type="button"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
