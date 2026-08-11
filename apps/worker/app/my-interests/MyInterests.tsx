"use client";

import { useCallback, useEffect, useState } from "react";
import { formatWhen } from "../MarketplaceExplorer";

type InterestItem = Readonly<{
  jobRequestId: string;
  status: string;
  createdAt: string;
  offerStatus: string | null;
  summary: {
    role: string;
    title: string;
    employer: { id: string; name: string };
    areaLabel: string | null;
    startAt: string;
    endAt: string;
  } | null;
}>;

// Marketplace-intent status → worker-facing label. Kept visually distinct from offer state.
const INTEREST_LABEL: Record<string, string> = {
  submitted: "Interest submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  not_selected: "Not selected",
  withdrawn: "Withdrawn",
  offer_created: "Offer received",
  offer_accepted: "Offer accepted"
};

export function MyInterests() {
  const [status, setStatus] = useState<"loading" | "ready" | "signed_out" | "error">("loading");
  const [items, setItems] = useState<InterestItem[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/my-interests", { cache: "no-store" });
      if (r.status === 401) return setStatus("signed_out");
      if (!r.ok) return setStatus("error");
      const payload = (await r.json()) as { interests: InterestItem[] };
      setItems(payload.interests);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") return <div className="state">Loading…</div>;
  if (status === "signed_out")
    return (
      <div className="state">
        Please sign in to see your interests.
        <div style={{ marginTop: 12 }}>
          <a className="btn" href="/">Go to search</a>
        </div>
      </div>
    );
  if (status === "error") return <div className="state error" role="alert">We couldn&apos;t load your interests.</div>;

  const activeCount = items.filter((i) => !["withdrawn", "not_selected"].includes(i.status)).length;

  return (
    <>
      <section className="hero">
        <h1>My interests</h1>
        <p>{items.length === 0 ? "You haven't expressed interest in any jobs yet." : `${activeCount} active`}</p>
      </section>

      {items.length === 0 ? (
        <div className="state">
          Jobs you express interest in appear here.
          <div style={{ marginTop: 12 }}>
            <a className="btn" href="/">Find jobs</a>
          </div>
        </div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {items.map((i) => (
            <article key={`${i.jobRequestId}-${i.createdAt}`} className="card">
              {i.summary ? (
                <>
                  <a className="role cardlink" href={`/jobs/${encodeURIComponent(i.jobRequestId)}`}>
                    {i.summary.role}
                  </a>
                  <div className="employer">{i.summary.employer.name}</div>
                  <div className="chips">
                    <span className={`chip status-${i.status}`}>{INTEREST_LABEL[i.status] ?? i.status}</span>
                    {i.offerStatus ? <span className="chip offer">Offer: {i.offerStatus}</span> : null}
                    {i.summary.areaLabel ? <span className="chip">{i.summary.areaLabel}</span> : null}
                  </div>
                  <div className="when">{formatWhen(i.summary.startAt, i.summary.endAt)}</div>
                </>
              ) : (
                <div className="role muted">This job is no longer available</div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
