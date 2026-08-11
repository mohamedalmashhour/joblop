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

export function JobDetail({ id, postalCode }: { id: string; postalCode: string | null }) {
  const [status, setStatus] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [job, setJob] = useState<JobDetailData | null>(null);

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
    return () => {
      active = false;
    };
  }, [id, postalCode]);

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

      <div className="detail-cta">
        <button className="btn" type="button" aria-pressed={job.saved} onClick={toggleSaved}>
          {job.saved ? "★ Saved" : "☆ Save job"}
        </button>
        <a className="btn ghost" href={`/employers/${encodeURIComponent(job.employer.id)}`}>
          View employer
        </a>
      </div>
    </article>
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
