"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRwosDateTime } from "@rwos/shared";
import {
  eligibleOffersForAssignment,
  type AdminAssignmentSummary,
  type AdminWorkerOfferSummary
} from "../../api/dispatches/offerAssignmentBoundary";

type State =
  | { status: "loading" | "empty" | "denied" | "unavailable" }
  | {
      status: "ready";
      offers: readonly AdminWorkerOfferSummary[];
      assignments: readonly AdminAssignmentSummary[];
      canCreateAssignment: boolean;
    };

export function OfferAssignmentStatusPanel({
  dispatchReviewId
}: Readonly<{ dispatchReviewId: string }>) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "status" | "alert"; message: string } | undefined>();
  const requestGeneration = useRef(0);
  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    try {
      const nextState = await fetchOperationalState(dispatchReviewId);
      if (generation !== requestGeneration.current) return;
      setState(nextState);
    } catch {
      if (generation === requestGeneration.current) setState({ status: "unavailable" });
    }
  }, [dispatchReviewId]);
  useEffect(() => {
    void load();
    return () => {
      requestGeneration.current += 1;
    };
  }, [load]);

  const createAssignment = useCallback(
    async (offer: AdminWorkerOfferSummary) => {
      if (submitting) return;
      setSubmitting(true);
      setNotice({
        tone: "status",
        message: "Checking the latest records before Assignment creation."
      });
      try {
        const before = await fetchOperationalState(dispatchReviewId);
        setState(before);
        if (before.status !== "ready" || !before.canCreateAssignment) {
          setSelectedOfferId(null);
          setNotice({
            tone: "alert",
            message: "Assignment creation is not enabled. No Assignment was created."
          });
          return;
        }
        const currentOffer = before.offers.find((candidate) => candidate.id === offer.id);
        const existing = before.assignments.find(
          (assignment) => assignment.workerOfferId === offer.id
        );
        if (
          existing ||
          currentOffer?.status !== "accepted" ||
          currentOffer.versionToken !== offer.versionToken
        ) {
          setSelectedOfferId(null);
          setNotice({
            tone: "alert",
            message: existing
              ? "An Assignment already exists for this accepted offer. No duplicate was created."
              : "The offer changed before Assignment creation. Review the latest persisted status."
          });
          return;
        }

        const response = await fetch(
          `/api/dispatches/${encodeURIComponent(dispatchReviewId)}/assignments`,
          {
            method: "POST",
            cache: "no-store",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              workerOfferId: currentOffer.id,
              expectedOfferVersion: currentOffer.versionToken
            })
          }
        );
        const reconciled = await fetchOperationalState(dispatchReviewId);
        setState(reconciled);
        setSelectedOfferId(null);
        const persisted =
          reconciled.status === "ready"
            ? reconciled.assignments.find(
                (assignment) => assignment.workerOfferId === currentOffer.id
              )
            : undefined;
        if (persisted) {
          setNotice({
            tone: "status",
            message:
              "Assignment created and verified. Worker acknowledgement and attendance remain separate."
          });
        } else if (response.status === 404) {
          setNotice({
            tone: "alert",
            message: "Assignment creation is not enabled. No Assignment was created."
          });
        } else if (response.status === 409 || response.status === 412) {
          setNotice({
            tone: "alert",
            message: "The offer or staffing state changed. Review the refreshed persisted records."
          });
        } else {
          setNotice({
            tone: "alert",
            message:
              "The creation result could not be confirmed. Records were reconciled; review before trying again."
          });
        }
      } catch {
        setSelectedOfferId(null);
        setNotice({
          tone: "alert",
          message:
            "The creation result is unknown. Reconcile persisted assignments before trying again."
        });
      } finally {
        setSubmitting(false);
      }
    },
    [dispatchReviewId, submitting]
  );

  // Round 2b: advance a draft/approved offer (approve → send). Same rigor as assignment creation:
  // re-read the latest persisted offer, version-guard, POST, reconcile, and VERIFY the persisted
  // transition after reload — a button press is never treated as proof of the state change.
  const advanceOffer = useCallback(
    async (offer: AdminWorkerOfferSummary, action: "approve" | "send") => {
      if (submitting) return;
      setSubmitting(true);
      setNotice({ tone: "status", message: `Checking the latest offer record before ${action}.` });
      try {
        const before = await fetchOperationalState(dispatchReviewId);
        setState(before);
        const current =
          before.status === "ready" ? before.offers.find((candidate) => candidate.id === offer.id) : undefined;
        const requiredPrev = action === "approve" ? "draft" : "approved";
        if (!current || current.status !== requiredPrev || current.versionToken !== offer.versionToken) {
          setNotice({
            tone: "alert",
            message: "The offer changed before the action. Review the latest persisted status."
          });
          return;
        }
        const dispatchSegment = encodeURIComponent(dispatchReviewId);
        const offerSegment = encodeURIComponent(offer.id);
        const response = await fetch(
          action === "approve"
            ? `/api/dispatches/${dispatchSegment}/offers/${offerSegment}/approve`
            : `/api/dispatches/${dispatchSegment}/offers/${offerSegment}/send`,
          {
            method: "POST",
            cache: "no-store",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ expectedVersion: current.versionToken })
          }
        );
        const reconciled = await fetchOperationalState(dispatchReviewId);
        setState(reconciled);
        const persisted =
          reconciled.status === "ready" ? reconciled.offers.find((candidate) => candidate.id === offer.id) : undefined;
        const expectedNext = action === "approve" ? "approved" : "sent";
        if (persisted?.status === expectedNext) {
          setNotice({
            tone: "status",
            message:
              action === "approve"
                ? "Offer approved and verified in persisted records."
                : "Offer sent to the worker and verified. Delivery confirmation is separate."
          });
        } else if (response.status === 409 || response.status === 412) {
          setNotice({ tone: "alert", message: "The offer state changed. Review the refreshed persisted records." });
        } else {
          setNotice({
            tone: "alert",
            message: "The action result could not be confirmed. Records were reconciled; review before retrying."
          });
        }
      } catch {
        setNotice({ tone: "alert", message: "The action result is unknown. Reconcile persisted offers before retrying." });
      } finally {
        setSubmitting(false);
      }
    },
    [dispatchReviewId, submitting]
  );

  if (state.status !== "ready") {
    return (
      <section aria-busy={state.status === "loading"} aria-live="polite">
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

  const assignedOfferIds = new Set(state.assignments.map((assignment) => assignment.workerOfferId));
  const eligibleOffers = eligibleOffersForAssignment(state.offers, state.assignments);

  return (
    <section aria-busy={submitting}>
      <h2>Offers and assignments</h2>
      <p>
        These are persisted operational records. A sent offer is not proof of delivery, and an
        accepted offer is not an Assignment.
      </p>
      <p>
        Accepted offers without an Assignment: <strong>{eligibleOffers.length}</strong>.
      </p>
      {notice ? (
        <p aria-live={notice.tone === "alert" ? "assertive" : "polite"} role={notice.tone}>
          {notice.message}
        </p>
      ) : null}
      <h3>Worker offers</h3>
      {state.offers.length === 0 ? <p>No offers recorded.</p> : null}
      {state.offers.map((offer) => (
        <article key={offer.id} style={styles.record}>
          <h4 style={styles.recordTitle}>{offer.title}</h4>
          <span>Offer status: {offer.status.replaceAll("_", " ")}</span>
          <small>
            {formatWindow(offer.startAt, offer.endAt, offer.timezone)} · version{" "}
            {offer.versionToken}
          </small>
          {offer.status === "draft" ? (
            <button
              aria-label={`Approve offer for ${offer.title}`}
              disabled={submitting}
              onClick={() => void advanceOffer(offer, "approve")}
              style={styles.primaryButton}
              type="button"
            >
              {submitting ? "Working…" : "Approve offer"}
            </button>
          ) : null}
          {offer.status === "approved" ? (
            <button
              aria-label={`Send offer to worker for ${offer.title}`}
              disabled={submitting}
              onClick={() => void advanceOffer(offer, "send")}
              style={styles.primaryButton}
              type="button"
            >
              {submitting ? "Working…" : "Send offer to worker"}
            </button>
          ) : null}
          {offer.status === "sent" && !offer.deliveredAt ? (
            <small>Delivery is not confirmed; only the persisted sent state is known.</small>
          ) : null}
          {offer.status === "accepted" && !assignedOfferIds.has(offer.id) ? (
            <div style={styles.reconciliation}>
              <strong>Reconciliation required</strong>
              <span>This accepted offer has no persisted Assignment.</span>
              {state.canCreateAssignment ? (
                selectedOfferId === offer.id ? (
                  <>
                    <p>
                      Create one authoritative Assignment from the latest accepted terms? This does
                      not prove notification delivery, attendance, hours, payroll or payment.
                    </p>
                    <div style={styles.actions}>
                      <button
                        disabled={submitting}
                        onClick={() => setSelectedOfferId(null)}
                        style={styles.button}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={submitting}
                        onClick={() => void createAssignment(offer)}
                        style={styles.primaryButton}
                        type="button"
                      >
                        {submitting ? "Creating Assignment…" : "Create Assignment"}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    aria-label={`Review Assignment creation for ${offer.title}`}
                    disabled={submitting}
                    onClick={() => setSelectedOfferId(offer.id)}
                    style={styles.button}
                    type="button"
                  >
                    Review Assignment creation
                  </button>
                )
              ) : (
                <>
                  <span>
                    Assignment creation is not enabled in this environment. No Assignment has been
                    created.
                  </span>
                  <button onClick={() => void load()} style={styles.button} type="button">
                    Refresh offer and assignment records
                  </button>
                </>
              )}
            </div>
          ) : null}
        </article>
      ))}
      <h3>Assignments</h3>
      {state.assignments.length === 0 ? <p>No authoritative assignments recorded.</p> : null}
      {state.assignments.map((assignment) => (
        <article key={assignment.id} style={styles.record}>
          <h4 style={styles.recordTitle}>{assignment.title}</h4>
          <span>Assignment status: {assignment.status.replaceAll("_", " ")}</span>
          <small>
            {formatWindow(assignment.startAt, assignment.endAt, assignment.timezone)} · attendance{" "}
            {assignment.attendanceBoundary.replaceAll("_", " ")}
          </small>
        </article>
      ))}
    </section>
  );
}

async function fetchOperationalState(dispatchReviewId: string): Promise<State> {
  const [offersResponse, assignmentsResponse] = await Promise.all([
    fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}/offers`, {
      cache: "no-store"
    }),
    fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}/assignments`, {
      cache: "no-store"
    })
  ]);
  if (!offersResponse.ok || !assignmentsResponse.ok) {
    const denied =
      [401, 403].includes(offersResponse.status) || [401, 403].includes(assignmentsResponse.status);
    return { status: denied ? "denied" : "unavailable" };
  }
  const offersPayload = (await offersResponse.json()) as {
    workerOffers?: readonly AdminWorkerOfferSummary[];
  };
  const assignmentsPayload = (await assignmentsResponse.json()) as {
    assignments?: readonly AdminAssignmentSummary[];
    canCreateAssignment?: boolean;
  };
  if (
    !offersPayload.workerOffers ||
    !assignmentsPayload.assignments ||
    typeof assignmentsPayload.canCreateAssignment !== "boolean"
  ) {
    throw new Error("RWOS_MISSING_OPERATIONAL_STATUS");
  }
  if (offersPayload.workerOffers.length === 0 && assignmentsPayload.assignments.length === 0) {
    return { status: "empty" };
  }
  return {
    status: "ready",
    offers: offersPayload.workerOffers,
    assignments: assignmentsPayload.assignments,
    canCreateAssignment: assignmentsPayload.canCreateAssignment
  };
}

function formatWindow(startAt: string, endAt: string, timezone: string) {
  const start = formatRwosDateTime(startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone
  });
  const end = formatRwosDateTime(endAt, {
    timeStyle: "short",
    timeZone: timezone
  });
  return start === "Unavailable" || end === "Unavailable" ? "Unavailable" : `${start}–${end}`;
}

const styles = {
  button: {
    background: "#0c0c0c",
    border: "1px solid rgba(201, 162, 75, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  primaryButton: {
    background: "#000000",
    border: "1px solid rgba(201, 162, 75, 0.16)",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  reconciliation: {
    background: "#000000",
    border: "1px solid #c69214",
    borderRadius: 8,
    display: "grid",
    gap: 8,
    padding: 12
  },
  record: {
    borderTop: "1px solid rgba(201, 162, 75, 0.16)",
    display: "grid",
    gap: 6,
    padding: "14px 0"
  },
  recordTitle: {
    fontSize: "1rem",
    margin: 0
  }
} as const;
