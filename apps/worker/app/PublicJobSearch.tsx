"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "./i18n/LocaleProvider";

// Signed-out front door: a REAL job search anyone can use before having an account. Joblop's own
// open jobs come first, then jobs scanned from partner job boards. Opening a job asks the visitor
// to create an account first (then they are signed in and taken to what they picked).

type PublicJob = { jobCode: string; role: string; areaLabel: string; openings: number; startAt: string; urgency: string };
type Lead = {
  title: string;
  employer: string | null;
  areaLabel: string;
  salaryMinMinor: number | null;
  salaryMaxMinor: number | null;
  salaryPeriod: string | null;
  source: string;
};

export const NEXT_AFTER_SIGN_UP_KEY = "joblop_next_after_signup";
// Before the visitor types anything, show everyday work first (not just the newest postings).
const EVERYDAY_WORK = "cleaner cook warehouse driver retail labourer";

const TEXT = {
  en: {
    title: "Search jobs now, no account needed",
    sub: "Real jobs from Joblop employers and partner job boards. Create a free account when you want to see the details and apply.",
    placeholder: "What work? e.g. cleaner, cook, driver",
    search: "Search",
    joblopJobs: "Joblop jobs",
    moreJobs: "More jobs near you",
    joblopBadge: "Joblop",
    places: (n: number) => (n === 1 ? "1 place left" : `${n} places left`),
    urgent: "Urgent",
    open: "See details",
    gate: "To see the details and apply, create your free account. It takes one minute.",
    none: "No jobs found for that search yet. Try another word.",
    loading: "Searching…",
    found: (n: number) => `${n} jobs found`
  },
  fr: {
    title: "Cherchez des emplois maintenant, sans compte",
    sub: "De vrais emplois d’employeurs Joblop et de sites d’emploi partenaires. Créez un compte gratuit pour voir les détails et postuler.",
    placeholder: "Quel travail? ex. entretien, cuisinier, chauffeur",
    search: "Chercher",
    joblopJobs: "Emplois Joblop",
    moreJobs: "Autres emplois près de chez vous",
    joblopBadge: "Joblop",
    places: (n: number) => (n === 1 ? "1 place restante" : `${n} places restantes`),
    urgent: "Urgent",
    open: "Voir les détails",
    gate: "Pour voir les détails et postuler, créez votre compte gratuit. Ça prend une minute.",
    none: "Aucun emploi trouvé pour cette recherche. Essayez un autre mot.",
    loading: "Recherche…",
    found: (n: number) => `${n} emplois trouvés`
  },
  ar: {
    title: "ابحث عن وظائف الآن، دون حساب",
    sub: "وظائف حقيقية من أصحاب عمل Joblop ومواقع وظائف شريكة. أنشئ حسابًا مجانيًا عندما تريد رؤية التفاصيل والتقديم.",
    placeholder: "ما العمل؟ مثل: تنظيف، طباخ، سائق",
    search: "ابحث",
    joblopJobs: "وظائف Joblop",
    moreJobs: "وظائف أخرى قريبة منك",
    joblopBadge: "Joblop",
    places: (n: number) => (n === 1 ? "بقي مكان واحد" : `بقي ${n} أماكن`),
    urgent: "عاجل",
    open: "عرض التفاصيل",
    gate: "لرؤية التفاصيل والتقديم، أنشئ حسابك المجاني. يستغرق دقيقة واحدة.",
    none: "لا توجد وظائف لهذا البحث بعد. جرّب كلمة أخرى.",
    loading: "جارٍ البحث…",
    found: (n: number) => `تم العثور على ${n} وظيفة`
  }
};

function pay(l: Lead): string | null {
  const v = l.salaryMaxMinor ?? l.salaryMinMinor;
  if (!v) return null;
  const hourly = l.salaryPeriod === "hour" || v < 20000;
  return hourly ? `$${(v / 100).toFixed(2).replace(/\.00$/, "")}/h` : `$${Math.round(v / 100000)}k/yr`;
}

export function PublicJobSearch({ onWantDetails }: { onWantDetails: (next: string) => void }) {
  const locale = useLocale();
  const lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  const t = TEXT[lang];
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<PublicJob[] | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadTotal, setLeadTotal] = useState(0);

  const run = useCallback(async (query: string) => {
    setJobs(null);
    const params = new URLSearchParams({ limit: "6" });
    if (query.trim()) params.set("q", query.trim());
    const leadParams = new URLSearchParams({ limit: "6", q: query.trim() || EVERYDAY_WORK });
    const [j, l] = await Promise.all([
      fetch(`/api/public/jobs?${params.toString()}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/public/jobscanner/leads?${leadParams.toString()}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({}))
    ]);
    setJobs(Array.isArray(j?.jobs) ? j.jobs : []);
    setLeads(Array.isArray(l?.leads) ? l.leads : []);
    setLeadTotal(typeof l?.total === "number" ? l.total : 0);
  }, []);

  useEffect(() => {
    void run("");
  }, [run]);

  const total = (jobs?.length ?? 0) + leadTotal;
  const leadNext = (title: string) => `/job-scanner?q=${encodeURIComponent(q.trim() || title)}`;

  return (
    <section className="pjs" aria-labelledby="pjs-title">
      <h2 id="pjs-title">{t.title}</h2>
      <p className="pjs-sub">{t.sub}</p>
      <form
        className="pjs-form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void run(q);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder} maxLength={80} />
        <button type="submit">{t.search}</button>
      </form>
      {jobs === null ? (
        <p className="pjs-note">{t.loading}</p>
      ) : jobs.length === 0 && leads.length === 0 ? (
        <p className="pjs-note">{t.none}</p>
      ) : (
        <>
          <p className="pjs-count">{t.found(total)}</p>
          {jobs.length > 0 ? (
            <>
              <h3 className="pjs-h">{t.joblopJobs}</h3>
              <div className="pjs-grid">
                {jobs.map((job) => (
                  <button type="button" key={job.jobCode} className="pjs-card pjs-own" title={t.gate} onClick={() => onWantDetails("/")}>
                    <span className="pjs-badge">{t.joblopBadge}</span>
                    <strong>{job.role}</strong>
                    <span className="pjs-meta">📍 {job.areaLabel} · {new Date(job.startAt).toLocaleDateString(locale)}</span>
                    <span className="pjs-foot">
                      <em>{t.places(job.openings)}{job.urgency === "urgent" || job.urgency === "immediate" ? ` · ${t.urgent}` : ""}</em>
                      <span>{t.open} →</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {leads.length > 0 ? (
            <>
              <h3 className="pjs-h">{t.moreJobs}</h3>
              <div className="pjs-grid">
                {leads.map((lead, i) => (
                  <div key={`${lead.title}-${i}`} className="pjs-cell">
                    <button type="button" className="pjs-card" title={t.gate} onClick={() => onWantDetails(leadNext(lead.title))}>
                      <strong>{lead.title}</strong>
                      <span className="pjs-meta">{lead.employer ? `${lead.employer} · ` : ""}📍 {lead.areaLabel}</span>
                      <span className="pjs-foot">
                        <em>{pay(lead) ?? ""}</em>
                        <span>{t.open} →</span>
                      </span>
                    </button>
                    {lead.source === "adzuna" ? (
                      <a className="pjs-adzuna" href="https://www.adzuna.ca" target="_blank" rel="noreferrer">Adzuna</a>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <p className="pjs-gate">🔒 {t.gate}</p>
        </>
      )}
    </section>
  );
}
