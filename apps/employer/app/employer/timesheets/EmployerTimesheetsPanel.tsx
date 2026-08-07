"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  calendarPartialState,
  formatRwosDateTime,
  parseEmployerTimesheetList,
  type AuthenticatedViewState,
  type EmployerTimesheetDto
} from "@rwos/shared";
import { styles } from "../employerStyles";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type TimesheetsState =
  | AuthenticatedViewState<readonly EmployerTimesheetDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

// Persisted, org-scoped employer timesheet read (GET /api/timesheets → /organizations/:id/timesheets).
// Read-only review surface — no confirm/dispute mutations here. Never shows fixture rows as persisted data.
export function EmployerTimesheetsPanel() {
  const [state, setState] = useState<TimesheetsState>({ status: "loading" });
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/timesheets", { cache: "no-store" });
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
      const timesheets = parseEmployerTimesheetList(payload);
      setState(timesheets.length > 0 ? calendarListState(timesheets) : calendarPartialState(timesheets));
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
      <TimesheetsMessage
        title="Loading timesheets"
        message="Checking your authenticated organization context."
      />
    );
  }
  if (state.status === "denied") {
    return (
      <TimesheetsMessage
        title="Sign in to view timesheets"
        message="Timesheets are shown only for your authenticated organization."
        action={{ href: "/signin", label: "Go to sign in" }}
      />
    );
  }
  if (state.status === "organization_required") {
    return (
      <TimesheetsMessage
        title="Select your organization"
        message="Choose your organization on the request calendar, then return to view its timesheets."
        action={{ href: "/employer/calendar", label: "Open request calendar" }}
      />
    );
  }
  if (state.status === "empty") {
    return (
      <TimesheetsMessage
        title="No timesheets yet"
        message="Timesheets for this organization will appear here — no fixture records are shown."
        action={{ href: "/employer/attendance", label: "View attendance" }}
      />
    );
  }
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <TimesheetsMessage
        title={
          state.status === "unavailable"
            ? "Timesheets unavailable"
            : state.status === "stale"
              ? "Timesheets changed"
              : "Timesheets could not be loaded"
        }
        message="No fixture records are shown as persisted data. Retry when the service is available."
        onRetry={load}
      />
    );
  }

  return (
    <div style={styles.cardGrid}>
      {state.data.map((timesheet) => (
        <article key={timesheet.timesheetId} style={styles.card}>
          <span style={styles.statusBadge}>{timesheet.status.replaceAll("_", " ")}</span>
          <h3 style={styles.cardTitle}>{formatTimesheetWindow(timesheet)}</h3>
          <p style={styles.cardText}>{formatTotals(timesheet)}</p>
          <p style={styles.cardText}>{formatReviewStates(timesheet)}</p>
          {timesheet.exceptionSummary ? (
            <p style={styles.cardText}>Exception: {timesheet.exceptionSummary}</p>
          ) : null}
          <a
            href={`/employer/assignments/detail?assignment=${encodeURIComponent(timesheet.assignmentId)}`}
            style={styles.secondaryButton}
          >
            Open assignment detail
          </a>
        </article>
      ))}
    </div>
  );
}

function formatTimesheetWindow(timesheet: EmployerTimesheetDto) {
  const start = formatRwosDateTime(timesheet.scheduledStartAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timesheet.timezone
  });
  const end = formatRwosDateTime(timesheet.scheduledEndAt, {
    timeStyle: "short",
    timeZone: timesheet.timezone
  });
  return `${start} — ${end}`;
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

function formatTotals(timesheet: EmployerTimesheetDto) {
  return `Payable ${formatMinutes(timesheet.payableMinutes)} · billable ${formatMinutes(
    timesheet.billableMinutes
  )} · break ${formatMinutes(timesheet.breakMinutes)}`;
}

function formatReviewStates(timesheet: EmployerTimesheetDto) {
  const label = (value: string) => value.replaceAll("_", " ");
  return `Worker ${label(timesheet.workerReviewStatus)} · employer ${label(
    timesheet.employerReviewStatus
  )} · platform ${label(timesheet.platformReviewStatus)}`;
}

function TimesheetsMessage({
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
