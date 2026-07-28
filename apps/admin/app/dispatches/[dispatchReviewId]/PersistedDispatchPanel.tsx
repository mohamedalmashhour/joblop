"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminDispatchReview } from "../../api/dispatches/dispatchBoundary";
import { CandidateReviewPanel } from "./CandidateReviewPanel";
import { OfferAssignmentStatusPanel } from "./OfferAssignmentStatusPanel";

export function PersistedDispatchPanel({
  dispatchReviewId
}: Readonly<{ dispatchReviewId: string }>) {
  const [dispatch, setDispatch] = useState<AdminDispatchReview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        setStatus(response.status === 401 ? "denied" : "unavailable");
        return;
      }
      const payload = (await response.json()) as { dispatchReview?: AdminDispatchReview };
      if (!payload.dispatchReview) throw new Error("RWOS_MISSING_DISPATCH");
      setDispatch(payload.dispatchReview);
      setStatus("ready");
    } catch {
      setStatus("unavailable");
    }
  }, [dispatchReviewId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status !== "ready" || !dispatch) {
    return (
      <main style={styles.page}>
        <section aria-live="polite" style={styles.hero}>
          <h1>
            {status === "loading" ? "Loading dispatch review" : "Dispatch review unavailable"}
          </h1>
          <p>
            {status === "denied"
              ? "Administrator authorization is required."
              : "No fixture dispatch or candidate data is substituted."}
          </p>
          {status !== "loading" ? (
            <button onClick={() => void load()} style={styles.button} type="button">
              Retry
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Resident Workforce OS / Dispatch review</p>
          <h1 style={styles.title}>Operational dispatch review</h1>
          <p style={styles.lede}>
            {dispatch.id} · {dispatch.state.replaceAll("_", " ")}
          </p>
        </div>
        <a
          href={`/calendar/request?request=${encodeURIComponent(dispatch.jobRequestId)}`}
          style={styles.link}
        >
          Open source request
        </a>
      </header>
      <section style={styles.grid}>
        <article style={styles.panel}>
          <h2>Persisted review state</h2>
          <p>{dispatchStateCopy(dispatch.state)}</p>
          {[
            ["Priority", dispatch.priority],
            ["Required workers", String(dispatch.requiredWorkerCount)],
            ["Shortlisted candidates", String(dispatch.shortlistedCandidateCount)],
            ["Offers prepared (not necessarily sent)", String(dispatch.preparedOfferCount)],
            [
              "Workers still requested (not assignment status)",
              String(dispatch.remainingWorkerCount)
            ],
            ["Version", String(dispatch.versionToken)],
            ["Created", formatDate(dispatch.createdAt)],
            ["Updated", formatDate(dispatch.updatedAt)]
          ].map(([label, value]) => (
            <div key={label} style={styles.row}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
        </article>
        <article style={styles.panel}>
          <CandidateReviewPanel dispatch={dispatch} onUpdated={setDispatch} />
          <p>
            Candidate sourcing and worker contact are unavailable in this view. Counts are shown
            only from the persisted dispatch record.
          </p>
          <p>
            No shortlist, offer, assignment, notification, payroll, or payment action is performed
            here.
          </p>
          <p>
            A remaining count of zero does not prove that workers were contacted, accepted work, or
            were assigned.
          </p>
        </article>
        <article style={styles.panel}>
          <OfferAssignmentStatusPanel dispatchReviewId={dispatch.id} />
        </article>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

function dispatchStateCopy(state: AdminDispatchReview["state"]) {
  const copy: Record<AdminDispatchReview["state"], string> = {
    draft: "Dispatch review created; operational review has not started.",
    active: "Operational review is active; candidate review has not necessarily started.",
    candidate_review: "Candidate review is in progress. No offer or assignment is implied.",
    shortlist_ready: "A shortlist is prepared for governed review. No offer has been sent.",
    offer_preparation: "Offer preparation is in progress. No assignment is confirmed.",
    paused: "Review is paused. No further dispatch progression is occurring here.",
    cancelled: "Review is cancelled. No active dispatch action remains.",
    closed:
      "Review is closed. Downstream outcomes require authoritative offer and assignment records."
  };
  return copy[state];
}

const styles = {
  page: {
    background: "#f4f7fb",
    color: "#10233f",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh"
  },
  hero: {
    alignItems: "center",
    background: "#061b41",
    color: "#fff",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 24,
    justifyContent: "space-between",
    padding: "40px clamp(18px, 5vw, 64px)"
  },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#d6e5f8", fontSize: 18 },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "24px clamp(18px, 5vw, 64px)"
  },
  panel: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 14, padding: 24 },
  row: {
    borderBottom: "1px solid #e7edf5",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
    justifyContent: "space-between",
    padding: "12px 0"
  },
  button: {
    background: "#fff",
    border: "1px solid #91a5bf",
    borderRadius: 8,
    color: "#061b41",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  link: {
    alignItems: "center",
    background: "#fff",
    borderRadius: 8,
    color: "#061b41",
    display: "inline-flex",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px",
    textDecoration: "none"
  }
} as const;
