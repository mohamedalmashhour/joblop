"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MarketplaceMap, type MapPin } from "./MarketplaceMap";

export type JobResult = Readonly<{
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
  total: number;
  nextCursor: number | null;
  jobs: readonly JobResult[];
}>;

const RADII = [5, 10, 25, 50, 100] as const;
const SORTS = [
  { value: "nearest", label: "Nearest" },
  { value: "soonest", label: "Soonest" },
  { value: "highest_rate", label: "Highest rate" }
] as const;

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

  if (authState === "loading") return <div className="state">Loading…</div>;
  if (authState === "signed_out") return <SignInPanel onSignedIn={() => setAuthState("signed_in")} />;
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
      if (response.ok) return onSignedIn();
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
  const [sort, setSort] = useState<string>("nearest");
  const [dateFrom, setDateFrom] = useState("");
  const [minOpenings, setMinOpenings] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "error" | "empty">("idle");
  const [origin, setOrigin] = useState<SearchResponse["origin"] | null>(null);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (cursor: number | null) => {
      const response = await fetch("/api/marketplace/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postalCode,
          radiusKm,
          sort,
          ...(role.trim() ? { role: role.trim() } : {}),
          ...(dateFrom ? { dateFrom: new Date(dateFrom).toISOString() } : {}),
          ...(minOpenings && Number(minOpenings) > 0 ? { minOpenings: Number(minOpenings) } : {}),
          ...(verifiedOnly ? { verifiedOnly: true } : {}),
          ...(cursor !== null ? { cursor } : {})
        })
      });
      return response;
    },
    [postalCode, radiusKm, role, sort, dateFrom, minOpenings, verifiedOnly]
  );

  const runSearch = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      setStatus("searching");
      setErrorMessage(null);
      setSelectedId(null);
      try {
        const response = await fetchPage(null);
        if (response.status === 401) return onSignedOut();
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setErrorMessage(payload?.message ?? "We couldn't run that search. Check your postal code.");
          setStatus("error");
          return;
        }
        const payload = (await response.json()) as SearchResponse;
        setOrigin(payload.origin);
        setJobs([...payload.jobs]);
        setTotal(payload.total);
        setNextCursor(payload.nextCursor);
        setStatus(payload.total === 0 ? "empty" : "done");
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
        setStatus("error");
      }
    },
    [fetchPage, onSignedOut]
  );

  const loadMore = useCallback(async () => {
    if (nextCursor === null) return;
    try {
      const response = await fetchPage(nextCursor);
      if (response.status === 401) return onSignedOut();
      if (!response.ok) return;
      const payload = (await response.json()) as SearchResponse;
      setJobs((current) => [...current, ...payload.jobs]);
      setNextCursor(payload.nextCursor);
    } catch {
      /* keep current page on failure */
    }
  }, [fetchPage, nextCursor, onSignedOut]);

  const toggleSaved = useCallback(async (job: JobResult) => {
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

  // When a pin selects a job, scroll its card into view in the list.
  const selectFromMap = useCallback((jobRequestId: string) => {
    setSelectedId(jobRequestId);
    setMobileView("list");
    requestAnimationFrame(() => {
      document.getElementById(`card-${jobRequestId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  async function signOut() {
    await fetch("/api/session/sign-out", { method: "POST" }).catch(() => undefined);
    onSignedOut();
  }

  const pins: MapPin[] = jobs.map((j) => ({
    jobRequestId: j.jobRequestId,
    latitude: j.mapPoint.latitude,
    longitude: j.mapPoint.longitude,
    label: j.role,
    saved: j.saved
  }));
  const mapOrigin = jobs[0]
    ? { latitude: jobs[0].mapPoint.latitude, longitude: jobs[0].mapPoint.longitude }
    : null;
  const detailHref = (id: string) =>
    `/jobs/${encodeURIComponent(id)}${origin ? `?postalCode=${encodeURIComponent(origin.postalCode)}` : ""}`;

  return (
    <>
      <section className="hero">
        <div className="hero-row">
          <div>
            <h1>Find work near you</h1>
            <p>Search open shifts, see how far they are, and save the ones you like.</p>
          </div>
          <div className="hero-actions">
            <a className="btn ghost" href="/verification">
              Verification
            </a>
            <a className="btn ghost" href="/hr">
              My HR
            </a>
            <a className="btn ghost" href="/documents">
              Documents
            </a>
            <a className="btn ghost" href="/my-interests">
              My interests
            </a>
            <a className="btn ghost" href="/saved-jobs">
              Saved jobs
            </a>
            <button className="btn ghost" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
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
        <div className="field">
          <label htmlFor="sort">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit" disabled={status === "searching"}>
          {status === "searching" ? "Searching…" : "Search jobs"}
        </button>
      </form>

      <div className="filters">
        <div className="field">
          <label htmlFor="dateFrom">From date</label>
          <input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="minOpenings">Min openings</label>
          <input id="minOpenings" type="number" min={1} inputMode="numeric" value={minOpenings} onChange={(e) => setMinOpenings(e.target.value)} placeholder="Any" />
        </div>
        <label className="checkfield" htmlFor="verifiedOnly">
          <input id="verifiedOnly" type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
          Verified employers only
        </label>
        {(dateFrom || minOpenings || verifiedOnly || role.trim()) ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => { setDateFrom(""); setMinOpenings(""); setVerifiedOnly(false); setRole(""); }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {status === "done" || status === "empty" ? (
        <div className="resultbar">
          <h2>
            {total} {total === 1 ? "job" : "jobs"} near {origin?.city ?? origin?.postalCode}
            {origin?.province ? `, ${origin.province}` : ""}
          </h2>
          <div className="viewtoggle" role="tablist" aria-label="List or map view">
            <button role="tab" aria-selected={mobileView === "list"} className={mobileView === "list" ? "active" : ""} onClick={() => setMobileView("list")} type="button">
              List
            </button>
            <button role="tab" aria-selected={mobileView === "map"} className={mobileView === "map" ? "active" : ""} onClick={() => setMobileView("map")} type="button">
              Map
            </button>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="state error" role="alert">
          {errorMessage}
          <div style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => runSearch()}>
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {status === "empty" ? (
        <div className="state">
          No open jobs {role.trim() ? "matching these filters " : ""}in this area yet.
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
            {radiusKm < 100 ? (
              <button className="btn" type="button" onClick={() => { setRadiusKm(radiusKm < 25 ? 25 : 100); }}>
                Widen to {radiusKm < 25 ? "25" : "100"} km
              </button>
            ) : null}
            {role.trim() ? (
              <button className="btn ghost" type="button" onClick={() => setRole("")}>
                Clear role filter
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {status === "done" ? (
        <div className={`explorer view-${mobileView}`}>
          <div className="results" ref={listRef}>
            {jobs.map((job) => (
              <JobCard
                key={job.jobRequestId}
                job={job}
                selected={job.jobRequestId === selectedId}
                href={detailHref(job.jobRequestId)}
                onSelect={() => setSelectedId(job.jobRequestId)}
                onToggleSaved={toggleSaved}
              />
            ))}
            {nextCursor !== null ? (
              <button className="btn ghost loadmore" type="button" onClick={loadMore}>
                Load more ({jobs.length} of {total})
              </button>
            ) : (
              <p className="notice" style={{ textAlign: "center" }}>Showing all {total} jobs</p>
            )}
          </div>
          <div className="mapcol">
            <div className="mapsticky">
              <MarketplaceMap origin={mapOrigin} pins={pins} selectedId={selectedId} onSelect={selectFromMap} radiusKm={radiusKm} />
              <p className="notice" style={{ textAlign: "center" }}>
                Pins are approximate — exact worksite is shared only once you're assigned.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function JobCard({
  job,
  selected,
  href,
  onSelect,
  onToggleSaved
}: {
  job: JobResult;
  selected: boolean;
  href: string;
  onSelect: () => void;
  onToggleSaved: (job: JobResult) => void;
}) {
  return (
    <article id={`card-${job.jobRequestId}`} className={`card${selected ? " selected" : ""}`} onMouseEnter={onSelect} onFocus={onSelect}>
      <button
        className="save"
        type="button"
        aria-pressed={job.saved}
        aria-label={job.saved ? `Remove ${job.role} from saved` : `Save ${job.role}`}
        title={job.saved ? "Saved" : "Save"}
        onClick={() => onToggleSaved(job)}
      >
        {job.saved ? "★" : "☆"}
      </button>
      <a className="role cardlink" href={href}>
        {job.role}
      </a>
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
        {job.workerRateMinor !== null ? <span className="chip">{formatRate(job.workerRateMinor, job.currency)}</span> : null}
      </div>
      <div className="when">{formatWhen(job.startAt, job.endAt)}</div>
      <a className="detaillink" href={href}>
        View details →
      </a>
    </article>
  );
}

export function formatWhen(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const day = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${t(start)} – ${t(end)}`;
}

export function formatRate(minor: number, currency: string): string {
  return `${(minor / 100).toLocaleString(undefined, { style: "currency", currency })}/h`;
}
