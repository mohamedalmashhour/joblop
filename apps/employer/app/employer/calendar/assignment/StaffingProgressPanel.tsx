"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EmployerDispatchStatus } from "../../../api/job-requests/jobRequestBoundary";
import { styles } from "../../employerStyles";

export function StaffingProgressPanel({ requestId }: Readonly<{ requestId: string | null }>) {
  const [status, setStatus] = useState<EmployerDispatchStatus | null>(null);
  const [view, setView] = useState<
    "loading" | "ready" | "denied" | "organization_required" | "unavailable" | "error" | "invalid"
  >(requestId && isUuid(requestId) ? "loading" : "invalid");
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (!requestId || !isUuid(requestId)) return setView("invalid");
    const current = ++generation.current;
    setView("loading");
    try {
      const response = await fetch(
        `/api/job-requests/${encodeURIComponent(requestId)}/dispatch-status`,
        { cache: "no-store" }
      );
      if (current !== generation.current) return;
      if (!response.ok) {
        setView(
          response.status === 400
            ? "invalid"
            : response.status === 401 || response.status === 403
              ? "denied"
              : response.status === 409
                ? "organization_required"
                : response.status === 503
                  ? "unavailable"
                  : "error"
        );
        return;
      }
      const payload = (await response.json()) as { dispatchStatus?: EmployerDispatchStatus };
      if (!payload.dispatchStatus) throw new Error("RWOS_MISSING_STATUS");
      setStatus(payload.dispatchStatus);
      setView("ready");
    } catch {
      if (current === generation.current) setView("unavailable");
    }
  }, [requestId]);

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);

  if (view !== "ready" || !status) {
    return (
      <article aria-busy={view === "loading"} aria-live="polite" style={styles.panel}>
        <h2 style={styles.sectionTitle}>
          {view === "loading"
            ? "Loading staffing progress"
            : view === "invalid"
              ? "Request reference required"
              : view === "organization_required"
                ? "Choose an employer organization"
                : view === "unavailable"
                  ? "Staffing progress temporarily unavailable"
                  : view === "error"
                    ? "Staffing progress could not be loaded"
                    : "Staffing progress unavailable"}
        </h2>
        <p style={styles.sectionCopy}>
          {view === "denied"
            ? "Sign in through the request calendar with an authorized employer account. This page does not reveal whether an inaccessible request exists."
            : view === "organization_required"
              ? "Select the organization whose request calendar you are authorized to view, then reopen staffing progress."
              : view === "invalid"
                ? "Open staffing progress from a persisted request in your request calendar."
                : view === "loading"
                  ? "Checking your organization-authorized request status."
                  : view === "unavailable"
                    ? "The staffing service could not be reached. No fixture status or worker identity is substituted, and your request was not changed."
                    : "A current staffing status could not be confirmed. No fixture status is shown."}
        </p>
        {view === "unavailable" || view === "error" ? (
          <button onClick={() => void load()} style={styles.secondaryButton} type="button">
            Try again
          </button>
        ) : null}
        {view !== "loading" ? (
          <a href="/employer/calendar" style={styles.secondaryButton}>
            {view === "organization_required" ? "Choose organization" : "Back to request calendar"}
          </a>
        ) : null}
      </article>
    );
  }

  const copy = stateCopy(status.state);
  return (
    <div style={styles.twoColumn}>
      <article style={styles.panel}>
        <p style={styles.eyebrowDark}>Persisted staffing progress</p>
        <h2 style={styles.sectionTitle}>{copy.title}</h2>
        <p style={styles.sectionCopy}>{copy.body}</p>
        {[
          ["Request", status.requestNumber],
          ["Workers requested", String(status.requiredWorkerCount)],
          ["Worker places without a prepared offer", String(status.remainingWorkerCount)]
        ].map(([label, value]) => (
          <div key={label} style={styles.tintedCard}>
            <strong>{label}</strong>
            <p style={styles.cardText}>{value}</p>
          </div>
        ))}
        <p style={styles.cardText}>
          A remaining count of zero does not confirm accepted offers or assignments.
        </p>
        {status.updatedAt ? (
          <p style={styles.cardText}>
            Updated:{" "}
            <time dateTime={status.updatedAt}>
              {new Date(status.updatedAt).toLocaleString(undefined, { timeZoneName: "short" })}
            </time>{" "}
            (your device time)
          </p>
        ) : null}
      </article>
      <article style={styles.panel}>
        <h2 style={styles.sectionTitle}>Worker offers and assignments</h2>
        <p style={styles.sectionCopy}>
          This staffing-progress status does not show whether a worker offer was authorized, sent,
          delivered, viewed, accepted, declined, expired, withdrawn, or cancelled.
        </p>
        <p style={styles.sectionCopy}>
          This status does not include an authoritative assignment record or worker identity. Worker
          identities, compensation, candidate details, and platform notes remain hidden.
        </p>
      </article>
    </div>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stateCopy(state: EmployerDispatchStatus["state"]) {
  const copy: Record<EmployerDispatchStatus["state"], { title: string; body: string }> = {
    not_started: {
      title: "Dispatch review has not started",
      body: "No candidate review, worker offer, or assignment is shown."
    },
    draft: {
      title: "Dispatch review created",
      body: "Operational candidate review has not started. No worker offer or assignment is confirmed."
    },
    active: {
      title: "Dispatch review active",
      body: "The operations team is reviewing the request. No worker offer or assignment is confirmed."
    },
    candidate_review: {
      title: "Candidate review in progress",
      body: "Review does not mean a worker was contacted, offered work, or assigned."
    },
    shortlist_ready: {
      title: "Candidate shortlist prepared",
      body: "Shortlisting does not mean a worker was contacted, accepted work, or was assigned."
    },
    offer_preparation: {
      title: "Worker-offer preparation in progress",
      body: "Prepared does not mean sent, delivered, viewed, accepted, or assigned."
    },
    paused: {
      title: "Dispatch review paused",
      body: "Existing counts do not confirm worker availability, an accepted offer, or coverage."
    },
    cancelled: {
      title: "Dispatch review cancelled",
      body: "Cancellation does not prove that staffing was arranged elsewhere."
    },
    closed: {
      title: "Dispatch review closed",
      body: "Confirmed outcomes require authoritative worker-offer and assignment records."
    }
  };
  return copy[state];
}
