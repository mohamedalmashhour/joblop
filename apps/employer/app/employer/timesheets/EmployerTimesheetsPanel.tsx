"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarFailureState,
  calendarListState,
  calendarPartialState,
  formatRwosDateTime,
  type AuthenticatedViewState,
  type EmployerTimesheetDto
} from "@rwos/shared";
import { styles } from "../employerStyles";
import { useLocale } from "../../i18n/LocaleProvider";
import { fill, langOf, statusLabel } from "../../i18n/localText";
import { reviewStatusLabels, timesheetStatusLabels, timesheetsText } from "../recordListText";

type OrganizationChoice = Readonly<{ id: string; publicId: string; displayName: string }>;
type TimesheetsState =
  | AuthenticatedViewState<readonly EmployerTimesheetDto[]>
  | Readonly<{ status: "organization_required"; organizations: readonly OrganizationChoice[] }>;

// Persisted, org-scoped employer timesheet read (GET /api/timesheets → /organizations/:id/timesheets).
// Read-only review surface — no confirm/dispute mutations here. Never shows fixture rows as persisted data.
export function EmployerTimesheetsPanel() {
  const lang = langOf(useLocale());
  const tx = timesheetsText[lang];
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
      // The route has already parsed the API record into this shape, and parsing it again would fail.
      const payload = (await response.json()) as { timesheets: readonly EmployerTimesheetDto[] };
      if (generation !== generationRef.current) return;
      const timesheets = payload.timesheets;
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
        title={tx.loading}
        message={tx.loadingBody}
      />
    );
  }
  if (state.status === "denied") {
    return (
      <TimesheetsMessage
        title={tx.signInTitle}
        message={tx.signInBody}
        action={{ href: "/signin", label: tx.goToSignIn }}
      />
    );
  }
  if (state.status === "organization_required") {
    return (
      <TimesheetsMessage
        title={tx.chooseCompanyTitle}
        message={tx.chooseCompanyBody}
        action={{ href: "/employer/calendar", label: tx.openCalendar }}
      />
    );
  }
  if (state.status === "empty") {
    return (
      <TimesheetsMessage
        title={tx.emptyTitle}
        message={tx.emptyBody}
        action={{ href: "/employer/attendance", label: tx.emptyAction }}
      />
    );
  }
  if (state.status !== "ready" && state.status !== "partial") {
    return (
      <TimesheetsMessage
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
      {state.data.map((timesheet) => (
        <article key={timesheet.timesheetId} style={styles.card}>
          <span style={styles.statusBadge}>{statusLabel(timesheetStatusLabels[lang], timesheet.status)}</span>
          <h3 style={styles.cardTitle}>{formatTimesheetWindow(timesheet)}</h3>
          <p style={styles.cardText}>{formatTotals(timesheet, tx.totals)}</p>
          <p style={styles.cardText}>{formatReviewStates(timesheet, tx.reviews, reviewStatusLabels[lang])}</p>
          {timesheet.exceptionSummary ? (
            <p style={styles.cardText}>{fill(tx.problem, { issue: timesheet.exceptionSummary })}</p>
          ) : null}
          <a
            href={`/employer/assignments/detail?assignment=${encodeURIComponent(timesheet.assignmentId)}`}
            style={styles.secondaryButton}
          >
            {tx.openDetail}
          </a>
          {timesheet.status === "employer_review" ? (
            <TimesheetActions timesheet={timesheet} onDone={load} />
          ) : null}
        </article>
      ))}
    </div>
  );
}

type ActionMode = "idle" | "disputing" | "submitting";

// Employer review actions, shown only while status === "employer_review".
// Optimistic-concurrency guarded via versionToken; a 409 (stale) reloads the list.
function TimesheetActions({
  timesheet,
  onDone
}: Readonly<{ timesheet: EmployerTimesheetDto; onDone: () => void | Promise<void> }>) {
  const tx = timesheetsText[langOf(useLocale())];
  const [mode, setMode] = useState<ActionMode>("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (action: "confirm" | "dispute", extra?: Readonly<{ reason: string }>) => {
      setMode("submitting");
      setError(null);
      try {
        const id = encodeURIComponent(timesheet.timesheetId);
        // Literal action segment keeps each URL statically resolvable to its
        // implemented route (/api/timesheets/[timesheetId]/confirm|dispute).
        const endpoint =
          action === "confirm"
            ? `/api/timesheets/${id}/confirm`
            : `/api/timesheets/${id}/dispute`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedVersion: timesheet.versionToken, ...extra })
        });
        if (response.status === 409) {
          setError(tx.changed);
          await onDone();
          return;
        }
        if (!response.ok) {
          setError(tx.actionFailed);
          setMode(action === "dispute" ? "disputing" : "idle");
          return;
        }
        await onDone();
      } catch {
        setError(tx.actionFailed);
        setMode(action === "dispute" ? "disputing" : "idle");
      }
    },
    [onDone, timesheet.timesheetId, timesheet.versionToken, tx]
  );

  const busy = mode === "submitting";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {mode === "disputing" ? (
        <>
          <label style={styles.cardText} htmlFor={`dispute-${timesheet.timesheetId}`}>
            {tx.disputeReason}
          </label>
          <textarea
            id={`dispute-${timesheet.timesheetId}`}
            aria-label={tx.disputeReason}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={3}
            disabled={busy}
            style={styles.cardText}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              disabled={busy || reason.trim().length === 0}
              onClick={() => void submit("dispute", { reason: reason.trim() })}
              style={{ ...styles.primaryButton, cursor: busy ? "wait" : "pointer" }}
            >
              {busy ? tx.submitting : tx.submitDispute}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setError(null);
              }}
              style={{ ...styles.secondaryButton, cursor: "pointer" }}
            >
              {tx.cancel}
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit("confirm")}
            style={{ ...styles.primaryButton, cursor: busy ? "wait" : "pointer" }}
          >
            {busy ? tx.confirming : tx.confirm}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode("disputing");
              setError(null);
            }}
            style={{ ...styles.secondaryButton, cursor: "pointer" }}
          >
            {tx.dispute}
          </button>
        </div>
      )}
      {error ? (
        <p aria-live="polite" style={styles.cardText}>
          {error}
        </p>
      ) : null}
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

function formatTotals(timesheet: EmployerTimesheetDto, template: string) {
  return fill(template, {
    worked: formatMinutes(timesheet.payableMinutes),
    billed: formatMinutes(timesheet.billableMinutes),
    break: formatMinutes(timesheet.breakMinutes)
  });
}

function formatReviewStates(
  timesheet: EmployerTimesheetDto,
  template: string,
  labels: Readonly<Record<string, string>>
) {
  return fill(template, {
    worker: statusLabel(labels, timesheet.workerReviewStatus),
    employer: statusLabel(labels, timesheet.employerReviewStatus),
    platform: statusLabel(labels, timesheet.platformReviewStatus)
  });
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
  const retryLabel = timesheetsText[langOf(useLocale())].retry;
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
