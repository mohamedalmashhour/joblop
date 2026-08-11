"use client";

import { useCallback, useEffect, useState } from "react";

type JobResult = Readonly<{
  jobRequestId: string;
  role: string;
  employerName: string;
  verifiedEmployer: boolean;
  areaLabel: string;
  distanceKm: number;
  distanceLabel: string;
  mapPoint: { latitude: number; longitude: number; approximate: boolean };
  startAt: string;
  endAt: string;
  openings: number;
  workerRateMinor: number | null;
  currency: string;
  saved: boolean;
}>;

type SearchResponse = Readonly<{
  origin: { province: string; city: string | null; postalCode: string };
  count: number;
  jobs: readonly JobResult[];
}>;

const RADII = [5, 10, 25, 50, 100] as const;

export function MarketplaceExplorer() {
  const [authState, setAuthState] = useState<"loading" | "signed_out" | "signed_in">("loading");

  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => (active ? setAuthState(r.ok ? "signed_in" : "signed_out") : undefined))
      .catch(() => (active ? setAuthState("signed_out") : undefined));
    return () => {
      active = false;
    };
  }, []);

  if (authState === "loading") {
    return <div className="state">Loading…</div>;
  }
  if (authState === "signed_out") {
    return <SignInPanel onSignedIn={() => setAuthState("signed_in")} />;
  }
  return <SearchPanel onSignedOut={() => setAuthState("signed_out")} />;
}

function SignInPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/session/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (response.ok) {
        onSignedIn();
        return;
      }
      setError(response.status === 429 ? "Too many attempts. Try again shortly." : "Sign in failed. Check your email and password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hero">
      <h1>Find work near you</h1>
      <p>Sign in to search open shifts, see how far they are, and save the ones you like.</p>
      <form className="searchbar" onSubmit={submit} style={{ marginTop: 20 }}>
        <div className="field grow">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field grow">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error ? <p className="notice" style={{ color: "var(--danger)" }}>{error}</p> : null}
    </section>
  );
}

function SearchPanel({ onSignedOut }: { onSignedOut: () => void }) {
  const [postalCode, setPostalCode] = useState("H7V 1A1");
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [jobs, setJobs] = useState<readonly JobResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runSearch = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      setStatus("searching");
      setErrorMessage(null);
      try {
        const response = await fetch("/api/marketplace/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ postalCode, radiusKm, ...(role.trim() ? { role: role.trim() } : {}) })
        });
        if (response.status === 401) {
          onSignedOut();
          return;
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setErrorMessage(payload?.message ?? "We couldn't run that search. Check your postal code.");
          setStatus("error");
          return;
        }
        const payload = (await response.json()) as SearchResponse;
        setData(payload);
        setJobs(payload.jobs);
        setStatus("done");
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
        setStatus("error");
      }
    },
    [postalCode, radiusKm, role, onSignedOut]
  );

  const toggleSaved = useCallback(async (job: JobResult) => {
    // Optimistic flip; revert on failure.
    setJobs((current) => current.map((j) => (j.jobRequestId === job.jobRequestId ? { ...j, saved: !j.saved } : j)));
    try {
      const response = job.saved
        ? await fetch(`/api/saved-jobs/${encodeURIComponent(job.jobRequestId)}`, { method: "DELETE" })
        : await fetch("/api/saved-jobs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jobRequestId: job.jobRequestId })
          });
      if (!response.ok) throw new Error("save failed");
    } catch {
      setJobs((current) => current.map((j) => (j.jobRequestId === job.jobRequestId ? { ...j, saved: job.saved } : j)));
    }
  }, []);

  async function signOut() {
    await fetch("/api/session/sign-out", { method: "POST" }).catch(() => undefined);
    onSignedOut();
  }

  return (
    <>
      <section className="hero">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h1>Find work near you</h1>
            <p>Search open shifts, see how far they are, and save the ones you like.</p>
          </div>
          <button className="btn ghost" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </section>

      <form className="searchbar" onSubmit={runSearch}>
        <div className="field grow">
          <label htmlFor="postal">Postal code</label>
          <input id="postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="e.g. H7V 1A1" />
        </div>
        <div className="field">
          <label htmlFor="radius">Within</label>
          <select id="radius" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="role">Role (optional)</label>
          <input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Any role" />
        </div>
        <button className="btn" type="submit" disabled={status === "searching"}>
          {status === "searching" ? "Searching…" : "Search jobs"}
        </button>
      </form>

      {status === "done" && data ? (
        <div className="resultbar">
          <h2>
            {data.count} {data.count === 1 ? "job" : "jobs"} near {data.origin.city ?? data.origin.postalCode}
            {data.origin.province ? `, ${data.origin.province}` : ""}
          </h2>
          <span className="muted" style={{ fontSize: 13 }}>
            Sorted by distance · locations are approximate until you're assigned
          </span>
        </div>
      ) : null}

      {status === "error" ? <div className="state error">{errorMessage}</div> : null}
      {status === "done" && jobs.length === 0 ? (
        <div className="state">No open jobs in this area yet. Try a wider radius or a different postal code.</div>
      ) : null}

      <div className="grid">
        {jobs.map((job) => (
          <JobCard key={job.jobRequestId} job={job} onToggleSaved={toggleSaved} />
        ))}
      </div>
    </>
  );
}

function JobCard({ job, onToggleSaved }: { job: JobResult; onToggleSaved: (job: JobResult) => void }) {
  return (
    <article className="card">
      <button
        className="save"
        type="button"
        aria-pressed={job.saved}
        aria-label={job.saved ? "Remove from saved" : "Save job"}
        title={job.saved ? "Saved" : "Save"}
        onClick={() => onToggleSaved(job)}
      >
        {job.saved ? "★" : "☆"}
      </button>
      <div className="role">{job.role}</div>
      <div className="employer">
        {job.employerName}
        {job.verifiedEmployer ? " · ✓ Verified" : ""}
      </div>
      <div className="chips">
        <span className="chip dist">{job.distanceLabel}</span>
        <span className="chip">{job.areaLabel}</span>
        <span className="chip">
          {job.openings} {job.openings === 1 ? "opening" : "openings"}
        </span>
        {job.workerRateMinor !== null ? (
          <span className="chip">{formatRate(job.workerRateMinor, job.currency)}</span>
        ) : null}
      </div>
      <div className="when">{formatWhen(job.startAt, job.endAt)}</div>
    </article>
  );
}

function formatWhen(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const day = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${t(start)} – ${t(end)}`;
}

function formatRate(minor: number, currency: string): string {
  return `${(minor / 100).toLocaleString(undefined, { style: "currency", currency })}/h`;
}
