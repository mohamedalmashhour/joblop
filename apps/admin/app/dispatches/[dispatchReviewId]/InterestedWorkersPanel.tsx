"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Marketplace INTEREST review, inside the existing governed dispatch review. This panel is a
// review signal + governed handoff only:
//   - it NEVER creates an offer or an assignment;
//   - offers are created in the existing worker-offer flow; here the reviewer LINKS an
//     interest to an already-created governed offer;
//   - "Accepted / Assigned" language is shown ONLY from authoritative governed offer state,
//     never from interest or shortlist state.

type InterestedWorker = Readonly<{
  interestId: string | null;
  workerIdentityId: string | null;
  displayName: string | null;
  status: string | null;
  distanceKmAtInterest: number | null;
  linkedOfferId: string | null;
  createdAt: string | null;
  governedOffer: { workerOfferId: string | null; status: string | null; version: number | null } | null;
}>;

// Truthful marketplace-intent labels. Interest/shortlist NEVER imply a job was assigned.
const INTEREST_LABEL: Record<string, string> = {
  submitted: "Expressed interest",
  under_review: "Under review",
  shortlisted: "Shortlisted — selected for further consideration; no job assigned",
  not_selected: "Not selected",
  offer_created: "Governed offer linked",
  offer_accepted: "Offer accepted"
};

// Authoritative badge from the governed offer state (not from interest state).
function governedBadge(offerStatus: string | null): { label: string; tone: "neutral" | "info" | "good" } | null {
  if (!offerStatus) return null;
  if (offerStatus === "accepted") return { label: "Offer accepted (governed) — assignment authoritative", tone: "good" };
  if (["sent", "delivered", "viewed", "approved", "draft"].includes(offerStatus))
    return { label: `Governed offer: ${offerStatus}`, tone: "info" };
  return { label: `Governed offer: ${offerStatus}`, tone: "neutral" };
}

type State =
  | { status: "loading" | "denied" | "unavailable" }
  | { status: "ready"; interested: readonly InterestedWorker[] };

export function InterestedWorkersPanel({
  dispatchReviewId,
  jobRequestId
}: Readonly<{ dispatchReviewId: string; jobRequestId: string }>) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
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
            setNotice({ tone: "alert", message: "No governed offer exists for this worker yet. Create one in the offers panel first." });
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
                ? "That governed offer does not match this worker and job. Refresh and try again."
                : res.status === 401 || res.status === 403
                  ? "Administrator authorization is required."
                  : "That action could not be completed. Refresh and try again."
          });
          return;
        }
        await load(); // re-read authoritative state
      } catch {
        setNotice({ tone: "alert", message: "Something went wrong. Please try again." });
      } finally {
        setBusyId(null);
      }
    },
    [busyId, dispatchReviewId, load]
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
          body: JSON.stringify({ workerIdentityId: worker.workerIdentityId, expiresAt })
        });
        if (!res.ok) {
          setNotice({
            tone: "alert",
            message:
              res.status === 401 || res.status === 403
                ? "Administrator authorization is required."
                : "The governed offer could not be created. Refresh and try again."
          });
          return;
        }
        setNotice({ tone: "status", message: "Governed draft offer created. Approve and send it in the offers panel." });
        await load();
      } catch {
        setNotice({ tone: "alert", message: "Something went wrong. Please try again." });
      } finally {
        setBusyId(null);
      }
    },
    [busyId, dispatchReviewId, load]
  );

  if (state.status !== "ready") {
    return (
      <div>
        <h2>Interested workers (marketplace)</h2>
        <p aria-live="polite">
          {state.status === "loading"
            ? "Loading marketplace interest…"
            : state.status === "denied"
              ? "Administrator authorization is required."
              : "Marketplace interest is unavailable."}
        </p>
        {state.status !== "loading" ? (
          <button type="button" style={styles.button} onClick={() => void load()}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <h2>Interested workers (marketplace)</h2>
      <p style={styles.muted}>
        A worker expressing interest is only an intent signal. It does not create an offer or an
        assignment. Governed offers are created in the offers panel; here you link an interest to an
        already-created offer. Assignment is created only when a worker accepts through the governed
        offer flow.
      </p>
      {notice ? (
        <p role={notice.tone} style={notice.tone === "alert" ? styles.alert : styles.status}>
          {notice.message}
        </p>
      ) : null}
      {state.interested.length === 0 ? (
        <p style={styles.muted}>No workers have expressed interest yet.</p>
      ) : (
        <ul style={styles.list}>
          {state.interested.map((w) => {
            const badge = governedBadge(w.governedOffer?.status ?? null);
            const canReview = w.status === "submitted";
            const canShortlist = w.status === "submitted" || w.status === "under_review";
            const canDismiss = ["submitted", "under_review", "shortlisted"].includes(w.status ?? "");
            const canLink = !!w.governedOffer?.workerOfferId && w.status !== "offer_created" && w.status !== "offer_accepted";
            const canCreateOffer = w.status === "shortlisted" && !w.governedOffer?.workerOfferId && !!w.workerIdentityId;
            return (
              <li key={w.interestId ?? w.workerIdentityId} style={styles.item}>
                <div style={styles.itemHead}>
                  <strong>{w.displayName ?? "Worker"}</strong>
                  {w.distanceKmAtInterest !== null ? (
                    <span style={styles.dim}>{w.distanceKmAtInterest} km at interest</span>
                  ) : null}
                </div>
                <div style={styles.badges}>
                  <span style={styles.intentBadge}>{INTEREST_LABEL[w.status ?? ""] ?? w.status}</span>
                  {badge ? (
                    <span style={badge.tone === "good" ? styles.goodBadge : styles.infoBadge}>{badge.label}</span>
                  ) : null}
                </div>
                <div style={styles.actions}>
                  {canReview ? (
                    <button type="button" style={styles.button} disabled={busyId === w.interestId} onClick={() => void act(w, "review")}>
                      Mark under review
                    </button>
                  ) : null}
                  {canShortlist ? (
                    <button type="button" style={styles.button} disabled={busyId === w.interestId} onClick={() => void act(w, "shortlist")}>
                      Shortlist
                    </button>
                  ) : null}
                  {canDismiss ? (
                    <button type="button" style={styles.buttonGhost} disabled={busyId === w.interestId} onClick={() => void act(w, "not_selected")}>
                      Not selected
                    </button>
                  ) : null}
                  {canCreateOffer ? (
                    <button type="button" style={styles.button} disabled={busyId === w.interestId} onClick={() => void createOffer(w)}>
                      Create offer
                    </button>
                  ) : null}
                  {canLink ? (
                    <button type="button" style={styles.button} disabled={busyId === w.interestId} onClick={() => void act(w, "link_offer")}>
                      Link to governed offer
                    </button>
                  ) : null}
                  {!w.governedOffer && (w.status === "shortlisted" || w.status === "under_review" || w.status === "submitted") ? (
                    <span style={styles.dim}>No governed offer yet — create one in the offers panel to link.</span>
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
  item: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  itemHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  badges: { display: "flex", flexWrap: "wrap", gap: 6 },
  intentBadge: { background: "#000000", color: "#f4efe4", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  infoBadge: { background: "#000000", color: "#f4efe4", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  goodBadge: { background: "#dcfce7", color: "#15803d", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 },
  actions: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  button: { border: "1px solid rgba(201, 162, 75, 0.16)", background: "#171511", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  buttonGhost: { border: "1px solid rgba(201, 162, 75, 0.16)", background: "transparent", color: "#f4efe4", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  status: { color: "#15803d", fontSize: 13 },
  alert: { color: "#b91c1c", fontSize: 13 }
};
