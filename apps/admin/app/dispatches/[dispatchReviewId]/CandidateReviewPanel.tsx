"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminDispatchReview } from "../../api/dispatches/dispatchBoundary";

export function CandidateReviewPanel({
  dispatch,
  onUpdated
}: Readonly<{
  dispatch: AdminDispatchReview;
  onUpdated: (dispatch: AdminDispatchReview) => void;
}>) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sourceStatus, setSourceStatus] = useState<
    "not_checked" | "checking" | "available" | "candidate_source_unavailable" | "error"
  >("not_checked");
  const [shortlisting, setShortlisting] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const guard = useRef(false);

  useEffect(() => {
    if (confirming && !dialog.current?.open) dialog.current?.showModal();
    if (!confirming && dialog.current?.open) {
      dialog.current.close();
      trigger.current?.focus();
    }
  }, [confirming]);

  async function startReview() {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setMessage("Starting governed candidate review.");
    try {
      const response = await fetch(
        `/api/dispatches/${encodeURIComponent(dispatch.id)}/candidate-review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedVersion: dispatch.versionToken })
        }
      );
      if (!response.ok) {
        setConfirming(false);
        setMessage(
          response.status === 409
            ? "This dispatch changed. Candidate review was not started; load the latest record."
            : "Candidate review could not be started. No transition is claimed."
        );
        return;
      }
      const payload = (await response.json()) as { dispatchReview?: AdminDispatchReview };
      if (!payload.dispatchReview) throw new Error("RWOS_MISSING_DISPATCH");
      onUpdated(payload.dispatchReview);
      setConfirming(false);
      setMessage("Candidate review started. Candidate availability has not been checked.");
    } catch {
      setConfirming(false);
      setMessage("The transition result is unknown. Load the latest dispatch before trying again.");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }

  async function checkSource() {
    setSourceStatus("checking");
    try {
      const response = await fetch(
        `/api/dispatches/${encodeURIComponent(dispatch.id)}/candidate-source-status`,
        { cache: "no-store" }
      );
      if (!response.ok) return setSourceStatus("error");
      const payload = (await response.json()) as { status?: unknown };
      setSourceStatus(
        payload.status === "available"
          ? "available"
          : payload.status === "candidate_source_unavailable"
            ? "candidate_source_unavailable"
            : "error"
      );
    } catch {
      setSourceStatus("error");
    }
  }

  async function sourceAndShortlist() {
    setShortlisting(true);
    setMessage("Sourcing interested workers and shortlisting them.");
    try {
      const response = await fetch(
        `/api/dispatches/${encodeURIComponent(dispatch.id)}/source-and-shortlist`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }
      );
      if (!response.ok) {
        setMessage("Candidates could not be sourced. No worker was shortlisted.");
        return;
      }
      const result = (await response.json()) as { shortlisted?: number };
      const refreshed = await fetch(`/api/dispatches/${encodeURIComponent(dispatch.id)}`, {
        cache: "no-store"
      });
      if (refreshed.ok) {
        const payload = (await refreshed.json()) as { dispatchReview?: AdminDispatchReview };
        if (payload.dispatchReview) onUpdated(payload.dispatchReview);
      }
      setMessage(
        `Shortlisted ${result.shortlisted ?? 0} interested worker(s). You can now move to offer preparation.`
      );
    } catch {
      setMessage("The sourcing result is unknown. Load the latest dispatch before trying again.");
    } finally {
      setShortlisting(false);
    }
  }

  const canStart = dispatch.state === "draft" || dispatch.state === "active";
  return (
    <section aria-busy={busy || sourceStatus === "checking"}>
      <h2>Candidate review boundary</h2>
      <p aria-live="polite" role={message.includes("changed") ? "alert" : "status"}>
        {message ||
          "Candidate review and candidate-source availability are separate governed steps."}
      </p>
      {canStart ? (
        <button
          disabled={busy || confirming}
          onClick={() => setConfirming(true)}
          ref={trigger}
          style={styles.primary}
          type="button"
        >
          Start candidate review
        </button>
      ) : null}
      {dispatch.state === "candidate_review" ? (
        <>
          <button
            disabled={sourceStatus === "checking"}
            onClick={() => void checkSource()}
            style={styles.secondary}
            type="button"
          >
            {sourceStatus === "checking" ? "Checking…" : "Check candidate source"}
          </button>
          {sourceStatus === "candidate_source_unavailable" ? (
            <div role="status" style={styles.notice}>
              <h3>Candidate source unavailable</h3>
              <p>
                The authorized candidate source could not provide candidates. No candidate records
                were returned, and no worker was shortlisted, contacted, offered work, or assigned.
              </p>
            </div>
          ) : sourceStatus === "available" ? (
            <div role="status">
              <p>
                The candidate source is available. Source the interested workers to create governed
                shortlisted candidates for this dispatch.
              </p>
              <button
                disabled={shortlisting}
                onClick={() => void sourceAndShortlist()}
                style={styles.primary}
                type="button"
              >
                {shortlisting ? "Shortlisting…" : "Source & shortlist interested workers"}
              </button>
            </div>
          ) : sourceStatus === "error" ? (
            <p role="alert">Candidate-source status could not be checked. No result is claimed.</p>
          ) : null}
        </>
      ) : null}
      {confirming ? (
        <dialog
          aria-describedby="candidate-review-confirm-copy"
          aria-labelledby="candidate-review-confirm"
          onCancel={() => setConfirming(false)}
          ref={dialog}
          style={styles.dialog}
        >
          <h3 id="candidate-review-confirm">Confirm candidate review</h3>
          <p id="candidate-review-confirm-copy">
            Begin governed candidate review for {dispatch.requiredWorkerCount} requested worker(s)
            at {dispatch.priority} priority. This does not find, shortlist, contact, offer work to,
            or assign a worker by itself.
          </p>
          <div style={styles.actions}>
            <button
              autoFocus
              disabled={busy}
              onClick={() => setConfirming(false)}
              style={styles.secondary}
              type="button"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() => void startReview()}
              style={styles.primary}
              type="button"
            >
              {busy ? "Starting…" : "Confirm candidate review"}
            </button>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}

const styles = {
  actions: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  dialog: {
    background: "#0c0c0c",
    border: "1px solid #e8d782",
    borderRadius: 12,
    color: "#f4efe4",
    maxWidth: 560,
    padding: 24
  },
  notice: { background: "#0c0c0c", borderRadius: 10, marginTop: 16, padding: 16 },
  primary: {
    background: "#171511",
    border: 0,
    borderRadius: 8,
    color: "#fff",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  secondary: {
    background: "#0c0c0c",
    border: "1px solid rgba(201, 162, 75, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    fontWeight: 800,
    marginRight: 10,
    minHeight: 44,
    padding: "0 18px"
  }
} as const;
