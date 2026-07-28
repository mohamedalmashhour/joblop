"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdminAssignmentSummary,
  AdminWorkerOfferSummary
} from "../../api/dispatches/offerAssignmentBoundary";

type State =
  | { status: "loading" | "empty" | "denied" | "unavailable" }
  | {
      status: "ready";
      offers: readonly AdminWorkerOfferSummary[];
      assignments: readonly AdminAssignmentSummary[];
    };

export function OfferAssignmentStatusPanel({
  dispatchReviewId
}: Readonly<{ dispatchReviewId: string }>) {
  const [state, setState] = useState<State>({ status: "loading" });
  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [offersResponse, assignmentsResponse] = await Promise.all([
        fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}/offers`, {
          cache: "no-store"
        }),
        fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}/assignments`, {
          cache: "no-store"
        })
      ]);
      if (!offersResponse.ok || !assignmentsResponse.ok) {
        const denied = offersResponse.status === 401 || assignmentsResponse.status === 401;
        setState({ status: denied ? "denied" : "unavailable" });
        return;
      }
      const offersPayload = (await offersResponse.json()) as {
        workerOffers?: readonly AdminWorkerOfferSummary[];
      };
      const assignmentsPayload = (await assignmentsResponse.json()) as {
        assignments?: readonly AdminAssignmentSummary[];
      };
      if (!offersPayload.workerOffers || !assignmentsPayload.assignments) {
        throw new Error("RWOS_MISSING_OPERATIONAL_STATUS");
      }
      if (offersPayload.workerOffers.length === 0 && assignmentsPayload.assignments.length === 0) {
        setState({ status: "empty" });
        return;
      }
      setState({
        status: "ready",
        offers: offersPayload.workerOffers,
        assignments: assignmentsPayload.assignments
      });
    } catch {
      setState({ status: "unavailable" });
    }
  }, [dispatchReviewId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (state.status !== "ready") {
    return (
      <section aria-live="polite">
        <h2>Offers and assignments</h2>
        <p>
          {state.status === "loading"
            ? "Loading authoritative offer and assignment records…"
            : state.status === "empty"
              ? "No persisted offers or assignments exist for this dispatch."
              : state.status === "denied"
                ? "Administrator authorization is required."
                : "Offer and assignment records are unavailable. No fixture state is substituted."}
        </p>
        {state.status !== "loading" && state.status !== "empty" ? (
          <button onClick={() => void load()} style={styles.button} type="button">
            Retry status
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section>
      <h2>Offers and assignments</h2>
      <p>
        These are persisted operational records. A sent offer is not proof of delivery, and an
        accepted offer is not an Assignment.
      </p>
      <h3>Worker offers</h3>
      {state.offers.length === 0 ? <p>No offers recorded.</p> : null}
      {state.offers.map((offer) => (
        <article key={offer.id} style={styles.record}>
          <strong>{offer.title}</strong>
          <span>{offer.status.replaceAll("_", " ")}</span>
          <small>
            {formatWindow(offer.startAt, offer.endAt, offer.timezone)} · version{" "}
            {offer.versionToken}
          </small>
          {offer.status === "sent" && !offer.deliveredAt ? (
            <small>Delivery is not confirmed; only the persisted sent state is known.</small>
          ) : null}
        </article>
      ))}
      <h3>Assignments</h3>
      {state.assignments.length === 0 ? <p>No authoritative assignments recorded.</p> : null}
      {state.assignments.map((assignment) => (
        <article key={assignment.id} style={styles.record}>
          <strong>{assignment.title}</strong>
          <span>{assignment.status.replaceAll("_", " ")}</span>
          <small>
            {formatWindow(assignment.startAt, assignment.endAt, assignment.timezone)} · attendance{" "}
            {assignment.attendanceBoundary.replaceAll("_", " ")}
          </small>
        </article>
      ))}
    </section>
  );
}

function formatWindow(startAt: string, endAt: string, timezone: string) {
  const start = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone
  }).format(new Date(startAt));
  const end = new Intl.DateTimeFormat("en-CA", {
    timeStyle: "short",
    timeZone: timezone
  }).format(new Date(endAt));
  return `${start}–${end}`;
}

const styles = {
  button: {
    background: "#fff",
    border: "1px solid #91a5bf",
    borderRadius: 8,
    color: "#061b41",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  record: {
    borderTop: "1px solid #e7edf5",
    display: "grid",
    gap: 6,
    padding: "14px 0"
  }
} as const;
