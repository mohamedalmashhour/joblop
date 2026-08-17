"use client";

import { useCallback, useEffect, useState } from "react";

type Offer = Readonly<{
  workerOfferId: string;
  jobRequestId: string;
  status: string;
  expiresAt: string;
  title: string | null;
  summary: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string | null;
  compensationSummary: string | null;
  policySummary: string | null;
  termsVersionId: string | null;
  versionToken: number;
}>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error" }
  | { status: "ready"; items: readonly Offer[] };

// Statuses where the worker can still respond. Terminal states (accepted/declined/expired/
// withdrawn/cancelled) are read-only. `draft`/`approved` are pre-delivery and never worker-visible.
const RESPONDABLE = new Set(["sent", "delivered", "viewed"]);
const STATUS_LABEL: Record<string, string> = {
  draft: "Preparing",
  approved: "Preparing",
  sent: "Awaiting your response",
  delivered: "Awaiting your response",
  viewed: "Awaiting your response",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled"
};
const STATUS_CHIP: Record<string, string> = {
  accepted: "status-verified",
  declined: "status-rejected",
  expired: "status-rejected",
  withdrawn: "status-rejected",
  cancelled: "status-rejected"
};

function when(startAt: string | null, endAt: string | null, tz: string | null): string {
  if (!startAt || !endAt) return "Schedule to be confirmed";
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", ...(tz ? { timeZone: tz } : {})
  };
  return `${new Date(startAt).toLocaleString(undefined, opts)} – ${new Date(endAt).toLocaleString(undefined, opts)}`;
}
function expiry(expiresAt: string): string {
  return `Expires ${new Date(expiresAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export function Offers() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/offers", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) return setState({ status: r.status === 401 ? "signed_out" : "error" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { workerOffers: Offer[] };
      setState({ status: "ready", items: payload.workerOffers ?? [] });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const respond = useCallback(async (offer: Offer, action: "accept" | "decline") => {
    setBusyId(offer.workerOfferId);
    setNotice("");
    try {
      const r = await fetch(`/api/offers/${encodeURIComponent(offer.workerOfferId)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: offer.versionToken, expectedTermsVersionId: offer.termsVersionId ?? "" })
      });
      if (r.status === 409) {
        setNotice("This offer changed since you loaded it. We refreshed it — please review and respond again.");
        await load();
        return;
      }
      if (r.status === 401) return setState({ status: "signed_out" });
      if (!r.ok) {
        setNotice("We couldn't record your response. Please try again.");
        return;
      }
      setNotice(action === "accept" ? "Offer accepted. JobLop will confirm your assignment." : "Offer declined.");
      await load();
    } catch {
      setNotice("We couldn't record your response. Please try again.");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  if (state.status === "loading") return <div className="state">Loading…</div>;
  if (state.status === "signed_out")
    return <div className="state">Please sign in to see your offers.<div style={{ marginTop: 12 }}><a className="btn" href="/">Go to search</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">We couldn&apos;t load your offers.</div>;

  return (
    <>
      <section className="hero">
        <h1>My offers</h1>
        <p>Private offers JobLop has issued you. Accepting binds you to the shift terms shown; declining releases it.</p>
      </section>
      {notice ? <div className="state" role="status" style={{ marginBottom: 16 }}>{notice}</div> : null}

      {state.items.length === 0 ? (
        <div className="state">You have no offers yet. When JobLop selects you for a shift, the offer appears here.</div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {state.items.map((o) => {
            const respondable = RESPONDABLE.has(o.status);
            const busy = busyId === o.workerOfferId;
            return (
              <article className="card" key={o.workerOfferId}>
                <div className="role">{o.title ?? "Shift offer"}</div>
                <div className="chips">
                  <span className={`chip ${STATUS_CHIP[o.status] ?? "status-pending"}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                </div>
                {o.summary ? <p className="muted" style={{ margin: "6px 0" }}>{o.summary}</p> : null}
                <div className="when">{when(o.startAt, o.endAt, o.timezone)}</div>
                {o.compensationSummary ? <div className="when">Compensation: {o.compensationSummary}</div> : null}
                {o.policySummary ? <div className="when" style={{ fontSize: 13, color: "var(--text-muted)" }}>{o.policySummary}</div> : null}
                <div className="when" style={{ fontSize: 13, color: "var(--text-muted)" }}>{expiry(o.expiresAt)}</div>
                {respondable ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="btn" type="button" disabled={busy} onClick={() => void respond(o, "accept")}>
                      {busy ? "Working…" : "Accept offer"}
                    </button>
                    <button className="btn ghost" type="button" disabled={busy} onClick={() => void respond(o, "decline")}>
                      Decline
                    </button>
                    <a className="btn ghost" href={`/jobs/${encodeURIComponent(o.jobRequestId)}`}>View job</a>
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <a className="btn ghost" href={`/jobs/${encodeURIComponent(o.jobRequestId)}`}>View job</a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="notice">Only your own offers appear here. Responding is governed and recorded by JobLop; no money is moved.</p>
    </>
  );
}
