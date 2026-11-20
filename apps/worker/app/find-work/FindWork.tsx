"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { foldPlaceText, placeMatches, resolveKnownPlace, type PublicCalendarJob } from "@rwos/shared";
import { useLocale, useT, fmtLocale } from "../i18n/LocaleProvider";
import { workerPayLabel } from "../workerPayLabel";
import { leadPayLabel } from "../leadPay";
import { appendUnique, nextCursorOf } from "../pagination";
import { publicJobPath, signUpReturningTo } from "../safeReturnPath";
import { JoblopJobBadge, OutsideApplyLink, OutsideSiteBadge } from "../JobSourceBadge";
import { outsideApplyUrl } from "../jobSource";
import { PublicJobsCalendar } from "../PublicJobsCalendar";
import { accountHref } from "../authScroll";
import { FIND_WORK_TABS, cleanFilter, findWorkHref, type FindWorkTab } from "../findWorkUrl";
import { mapLayout } from "./mapLayout";
import { groupLeads } from "./groupLeads";
import { QuebecJobsMap, type CityPin } from "./QuebecJobsMap";

// The one "Find work" page. List / Map / Calendar are tabs that share the same two filters (what work +
// city). The list shows Joblop jobs first ("apply here in one click"), then jobs on other websites
// ("you apply on their site"). Anyone sees the jobs and the pay; pressing Apply on a Joblop job opens
// the existing sign-up / sign-in flow and comes back to that job.

export type PublicJob = Readonly<{
  jobCode: string;
  role: string;
  city: string | null;
  province: string | null;
  areaLabel: string;
  openings: number;
  startAt: string;
  urgency: string;
  workerRateMinor?: number | null;
  currency?: string | null;
  payOffered?: unknown;
}>;

type Lead = Readonly<{
  title: string;
  employer: string | null;
  areaLabel: string;
  salaryMinMinor: number | null;
  salaryMaxMinor: number | null;
  salaryPeriod: string | null;
  source: string;
  url?: string | null;
}>;

// Before the visitor types anything, outside listings show everyday work first.
const EVERYDAY_WORK = "cleaner cook warehouse driver retail labourer";


export function FindWork({ initialTab, initialQ, initialCity }: { initialTab: FindWorkTab; initialQ: string; initialCity: string }) {
  const t = useT();
  const locale = useLocale();
  const arrow = locale === "ar" ? "←" : "→";
  const [tab, setTab] = useState<FindWorkTab>(initialTab);
  const [draftQ, setDraftQ] = useState(initialQ);
  const [draftCity, setDraftCity] = useState(initialCity);
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);
  const [jobs, setJobs] = useState<readonly PublicJob[] | null>(null);
  // "Load more": the API pages Joblop jobs 30 at a time.
  const [jobsCursor, setJobsCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [leads, setLeads] = useState<readonly Lead[] | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" }).then((r) => setSignedIn(r.ok)).catch(() => undefined);
  }, []);

  // The address bar always matches the tab and filters, so the page can be shared or reloaded.
  useEffect(() => {
    window.history.replaceState(null, "", findWorkHref({ tab, q, city }));
  }, [tab, q, city]);

  const load = useCallback(async (query: string, place: string) => {
    setJobs(null);
    setLeads(null);
    const jobParams = new URLSearchParams({ limit: "30" });
    if (query) jobParams.set("q", query);
    if (place) jobParams.set("city", place);
    const leadParams = new URLSearchParams({ limit: "12", q: query || EVERYDAY_WORK });
    if (place) leadParams.set("city", place);
    const [j, l] = await Promise.all([
      fetch(`/api/public/jobs?${jobParams.toString()}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/public/jobscanner/leads?${leadParams.toString()}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({}))
    ]);
    setJobs(Array.isArray(j?.jobs) ? (j.jobs as PublicJob[]) : []);
    setJobsCursor(nextCursorOf(j));
    setLeads(Array.isArray(l?.leads) ? (l.leads as Lead[]) : []);
  }, []);

  const loadMore = useCallback(async () => {
    if (jobsCursor === null) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ limit: "30", cursor: jobsCursor });
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    const page = await fetch(`/api/public/jobs?${params.toString()}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    const more = Array.isArray(page?.jobs) ? (page.jobs as PublicJob[]) : [];
    setJobs((current) => appendUnique(current ?? [], more, (job) => job.jobCode));
    setJobsCursor(nextCursorOf(page));
    setLoadingMore(false);
  }, [jobsCursor, q, city]);

  useEffect(() => {
    void load(q, city);
  }, [load, q, city]);

  // The calendar uses the same two filters.
  const calendarMatches = useMemo(() => {
    const word = foldPlaceText(q);
    return (job: PublicCalendarJob) =>
      (!word || foldPlaceText(job.role).includes(word)) && (!city || placeMatches(job.city, city) || placeMatches(job.areaLabel, city));
  }, [q, city]);

  const applyHref = (job: PublicJob) => (signedIn ? publicJobPath(job.jobCode) : signUpReturningTo(publicJobPath(job.jobCode)));
  const tabLabel: Record<FindWorkTab, string> = { list: t("fw.tabList"), map: t("fw.tabMap"), calendar: t("fw.tabCal") };

  return (
    <div className="fw">
      <h1 className="fw-title">{t("fw.title")}</h1>
      <p className="fw-sub">{t("fw.sub")}</p>

      <div className="fw-tabs" role="tablist" aria-label={t("fw.tabsLabel")}>
        {FIND_WORK_TABS.map((id) => (
          <button
            key={id}
            id={`fw-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls="fw-panel"
            className={tab === id ? "fw-tab on" : "fw-tab"}
            onClick={() => setTab(id)}
          >
            {tabLabel[id]}
          </button>
        ))}
      </div>

      <form
        className="fw-filter"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(cleanFilter(draftQ));
          setCity(cleanFilter(draftCity));
        }}
      >
        <input value={draftQ} onChange={(e) => setDraftQ(e.target.value)} placeholder={t("home.whatPh")} aria-label={t("home.whatPh")} maxLength={80} />
        <input value={draftCity} onChange={(e) => setDraftCity(e.target.value)} placeholder={t("home.cityPh")} aria-label={t("home.cityPh")} maxLength={80} autoComplete="address-level2" />
        <button type="submit" className="fw-search">{t("fw.search")}</button>
      </form>

      <div id="fw-panel" role="tabpanel" aria-labelledby={`fw-tab-${tab}`}>
        {tab === "list" ? (
          <ListTab jobs={jobs} leads={leads} applyHref={applyHref} arrow={arrow} onMore={jobsCursor !== null ? () => void loadMore() : undefined} moreBusy={loadingMore} />
        ) : tab === "map" ? (
          <MapTab jobs={jobs} city={city} applyHref={applyHref} />
        ) : (
          <PublicJobsCalendar matches={calendarMatches} onCreateAccount={() => window.location.assign(accountHref("signup"))} />
        )}
      </div>
    </div>
  );
}

function JoblopJobCard({ job, applyHref }: { job: PublicJob; applyHref: string }) {
  const t = useT();
  const locale = useLocale();
  const money = fmtLocale(locale);
  const when = new Date(job.startAt);
  const whenText = Number.isFinite(when.getTime())
    ? when.toLocaleString(money, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" })
    : "";
  return (
    <article className="fw-card">
      <JoblopJobBadge />
      <h3><a href={publicJobPath(job.jobCode)} dir="auto">{job.role}</a></h3>
      <p className="fw-meta"><bdi>{job.areaLabel}</bdi>{whenText ? <> · <bdi>{whenText}</bdi></> : null}</p>
      <div className="fw-row">
        <span className="fw-pay">
          <bdi>{workerPayLabel(job, money, { paidByEmployer: t("pay.paidByEmployer"), employerPaysDirectly: t("pay.employerPaysDirectly"), pending: t("pay.pending") })}</bdi>
          <small> · {job.openings === 1 ? t("fw.placesOne") : t("fw.placesMany", { count: job.openings })}</small>
        </span>
        <a className="fw-apply" href={applyHref}>{t("fw.apply")}</a>
      </div>
    </article>
  );
}

function ListTab({
  jobs,
  leads,
  applyHref,
  arrow,
  onMore,
  moreBusy
}: {
  jobs: readonly PublicJob[] | null;
  leads: readonly Lead[] | null;
  applyHref: (job: PublicJob) => string;
  arrow: string;
  onMore?: (() => void) | undefined;
  moreBusy?: boolean;
}) {
  const t = useT();
  return (
    <>
      <section className="fw-sec" aria-labelledby="fw-sec-joblop">
        <h2 id="fw-sec-joblop">{t("fw.secJoblop")} <small>{t("fw.secJoblopSub")}</small></h2>
        {jobs === null ? <p className="fw-note">{t("fw.loading")}</p> : null}
        {jobs !== null && jobs.length === 0 ? <p className="fw-note">{t("fw.noneJoblop")}</p> : null}
        <div className="fw-grid">
          {(jobs ?? []).map((job) => (
            <JoblopJobCard key={job.jobCode} job={job} applyHref={applyHref(job)} />
          ))}
        </div>
        {onMore ? (
          <button type="button" className="btn ghost" onClick={onMore} disabled={moreBusy}>
            {moreBusy ? t("fw.loading") : t("common.loadMore")}
          </button>
        ) : null}
      </section>

      <section className="fw-sec" aria-labelledby="fw-sec-other">
        <h2 id="fw-sec-other">{t("fw.secOther")} <small>{t("fw.secOtherSub")}</small></h2>
        {leads === null ? <p className="fw-note">{t("fw.loading")}</p> : null}
        {leads !== null && leads.length === 0 ? <p className="fw-note">{t("fw.noneOther")}</p> : null}
        <div className="fw-grid">
          {groupLeads(leads ?? []).map((group) => (
            <OutsideLeadCard key={group.key} lead={group.lead} locations={group.locations} arrow={arrow} />
          ))}
        </div>
      </section>
    </>
  );
}

// How many cities a grouped card lists before the rest fold under "Show N more".
const LOCATIONS_SHOWN = 3;

function LeadApply({ lead, arrow }: { lead: Lead; arrow: string }) {
  const t = useT();
  return outsideApplyUrl(lead.url) ? (
    <OutsideApplyLink url={lead.url} source={lead.source} />
  ) : (
    <a className="src-apply src-apply-out" href="/job-scanner">{t("fw.apply")} {arrow}</a>
  );
}

// One outside job. Listings with the same title and company in several cities share one card that
// says "N locations"; each city keeps its own "Apply on <site>" link.
function OutsideLeadCard({ lead, locations, arrow }: { lead: Lead; locations: readonly Lead[]; arrow: string }) {
  const t = useT();
  const pay = leadPayLabel(lead, useLocale());
  const many = locations.length > 1;
  const row = (l: Lead) => (
    <li key={`${l.areaLabel}-${l.url ?? ""}`} className="fw-loc">
      <bdi>{l.areaLabel}</bdi>
      <LeadApply lead={l} arrow={arrow} />
    </li>
  );
  return (
    <article className="fw-card fw-card-out">
      <OutsideSiteBadge />
      <h3 dir="auto">{lead.title}</h3>
      <p className="fw-meta">
        {lead.employer ? <><bdi>{lead.employer}</bdi> · </> : null}
        {many ? <strong>{t("fw.locations", { count: locations.length })}</strong> : <bdi>{lead.areaLabel}</bdi>}
      </p>
      {many ? (
        <>
          <span className={pay ? "fw-pay" : "fw-meta"} dir={pay ? "ltr" : undefined}>{pay ?? t("fw.payOnSite")}</span>
          <ul className="fw-locs">{locations.slice(0, LOCATIONS_SHOWN).map(row)}</ul>
          {locations.length > LOCATIONS_SHOWN ? (
            <details className="fw-locs-more">
              <summary>{t("fw.moreLocations", { count: locations.length - LOCATIONS_SHOWN })}</summary>
              <ul className="fw-locs">{locations.slice(LOCATIONS_SHOWN).map(row)}</ul>
            </details>
          ) : null}
        </>
      ) : (
        <div className="fw-row">
          <span className={pay ? "fw-pay" : "fw-meta"} dir={pay ? "ltr" : undefined}>{pay ?? t("fw.payOnSite")}</span>
          <LeadApply lead={lead} arrow={arrow} />
        </div>
      )}
      <p className="fw-note">{t("fw.newTabNote")}</p>
      {lead.source === "adzuna" ? (
        <p className="fw-source">via <a href="https://www.adzuna.ca" target="_blank" rel="noopener noreferrer">Adzuna</a></p>
      ) : null}
    </article>
  );
}

function MapTab({ jobs, city, applyHref }: { jobs: readonly PublicJob[] | null; city: string; applyHref: (job: PublicJob) => string }) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const layout = useMemo(() => mapLayout(jobs ?? [], resolveKnownPlace(city)), [jobs, city]);
  // One pin per city; it shows how many jobs the city has.
  const pins: CityPin[] = useMemo(
    () => layout.pins.map((p) => ({ id: p.place, latitude: p.latitude, longitude: p.longitude, label: p.place, count: p.count })),
    [layout]
  );
  if (jobs === null) return <p className="fw-note">{t("fw.loading")}</p>;
  const selectedPlace = selected && layout.pins.some((p) => p.place === selected) ? selected : null;
  const inPlace = selectedPlace ? jobs.filter((j) => layout.placeOf.get(j.jobCode) === selectedPlace) : [];
  return (
    <div className="fw-map">
      <div className="fw-map-frame">
        <QuebecJobsMap pins={pins} selectedId={selectedPlace} onSelect={setSelected} withQuebec={!city} />
      </div>
      {pins.length === 0 ? <p className="fw-note">{t("fw.mapEmpty")}</p> : <p className="fw-note">{t("fw.mapNote")}</p>}
      {layout.offMap > 0 ? <p className="fw-note">{layout.offMap === 1 ? t("fw.mapOffMapOne") : t("fw.mapOffMap", { count: layout.offMap })}</p> : null}
      {selectedPlace ? (
        <section className="fw-sec" aria-live="polite">
          <h2>{selectedPlace}</h2>
          <div className="fw-grid">
            {inPlace.map((job) => (
              <JoblopJobCard key={job.jobCode} job={job} applyHref={applyHref(job)} />
            ))}
          </div>
        </section>
      ) : pins.length > 0 ? (
        <p className="fw-note">{t("fw.mapPick")}</p>
      ) : null}
    </div>
  );
}
