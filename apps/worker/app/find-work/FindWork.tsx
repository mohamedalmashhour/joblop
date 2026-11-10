"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { foldPlaceText, placeMatches, resolveKnownPlace, type PublicCalendarJob } from "@rwos/shared";
import { useLocale, useT, fmtLocale } from "../i18n/LocaleProvider";
import { workerPayLabel } from "../workerPayLabel";
import { publicJobPath, signUpReturningTo } from "../safeReturnPath";
import { JoblopJobBadge, OutsideApplyLink, OutsideSiteBadge } from "../JobSourceBadge";
import { outsideApplyUrl } from "../jobSource";
import { MarketplaceMap, type MapPin } from "../MarketplaceMap";
import { PublicJobsCalendar } from "../PublicJobsCalendar";
import { accountHref } from "../authScroll";
import { FIND_WORK_TABS, cleanFilter, findWorkHref, type FindWorkTab } from "../findWorkUrl";
import { mapLayout } from "./mapLayout";

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

function leadPay(l: Lead): string | null {
  const v = l.salaryMaxMinor ?? l.salaryMinMinor;
  if (!v) return null;
  const hourly = l.salaryPeriod === "hour" || v < 20000;
  return hourly ? `$${(v / 100).toFixed(2).replace(/\.00$/, "")}/h` : `$${Math.round(v / 100000)}k/yr`;
}

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
    setLeads(Array.isArray(l?.leads) ? (l.leads as Lead[]) : []);
  }, []);

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
          <ListTab jobs={jobs} leads={leads} applyHref={applyHref} arrow={arrow} />
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
    ? when.toLocaleString(money, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
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
  arrow
}: {
  jobs: readonly PublicJob[] | null;
  leads: readonly Lead[] | null;
  applyHref: (job: PublicJob) => string;
  arrow: string;
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
      </section>

      <section className="fw-sec" aria-labelledby="fw-sec-other">
        <h2 id="fw-sec-other">{t("fw.secOther")} <small>{t("fw.secOtherSub")}</small></h2>
        {leads === null ? <p className="fw-note">{t("fw.loading")}</p> : null}
        {leads !== null && leads.length === 0 ? <p className="fw-note">{t("fw.noneOther")}</p> : null}
        <div className="fw-grid">
          {(leads ?? []).map((lead, i) => {
            const pay = leadPay(lead);
            return (
              <article key={`${lead.source}-${lead.title}-${i}`} className="fw-card fw-card-out">
                <OutsideSiteBadge />
                <h3 dir="auto">{lead.title}</h3>
                <p className="fw-meta">{lead.employer ? <><bdi>{lead.employer}</bdi> · </> : null}<bdi>{lead.areaLabel}</bdi></p>
                <div className="fw-row">
                  <span className={pay ? "fw-pay" : "fw-meta"} dir={pay ? "ltr" : undefined}>{pay ?? t("fw.payOnSite")}</span>
                  {outsideApplyUrl(lead.url) ? (
                    <OutsideApplyLink url={lead.url} source={lead.source} />
                  ) : (
                    <a className="src-apply src-apply-out" href="/job-scanner">{t("fw.apply")} {arrow}</a>
                  )}
                </div>
                <p className="fw-note">{t("fw.newTabNote")}</p>
                {lead.source === "adzuna" ? (
                  <p className="fw-source">via <a href="https://www.adzuna.ca" target="_blank" rel="noopener noreferrer">Adzuna</a></p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function MapTab({ jobs, city, applyHref }: { jobs: readonly PublicJob[] | null; city: string; applyHref: (job: PublicJob) => string }) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const layout = useMemo(() => mapLayout(jobs ?? [], resolveKnownPlace(city)), [jobs, city]);
  if (jobs === null) return <p className="fw-note">{t("fw.loading")}</p>;
  if (layout.pins.length === 0) return <p className="fw-note">{t("fw.mapEmpty")}</p>;
  // One dot per city; its label says the city and how many jobs it has.
  const pins: MapPin[] = layout.pins.map((p) => ({
    jobRequestId: p.place,
    latitude: p.latitude,
    longitude: p.longitude,
    label: `${p.place} (${p.count})`,
    saved: false
  }));
  const selectedPlace = selected && layout.pins.some((p) => p.place === selected) ? selected : null;
  const inPlace = selectedPlace ? jobs.filter((j) => layout.placeOf.get(j.jobCode) === selectedPlace) : [];
  return (
    <div className="fw-map">
      <div className="fw-map-frame">
        <MarketplaceMap origin={layout.origin} pins={pins} selectedId={selected} onSelect={setSelected} radiusKm={layout.radiusKm} />
      </div>
      <p className="fw-note">{t("fw.mapNote")}</p>
      {layout.offMap > 0 ? <p className="fw-note">{t("fw.mapOffMap", { count: layout.offMap })}</p> : null}
      {selectedPlace ? (
        <section className="fw-sec" aria-live="polite">
          <h2>{selectedPlace}</h2>
          <div className="fw-grid">
            {inPlace.map((job) => (
              <JoblopJobCard key={job.jobCode} job={job} applyHref={applyHref(job)} />
            ))}
          </div>
        </section>
      ) : (
        <p className="fw-note">{t("fw.mapPick")}</p>
      )}
    </div>
  );
}
