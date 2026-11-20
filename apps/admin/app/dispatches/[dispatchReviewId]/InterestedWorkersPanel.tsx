"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { readShiftOverlapNotice } from "../shiftOverlapNotice";
import { CertificateOverrideBox, certificateOverrideBody, type CertificateOverride } from "../CertificateOverrideBox";
import { SignedOut } from "../../shared/SignedOut";
import { BoardOnlyNotice, CreateOfferNote } from "./BoardOnlyNotice";
import { usePageText } from "../../i18n/pageText";
import { dispatchPanelsText, fillIn, statusWord, type DispatchPanelsCopy } from "./dispatchPanelsText";

// Workers who said they are interested in this job. This box never creates an assignment: the
// reviewer picks workers, creates a draft offer, or links the interest to an offer that exists.
// "Offer accepted" is shown only from the offer's own status, never from the interest status.
// Staff words (EN/FR/AR) live in dispatchPanelsText.ts.

type InterestedWorker = Readonly<{
  interestId: string | null;
  workerIdentityId: string | null;
  displayName: string | null;
  status: string | null;
  distanceKmAtInterest: number | null;
  linkedOfferId: string | null;
  employerFavorite: boolean;
  createdAt: string | null;
  governedOffer: { workerOfferId: string | null; status: string | null; version: number | null } | null;
}>;

// Badge from the offer's own status (not from the interest status).
function offerBadge(
  copy: DispatchPanelsCopy,
  offerStatus: string | null
): { label: string; tone: "neutral" | "info" | "good" } | null {
  if (!offerStatus) return null;
  if (offerStatus === "accepted") return { label: copy.interested.offerAccepted, tone: "good" };
  const label = fillIn(copy.interested.offerWithStatus, { status: statusWord(copy.offers.statusWords, offerStatus) });
  if (["sent", "delivered", "viewed", "approved", "draft"].includes(offerStatus)) return { label, tone: "info" };
  return { label, tone: "neutral" };
}

type State =
  | { status: "loading" | "denied" | "unavailable" }
  | { status: "ready"; interested: readonly InterestedWorker[] };

export function InterestedWorkersPanel({
  dispatchReviewId,
  jobRequestId
}: Readonly<{ dispatchReviewId: string; jobRequestId: string }>) {
  const locale = useLocale();
  const copy = usePageText(dispatchPanelsText);
  const t = copy.interested;
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  // Required-certificate pre-check per worker (override is logged by the API).
  const [certificateOverrides, setCertificateOverrides] = useState<Record<string, CertificateOverride>>({});
  const overrideHandlers = useRef(new Map<string, (value: CertificateOverride) => void>());
  const overrideHandler = (workerIdentityId: string) => {
    let handler = overrideHandlers.current.get(workerIdentityId);
    if (!handler) {
      handler = (value: CertificateOverride) => setCertificateOverrides((current) => ({ ...current, [workerIdentityId]: value }));
      overrideHandlers.current.set(workerIdentityId, handler);
    }
    return handler;
  };
  const [notice, setNotice] = useState<{ tone: "status" | "alert"; message: string } | undefined>();
  const generation = useRef(0);

  const load = useCallback(async () => {
    const gen = ++generation.current;
    setState({ status: "loading" });
    try {
      const res = await fetch(
        `/api/dispatches/${encodeURIComponent(dispatchReviewId)}/interested-workers?jobRequestId=${encodeURIComponent(jobRequestId)}`,
        { cache: "no-store" }
      );
      if (gen !== generation.current) return;
      if (!res.ok) return setState({ status: res.status === 401 || res.status === 403 ? "denied" : "unavailable" });
      const payload = (await res.json()) as { interested: InterestedWorker[] };
      setState({ status: "ready", interested: payload.interested });
    } catch {
      if (gen === generation.current) setState({ status: "unavailable" });
    }
  }, [dispatchReviewId, jobRequestId]);

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);

  const act = useCallback(
    async (worker: InterestedWorker, action: "review" | "shortlist" | "not_selected" | "link_offer") => {
      if (!worker.interestId || busyId) return;
      setBusyId(worker.interestId);
      setNotice(undefined);
      try {
        const body: Record<string, unknown> = { action, interestId: worker.interestId };
        if (action === "link_offer") {
          if (!worker.governedOffer?.workerOfferId) {
            setNotice({ tone: "alert", message: t.noOffer });
            return;
          }
          body.workerOfferId = worker.governedOffer.workerOfferId;
        }
        const res = await fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}/interested-workers`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          setNotice({
            tone: "alert",
            message:
              res.status === 409
                ? t.mismatch
                : res.status === 401 || res.status === 403
                  ? t.authRequired
                  : t.actionFailed
          });
          return;
        }
        await load(); // re-read the saved state
      } catch {
        setNotice({ tone: "alert", message: t.generic });
      } finally {
        setBusyId(null);
      }
    },
    [busyId, dispatchReviewId, load, t]
  );

  // Round 2b: create a governed DRAFT offer for a shortlisted worker (reuses the offers BFF →
  // worker-offer service). After creation, re-read authoritative state so the offer appears; it is
  // then approved/sent in the offers panel. A default 7-day expiry is applied.
  const createOffer = useCallback(
    async (worker: InterestedWorker) => {
      if (!worker.interestId || !worker.workerIdentityId || busyId) return;
      setBusyId(worker.interestId);
      setNotice(undefined);
      try {
        const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
        const res = await fetch(`/api/dispatches/${encodeURIComponent(dispatchReviewId)}/offers`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ workerIdentityId: worker.workerIdentityId, expiresAt, ...certificateOverrideBody(certificateOverrides[worker.workerIdentityId] ?? null) })
        });
        if (!res.ok) {
          // The worker already holds a shift at that time; the API's message names it.
          const overlap = await readShiftOverlapNotice(res, locale);
          setNotice({
            tone: "alert",
            message: overlap
              ? overlap
              : res.status === 401 || res.status === 403
                ? t.authRequired
                : t.offerFailed
          });
          return;
        }
        setNotice({ tone: "status", message: t.offerCreated });
        await load();
      } catch {
        setNotice({ tone: "alert", message: t.generic });
      } finally {
        setBusyId(null);
      }
    },
    [busyId, dispatchReviewId, load, locale, certificateOverrides, t]
  );

  if (state.status === "denied") return <SignedOut compact />;
  if (state.status !== "ready") {
    return (
      <div>
        <h2>{t.title}</h2>
        <p aria-live="polite">{state.status === "loading" ? t.loading : t.unavailable}</p>
        {state.status !== "loading" ? (
          <button type="button" style={styles.button} onClick={() => void load()}>
            {t.retry}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <h2>{t.title}</h2>
      <p style={styles.muted}>{t.intro}</p>
      <BoardOnlyNotice />
      {notice ? (
        <p role={notice.tone} style={notice.tone === "alert" ? styles.alert : styles.status}>
          {notice.message}
        </p>
      ) : null}
      {state.interested.length === 0 ? (
        <p style={styles.muted}>{t.none}</p>
      ) : (
        <ul style={styles.list}>
          {state.interested.map((w) => {
            const badge = offerBadge(copy, w.governedOffer?.status ?? null);
            const canReview = w.status === "submitted";
            const canShortlist = w.status === "submitted" || w.status === "under_review";
            const canDismiss = ["submitted", "under_review", "shortlisted"].includes(w.status ?? "");
            const canLink = !!w.governedOffer?.workerOfferId && w.status !== "offer_created" && w.status !== "offer_accepted";
            const canCreateOffer = w.status === "shortlisted" && !w.governedOffer?.workerOfferId && !!w.workerIdentityId;
            return (
              <li key={w.interestId ?? w.workerIdentityId} style={styles.item}>
                <div style={styles.itemHead}>
                  <strong>{w.displayName ?? t.workerFallback}</strong>
                  {w.employerFavorite ? <span> {t.favourite}</span> : null}
                  {w.distanceKmAtInterest !== null ? (
                    <span style={styles.dim}>{fillIn(t.kmAtInterest, { km: w.distanceKmAtInterest })}</span>
                  ) : null}
                </div>
                <div style={styles.badges}>
                  <span style={styles.intentBadge}>{w.status ? statusWord(t.labels, w.status) : ""}</span>
                  {badge ? (
                    <span style={badge.tone === "good" ? styles.goodBadge : styles.infoBadge}>{badge.label}</span>
                  ) : null}
                </div>
                <div style={styles.actions}>
                  {canReview ? (
                    <button type="button" style={styles.button} disabled={busyId === w.interestId} onClick={() => void act(w, "review")}>
                      {t.markReview}
                    </button>
                  ) : null}
                  {canShortlist ? (
                    <button type="button" style={styles.button} disabled={busyId === w.interestId} onClick={() => void act(w, "shortlist")}>
                      {t.shortlist}
                    </button>
                  ) : null}
                  {canDismiss ? (
                    <button type="button" style={styles.buttonGhost} disabled={busyId === w.interestId} onClick={() => void act(w, "not_selected")}>
                      {t.notSelected}
                    </button>
                  ) : null}
                  {canCreateOffer && w.workerIdentityId ? (
                    <CertificateOverrideBox dispatchReviewId={dispatchReviewId} workerIdentityId={w.workerIdentityId} onChange={overrideHandler(w.workerIdentityId)} />
                  ) : null}
                  {canCreateOffer ? (
                    <button
                      type="button"
                      style={styles.button}
                      disabled={busyId === w.interestId || Boolean(w.workerIdentityId && certificateOverrides[w.workerIdentityId]?.needed && !certificateOverrides[w.workerIdentityId]?.override)}
                      onClick={() => void createOffer(w)}
                    >
                      {t.createOffer}
                    </button>
                  ) : null}
                  {canCreateOffer ? <CreateOfferNote /> : null}
                  {canLink ? (
                    <button type="button" style={styles.button} disabled={busyId === w.interestId} onClick={() => void act(w, "link_offer")}>
                      {t.linkOffer}
                    </button>
                  ) : null}
                  {!w.governedOffer && (w.status === "shortlisted" || w.status === "under_review" || w.status === "submitted") ? (
                    <span style={styles.dim}>{t.noOfferYet}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  muted: { color: "#b3a894", fontSize: 13, lineHeight: 1.5 },
  dim: { color: "#ece3d2", fontSize: 12 },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 },
  item: { border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  itemHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  badges: { display: "flex", flexWrap: "wrap", gap: 6 },
  intentBadge: { background: "#000000", color: "#f4efe4", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  infoBadge: { background: "#000000", color: "#f4efe4", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  goodBadge: { background: "#dcfce7", color: "#15803d", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  button: { border: "1px solid rgba(248, 184, 8, 0.16)", background: "#171511", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  buttonGhost: { border: "1px solid rgba(248, 184, 8, 0.16)", background: "transparent", color: "#f4efe4", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  status: { color: "#15803d", fontSize: 13 },
  alert: { color: "#b91c1c", fontSize: 13 }
};
