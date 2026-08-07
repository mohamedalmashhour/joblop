"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  calendarPartialState,
  formatRwosDateTime,
  parseEmployerAttendanceList,
  type AuthenticatedViewState,
  type EmployerAttendanceDto
} from "@rwos/shared";
import { styles } from "../employerStyles";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type AttendanceState =
  | AuthenticatedViewState<readonly EmployerAttendanceDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

// Persisted, org-scoped employer attendance read (GET /api/attendance → /organizations/:id/attendance).
// No fixture records are ever shown as persisted data — the state machine mirrors the assignments panel.
export function EmployerAttendancePanel() {
  const [state, setState] = useState<AttendanceState>({ status: "loading" });
  const generationRef = useRef(0);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/attendance", { cache: "no-store" });
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
      const records = parseEmployerAttendanceList(payload);
      setState(records.length > 0 ? calendarListState(records) : calendarPartialState(records));
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
      <AttendanceMessage
        title="Loading attendance"
        message="Checking your authenticated organization context."
      />
    );
  }
  if (state.status === "denied") {
    return (
      <AttendanceMessage
        title="Sign in to view attendance"
        message="Attendance is shown only for your authenticated organization."
        action={{ href: "/signin", label: "Go to sign in" }}
      />
    );
  }
  if (state.status === "organization_required") {
    return (
      <AttendanceMessage
        title="Select your organization"
        message="Choose your organization on the request calendar, then return to view its attendance."
        action={{ href: "/employer/calendar", label: "Open request calendar" }}
      />
    );
  }
  if (state.status === "empty") {
    return (
      <AttendanceMessage
        title="No attendance yet"
        message="Attendance records for this organization will appear here — no fixture records are shown."
        action={{ href: "/employer/assignments", label: "View assignments" }}
      />
    );
  }
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <AttendanceMessage
        title={
          state.status === "unavailable"
            ? "Attendance unavailable"
            : state.status === "stale"
              ? "Attendance changed"
              : "Attendance could not be loaded"
        }
        message="No fixture records are shown as persisted data. Retry when the service is available."
        onRetry={load}
      />
    );
  }

  return (
    <div style={styles.cardGrid}>
      {state.data.map((record) => (
        <article key={record.attendanceRecordId} style={styles.card}>
          <span style={styles.statusBadge}>{record.status.replaceAll("_", " ")}</span>
          <h3 style={styles.cardTitle}>{formatAttendanceWindow(record)}</h3>
          <p style={styles.cardText}>{formatPresence(record)}</p>
          {record.exceptionCategory ? (
            <p style={styles.cardText}>Exception: {record.exceptionCategory.replaceAll("_", " ")}</p>
          ) : null}
          <a
            href={`/employer/assignments/detail?assignment=${encodeURIComponent(record.assignmentId)}`}
            style={styles.secondaryButton}
          >
            Open assignment detail
          </a>
        </article>
      ))}
    </div>
  );
}

function formatAttendanceWindow(record: EmployerAttendanceDto) {
  const start = formatRwosDateTime(record.scheduledStartAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: record.timezone
  });
  const end = formatRwosDateTime(record.scheduledEndAt, {
    timeStyle: "short",
    timeZone: record.timezone
  });
  return `${start} — ${end}`;
}

function formatPresence(record: EmployerAttendanceDto) {
  const checkIn = record.checkInAt
    ? formatRwosDateTime(record.checkInAt, { timeStyle: "short", timeZone: record.timezone })
    : "—";
  const checkOut = record.checkOutAt
    ? formatRwosDateTime(record.checkOutAt, { timeStyle: "short", timeZone: record.timezone })
    : "—";
  return `Checked in ${checkIn} · checked out ${checkOut}`;
}

function AttendanceMessage({
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
