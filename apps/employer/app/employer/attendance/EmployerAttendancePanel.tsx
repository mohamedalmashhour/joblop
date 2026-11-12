"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  calendarPartialState,
  formatRwosDateTime,
  type AuthenticatedViewState,
  type EmployerAttendanceDto
} from "@rwos/shared";
import { styles } from "../employerStyles";
import { useLocale } from "../../i18n/LocaleProvider";
import { fill, langOf, statusLabel } from "../../i18n/localText";
import { attendanceStatusLabels, attendanceText } from "../recordListText";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type AttendanceState =
  | AuthenticatedViewState<readonly EmployerAttendanceDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

// Persisted, org-scoped employer attendance read (GET /api/attendance → /organizations/:id/attendance).
// No fixture records are ever shown as persisted data — the state machine mirrors the assignments panel.
export function EmployerAttendancePanel() {
  const lang = langOf(useLocale());
  const tx = attendanceText[lang];
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
      // The route has already parsed the API record into this shape, and parsing it again would fail.
      const payload = (await response.json()) as { attendanceRecords: readonly EmployerAttendanceDto[] };
      if (generation !== generationRef.current) return;
      const records = payload.attendanceRecords;
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
        title={tx.loading}
        message={tx.loadingBody}
      />
    );
  }
  if (state.status === "denied") {
    return (
      <AttendanceMessage
        title={tx.signInTitle}
        message={tx.signInBody}
        action={{ href: "/signin", label: tx.goToSignIn }}
      />
    );
  }
  if (state.status === "organization_required") {
    return (
      <AttendanceMessage
        title={tx.chooseCompanyTitle}
        message={tx.chooseCompanyBody}
        action={{ href: "/employer/calendar", label: tx.openCalendar }}
      />
    );
  }
  if (state.status === "empty") {
    return (
      <AttendanceMessage
        title={tx.emptyTitle}
        message={tx.emptyBody}
        action={{ href: "/employer/assignments", label: tx.emptyAction }}
      />
    );
  }
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <AttendanceMessage
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
      {state.data.map((record) => (
        <article key={record.attendanceRecordId} style={styles.card}>
          <span style={styles.statusBadge}>{statusLabel(attendanceStatusLabels[lang], record.status)}</span>
          <h3 style={styles.cardTitle}>{formatAttendanceWindow(record)}</h3>
          <p style={styles.cardText}>{formatPresence(record, tx.checkedIn)}</p>
          {record.cancelledBy ? <p style={styles.cardText}>{tx.cancelledBy[record.cancelledBy]}</p> : null}
          {/* No link here: the records carry no request number, and the old assignment-detail
              page is not available on the live site. */}
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

function formatPresence(record: EmployerAttendanceDto, template: string) {
  const checkIn = record.checkInAt
    ? formatRwosDateTime(record.checkInAt, { timeStyle: "short", timeZone: record.timezone })
    : "—";
  const checkOut = record.checkOutAt
    ? formatRwosDateTime(record.checkOutAt, { timeStyle: "short", timeZone: record.timezone })
    : "—";
  return fill(template, { in: checkIn, out: checkOut });
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
  const retryLabel = attendanceText[langOf(useLocale())].retry;
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
