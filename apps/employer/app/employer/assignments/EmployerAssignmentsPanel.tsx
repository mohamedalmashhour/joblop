"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  calendarPartialState,
  formatRwosDateTime,
  type AuthenticatedViewState,
  type EmployerAssignmentDto
} from "@rwos/shared";
import { styles } from "../employerStyles";
import { useLocale } from "../../i18n/LocaleProvider";
import { langOf, statusLabel } from "../../i18n/localText";
import { assignmentStatusLabels, assignmentsText } from "../recordListText";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type AssignmentsState =
  | AuthenticatedViewState<readonly EmployerAssignmentDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

// Persisted, org-scoped employer assignments read (GET /api/assignments → /organizations/:id/assignments).
// No fixture records are ever shown as persisted data — the state machine mirrors the request calendar.
export function EmployerAssignmentsPanel() {
  const lang = langOf(useLocale());
  const tx = assignmentsText[lang];
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
      // The route has already parsed the API record into this shape, and parsing it again would fail.
      const payload = (await response.json()) as { assignments: readonly EmployerAssignmentDto[] };
      if (generation !== generationRef.current) return;
      const assignments = payload.assignments;
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
        title={tx.loading}
        message={tx.loadingBody}
      />
    );
  }
  if (state.status === "denied") {
    return (
      <AssignmentsMessage
        title={tx.signInTitle}
        message={tx.signInBody}
        action={{ href: "/signin", label: tx.goToSignIn }}
      />
    );
  }
  if (state.status === "organization_required") {
    return (
      <AssignmentsMessage
        title={tx.chooseCompanyTitle}
        message={tx.chooseCompanyBody}
        action={{ href: "/employer/calendar", label: tx.openCalendar }}
      />
    );
  }
  if (state.status === "empty") {
    return (
      <AssignmentsMessage
        title={tx.emptyTitle}
        message={tx.emptyBody}
        action={{ href: "/employer/calendar", label: tx.emptyAction }}
      />
    );
  }
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <AssignmentsMessage
        title={
          state.status === "unavailable"
            ? tx.unavailableTitle
            : state.status === "stale"
              ? tx.changedTitle
              : tx.errorTitle
        }
        message={tx.errorBody}
        onRetry={load}
      />
    );
  }

  return (
    <div style={styles.cardGrid}>
      {state.data.map((assignment) => (
        <article key={assignment.assignmentId} style={styles.card}>
          <span style={styles.statusBadge}>{statusLabel(assignmentStatusLabels[lang], assignment.status)}</span>
          <h3 style={styles.cardTitle}>{assignment.title ?? assignment.roleSummary ?? tx.pageEyebrow}</h3>
          {assignment.roleSummary ? <p style={styles.cardText}>{assignment.roleSummary}</p> : null}
          {assignment.worksiteSummary ? (
            <p style={styles.cardText}>{assignment.worksiteSummary}</p>
          ) : null}
          <p style={styles.cardText}>{formatAssignmentWindow(assignment)}</p>
          <a
            href={`/employer/assignments/detail?assignment=${encodeURIComponent(assignment.assignmentId)}`}
            style={styles.secondaryButton}
          >
            {tx.openDetail}
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
  const retryLabel = assignmentsText[langOf(useLocale())].retry;
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
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
