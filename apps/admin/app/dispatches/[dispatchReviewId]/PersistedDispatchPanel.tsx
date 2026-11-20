"use client";

import { useCallback, useEffect, useState } from "react";
import { formatRwosDateTime } from "@rwos/shared";
import type { AdminDispatchReview } from "../../api/dispatches/dispatchBoundary";
import { CandidateReviewPanel } from "./CandidateReviewPanel";
import { OfferAssignmentStatusPanel } from "./OfferAssignmentStatusPanel";
import { InterestedWorkersPanel } from "./InterestedWorkersPanel";
import { WorksiteMapsPanel } from "./WorksiteMapsPanel";
import { SignedOut } from "../../shared/SignedOut";
import { usePageText } from "../../i18n/pageText";
import { useLocale } from "../../i18n/LocaleProvider";
import { dispatchPanelsText, statusWord } from "./dispatchPanelsText";

export function PersistedDispatchPanel({
  dispatchReviewId
}: Readonly<{ dispatchReviewId: string }>) {
  const t = usePageText(dispatchPanelsText).detail;
  const locale = useLocale();
  const formatDate = (value: string) =>
    formatRwosDateTime(value, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Toronto",
      locale
    });
  const [dispatch, setDispatch] = useState<AdminDispatchReview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [preparing, setPreparing] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        setStatus(response.status === 401 || response.status === 403 ? "denied" : "unavailable");
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

  const moveToOfferPreparation = useCallback(async () => {
    if (!dispatch) return;
    setPreparing(true);
    setActionMessage("");
    try {
      const response = await fetch(
        `/api/dispatches/${encodeURIComponent(dispatchReviewId)}/offer-preparation`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedVersion: dispatch.versionToken })
        }
      );
      if (!response.ok) {
        setActionMessage(
          response.status === 409 ? t.changed : t.moveFailed
        );
        return;
      }
      const payload = (await response.json()) as { dispatchReview?: AdminDispatchReview };
      if (payload.dispatchReview) setDispatch(payload.dispatchReview);
      setActionMessage(t.moved);
    } catch {
      setActionMessage(t.moveUnavailable);
    } finally {
      setPreparing(false);
    }
  }, [dispatch, dispatchReviewId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status !== "ready" || !dispatch) {
    if (status === "denied") return <main style={styles.page}><SignedOut /></main>;
    return (
      <main style={styles.page}>
        <section aria-busy={status === "loading"} aria-live="polite" style={styles.hero}>
          <h1>
            {status === "loading" ? t.loading : t.unavailable}
          </h1>
          {status !== "loading" ? <p>{t.unavailableBody}</p> : null}
          {status !== "loading" ? (
            <button onClick={() => void load()} style={styles.button} type="button">
              {t.retry}
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
          <p style={styles.eyebrow}>{t.eyebrow}</p>
          <h1 style={styles.title}>{t.title}</h1>
          <p style={styles.lede}>
            {dispatch.jobRequestNumber ?? dispatch.jobRequestId} · {statusWord(t.stateLabels, dispatch.state)}
          </p>
        </div>
        <a
          href={`/calendar/request?request=${encodeURIComponent(dispatch.jobRequestId)}`}
          style={styles.link}
        >
          {t.openRequest}
        </a>
      </header>
      <section style={styles.grid}>
        <article style={styles.panel}>
          <h2>{t.stateTitle}</h2>
          <p>{t.stateHelp[dispatch.state] ?? statusWord(t.stateLabels, dispatch.state)}</p>
          {[
            [t.rowPriority, statusWord(t.priorities, dispatch.priority)],
            [t.rowRequired, String(dispatch.requiredWorkerCount)],
            [t.rowShortlisted, String(dispatch.shortlistedCandidateCount)],
            [t.rowPrepared, String(dispatch.preparedOfferCount)],
            [t.rowRemaining, String(dispatch.remainingWorkerCount)],
            [t.rowVersion, String(dispatch.versionToken)],
            [t.rowCreated, formatDate(dispatch.createdAt)],
            [t.rowUpdated, formatDate(dispatch.updatedAt)]
          ].map(([label, value]) => (
            <div key={label} style={styles.row}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
          {dispatch.state === "candidate_review" || dispatch.state === "shortlist_ready" ? (
            <div style={{ marginTop: 16 }}>
              <button
                disabled={preparing}
                onClick={() => void moveToOfferPreparation()}
                style={styles.button}
                type="button"
              >
                {preparing ? t.moving : t.moveToOffers}
              </button>
              {actionMessage ? (
                <p aria-live="polite" style={{ fontSize: 13, marginTop: 8 }}>
                  {actionMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </article>
        <article style={styles.panel}>
          <CandidateReviewPanel dispatch={dispatch} onUpdated={setDispatch} />
          <p>{t.note1}</p>
          <p>{t.note2}</p>
          <p>{t.note3}</p>
        </article>
        <article style={styles.panel}>
          <OfferAssignmentStatusPanel dispatchReviewId={dispatch.id} />
        </article>
        <article style={styles.panel}>
          <InterestedWorkersPanel dispatchReviewId={dispatch.id} jobRequestId={dispatch.jobRequestId} />
        </article>
        <article style={{ ...styles.panel, gridColumn: "1 / -1" }}>
          <WorksiteMapsPanel dispatchReviewId={dispatch.id} />
        </article>
      </section>
    </main>
  );
}

const styles = {
  page: {
    background: "#000000",
    color: "#f4efe4",
    fontFamily: "Inter, system-ui, sans-serif",
    minHeight: "100vh"
  },
  hero: {
    alignItems: "center",
    background: "#000000",
    color: "#fff",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 24,
    justifyContent: "space-between",
    padding: "40px clamp(18px, 5vw, 64px)"
  },
  eyebrow: { color: "#fff1a8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" as const },
  title: { fontSize: "clamp(34px, 5vw, 56px)", margin: "8px 0" },
  lede: { color: "#faf6ec", fontSize: 18 },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    padding: "24px clamp(18px, 5vw, 64px)"
  },
  panel: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 14, padding: 24 },
  row: {
    borderBottom: "1px solid rgba(248, 184, 8, 0.16)",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
    justifyContent: "space-between",
    padding: "12px 0"
  },
  button: {
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px"
  },
  link: {
    alignItems: "center",
    background: "#0c0c0c",
    border: "1px solid rgba(248, 184, 8, 0.3)",
    borderRadius: 8,
    color: "#f4efe4",
    display: "inline-flex",
    fontWeight: 800,
    minHeight: 44,
    padding: "0 18px",
    textDecoration: "none"
  }
} as const;
