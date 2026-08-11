"use client";

import { useEffect, useState } from "react";
import { formatWhen } from "../../MarketplaceExplorer";

type Opportunity = Readonly<{
  jobRequestId: string;
  role: string;
  areaLabel: string;
  startAt: string;
  endAt: string;
  openings: number;
}>;

type Profile = Readonly<{
  id: string;
  name: string;
  verified: boolean;
  areas: readonly string[];
  activeOpportunityCount: number;
  opportunities: readonly Opportunity[];
}>;

export function EmployerProfile({ id }: { id: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/employers/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => {
        if (!active) return;
        if (r.status === 404) return setStatus("not_found");
        if (!r.ok) return setStatus("error");
        const payload = (await r.json()) as { employer: Profile };
        setProfile(payload.employer);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [id]);

  if (status === "loading") return <div className="state">Loading…</div>;
  if (status === "not_found")
    return (
      <div className="state">
        This employer is not available.
        <div style={{ marginTop: 12 }}>
          <a className="btn" href="/">Return to search</a>
        </div>
      </div>
    );
  if (status === "error" || !profile)
    return <div className="state error" role="alert">We couldn&apos;t load this employer.</div>;

  return (
    <article className="detail">
      <div className="detail-head">
        <div>
          <h1>{profile.name}</h1>
          <p className="employer">
            {profile.verified ? (
              <span className="chip verified">✓ Verified employer</span>
            ) : (
              <span className="chip">Employer on JobLop</span>
            )}
          </p>
          {profile.areas.length > 0 ? <p className="muted">Hiring in {profile.areas.join(" · ")}</p> : null}
        </div>
      </div>

      <section className="detail-section">
        <h2>
          {profile.activeOpportunityCount} open {profile.activeOpportunityCount === 1 ? "opportunity" : "opportunities"}
        </h2>
        {profile.opportunities.length === 0 ? (
          <p className="muted">No open opportunities right now.</p>
        ) : (
          <div className="results" style={{ marginTop: 12 }}>
            {profile.opportunities.map((o) => (
              <a key={o.jobRequestId} className="card cardlink" href={`/jobs/${encodeURIComponent(o.jobRequestId)}`}>
                <div className="role">{o.role}</div>
                <div className="chips">
                  <span className="chip">{o.areaLabel}</span>
                  <span className="chip">
                    {o.openings} {o.openings === 1 ? "opening" : "openings"}
                  </span>
                </div>
                <div className="when">{formatWhen(o.startAt, o.endAt)}</div>
              </a>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
