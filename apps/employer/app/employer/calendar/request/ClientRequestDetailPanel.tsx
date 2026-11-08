"use client";

import { ApplicantsPanel } from "./ApplicantsPanel";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildCalendarExport,
  calendarFailureState,
  formatRwosDateTime,
  parseClientCalendarDto,
  type AuthenticatedViewState,
  type ClientCalendarDto
} from "@rwos/shared";
import { styles } from "../../employerStyles";
import { JobLocationMap } from "../../../shared/maps";
import { AddWorkersPanel } from "./AddWorkersPanel";
import { BonusOfferPanel } from "./BonusOfferPanel";
import { CancelRequestPanel } from "./CancelRequestPanel";
import { EditRequestPanel } from "./EditRequestPanel";
import { DuplicateRequestButton } from "./DuplicateRequestButton";
import { ReduceWorkersPanel } from "./ReduceWorkersPanel";

export function ClientRequestDetailPanel({ requestId }: Readonly<{ requestId: string | null }>) {
  const [state, setState] = useState<AuthenticatedViewState<ClientCalendarDto>>({
    status: "loading"
  });
  const [organizationRequired, setOrganizationRequired] = useState(false);
  const requestGeneration = useRef(0);
  const load = useCallback(async () => {
    if (!requestId) return;
    const generation = ++requestGeneration.current;
    setOrganizationRequired(false);
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/calendar/requests/${encodeURIComponent(requestId)}`, {
        cache: "no-store"
      });
      if (generation !== requestGeneration.current) return;
      if (response.status === 409) {
        const payload = await response.json().catch(() => null);
        if (
          typeof payload === "object" &&
          payload !== null &&
          "status" in payload &&
          payload.status === "organization_required"
        ) {
          setOrganizationRequired(true);
          return setState({ status: "stale" });
        }
      }
      if (!response.ok) return setState(calendarFailureState(response.status));
      const payload = (await response.json()) as { request?: unknown };
      if (generation !== requestGeneration.current) return;
      setState({ status: "ready", data: parseClientCalendarDto(payload.request) });
    } catch {
      if (generation !== requestGeneration.current) return;
      setState({ status: "error" });
    }
  }, [requestId]);
  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);

  if (!requestId) {
    return (
      <article style={styles.panel} aria-live="polite">
        <h2 style={styles.sectionTitle}>Request reference required</h2>
        <p style={styles.sectionCopy}>Open a persisted request from the authenticated calendar.</p>
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      </article>
    );
  }

  if (organizationRequired) {
    return (
      <article style={styles.panel} aria-live="polite">
        <h2 style={styles.sectionTitle}>Organization selection required</h2>
        <p style={styles.sectionCopy}>
          Choose an authorized employer organization before opening this persisted request.
        </p>
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Choose organization
        </a>
      </article>
    );
  }

  if (state.status !== "ready") {
    const copy: readonly [string, string] =
      state.status === "loading"
        ? ["Loading request detail", "Checking the persisted client-authorized record."]
        : state.status === "denied"
          ? ["Authentication required", "Return to the calendar and sign in."]
          : state.status === "unavailable"
            ? [
                "Request service unavailable",
                "The persisted record could not be reached. No fixture record is substituted."
              ]
            : state.status === "stale"
              ? ["Request changed", "Refresh the persisted record before continuing."]
              : [
                  "Request detail unavailable",
                  "No fixture record is substituted for this persisted request."
                ];
    return (
      <article style={styles.panel} aria-live="polite">
        <h2 style={styles.sectionTitle}>{copy[0]}</h2>
        <p style={styles.sectionCopy}>{copy[1]}</p>
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
        {state.status === "error" || state.status === "stale" || state.status === "unavailable" ? (
          <button
            type="button"
            onClick={() => void load()}
            style={{ ...styles.secondaryButton, cursor: "pointer" }}
          >
            Retry
          </button>
        ) : null}
      </article>
    );
  }

  const request = state.data;
  const fields = [
    ["Request number", request.requestNumber],
    ["Status", request.status.replaceAll("_", " ")],
    ["Workers requested", String(request.numberOfWorkers)],
    ["Schedule", formatWindow(request)],
    ["Duties", request.dutiesSummary ?? "Not provided"],
    [
      "Qualifications",
      request.qualifications.length ? request.qualifications.join(", ") : "Not provided"
    ],
    ["Location", request.addressSummary ?? "Restricted or not provided"],
    ["Special instructions", request.specialInstructions ?? "Not provided"],
    ["Contract verification", request.verification.contract],
    [
      "Payment readiness",
      `${request.verification.paymentMethodReadiness} — payment details hidden`
    ],
    ["Location verification", request.verification.location]
  ] as const;
  return (
    <div style={styles.twoColumn}>
      <article style={styles.panel}>
        <p style={styles.eyebrowDark}>Persisted client request</p>
        <h2 style={styles.sectionTitle}>{request.title}</h2>
        <span style={clientStatusStyle(request.status)}>{request.status.replaceAll("_", " ")}</span>
        {request.status !== "cancelled" && request.status !== "completed" ? (
          <BonusOfferPanel requestId={request.id} />
        ) : null}
        {request.actionRequired === "information_required" ? (
          <p aria-live="polite" style={styles.warning}>
            Information requested: {request.actionRequiredReason}
          </p>
        ) : null}
        {request.status === "draft" || request.actionRequired === "information_required" ? (
          <a
            href={`/employer/calendar/request/edit?id=${encodeURIComponent(request.id)}`}
            style={styles.primaryButton}
          >
            {request.actionRequired === "information_required"
              ? "Provide requested information"
              : "Edit persisted draft"}
          </a>
        ) : (
          <p style={styles.cardText}>This request cannot be edited in its current status.</p>
        )}
        <a
          href={`/employer/calendar/assignment?request=${encodeURIComponent(request.id)}`}
          style={styles.secondaryButton}
        >
          View staffing progress
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          style={{ ...styles.secondaryButton, cursor: "pointer" }}
          className="no-print"
        >
          🖨 Print details
        </button>
        <ApplicantsPanel requestId={request.id} />
        <div style={{ marginTop: 14 }}>
          <DuplicateRequestButton requestId={request.id} />
        </div>
        {request.status !== "cancelled" && request.status !== "completed" ? (
          <>
            <div style={{ marginTop: 14 }}>
              <EditRequestPanel requestId={request.id} versionToken={request.versionToken} />
            </div>
            <div style={{ marginTop: 14 }}>
              <AddWorkersPanel
                requestId={request.id}
                currentWorkers={request.numberOfWorkers}
                versionToken={request.versionToken}
              />
            </div>
            {request.numberOfWorkers > 1 ? (
              <div style={{ marginTop: 14 }}>
                <ReduceWorkersPanel
                  requestId={request.id}
                  currentWorkers={request.numberOfWorkers}
                  versionToken={request.versionToken}
                />
              </div>
            ) : null}
            <div style={{ marginTop: 14 }}>
              <CancelRequestPanel requestId={request.id} />
            </div>
          </>
        ) : null}
      </article>
      <article style={styles.panel}>
        <h2 style={styles.cardTitle}>Request details</h2>
        {fields.map(([label, value]) => (
          <div key={label} style={styles.tintedCard}>
            <strong>{label}</strong>
            <p style={styles.cardText}>{value}</p>
          </div>
        ))}
        <JobLocationMap address={request.addressSummary} />
        {request.addressSummary ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.addressSummary)}`}
            target="_blank"
            rel="noreferrer"
            style={{ ...styles.secondaryButton, marginTop: 10, display: "inline-block" }}
            className="no-print"
          >
            Open in Google Maps
          </a>
        ) : null}
        {request.status === "assigned" || request.status === "in_progress" ? (
          <AddToCalendar request={request} />
        ) : null}
      </article>
    </div>
  );
}

// Client-side "add this confirmed shift to my own calendar" — Google Calendar link + .ics download,
// built from the request the panel already holds. Reuses the shared, tested calendar-export capsule;
// no account linking, no server round-trip.
function AddToCalendar({ request }: Readonly<{ request: ClientCalendarDto }>) {
  const exported = buildCalendarExport({
    title: request.title,
    startAt: request.startAt,
    endAt: request.endAt,
    jobCode: request.requestNumber,
    location: request.addressSummary,
    uid: request.id,
    stampedAt: new Date().toISOString()
  });
  const downloadIcs = () => {
    const blob = new Blob([exported.ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exported.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div style={styles.tintedCard}>
      <strong>Add to your calendar</strong>
      <p style={styles.cardText}>
        This shift is confirmed. Add it to your calendar with the job code {request.requestNumber}.
      </p>
      <a href={exported.googleCalendarUrl} target="_blank" rel="noopener noreferrer" style={styles.secondaryButton}>
        Add to Google Calendar
      </a>
      <button type="button" onClick={downloadIcs} style={{ ...styles.secondaryButton, cursor: "pointer", marginTop: 10 }}>
        Download .ics (Apple / Outlook)
      </button>
    </div>
  );
}

function clientStatusStyle(status: ClientCalendarDto["status"]) {
  const tone =
    status === "cancelled"
      ? ["#fdecec", "#8a1c1c"]
      : status === "under_review"
        ? ["#fff8d8", "#725000"]
        : status === "assigned" || status === "in_progress" || status === "completed"
          ? ["#faf6ec", "#171511"]
          : status === "submitted" || status === "published"
            ? ["#faf6ec", "#2a2114"]
            : ["#fbf9f4", "#3a3326"];
  return { ...styles.statusBadge, background: tone[0], color: tone[1] };
}

function formatWindow(request: ClientCalendarDto) {
  const start = formatRwosDateTime(request.startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: request.timezone
  });
  const end = formatRwosDateTime(request.endAt, {
    timeStyle: "short",
    timeZone: request.timezone
  });
  return start === "Unavailable" || end === "Unavailable" ? "Unavailable" : `${start}–${end}`;
}
