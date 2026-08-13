"use client";

import { useCallback, useEffect, useState } from "react";
import { formatWhen, formatRate } from "../../MarketplaceExplorer";

type JobDetailData = Readonly<{
  jobRequestId: string;
  role: string;
  title: string;
  employer: { id: string; name: string; verified: boolean };
  areaLabel: string;
  distanceKm: number | null;
  distanceLabel: string | null;
  mapPoint: { latitude: number; longitude: number; approximate: boolean };
  startAt: string;
  endAt: string;
  openings: number;
  workerRateMinor: number | null;
  currency: string;
  description: string | null;
  duties: string | null;
  qualifications: readonly string[];
  saved: boolean;
}>;

type InterestState = Readonly<{
  interest: { status: string } | null;
  eligibility: { eligible: boolean; reasons: string[] };
}>;

const INELIGIBLE_COPY: Record<string, string> = {
  already_assigned: "You're already assigned to this job.",
  active_offer_exists: "You already have an active offer for this job.",
  job_not_open: "This job is no longer open.",
  job_not_found: "This job is no longer available."
};

export function JobDetail({ id, postalCode }: { id: string; postalCode: string | null }) {
  const [status, setStatus] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [job, setJob] = useState<JobDetailData | null>(null);
  const [interest, setInterest] = useState<InterestState | null>(null);
  const [interestBusy, setInterestBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const url = `/api/jobs/${encodeURIComponent(id)}${postalCode ? `?postalCode=${encodeURIComponent(postalCode)}` : ""}`;
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        if (!active) return;
        if (r.status === 404) return setStatus("not_found");
        if (!r.ok) return setStatus("error");
        const payload = (await r.json()) as { job: JobDetailData };
        setJob(payload.job);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    // Interest + eligibility state (independent of the detail fetch).
    fetch(`/api/jobs/${encodeURIComponent(id)}/interest`, { cache: "no-store" })
      .then(async (r) => {
        if (!active || !r.ok) return;
        setInterest((await r.json()) as InterestState);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, postalCode]);

  const expressInterest = useCallback(async () => {
    setInterestBusy(true);
    try {
      const r = await fetch(`/api/jobs/${encodeURIComponent(id)}/interest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(postalCode ? { postalCode } : {})
      });
      if (r.ok) {
        const body = (await r.json()) as { interest: { status: string } };
        setInterest((prev) => ({ interest: body.interest, eligibility: prev?.eligibility ?? { eligible: true, reasons: [] } }));
      }
    } finally {
      setInterestBusy(false);
    }
  }, [id, postalCode]);

  const withdrawInterest = useCallback(async () => {
    setInterestBusy(true);
    try {
      const r = await fetch(`/api/jobs/${encodeURIComponent(id)}/interest`, { method: "DELETE" });
      if (r.ok) setInterest((prev) => ({ interest: null, eligibility: prev?.eligibility ?? { eligible: true, reasons: [] } }));
    } finally {
      setInterestBusy(false);
    }
  }, [id]);

  const toggleSaved = useCallback(async () => {
    if (!job) return;
    const wasSaved = job.saved;
    setJob({ ...job, saved: !wasSaved });
    try {
      const response = wasSaved
        ? await fetch(`/api/saved-jobs/${encodeURIComponent(job.jobRequestId)}`, { method: "DELETE" })
        : await fetch("/api/saved-jobs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jobRequestId: job.jobRequestId })
          });
      if (!response.ok) throw new Error("save failed");
    } catch {
      setJob((current) => (current ? { ...current, saved: wasSaved } : current));
    }
  }, [job]);

  if (status === "loading") return <div className="state">Loading…</div>;
  if (status === "not_found")
    return (
      <div className="state">
        This job is no longer available.
        <div style={{ marginTop: 12 }}>
          <a className="btn" href="/">
            Return to search
          </a>
        </div>
      </div>
    );
  if (status === "error" || !job)
    return (
      <div className="state error" role="alert">
        We couldn&apos;t load this job. Please try again.
      </div>
    );

  return (
    <article className="detail">
      <div className="detail-head">
        <div>
          <h1>{job.role}</h1>
          <p className="detail-title">{job.title}</p>
          <p className="employer">
            <a href={`/employers/${encodeURIComponent(job.employer.id)}`}>{job.employer.name}</a>
            {job.employer.verified ? <span className="chip verified" style={{ marginLeft: 8 }}>✓ Verified</span> : null}
          </p>
        </div>
        <button
          className="btn"
          type="button"
          aria-pressed={job.saved}
          onClick={toggleSaved}
        >
          {job.saved ? "★ Saved" : "☆ Save job"}
        </button>
      </div>

      <div className="detail-facts">
        <Fact label="Location">{job.areaLabel}{job.distanceLabel ? ` · ${job.distanceLabel}` : ""}</Fact>
        <Fact label="When">{formatWhen(job.startAt, job.endAt)}</Fact>
        <Fact label="Openings">{job.openings}</Fact>
        {job.workerRateMinor !== null ? <Fact label="Pay">{formatRate(job.workerRateMinor, job.currency)}</Fact> : null}
      </div>

      <p className="notice">
        The map location is approximate. The exact worksite address is shared only once you&apos;re assigned.
      </p>

      {job.description ? (
        <Section title="About this shift">
          <p>{job.description}</p>
        </Section>
      ) : null}
      {job.duties ? (
        <Section title="Duties">
          <p>{job.duties}</p>
        </Section>
      ) : null}
      {job.qualifications.length > 0 ? (
        <Section title="Qualifications">
          <ul className="quals">
            {job.qualifications.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <InterestPanel state={interest} busy={interestBusy} onExpress={expressInterest} onWithdraw={withdrawInterest} />

      <div className="detail-cta">
        <button className="btn ghost" type="button" aria-pressed={job.saved} onClick={toggleSaved}>
          {job.saved ? "★ Saved" : "☆ Save job"}
        </button>
        <a className="btn ghost" href={`/employers/${encodeURIComponent(job.employer.id)}`}>
          View employer
        </a>
        <a className="btn ghost" href="/my-interests">
          My interests
        </a>
      </div>
    </article>
  );
}

// The governed Express-Interest CTA. Interest is intent only — the copy never implies the
// worker "got the job". If a governed offer later exists, that lives in the offer flow.
function InterestPanel({
  state,
  busy,
  onExpress,
  onWithdraw
}: {
  state: InterestState | null;
  busy: boolean;
  onExpress: () => void;
  onWithdraw: () => void;
}) {
  const current = state?.interest?.status ?? null;
  const eligible = state?.eligibility?.eligible ?? true;
  const reasons = state?.eligibility?.reasons ?? [];

  // Already expressed (pre-offer): show submitted state + withdraw.
  if (current && ["submitted", "under_review", "shortlisted"].includes(current)) {
    return (
      <section className="detail-section interest submitted">
        <h2>Interest submitted ✓</h2>
        <p>JobLop will review your profile and the staffing need. If you&apos;re selected, you&apos;ll receive a private offer.</p>
        <button className="btn ghost" type="button" onClick={onWithdraw} disabled={busy}>
          Withdraw interest
        </button>
      </section>
    );
  }

  // An offer has been created/accepted through the governed flow — direct the worker there.
  if (current && ["offer_created", "offer_accepted"].includes(current)) {
    return (
      <section className="detail-section interest">
        <h2>You have an offer</h2>
        <p>JobLop has issued you a private offer for this job. Review and respond on your offers page.</p>
        <a className="btn" href="/offers">Go to my offers</a>
      </section>
    );
  }

  // Not yet interested. Gate on server eligibility.
  return (
    <section className="detail-section interest">
      <h2>Interested in this shift?</h2>
      {eligible ? (
        <>
          <p>Let JobLop know you&apos;re interested. Platform dispatch reviews interest before any offer is made — expressing interest is free and never guarantees the job.</p>
          <button className="btn" type="button" onClick={onExpress} disabled={busy}>
            {busy ? "Submitting…" : "Express interest"}
          </button>
        </>
      ) : (
        <p className="muted">{INELIGIBLE_COPY[reasons[0] ?? ""] ?? "You can't express interest in this job right now."}</p>
      )}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fact">
      <span className="fact-label">{label}</span>
      <span className="fact-value">{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
