"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRwosDateTime } from "@rwos/shared";
import { useLocale } from "../../i18n/LocaleProvider";
import { BoardOnlyNotice } from "./BoardOnlyNotice";
import { readShiftOverlapNotice } from "../shiftOverlapNotice";
import { CertificateOverrideBox, certificateOverrideBody, type CertificateOverride } from "../CertificateOverrideBox";
import {
  eligibleOffersForAssignment,
  type AdminAssignmentSummary,
  type AdminWorkerOfferSummary
} from "../../api/dispatches/offerAssignmentBoundary";
import { SignedOut } from "../../shared/SignedOut";
import { usePageText } from "../../i18n/pageText";
import { dispatchPanelsText, fillIn, statusWord } from "./dispatchPanelsText";

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
  const locale = useLocale();
  const t = usePageText(dispatchPanelsText).offers;
  const dateLocale = locale;
  const [state, setState] = useState<State>({ status: "loading" });
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Required-certificate pre-check for the offer being assigned (override is logged by the API).
  const [certificateOverride, setCertificateOverride] = useState<CertificateOverride | null>(null);
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
      setNotice({ tone: "status", message: t.checking });
      try {
        const before = await fetchOperationalState(dispatchReviewId);
        setState(before);
        if (before.status !== "ready" || !before.canCreateAssignment) {
          setSelectedOfferId(null);
          setNotice({ tone: "alert", message: t.notEnabledNotice });
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
            message: existing ? t.existing : t.changedBefore
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
              expectedOfferVersion: currentOffer.versionToken,
              ...certificateOverrideBody(certificateOverride)
            })
          }
        );
        const overlap = await readShiftOverlapNotice(response, locale);
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
          setNotice({ tone: "status", message: t.created });
        } else if (overlap) {
          // The worker already holds a shift at that time; the API's message names it.
          setNotice({ tone: "alert", message: overlap });
        } else if (response.status === 404) {
          setNotice({ tone: "alert", message: t.notEnabledNotice });
        } else if (response.status === 409 || response.status === 412) {
          setNotice({ tone: "alert", message: t.stateChanged });
        } else {
          setNotice({ tone: "alert", message: t.unconfirmed });
        }
      } catch {
        setSelectedOfferId(null);
        setNotice({ tone: "alert", message: t.unknown });
      } finally {
        setSubmitting(false);
      }
    },
    [dispatchReviewId, submitting, locale, t]
  );

  // Round 2b: advance a draft/approved offer (approve → send). Same rigor as assignment creation:
  // re-read the latest persisted offer, version-guard, POST, reconcile, and VERIFY the persisted
  // transition after reload — a button press is never treated as proof of the state change.
  const advanceOffer = useCallback(
    async (offer: AdminWorkerOfferSummary, action: "approve" | "send") => {
      if (submitting) return;
      setSubmitting(true);
      setNotice({ tone: "status", message: t.checking });
      try {
        const before = await fetchOperationalState(dispatchReviewId);
        setState(before);
        const current =
          before.status === "ready" ? before.offers.find((candidate) => candidate.id === offer.id) : undefined;
        const requiredPrev = action === "approve" ? "draft" : "approved";
        if (!current || current.status !== requiredPrev || current.versionToken !== offer.versionToken) {
          setNotice({ tone: "alert", message: t.changedBefore });
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
        const overlap = await readShiftOverlapNotice(response, locale);
        const reconciled = await fetchOperationalState(dispatchReviewId);
        setState(reconciled);
        const persisted =
          reconciled.status === "ready" ? reconciled.offers.find((candidate) => candidate.id === offer.id) : undefined;
        const expectedNext = action === "approve" ? "approved" : "sent";
        if (persisted?.status === expectedNext) {
          setNotice({ tone: "status", message: action === "approve" ? t.approved : t.sent });
        } else if (overlap) {
          setNotice({ tone: "alert", message: overlap });
        } else if (response.status === 409 || response.status === 412) {
          setNotice({ tone: "alert", message: t.stateChanged });
        } else {
          setNotice({ tone: "alert", message: t.unconfirmed });
        }
      } catch {
        setNotice({ tone: "alert", message: t.unknown });
      } finally {
        setSubmitting(false);
      }
    },
    [dispatchReviewId, submitting, locale, t]
  );

  if (state.status === "denied") return <SignedOut compact />;
  if (state.status !== "ready") {
    return (
      <section aria-busy={state.status === "loading"} aria-live="polite">
        <h2>{t.title}</h2>
        <p>
          {state.status === "loading" ? t.loading : state.status === "empty" ? t.empty : t.unavailable}
        </p>
        {state.status !== "loading" && state.status !== "empty" ? (
          <button onClick={() => void load()} style={styles.button} type="button">
            {t.retry}
          </button>
        ) : null}
      </section>
    );
  }
  const windowText = (startAt: string, endAt: string, timezone: string) =>
    formatWindow(startAt, endAt, timezone, dateLocale, t.unavailableTime);

  const assignedOfferIds = new Set(state.assignments.map((assignment) => assignment.workerOfferId));
  const eligibleOffers = eligibleOffersForAssignment(state.offers, state.assignments);

  return (
    <section aria-busy={submitting}>
      <h2>{t.title}</h2>
      <p>{t.intro}</p>
      <p>
        {t.acceptedWithout} <strong>{eligibleOffers.length}</strong>
      </p>
      {notice ? (
        <p aria-live={notice.tone === "alert" ? "assertive" : "polite"} role={notice.tone}>
          {notice.message}
        </p>
      ) : null}
      <h3>{t.offersTitle}</h3>
      <BoardOnlyNotice />
      {state.offers.length === 0 ? <p>{t.noOffers}</p> : null}
      {state.offers.map((offer) => (
        <article key={offer.id} style={styles.record}>
          <h4 style={styles.recordTitle}>{offer.title}</h4>
          <span>{fillIn(t.offerStatus, { status: statusWord(t.statusWords, offer.status) })}</span>
          <small>
            {windowText(offer.startAt, offer.endAt, offer.timezone)} ·{" "}
            {fillIn(t.version, { n: offer.versionToken })}
          </small>
          {offer.status === "draft" ? (
            <button
              aria-label={fillIn(t.approveAria, { title: offer.title })}
              disabled={submitting}
              onClick={() => void advanceOffer(offer, "approve")}
              style={styles.primaryButton}
              type="button"
            >
              {submitting ? t.working : t.approve}
            </button>
          ) : null}
          {offer.status === "approved" ? (
            <button
              aria-label={fillIn(t.sendAria, { title: offer.title })}
              disabled={submitting}
              onClick={() => void advanceOffer(offer, "send")}
              style={styles.primaryButton}
              type="button"
            >
              {submitting ? t.working : t.send}
            </button>
          ) : null}
          {offer.status === "sent" && !offer.deliveredAt ? <small>{t.notDelivered}</small> : null}
          {offer.status === "accepted" && !assignedOfferIds.has(offer.id) ? (
            <div style={styles.reconciliation}>
              <strong>{t.reconTitle}</strong>
              <span>{t.reconBody}</span>
              {state.canCreateAssignment ? (
                selectedOfferId === offer.id ? (
                  <>
                    <p>{t.createQuestion}</p>
                    <CertificateOverrideBox dispatchReviewId={dispatchReviewId} workerOfferId={offer.id} onChange={setCertificateOverride} />
                    <div style={styles.actions}>
                      <button
                        disabled={submitting}
                        onClick={() => setSelectedOfferId(null)}
                        style={styles.button}
                        type="button"
                      >
                        {t.cancel}
                      </button>
                      <button
                        disabled={submitting || Boolean(certificateOverride?.needed && !certificateOverride.override)}
                        onClick={() => void createAssignment(offer)}
                        style={styles.primaryButton}
                        type="button"
                      >
                        {submitting ? t.creating : t.create}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    aria-label={fillIn(t.reviewAria, { title: offer.title })}
                    disabled={submitting}
                    onClick={() => setSelectedOfferId(offer.id)}
                    style={styles.button}
                    type="button"
                  >
                    {t.reviewCreate}
                  </button>
                )
              ) : (
                <>
                  <span>{t.notEnabled}</span>
                  <button onClick={() => void load()} style={styles.button} type="button">
                    {t.refresh}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </article>
      ))}
      <h3>{t.assignmentsTitle}</h3>
      {state.assignments.length === 0 ? <p>{t.noAssignments}</p> : null}
      {state.assignments.map((assignment) => (
        <article key={assignment.id} style={styles.record}>
          <h4 style={styles.recordTitle}>{assignment.title}</h4>
          <span>{fillIn(t.assignmentStatus, { status: statusWord(t.statusWords, assignment.status) })}</span>
          <small>
            {windowText(assignment.startAt, assignment.endAt, assignment.timezone)} ·{" "}
            {fillIn(t.attendance, { state: statusWord(t.attendanceWords, assignment.attendanceBoundary) })}
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

function formatWindow(startAt: string, endAt: string, timezone: string, locale: string, unknown: string) {
  const start = formatRwosDateTime(startAt, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
    locale
  });
  const end = formatRwosDateTime(endAt, {
    timeStyle: "short",
    timeZone: timezone,
    locale
  });
  return start === "Unavailable" || end === "Unavailable" ? unknown : `${start}–${end}`;
}

const styles = {
  button: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  primaryButton: {
    background: "#000000",
    border: "1px solid rgba(248, 184, 8, 0.16)",
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
    borderTop: "1px solid rgba(248, 184, 8, 0.16)",
    display: "grid",
    gap: 6,
    padding: "14px 0"
  },
  recordTitle: {
    fontSize: "1rem",
    margin: 0
  }
} as const;
