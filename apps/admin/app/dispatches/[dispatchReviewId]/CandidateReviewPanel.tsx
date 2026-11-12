"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminDispatchReview } from "../../api/dispatches/dispatchBoundary";
import { usePageText } from "../../i18n/pageText";
import { dispatchPanelsText, fillIn, statusWord } from "./dispatchPanelsText";

export function CandidateReviewPanel({
  dispatch,
  onUpdated
}: Readonly<{
  dispatch: AdminDispatchReview;
  onUpdated: (dispatch: AdminDispatchReview) => void;
}>) {
  const all = usePageText(dispatchPanelsText);
  const t = all.candidates;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessageText] = useState("");
  const [messageIsAlert, setMessageIsAlert] = useState(false);
  const setMessage = (text: string, alert = false) => {
    setMessageText(text);
    setMessageIsAlert(alert);
  };
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
    setMessage(t.startingMsg);
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
        if (response.status === 409) setMessage(t.changedNotStarted, true);
        else setMessage(t.startFailed);
        return;
      }
      const payload = (await response.json()) as { dispatchReview?: AdminDispatchReview };
      if (!payload.dispatchReview) throw new Error("RWOS_MISSING_DISPATCH");
      onUpdated(payload.dispatchReview);
      setConfirming(false);
      setMessage(t.started);
    } catch {
      setConfirming(false);
      setMessage(t.unknown);
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
    setMessage(t.shortlistingMsg);
    try {
      const response = await fetch(
        `/api/dispatches/${encodeURIComponent(dispatch.id)}/source-and-shortlist`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }
      );
      if (!response.ok) {
        setMessage(t.shortlistFailed);
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
      const count = result.shortlisted ?? 0;
      setMessage(count === 1 ? t.shortlistedOne : fillIn(t.shortlistedMany, { count }));
    } catch {
      setMessage(t.unknown);
    } finally {
      setShortlisting(false);
    }
  }

  const canStart = dispatch.state === "draft" || dispatch.state === "active";
  return (
    <section aria-busy={busy || sourceStatus === "checking"}>
      <h2>{t.title}</h2>
      <p aria-live="polite" role={messageIsAlert ? "alert" : "status"}>
        {message || t.intro}
      </p>
      {canStart ? (
        <button
          disabled={busy || confirming}
          onClick={() => setConfirming(true)}
          ref={trigger}
          style={styles.primary}
          type="button"
        >
          {t.start}
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
            {sourceStatus === "checking" ? t.checking : t.check}
          </button>
          {sourceStatus === "candidate_source_unavailable" ? (
            <div role="status" style={styles.notice}>
              <h3>{t.noneTitle}</h3>
              <p>{t.noneBody}</p>
            </div>
          ) : sourceStatus === "available" ? (
            <div role="status">
              <p>{t.available}</p>
              <button
                disabled={shortlisting}
                onClick={() => void sourceAndShortlist()}
                style={styles.primary}
                type="button"
              >
                {shortlisting ? t.shortlisting : t.shortlist}
              </button>
            </div>
          ) : sourceStatus === "error" ? (
            <p role="alert">{t.checkError}</p>
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
          <h3 id="candidate-review-confirm">{t.confirmTitle}</h3>
          <p id="candidate-review-confirm-copy">
            {fillIn(t.confirmBody, {
              count: dispatch.requiredWorkerCount,
              priority: statusWord(all.detail.priorities, dispatch.priority)
            })}
          </p>
          <div style={styles.actions}>
            <button
              autoFocus
              disabled={busy}
              onClick={() => setConfirming(false)}
              style={styles.secondary}
              type="button"
            >
              {t.cancel}
            </button>
            <button
              disabled={busy}
              onClick={() => void startReview()}
              style={styles.primary}
              type="button"
            >
              {busy ? t.confirming : t.confirm}
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
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    fontWeight: 800,
    marginRight: 10,
    minHeight: 44,
    padding: "0 18px"
  }
} as const;
