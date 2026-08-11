"use client";

import { useCallback, useEffect, useState } from "react";
import { formatWhen } from "../MarketplaceExplorer";

type SavedEntry = Readonly<{
  jobRequestId: string;
  savedAt: string;
  available: boolean;
  summary: {
    role: string;
    title: string;
    employer: { id: string; name: string; verified: boolean };
    areaLabel: string | null;
    startAt: string;
    endAt: string;
    openings: number;
  } | null;
}>;

export function SavedJobs() {
  const [status, setStatus] = useState<"loading" | "ready" | "signed_out" | "error">("loading");
  const [entries, setEntries] = useState<SavedEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/saved-jobs", { cache: "no-store" });
      if (r.status === 401) return setStatus("signed_out");
      if (!r.ok) return setStatus("error");
      const payload = (await r.json()) as { saved: SavedEntry[] };
      setEntries(payload.saved);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = useCallback(async (jobRequestId: string) => {
    const prev = entries;
    setEntries((current) => current.filter((e) => e.jobRequestId !== jobRequestId));
    try {
      const r = await fetch(`/api/saved-jobs/${encodeURIComponent(jobRequestId)}`, { method: "DELETE" });
      if (!r.ok) throw new Error("remove failed");
    } catch {
      setEntries(prev); // revert on failure
    }
  }, [entries]);

  if (status === "loading") return <div className="state">Loading…</div>;
  if (status === "signed_out")
    return (
      <div className="state">
        Please sign in to see your saved jobs.
        <div style={{ marginTop: 12 }}>
          <a className="btn" href="/">Go to search</a>
        </div>
      </div>
    );
  if (status === "error") return <div className="state error" role="alert">We couldn&apos;t load your saved jobs.</div>;

  return (
    <>
      <section className="hero">
        <h1>Saved jobs</h1>
        <p>{entries.length === 0 ? "You haven't saved any jobs yet." : `${entries.length} saved`}</p>
      </section>

      {entries.length === 0 ? (
        <div className="state">
          Jobs you save appear here.
          <div style={{ marginTop: 12 }}>
            <a className="btn" href="/">Find jobs</a>
          </div>
        </div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {entries.map((e) => (
            <article key={e.jobRequestId} className={`card${e.available ? "" : " unavailable"}`}>
              <button
                className="save"
                type="button"
                aria-pressed
                aria-label={`Remove ${e.summary?.role ?? "job"} from saved`}
                title="Remove"
                onClick={() => remove(e.jobRequestId)}
              >
                ★
              </button>
              {e.summary ? (
                <>
                  {e.available ? (
                    <a className="role cardlink" href={`/jobs/${encodeURIComponent(e.jobRequestId)}`}>
                      {e.summary.role}
                    </a>
                  ) : (
                    <div className="role">{e.summary.role}</div>
                  )}
                  <div className="employer">{e.summary.employer.name}</div>
                  <div className="chips">
                    {e.summary.areaLabel ? <span className="chip">{e.summary.areaLabel}</span> : null}
                    <span className="chip">
                      {e.summary.openings} {e.summary.openings === 1 ? "opening" : "openings"}
                    </span>
                  </div>
                  <div className="when">{formatWhen(e.summary.startAt, e.summary.endAt)}</div>
                  {!e.available ? <div className="chip" style={{ color: "var(--danger)" }}>No longer available</div> : null}
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
