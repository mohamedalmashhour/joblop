"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MarketplaceMap, type MapPin } from "./MarketplaceMap";
import { useLocale, useT, fmtLocale } from "./i18n/LocaleProvider";
import { LandingPanel } from "./LandingPanel";
import { syncAccountLanguageOnce } from "./i18n/saveLanguage";
import { NEXT_AFTER_SIGN_UP_KEY } from "./PublicJobSearch";
import type { RwosLocale } from "./i18n/config";
import { workerPayLabel, formatHourlyRate } from "./workerPayLabel";
import { CertificateChip, type RequiredCertificatesData } from "./RequiredCertificates";

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
  /** Long-term listing only: the pay the employer offers and pays directly. */
  payOffered?: unknown;
  saved: boolean;
  /** Certificates the employer requires (absent when none). */
  requiredCertificates?: RequiredCertificatesData;
}>;

type SearchResponse = Readonly<{
  origin: { province: string; city: string | null; postalCode: string | null; place?: string };
  count: number;
  total: number;
  nextCursor: number | null;
  jobs: readonly JobResult[];
  profile?: { score: number; tier: string; hiddenJobs: number };
}>;

const RADII = [5, 10, 25, 50, 100] as const;
const SORT_VALUES = ["nearest", "soonest", "highest_rate"] as const;

export function MarketplaceExplorer() {
  const t = useT();
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

  if (authState === "loading") return <div className="state">{t("common.loading")}</div>;
  if (authState === "signed_out") {
    const afterSignIn = () => {
      const next = readAndClearNext();
      // Only same-site paths, never an outside address.
      if (next && next.startsWith("/") && !next.startsWith("//") && next !== "/") {
        window.location.assign(next);
        return;
      }
      setAuthState("signed_in");
    };
    return <LandingPanel onSignedIn={afterSignIn} />;
  }
  return <SearchPanel onSignedOut={() => setAuthState("signed_out")} />;
}

function SearchPanel({ onSignedOut }: { onSignedOut: () => void }) {
  const t = useT();
  const rawLocale = useLocale();
  const locale = fmtLocale(rawLocale);
  // Signed in: make sure offers and notices use the language this worker reads the site in.
  useEffect(() => {
    syncAccountLanguageOnce(rawLocale);
  }, [rawLocale]);
  // Selectable role suggestions for the search box (worker picks a role instead of guessing free-text).
  const roleSuggestions =
    rawLocale === "ar"
      ? ["ممرضة", "الدعم الشخصي", "طاهٍ", "طباخ", "التدبير المنزلي", "خدمة الطعام", "الصيانة", "عامل نظافة"]
      : rawLocale.startsWith("fr")
        ? ["Infirmière", "Préposé aux bénéficiaires", "Chef", "Cuisinier", "Entretien ménager", "Service en salle", "Maintenance", "Nettoyage"]
        : ["Nurse", "Personal Support", "Chef", "Cook", "Housekeeping", "Dining Support", "Maintenance", "Cleaning"];
  // "Where?": a city or a postal code. Starts empty: never pre-filled with a place the worker didn't type.
  const [place, setPlace] = useState("");
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
  const [hiddenJobs, setHiddenJobs] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "agenda" | "map">("list");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const sortLabel = (value: string) =>
    value === "soonest" ? t("mk.sortSoonest") : value === "highest_rate" ? t("mk.sortHighestRate") : t("mk.sortNearest");

  const fetchPage = useCallback(
    async (cursor: number | null) => {
      const response = await fetch("/api/marketplace/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          place: place.trim(),
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
    [place, radiusKm, role, sort, dateFrom, minOpenings, verifiedOnly]
  );

  const runSearch = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      setSelectedId(null);
      if (!place.trim()) {
        setErrorMessage(t("mk.placeRequired"));
        setStatus("error");
        return;
      }
      setStatus("searching");
      setErrorMessage(null);
      try {
        const response = await fetchPage(null);
        if (response.status === 401) return onSignedOut();
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          setErrorMessage(searchErrorText(payload?.error, t));
          setStatus("error");
          return;
        }
        const payload = (await response.json()) as SearchResponse;
        setOrigin(payload.origin);
        setJobs([...payload.jobs]);
        setTotal(payload.total);
        setNextCursor(payload.nextCursor);
        setHiddenJobs(payload.profile?.hiddenJobs ?? 0);
        setStatus(payload.total === 0 ? "empty" : "done");
      } catch {
        setErrorMessage(t("common.somethingWrong"));
        setStatus("error");
      }
    },
    [fetchPage, onSignedOut, place, t]
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

  const selectFromMap = useCallback((jobRequestId: string) => {
    setSelectedId(jobRequestId);
    setView("list");
    requestAnimationFrame(() => {
      document.getElementById(`card-${jobRequestId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);


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
  const originPlace = origin ? (origin.postalCode ?? origin.place ?? origin.city ?? "") : "";
  const detailHref = (id: string) =>
    `/jobs/${encodeURIComponent(id)}${originPlace ? `?place=${encodeURIComponent(originPlace)}` : ""}`;

  const hasFilters = Boolean(role.trim() || dateFrom || minOpenings || verifiedOnly);
  const placeLabel = origin ? `${origin.city ?? origin.postalCode ?? origin.place ?? ""}${origin.province ? `, ${origin.province}` : ""}` : "";

  return (
    <>
      <section className="hero">
        <div className="hero-row">
          <div>
            <h1>{t("mk.heroTitle")}</h1>
            <p>{t("mk.heroIntro")}</p>
            <a className="btn" href="/jobs-calendar" style={{ display: "inline-flex", marginTop: 8, textDecoration: "none" }}>
              <span aria-hidden="true">📅&nbsp;</span>
              {rawLocale === "ar" ? "افتح تقويمي" : rawLocale.startsWith("fr") ? "Ouvrir mon calendrier" : "Open my calendar"}
            </a>
          </div>
        </div>
      </section>

      <form className="searchbar" onSubmit={runSearch}>
        <div className="field grow">
          <label htmlFor="place">{t("mk.postalCode")}</label>
          <input
            id="place"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={t("mk.postalPlaceholder")}
            autoComplete="off"
            maxLength={80}
          />
        </div>
        <div className="field">
          <label htmlFor="radius">{t("mk.within")}</label>
          <select id="radius" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
            {RADII.map((r) => (
              <option key={r} value={r}>{t("mk.kmUnit", { km: r })}</option>
            ))}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="role">{t("mk.role")}</label>
          <input id="role" list="role-options" value={role} onChange={(e) => setRole(e.target.value)} placeholder={t("mk.anyRole")} />
          <datalist id="role-options">
            {roleSuggestions.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="sort">{t("mk.sortBy")}</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_VALUES.map((value) => (
              <option key={value} value={value}>{sortLabel(value)}</option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit" disabled={status === "searching"}>
          {status === "searching" ? t("mk.searching") : t("mk.searchJobs")}
        </button>
      </form>

      <div className="filters">
        <div className="field">
          <label htmlFor="dateFrom">{t("mk.fromDate")}</label>
          <input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="minOpenings">{t("mk.minOpenings")}</label>
          <input id="minOpenings" type="number" min={1} inputMode="numeric" value={minOpenings} onChange={(e) => setMinOpenings(e.target.value)} placeholder={t("mk.any")} />
        </div>
        <label className="checkfield" htmlFor="verifiedOnly">
          <input id="verifiedOnly" type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
          {t("mk.verifiedOnly")}
        </label>
        {hasFilters ? (
          <button type="button" className="btn ghost" onClick={() => { setDateFrom(""); setMinOpenings(""); setVerifiedOnly(false); setRole(""); }}>
            {t("mk.clearFilters")}
          </button>
        ) : null}
      </div>

      {status === "done" || status === "empty" ? (
        <div className="resultbar">
          <h2>{total === 1 ? t("mk.resultsOne", { count: total, place: placeLabel }) : t("mk.resultsMany", { count: total, place: placeLabel })}</h2>
          <div className="viewtoggle" role="tablist" aria-label={t("mk.viewToggleLabel")}>
            <button role="tab" aria-selected={view === "list"} className={view === "list" ? "active" : ""} onClick={() => setView("list")} type="button">
              {t("mk.viewList")}
            </button>
            <button role="tab" aria-selected={view === "agenda"} className={view === "agenda" ? "active" : ""} onClick={() => setView("agenda")} type="button">
              {t("mk.viewAgenda")}
            </button>
            <button role="tab" aria-selected={view === "map"} className={view === "map" ? "active" : ""} onClick={() => setView("map")} type="button">
              {t("mk.viewMap")}
            </button>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="state error" role="alert">
          {errorMessage}
          <div style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => runSearch()}>{t("common.retry")}</button>
          </div>
        </div>
      ) : null}

      {status === "empty" ? (
        <div className="state">
          {hasFilters ? t("mk.emptyFiltered") : t("mk.empty")}
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
            {radiusKm < 100 ? (
              <button className="btn" type="button" onClick={() => { setRadiusKm(radiusKm < 25 ? 25 : 100); }}>
                {t("mk.widenTo", { km: radiusKm < 25 ? 25 : 100 })}
              </button>
            ) : null}
            {role.trim() ? (
              <button className="btn ghost" type="button" onClick={() => setRole("")}>{t("mk.clearRoleFilter")}</button>
            ) : null}
          </div>
        </div>
      ) : null}

      {status === "done" && view === "agenda" ? (
        <AgendaView jobs={jobs} locale={locale} detailHref={detailHref} onToggleSaved={toggleSaved} />
      ) : null}

      {status === "done" && view !== "agenda" ? (
        <div className={`explorer view-${view}`}>
          <div className="results" ref={listRef}>
            {hiddenJobs > 0 ? (
              <div className="card" style={{ borderColor: "var(--accent)" }}>
                <p className="notice" style={{ margin: 0 }}>{t("mk.moreJobs", { count: hiddenJobs })}</p>
                <a className="btn" href="/documents" style={{ alignSelf: "flex-start" }}>{t("mk.completeProfile")}</a>
              </div>
            ) : null}
            {jobs.map((job) => (
              <JobCard
                key={job.jobRequestId}
                job={job}
                locale={locale}
                selected={job.jobRequestId === selectedId}
                href={detailHref(job.jobRequestId)}
                onSelect={() => setSelectedId(job.jobRequestId)}
                onToggleSaved={toggleSaved}
              />
            ))}
            {nextCursor !== null ? (
              <button className="btn ghost loadmore" type="button" onClick={loadMore}>
                {t("mk.loadMore", { shown: jobs.length, total })}
              </button>
            ) : (
              <p className="notice" style={{ textAlign: "center" }}>
                {total === 1 ? t("mk.showingAllOne") : t("mk.showingAll", { total })}
              </p>
            )}
          </div>
          <div className="mapcol">
            <div className="mapsticky">
              <MarketplaceMap origin={mapOrigin} pins={pins} selectedId={selectedId} onSelect={selectFromMap} radiusKm={radiusKm} />
              <p className="notice" style={{ textAlign: "center" }}>{t("mk.pinsApproximate")}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function JobCard({
  job,
  locale,
  selected,
  href,
  onSelect,
  onToggleSaved
}: {
  job: JobResult;
  locale: RwosLocale;
  selected: boolean;
  href: string;
  onSelect: () => void;
  onToggleSaved: (job: JobResult) => void;
}) {
  const t = useT();
  return (
    <article id={`card-${job.jobRequestId}`} className={`card${selected ? " selected" : ""}`} onMouseEnter={onSelect} onFocus={onSelect}>
      <button
        className="save"
        type="button"
        aria-pressed={job.saved}
        aria-label={job.saved ? t("mk.removeSavedAria", { role: job.role }) : t("mk.saveAria", { role: job.role })}
        title={job.saved ? t("mk.saved") : t("mk.save")}
        onClick={() => onToggleSaved(job)}
      >
        {job.saved ? "★" : "☆"}
      </button>
      <a className="role cardlink" href={href}>{job.role}</a>
      <div className="employer">
        {job.employerName}
        {job.verifiedEmployer ? t("mk.verifiedSuffix") : ""}
      </div>
      <div className="chips">
        <span className="chip dist">{job.distanceLabel}</span>
        <span className="chip">{job.areaLabel}</span>
        <span className="chip">
          {job.openings === 1 ? t("mk.openingOne", { count: job.openings }) : t("mk.openingMany", { count: job.openings })}
        </span>
        <span className="chip">
          <bdi>{workerPayLabel(job, locale, { paidByEmployer: t("pay.paidByEmployer"), employerPaysDirectly: t("pay.employerPaysDirectly"), pending: t("pay.pending") })}</bdi>
        </span>
        <CertificateChip required={job.requiredCertificates} />
      </div>
      <div className="when">{formatWhen(job.startAt, job.endAt, locale)}</div>
      <a className="detaillink" href={href}>{t("mk.viewDetails")}</a>
    </article>
  );
}

function AgendaView({
  jobs,
  locale,
  detailHref,
  onToggleSaved
}: {
  jobs: readonly JobResult[];
  locale: RwosLocale;
  detailHref: (id: string) => string;
  onToggleSaved: (job: JobResult) => void;
}) {
  const groups: { key: string; label: string; items: JobResult[] }[] = [];
  for (const job of jobs) {
    const d = new Date(job.startAt);
    const key = d.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
    const label = d.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(job);
  }
  return (
    <div className="agenda">
      {groups.map((group) => (
        <section key={group.key} className="agenda-day">
          <h3 className="agenda-date">{group.label}</h3>
          <div className="results">
            {group.items.map((job) => (
              <JobCard
                key={job.jobRequestId}
                job={job}
                locale={locale}
                selected={false}
                href={detailHref(job.jobRequestId)}
                onSelect={() => undefined}
                onToggleSaved={onToggleSaved}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function formatWhen(startAt: string, endAt: string, locale?: RwosLocale): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const day = start.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time(start)} – ${time(end)}`;
}

export function formatRate(minor: number, currency: string, locale?: RwosLocale): string {
  return formatHourlyRate(minor, currency, locale);
}

/** The friendly message for a search the API could not run (an unknown place is never a 500). */
function searchErrorText(code: string | undefined, t: ReturnType<typeof useT>): string {
  if (code === "RWOS_PLACE_NOT_FOUND") return t("mk.placeNotFound");
  if (code === "RWOS_PLACE_REQUIRED") return t("mk.placeRequired");
  if (code === "RWOS_PLACE_UNAVAILABLE") return t("mk.placeUnavailable");
  return t("mk.searchError");
}

/** Where the visitor wanted to go before signing up (same-site path), read once. */
function readAndClearNext(): string | null {
  try {
    const value = window.sessionStorage.getItem(NEXT_AFTER_SIGN_UP_KEY);
    window.sessionStorage.removeItem(NEXT_AFTER_SIGN_UP_KEY);
    return value;
  } catch {
    return null;
  }
}
