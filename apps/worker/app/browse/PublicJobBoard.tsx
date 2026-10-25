"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { JobScannerDemo } from "./JobScannerDemo";

// Public, no-sign-in landing + job board for JobLop. Hero search, real categories, REAL featured
// jobs (from /public/jobs — never fabricated), job-seeker + employer sections, honest stats and
// value props (no fake brand logos or invented reviews), CTA band, footer. Bilingual (Bill 96).
// Privacy-safe: area-level job data only (city + province) — never address, client, or pay.

type Job = {
  jobCode: string; role: string; city: string | null; province: string | null;
  areaLabel: string; openings: number; startAt: string; urgency: string;
};
type Lang = "en" | "fr";

const PROVINCES: { code: string; en: string; fr: string }[] = [
  { code: "AB", en: "Alberta", fr: "Alberta" }, { code: "BC", en: "British Columbia", fr: "Colombie-Britannique" },
  { code: "MB", en: "Manitoba", fr: "Manitoba" }, { code: "NB", en: "New Brunswick", fr: "Nouveau-Brunswick" },
  { code: "NL", en: "Newfoundland and Labrador", fr: "Terre-Neuve-et-Labrador" }, { code: "NS", en: "Nova Scotia", fr: "Nouvelle-Écosse" },
  { code: "NT", en: "Northwest Territories", fr: "Territoires du Nord-Ouest" }, { code: "NU", en: "Nunavut", fr: "Nunavut" },
  { code: "ON", en: "Ontario", fr: "Ontario" }, { code: "PE", en: "Prince Edward Island", fr: "Île-du-Prince-Édouard" },
  { code: "QC", en: "Quebec", fr: "Québec" }, { code: "SK", en: "Saskatchewan", fr: "Saskatchewan" }, { code: "YT", en: "Yukon", fr: "Yukon" }
];

// JobLop's real work categories (not tech roles). `q` matches role/title/city server-side.
const CATEGORIES = [
  { icon: "🩺", bg: "#e9f0ff", en: "Care & Nursing", fr: "Soins & infirmerie", q: "nurse" },
  { icon: "🧑‍⚕️", bg: "#eafaf4", en: "Personal Support", fr: "Préposé aux bénéficiaires", q: "support" },
  { icon: "🍳", bg: "#fff2e8", en: "Kitchen", fr: "Cuisine", q: "cook" },
  { icon: "👨‍🍳", bg: "#fdeef3", en: "Chef", fr: "Chef", q: "chef" },
  { icon: "🧹", bg: "#f0ecff", en: "Housekeeping", fr: "Entretien ménager", q: "housekeeping" },
  { icon: "🍽️", bg: "#e7f7fb", en: "Dining Support", fr: "Service en salle", q: "dining" },
  { icon: "🔧", bg: "#fff6e0", en: "Maintenance", fr: "Maintenance", q: "maintenance" },
  { icon: "🧺", bg: "#eef7e8", en: "Laundry & Cleaning", fr: "Buanderie & nettoyage", q: "cleaner" }
];

const T = {
  en: {
    navJobs: "Find Jobs", navEmp: "For Employers", navRes: "Resources", navAbout: "About",
    signin: "Sign In", create: "Create Account",
    tabFind: "Find a Job", tabHire: "Hire Talent",
    heroA: "Your Next Opportunity", heroB: "Starts Here",
    heroSub: "Search jobs from across Canada and apply — 100% free, always. JobLop brings the whole market to you, and never takes a cut of your pay.",
    heroBadge: "⚡ Powered by JobScanner — one search across the market",
    freePill: "Free to apply",
    previewLive: "Live results", previewMore: "Unlock the whole market with JobScanner — sign up free",
    previewEmpty: "Type a role or pick a province to see live matches.",
    phRole: "Job title, role, or keyword", phLoc: "Location", searchBtn: "Search Jobs",
    popular: "Popular:", allCanada: "All of Canada",
    cStat1: "open jobs", cStat2: "Across every province", cBuild: "Build your future",
    catTitle: "Explore jobs by category", catSub: "Start with the work you do, then narrow by place.",
    featTitle: "Featured opportunities", featSub: "Fresh open shifts from employers near you.", viewAll: "View all jobs →",
    openings: (n: number) => `${n} opening${n === 1 ? "" : "s"}`, urgent: "Urgent", starts: "Starts", apply: "Apply now",
    none: "No open jobs match right now — try another province or clear the search.", loading: "Finding jobs…",
    seekTag: "FOR WORKERS", seekTitle: "Take the next step in your work",
    seekSub: "Create a free profile, get matched to shifts near you, and never miss an opportunity.",
    seekBtn: "Create your account",
    seek1: "Apply to shifts in a few taps", seek2: "Get matched to work near you", seek3: "Your hours recorded fairly",
    empTag: "FOR EMPLOYERS", empTitle: "Find and staff shifts faster",
    empSub: "Post a request, reach available local workers, and get coverage you can count on.",
    empBtn: "Post a request", emp1: "Reach available local workers", emp2: "Governed, compliant staffing", emp3: "Fill urgent shifts fast",
    trustTitle: "Trusted where people live and work",
    trustSub: "Care homes, restaurants, and local employers across Canada staff with JobLop.",
    st1: "open jobs", st2: "provinces hiring", st3: "worker fees", st4: "to browse",
    jsTag: "⚡ JOBSCANNER", jsTitle: "The deepest job search in Canada — and it's free",
    jsSub: "JobScanner hunts the market for you: it continuously scans partner job feeds across Canada, ranks the best matches, and lets you apply free on JobLop. One search instead of ten tabs.",
    js1t: "Deep, real search", js1b: "The whole market scanned and refreshed around the clock.",
    js2t: "Ranked for you", js2b: "Sorted by fit and pay so the best jobs rise to the top.",
    js3t: "Apply free", js3b: "Apply on JobLop at no cost — we never take a cut of your pay.",
    jsBtn: "Search the market — free",
    whyTitle: "Why workers choose JobLop",
    why1t: "Trusted workplaces", why1b: "Clear terms before you accept — no surprises.",
    why2t: "Paid fairly", why2b: "Your hours come from your own clock-in / clock-out.",
    why3t: "No cut of your pay", why3b: "JobLop never takes a fee from what you earn.",
    ctaTitle: "Ready to start your next shift?", ctaSub: "Whether you're looking for work or the right people, JobLop is here to help.",
    ctaFind: "Find work", ctaPost: "Post a request",
    fTag: "Connecting people with opportunities to build a brighter future.",
    fSeekers: "For Workers", fEmp: "For Employers", fCo: "Company", fLegal: "Legal",
    fBrowse: "Browse jobs", fCreate: "Create account", fAlerts: "Job alerts",
    fPost: "Post a request", fFind: "Find workers", fPricing: "Pricing",
    fAbout: "About", fContact: "Contact", fCareers: "Careers",
    fPrivacy: "Privacy", fTerms: "Terms", fCookie: "Cookies",
    copyright: "JobLop. A brighter future, together."
  },
  fr: {
    navJobs: "Offres", navEmp: "Employeurs", navRes: "Ressources", navAbout: "À propos",
    signin: "Se connecter", create: "Créer un compte",
    tabFind: "Trouver un emploi", tabHire: "Recruter",
    heroA: "Votre prochaine occasion", heroB: "commence ici",
    heroSub: "Cherchez des emplois partout au Canada et postulez — 100 % gratuit, toujours. JobLop vous apporte tout le marché et ne prend jamais de part de votre paie.",
    heroBadge: "⚡ Propulsé par JobScanner — une seule recherche, tout le marché",
    freePill: "Postuler gratuitement",
    previewLive: "Résultats en direct", previewMore: "Débloquez tout le marché avec JobScanner — inscription gratuite",
    previewEmpty: "Tapez un rôle ou choisissez une province pour voir des offres en direct.",
    phRole: "Titre, rôle ou mot-clé", phLoc: "Lieu", searchBtn: "Rechercher",
    popular: "Populaire :", allCanada: "Tout le Canada",
    cStat1: "offres ouvertes", cStat2: "Dans toutes les provinces", cBuild: "Bâtissez votre avenir",
    catTitle: "Explorez par catégorie", catSub: "Partez du travail que vous faites, puis affinez par lieu.",
    featTitle: "Offres en vedette", featSub: "De nouveaux quarts ouverts près de chez vous.", viewAll: "Voir toutes les offres →",
    openings: (n: number) => `${n} poste${n === 1 ? "" : "s"}`, urgent: "Urgent", starts: "Début", apply: "Postuler",
    none: "Aucune offre ne correspond — essayez une autre province ou effacez la recherche.", loading: "Recherche…",
    seekTag: "POUR LES TRAVAILLEURS", seekTitle: "Passez à l'étape suivante",
    seekSub: "Créez un profil gratuit, soyez jumelé à des quarts près de chez vous et ne manquez aucune occasion.",
    seekBtn: "Créer votre compte",
    seek1: "Postulez en quelques touches", seek2: "Jumelé à du travail près de vous", seek3: "Vos heures enregistrées équitablement",
    empTag: "POUR LES EMPLOYEURS", empTitle: "Comblez vos quarts plus vite",
    empSub: "Publiez une demande, rejoignez des travailleurs locaux disponibles et obtenez une couverture fiable.",
    empBtn: "Publier une demande", emp1: "Rejoignez des travailleurs locaux", emp2: "Dotation encadrée et conforme", emp3: "Comblez les urgences vite",
    trustTitle: "La confiance, là où l'on vit et travaille",
    trustSub: "Résidences, restaurants et employeurs locaux partout au Canada recrutent avec JobLop.",
    st1: "offres ouvertes", st2: "provinces qui embauchent", st3: "frais travailleur", st4: "pour consulter",
    jsTag: "⚡ JOBSCANNER", jsTitle: "La recherche d'emploi la plus poussée au Canada — gratuite",
    jsSub: "JobScanner cherche le marché pour vous : il analyse en continu des fils d'emplois partenaires partout au Canada, classe les meilleures correspondances et vous laisse postuler gratuitement sur JobLop. Une seule recherche au lieu de dix onglets.",
    js1t: "Recherche réelle et poussée", js1b: "Tout le marché analysé et rafraîchi en continu.",
    js2t: "Classé pour vous", js2b: "Triées par adéquation et salaire — les meilleures en premier.",
    js3t: "Postuler gratuitement", js3b: "Postulez sur JobLop sans frais — jamais de part de votre paie.",
    jsBtn: "Chercher le marché — gratuit",
    whyTitle: "Pourquoi les travailleurs choisissent JobLop",
    why1t: "Milieux de confiance", why1b: "Conditions claires avant d'accepter — sans surprise.",
    why2t: "Payé équitablement", why2b: "Vos heures proviennent de votre propre pointage.",
    why3t: "Aucune part de votre paie", why3b: "JobLop ne prend jamais de frais sur ce que vous gagnez.",
    ctaTitle: "Prêt pour votre prochain quart ?", ctaSub: "Que vous cherchiez du travail ou les bonnes personnes, JobLop est là pour vous aider.",
    ctaFind: "Trouver du travail", ctaPost: "Publier une demande",
    fTag: "Relier les gens aux occasions pour bâtir un avenir meilleur.",
    fSeekers: "Travailleurs", fEmp: "Employeurs", fCo: "Entreprise", fLegal: "Légal",
    fBrowse: "Parcourir les offres", fCreate: "Créer un compte", fAlerts: "Alertes d'emploi",
    fPost: "Publier une demande", fFind: "Trouver des travailleurs", fPricing: "Tarifs",
    fAbout: "À propos", fContact: "Contact", fCareers: "Carrières",
    fPrivacy: "Confidentialité", fTerms: "Conditions", fCookie: "Témoins",
    copyright: "JobLop. Un avenir meilleur, ensemble."
  }
} as const;

const EMPLOYER_URL = "http://localhost:3100"; // employer app (public "post a request" entry)

export function PublicJobBoard() {
  const [lang, setLang] = useState<Lang>("en");
  const [tab, setTab] = useState<"find" | "hire">("find");
  const [province, setProvince] = useState("");
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const gen = useRef(0);
  const t = T[lang];

  const load = useCallback(async () => {
    const mine = ++gen.current;
    setJobs(null);
    const params = new URLSearchParams();
    if (province) params.set("province", province);
    if (q.trim()) params.set("q", q.trim());
    params.set("limit", "24");
    try {
      const res = await fetch(`/api/public/jobs?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (mine === gen.current) setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch {
      if (mine === gen.current) setJobs([]);
    }
  }, [province, q]);

  useEffect(() => {
    const h = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(h);
  }, [load, q]);

  const scrollToJobs = () => document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth" });
  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric" }); }
    catch { return iso; }
  };
  const provinceCount = jobs ? new Set(jobs.map((j) => j.province).filter(Boolean)).size : 0;
  const jobCount = jobs ? jobs.length : null;

  return (
    <div className="jl">
      <style>{CSS}</style>

      {/* NAV */}
      <header className="jl-nav">
        <div className="jl-nav-in">
          <a href="/" className="jl-logo"><JobLopMark size={30} />Job<span>Lop</span></a>
          <nav className="jl-links">
            <a href="#jobs">{t.navJobs}</a>
            <a href={EMPLOYER_URL}>{t.navEmp}</a>
            <a href="#jobscanner">JobScanner</a>
            <a href="#about">{t.navAbout}</a>
          </nav>
          <div className="jl-nav-cta">
            <button className="jl-lang" onClick={() => setLang(lang === "en" ? "fr" : "en")}>{lang === "en" ? "FR" : "EN"}</button>
            <a href="/" className="jl-btn-ghost">{t.signin}</a>
            <a href="/" className="jl-btn-primary">{t.create}</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="jl-hero">
        <div className="jl-hero-in">
          <div className="jl-hero-copy">
            <span className="jl-free-pill">✓ {t.freePill}</span>
            <h1>{t.heroA}<br /><span className="jl-blue">{t.heroB}</span></h1>
            <p>{t.heroSub}</p>
            <div className="jl-tabs">
              <button className={tab === "find" ? "on" : ""} onClick={() => setTab("find")}>🔍 {t.tabFind}</button>
              <button className={tab === "hire" ? "on" : ""} onClick={() => setTab("hire")}>🧑‍💼 {t.tabHire}</button>
            </div>
            {tab === "find" ? (
              <form className="jl-search" onSubmit={(e) => { e.preventDefault(); scrollToJobs(); void load(); }}>
                <div className="jl-sf"><span>🔎</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.phRole} aria-label={t.phRole} /></div>
                <div className="jl-sf jl-sf-loc"><span>📍</span>
                  <select value={province} onChange={(e) => setProvince(e.target.value)} aria-label={t.phLoc}>
                    <option value="">{t.allCanada}</option>
                    {PROVINCES.map((p) => <option key={p.code} value={p.code}>{lang === "fr" ? p.fr : p.en}</option>)}
                  </select>
                </div>
                <button type="submit" className="jl-search-btn">{t.searchBtn}</button>
              </form>
            ) : (
              <a href={EMPLOYER_URL} className="jl-hire-cta">{t.empBtn} →</a>
            )}
            {tab === "find" && (
              <div className="jl-popular">
                <span>{t.popular}</span>
                {CATEGORIES.slice(0, 4).map((c) => (
                  <button key={c.q} onClick={() => { setQ(c.q); scrollToJobs(); }}>{lang === "fr" ? c.fr : c.en}</button>
                ))}
              </div>
            )}
            <a href="#jobscanner" className="jl-hero-js">{t.heroBadge} →</a>

            {/* Live search demo: real matches appear as the visitor types — proof of the deep search. */}
            {tab === "find" && (
              <div className="jl-preview">
                <div className="jl-preview-head">
                  <span className="jl-preview-dot" /> {t.previewLive}
                  {jobs !== null ? <span className="jl-preview-n">{jobs.length} {t.st1}</span> : null}
                </div>
                {jobs === null ? (
                  <div className="jl-preview-empty">{t.loading}</div>
                ) : jobs.length === 0 ? (
                  <div className="jl-preview-empty">{t.previewEmpty}</div>
                ) : (
                  <>
                    {jobs.slice(0, 3).map((j) => (
                      <a key={j.jobCode} href="/" className="jl-preview-row">
                        <span className="jl-preview-ic">{iconFor(j.role)}</span>
                        <span className="jl-preview-main"><strong>{j.role}</strong><em>📍 {j.areaLabel}</em></span>
                        {(j.urgency === "urgent" || j.urgency === "immediate") ? <span className="jl-preview-u">{t.urgent}</span> : null}
                      </a>
                    ))}
                    <a href="/" className="jl-preview-more">🔓 {t.previewMore} →</a>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="jl-hero-art" aria-hidden="true">
            <div className="jl-blob" />
            <div className="jl-fc jl-fc1"><div className="jl-fc-ic">🗂️</div><div><strong>{jobCount ?? "—"}</strong><span>{t.cStat1}</span></div></div>
            <div className="jl-fc jl-fc2"><div className="jl-fc-ic">🍁</div><div><strong>{t.cStat2}</strong></div></div>
            <div className="jl-fc jl-fc3"><div className="jl-fc-ic">📈</div><div><strong>{t.cBuild}</strong></div></div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="jl-sec">
        <div className="jl-wrap">
          <h2>{t.catTitle}</h2>
          <p className="jl-sub">{t.catSub}</p>
          <div className="jl-cats">
            {CATEGORIES.map((c) => (
              <button key={c.q} className="jl-cat" onClick={() => { setQ(c.q); scrollToJobs(); }}>
                <span className="jl-cat-ic" style={{ background: c.bg }}>{c.icon}</span>
                <strong>{lang === "fr" ? c.fr : c.en}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED / RESULTS (real data) */}
      <section className="jl-sec jl-sec-alt" id="jobs">
        <div className="jl-wrap">
          <div className="jl-row-head">
            <div><h2>{t.featTitle}</h2><p className="jl-sub">{t.featSub}</p></div>
            <button className="jl-link" onClick={() => { setQ(""); setProvince(""); }}>{t.viewAll}</button>
          </div>
          {jobs === null ? (
            <p className="jl-muted">{t.loading}</p>
          ) : jobs.length === 0 ? (
            <p className="jl-muted">{t.none}</p>
          ) : (
            <div className="jl-jobs">
              {jobs.map((j) => {
                const urgent = j.urgency === "urgent" || j.urgency === "immediate";
                return (
                  <div key={j.jobCode} className="jl-job">
                    <div className="jl-job-ic">{iconFor(j.role)}</div>
                    <div className="jl-job-main">
                      <strong>{j.role}</strong>
                      <span className="jl-job-meta">📍 {j.areaLabel} · {t.starts} {fmtDate(j.startAt)}</span>
                    </div>
                    <div className="jl-job-tags">
                      {urgent ? <span className="jl-tag jl-tag-u">{t.urgent}</span> : null}
                      <span className="jl-tag">{t.openings(j.openings)}</span>
                    </div>
                    <a href="/" className="jl-apply">{t.apply}</a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* JOBSCANNER */}
      <section className="jl-js" id="jobscanner">
        <div className="jl-wrap jl-js-in">
          <div className="jl-js-copy">
            <span className="jl-js-tag">📡 {t.jsTag}</span>
            <h2>{t.jsTitle}</h2>
            <p>{t.jsSub}</p>
            <a href="/job-scanner" className="jl-js-btn">{t.jsBtn} →</a>
          </div>
          <div className="jl-js-demo"><JobScannerDemo lang={lang} /></div>
        </div>
      </section>

      {/* FOR WORKERS */}
      <section className="jl-split jl-split-blue">
        <div className="jl-wrap jl-split-in">
          <div className="jl-split-copy">
            <span className="jl-eyebrow">{t.seekTag}</span>
            <h2>{t.seekTitle}</h2>
            <p>{t.seekSub}</p>
            <a href="/" className="jl-btn-primary jl-btn-lg">{t.seekBtn}</a>
            <ul className="jl-checks">
              <li>✓ {t.seek1}</li><li>✓ {t.seek2}</li><li>✓ {t.seek3}</li>
            </ul>
          </div>
          <div className="jl-split-card">
            <div className="jl-mini"><span>🎯</span> {lang === "fr" ? "Jumelage pour vous" : "Matches just for you"}</div>
            <ul className="jl-mini-list">
              <li>✓ {lang === "fr" ? "Créer un profil" : "Create profile"}</li>
              <li>✓ {lang === "fr" ? "Être jumelé" : "Get matched"}</li>
              <li>✓ {lang === "fr" ? "Postuler" : "Apply to shifts"}</li>
              <li>○ {lang === "fr" ? "Commencer" : "Get hired"}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FOR EMPLOYERS */}
      <section className="jl-split jl-split-peach">
        <div className="jl-wrap jl-split-in">
          <div className="jl-split-copy">
            <span className="jl-eyebrow jl-eyebrow-o">{t.empTag}</span>
            <h2>{t.empTitle}</h2>
            <p>{t.empSub}</p>
            <a href={EMPLOYER_URL} className="jl-btn-orange jl-btn-lg">{t.empBtn}</a>
            <ul className="jl-checks jl-checks-o">
              <li>✓ {t.emp1}</li><li>✓ {t.emp2}</li><li>✓ {t.emp3}</li>
            </ul>
          </div>
          <div className="jl-split-card">
            <div className="jl-mini"><span>👥</span> {lang === "fr" ? "Travailleurs qualifiés" : "Qualified workers"}</div>
            <div className="jl-avatars">{["🧑‍⚕️","👨‍🍳","🧹","🔧","🧑‍⚕️"].map((a, i) => <span key={i}>{a}</span>)}</div>
            <div className="jl-mini jl-mini-2"><span>📊</span> {lang === "fr" ? "Couverture fiable" : "Coverage you can count on"}</div>
          </div>
        </div>
      </section>

      {/* TRUST (honest) + STATS */}
      <section className="jl-sec" id="about">
        <div className="jl-wrap jl-center">
          <h2>{t.trustTitle}</h2>
          <p className="jl-sub">{t.trustSub}</p>
          <div className="jl-stats">
            <div><strong>{jobCount ?? "—"}</strong><span>{t.st1}</span></div>
            <div><strong>{provinceCount || "—"}</strong><span>{t.st2}</span></div>
            <div><strong>$0</strong><span>{t.st3}</span></div>
            <div><strong>$0</strong><span>{t.st4}</span></div>
          </div>
        </div>
      </section>

      {/* WHY (replaces fabricated testimonials) */}
      <section className="jl-sec jl-sec-alt" id="why">
        <div className="jl-wrap jl-center">
          <h2>{t.whyTitle}</h2>
          <div className="jl-why">
            <div className="jl-why-c"><div className="jl-why-ic">🤝</div><h4>{t.why1t}</h4><p>{t.why1b}</p></div>
            <div className="jl-why-c"><div className="jl-why-ic">⏱️</div><h4>{t.why2t}</h4><p>{t.why2b}</p></div>
            <div className="jl-why-c"><div className="jl-why-ic">🚫</div><h4>{t.why3t}</h4><p>{t.why3b}</p></div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="jl-cta">
        <div className="jl-wrap jl-center">
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaSub}</p>
          <div className="jl-cta-btns">
            <a href="/" className="jl-cta-white">{t.ctaFind}</a>
            <a href={EMPLOYER_URL} className="jl-cta-outline">{t.ctaPost}</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="jl-foot">
        <div className="jl-wrap jl-foot-in">
          <div className="jl-foot-brand">
            <a href="/" className="jl-logo jl-logo-w"><JobLopMark size={30} />Job<span>Lop</span></a>
            <p>{t.fTag}</p>
          </div>
          <div className="jl-foot-cols">
            <div><h5>{t.fSeekers}</h5><a href="#jobs">{t.fBrowse}</a><a href="/">{t.fCreate}</a><a href="#jobs">{t.fAlerts}</a></div>
            <div><h5>{t.fEmp}</h5><a href={EMPLOYER_URL}>{t.fPost}</a><a href={EMPLOYER_URL}>{t.fFind}</a><a href={EMPLOYER_URL}>{t.fPricing}</a></div>
            <div><h5>{t.fCo}</h5><a href="#about">{t.fAbout}</a><a href="#about">{t.fContact}</a><a href="#about">{t.fCareers}</a></div>
            <div><h5>{t.fLegal}</h5><a href="/privacy">{t.fPrivacy}</a><a href="/privacy">{t.fTerms}</a><a href="/privacy">{t.fCookie}</a></div>
          </div>
        </div>
        <div className="jl-foot-bar">© {new Date().getFullYear()} {t.copyright}</div>
      </footer>
    </div>
  );
}

// JobLop brand mark — the app icon recreated as a crisp, scalable SVG: blue rounded-square badge,
// a white briefcase whose body sweeps into a "J", and an upward arrow (growth).
function JobLopMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ flex: "0 0 auto", display: "block" }}>
      <defs>
        <linearGradient id="jlbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b6cf0" />
          <stop offset="1" stopColor="#1546c8" />
        </linearGradient>
        <linearGradient id="jlar" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2b6cf0" />
          <stop offset="1" stopColor="#58c6ff" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#jlbg)" />
      {/* briefcase handle */}
      <path d="M26 17a6 6 0 0 1 12 0v4h-4v-4a2 2 0 0 0-4 0v4h-4z" fill="#fff" />
      {/* briefcase + J body */}
      <path d="M21 23h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6v-6h-4v14a9 9 0 0 1-18 0 3 3 0 0 1 6 0 3 3 0 0 0 6 0V25a2 2 0 0 1 2-2z" fill="#fff" />
      {/* clasp */}
      <rect x="34" y="28" width="7" height="6" rx="2" fill="#2b6cf0" />
      {/* upward arrow */}
      <path d="M24 48c6-1 12-6 16-12l3 3 2-11-11 2 3 3c-3 5-9 10-16 11z" fill="url(#jlar)" />
    </svg>
  );
}

function iconFor(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("nurse")) return "🩺";
  if (r.includes("support") || r.includes("psw") || r.includes("préposé")) return "🧑‍⚕️";
  if (r.includes("chef")) return "👨‍🍳";
  if (r.includes("cook") || r.includes("kitchen") || r.includes("cuisin")) return "🍳";
  if (r.includes("house") || r.includes("clean") || r.includes("ménag")) return "🧹";
  if (r.includes("dining") || r.includes("salle")) return "🍽️";
  if (r.includes("maint")) return "🔧";
  return "💼";
}

const CSS = `
.jl{--ink:#101a2b;--muted:#5a6a82;--line:#e7ecf4;--blue:#2563eb;--blue2:#1d4ed8;--sky:#eef4ff;--orange:#f97316;--peach:#fff2e8;--navy:#0f1b2d;--bg:#fff;
  color:var(--ink);background:var(--bg);min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.45;}
.jl *{box-sizing:border-box;}
.jl a{color:inherit;text-decoration:none;}
.jl h2{font-size:clamp(23px,3.4vw,33px);letter-spacing:-.02em;margin:0 0 8px;font-weight:800;text-wrap:balance;}
.jl .jl-sub{color:var(--muted);margin:0 0 26px;font-size:15.5px;}
.jl-wrap{max-width:1120px;margin:0 auto;padding:0 max(18px,env(safe-area-inset-left)) 0 max(18px,env(safe-area-inset-right));}
.jl-center{text-align:center;}
.jl-muted{color:var(--muted);}
/* NAV */
.jl-nav{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);}
.jl-nav-in{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:18px;padding:12px max(18px,env(safe-area-inset-left));}
.jl-logo{display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:21px;color:var(--ink);letter-spacing:-.02em;}
.jl-logo span{color:var(--blue);}
.jl-links{display:flex;gap:22px;margin-left:12px;}
.jl-links a{color:var(--muted);font-weight:600;font-size:14.5px;}
.jl-links a:hover{color:var(--ink);}
.jl-nav-cta{margin-left:auto;display:flex;align-items:center;gap:10px;}
.jl-lang{border:1px solid var(--line);background:#fff;border-radius:8px;padding:7px 11px;font-weight:700;font-size:13px;cursor:pointer;color:var(--ink);}
.jl-btn-ghost{border:1px solid var(--line);padding:9px 16px;border-radius:9px;font-weight:700;font-size:14px;}
.jl-btn-ghost:hover{background:#f6f8fc;}
.jl-btn-primary{background:var(--blue);color:#fff;padding:9px 17px;border-radius:9px;font-weight:700;font-size:14px;}
.jl-btn-primary:hover{background:var(--blue2);}
.jl-btn-lg{display:inline-block;padding:13px 24px;font-size:15.5px;border-radius:11px;}
/* HERO */
.jl-hero{background:radial-gradient(900px 420px at 85% -5%,rgba(37,99,235,.14),transparent),linear-gradient(180deg,var(--sky),#fff);border-bottom:1px solid var(--line);}
.jl-hero-in{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:center;padding:clamp(34px,6vw,64px) max(18px,env(safe-area-inset-left));}
.jl-free-pill{display:inline-block;background:#e7f9ef;color:#0a7a46;font-weight:800;font-size:12.5px;letter-spacing:.02em;padding:6px 13px;border-radius:999px;margin-bottom:14px;}
.jl-hero-js{display:inline-flex;align-items:center;gap:6px;margin-top:16px;background:linear-gradient(90deg,#0f1b3a,#13224a);color:#dbf1ff;font-weight:700;font-size:13px;padding:9px 15px;border-radius:999px;border:1px solid rgba(88,198,255,.3);}
.jl-hero-js:hover{filter:brightness(1.12);}
.jl-hero-copy h1{font-size:clamp(32px,5.2vw,52px);line-height:1.04;letter-spacing:-.03em;margin:0 0 14px;font-weight:800;}
.jl-blue{color:var(--blue);}
.jl-hero-copy>p{color:var(--muted);font-size:clamp(15px,1.9vw,18px);max-width:520px;margin:0 0 20px;}
.jl-tabs{display:inline-flex;gap:4px;background:#fff;border:1px solid var(--line);border-radius:11px;padding:4px;margin-bottom:12px;}
.jl-tabs button{border:0;background:transparent;padding:9px 16px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;color:var(--muted);}
.jl-tabs button.on{background:var(--sky);color:var(--blue);}
.jl-search{display:flex;gap:8px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:14px;padding:7px;box-shadow:0 14px 40px -22px rgba(16,26,43,.4);max-width:560px;}
.jl-sf{display:flex;align-items:center;gap:8px;background:#f3f6fb;border-radius:10px;padding:0 12px;flex:1 1 190px;min-width:0;}
.jl-sf-loc{flex:0 0 auto;}
.jl-sf span{opacity:.65;font-size:14px;}
.jl-sf input,.jl-sf select{border:0;background:transparent;outline:none;font-size:15px;color:var(--ink);padding:12px 2px;width:100%;min-width:0;font-family:inherit;}
.jl-sf select{cursor:pointer;}
.jl-search-btn{border:0;background:var(--blue);color:#fff;font-weight:700;font-size:14.5px;border-radius:10px;padding:0 22px;min-height:46px;cursor:pointer;flex:0 0 auto;}
.jl-search-btn:hover{background:var(--blue2);}
.jl-hire-cta{display:inline-block;background:var(--orange);color:#fff;font-weight:700;padding:14px 24px;border-radius:12px;}
.jl-popular{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:16px;font-size:13px;}
.jl-popular span{color:var(--muted);font-weight:700;}
.jl-popular button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer;color:var(--muted);}
.jl-popular button:hover{border-color:var(--blue);color:var(--blue);}
.jl-preview{margin-top:16px;max-width:560px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:8px;box-shadow:0 14px 40px -24px rgba(16,26,43,.4);}
.jl-preview-head{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.03em;color:var(--muted);padding:6px 8px 8px;text-transform:uppercase;}
.jl-preview-dot{width:8px;height:8px;border-radius:50%;background:#1fbf6b;box-shadow:0 0 0 0 rgba(31,191,107,.5);animation:jlpulse 1.8s infinite;}
@keyframes jlpulse{0%{box-shadow:0 0 0 0 rgba(31,191,107,.5);}70%{box-shadow:0 0 0 7px rgba(31,191,107,0);}100%{box-shadow:0 0 0 0 rgba(31,191,107,0);}}
.jl-preview-n{margin-left:auto;color:var(--blue);}
.jl-preview-empty{padding:10px 8px 12px;color:var(--muted);font-size:13.5px;}
.jl-preview-row{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:9px;}
.jl-preview-row:hover{background:#f3f6fb;}
.jl-preview-ic{width:34px;height:34px;border-radius:9px;background:var(--sky);display:grid;place-items:center;font-size:17px;flex:0 0 auto;}
.jl-preview-main{display:flex;flex-direction:column;min-width:0;flex:1;}
.jl-preview-main strong{font-size:14px;}
.jl-preview-main em{font-style:normal;color:var(--muted);font-size:12.5px;}
.jl-preview-u{background:#fdece5;color:var(--orange);font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:999px;text-transform:uppercase;flex:0 0 auto;}
.jl-preview-more{display:block;text-align:center;margin-top:4px;background:linear-gradient(90deg,#0f1b3a,#13224a);color:#dbf1ff;font-weight:700;font-size:13px;padding:11px;border-radius:10px;}
.jl-preview-more:hover{filter:brightness(1.12);}
.jl-hero-art{position:relative;min-height:300px;display:flex;align-items:center;justify-content:center;}
.jl-blob{position:absolute;inset:8% 6%;background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(14,165,163,.16));border-radius:44% 56% 62% 38%/48% 42% 58% 52%;filter:blur(2px);}
.jl-fc{position:absolute;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 16px;box-shadow:0 18px 48px -24px rgba(16,26,43,.55);display:flex;align-items:center;gap:10px;}
.jl-fc-ic{width:36px;height:36px;border-radius:9px;background:var(--sky);display:grid;place-items:center;font-size:18px;}
.jl-fc strong{display:block;font-size:17px;font-weight:800;letter-spacing:-.01em;}
.jl-fc span{font-size:12px;color:var(--muted);}
.jl-fc1{top:8%;left:2%;}
.jl-fc2{top:44%;right:0;}
.jl-fc3{bottom:10%;left:12%;}
/* SECTIONS */
.jl-sec{padding:clamp(34px,5.5vw,64px) 0;}
.jl-sec-alt{background:#f7f9fc;}
.jl-row-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px;}
.jl-row-head h2,.jl-row-head p{margin:0;}
.jl-link{border:0;background:transparent;color:var(--blue);font-weight:700;font-size:14.5px;cursor:pointer;}
/* CATEGORIES */
.jl-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;}
.jl-cat{display:flex;flex-direction:column;gap:12px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;cursor:pointer;text-align:left;transition:transform .12s,box-shadow .12s,border-color .12s;}
.jl-cat:hover{transform:translateY(-2px);box-shadow:0 16px 36px -22px rgba(16,26,43,.4);border-color:#cfdaec;}
.jl-cat-ic{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;font-size:24px;}
.jl-cat strong{font-size:14.5px;}
/* JOBS */
.jl-jobs{display:flex;flex-direction:column;gap:10px;}
.jl-job{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--line);border-radius:13px;padding:14px 16px;transition:box-shadow .12s,border-color .12s;flex-wrap:wrap;}
.jl-job:hover{box-shadow:0 14px 34px -24px rgba(16,26,43,.45);border-color:#cfdaec;}
.jl-job-ic{width:44px;height:44px;border-radius:11px;background:var(--sky);display:grid;place-items:center;font-size:21px;flex:0 0 auto;}
.jl-job-main{display:flex;flex-direction:column;gap:3px;min-width:140px;flex:1 1 200px;}
.jl-job-main strong{font-size:15.5px;}
.jl-job-meta{color:var(--muted);font-size:13px;}
.jl-job-tags{display:flex;gap:7px;flex-wrap:wrap;}
.jl-tag{background:#eef3fb;color:#1f4e8f;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;}
.jl-tag-u{background:#fdece5;color:var(--orange);}
.jl-apply{background:var(--blue);color:#fff;font-weight:700;font-size:13.5px;padding:9px 16px;border-radius:9px;flex:0 0 auto;}
.jl-apply:hover{background:var(--blue2);}
/* SPLIT (workers / employers) */
.jl-split{padding:clamp(30px,5vw,56px) 0;}
.jl-split-blue{background:var(--sky);}
.jl-split-peach{background:var(--peach);}
.jl-split-in{display:grid;grid-template-columns:1.05fr .95fr;gap:28px;align-items:center;}
.jl-eyebrow{font-size:12px;font-weight:800;letter-spacing:.08em;color:var(--blue);}
.jl-eyebrow-o{color:var(--orange);}
.jl-split-copy h2{margin:10px 0;}
.jl-split-copy>p{color:var(--muted);max-width:440px;margin:0 0 18px;}
.jl-checks{list-style:none;padding:0;margin:18px 0 0;display:flex;flex-direction:column;gap:9px;color:var(--ink);font-weight:600;font-size:14.5px;}
.jl-checks li::marker{content:"";}
.jl-checks-o li{color:var(--ink);}
.jl-btn-orange{background:var(--orange);color:#fff;font-weight:700;border-radius:11px;}
.jl-btn-orange:hover{background:#ea6a0f;}
.jl-split-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:0 24px 60px -34px rgba(16,26,43,.5);display:flex;flex-direction:column;gap:14px;}
.jl-mini{display:flex;align-items:center;gap:9px;font-weight:700;font-size:14.5px;}
.jl-mini span{font-size:18px;}
.jl-mini-2{color:var(--muted);}
.jl-mini-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;color:var(--muted);font-size:14px;}
.jl-avatars{display:flex;gap:6px;}
.jl-avatars span{width:38px;height:38px;border-radius:50%;background:var(--sky);display:grid;place-items:center;font-size:19px;border:2px solid #fff;}
/* JOBSCANNER */
.jl-js{padding:clamp(32px,5vw,58px) 0;}
.jl-js-in{background:radial-gradient(600px 300px at 12% 0%,rgba(88,198,255,.22),transparent),linear-gradient(120deg,#0f1b3a,#13224a 55%,#0a2f3a);
  border-radius:22px;padding:clamp(28px,5vw,44px);color:#eaf1ff;display:grid;grid-template-columns:1.05fr .95fr;gap:28px;align-items:center;
  margin-left:max(18px,env(safe-area-inset-left));margin-right:max(18px,env(safe-area-inset-right));}
.jl-js-tag{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.09em;color:#7fd3ff;background:rgba(127,211,255,.12);padding:5px 11px;border-radius:999px;}
.jl-js-copy h2{color:#fff;margin:12px 0 10px;}
.jl-js-copy>p{color:#b9c9e6;max-width:460px;margin:0 0 20px;}
.jl-js-btn{display:inline-block;background:linear-gradient(90deg,#2b6cf0,#58c6ff);color:#06122b;font-weight:800;padding:13px 22px;border-radius:12px;}
.jl-js-btn:hover{filter:brightness(1.06);}
.jl-js-demo{display:flex;justify-content:center;}
.jl-js-feats{display:flex;flex-direction:column;gap:12px;}
.jl-js-feat{display:flex;gap:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:13px;padding:15px;}
.jl-js-feat span{font-size:22px;}
.jl-js-feat strong{display:block;font-size:15px;color:#fff;}
.jl-js-feat p{margin:3px 0 0;color:#aebfdd;font-size:13.5px;}
/* STATS */
.jl-stats{display:flex;gap:34px;flex-wrap:wrap;justify-content:center;margin-top:26px;}
.jl-stats div{display:flex;flex-direction:column;align-items:center;}
.jl-stats strong{font-size:30px;font-weight:800;color:var(--blue);letter-spacing:-.02em;}
.jl-stats span{font-size:12.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;}
/* WHY */
.jl-why{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-top:22px;text-align:left;}
.jl-why-c{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;}
.jl-why-ic{font-size:24px;}
.jl-why-c h4{margin:10px 0 6px;font-size:16.5px;}
.jl-why-c p{margin:0;color:var(--muted);font-size:14.5px;}
/* CTA */
.jl-cta{padding:clamp(30px,5vw,56px) 0;}
.jl-cta .jl-wrap{background:linear-gradient(120deg,#1d4ed8,#2563eb 55%,#0ea5a3);border-radius:22px;padding:clamp(32px,6vw,54px) 24px;color:#fff;}
.jl-cta h2{color:#fff;}
.jl-cta p{opacity:.92;max-width:520px;margin:0 auto 20px;}
.jl-cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}
.jl-cta-white{background:#fff;color:#13224a;font-weight:800;padding:13px 26px;border-radius:11px;}
.jl-cta-outline{border:1.5px solid rgba(255,255,255,.7);color:#fff;font-weight:800;padding:13px 26px;border-radius:11px;}
.jl-cta-outline:hover{background:rgba(255,255,255,.12);}
/* FOOTER */
.jl-foot{background:var(--navy);color:#c6d2e4;padding:clamp(32px,5vw,52px) 0 0;}
.jl-foot-in{display:grid;grid-template-columns:1.2fr 2fr;gap:28px;padding-bottom:28px;}
.jl-logo-w{color:#fff;}
.jl-foot-brand p{color:#8da2c0;font-size:14px;max-width:280px;margin:12px 0 0;}
.jl-foot-cols{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;}
.jl-foot-cols h5{color:#fff;font-size:13.5px;margin:0 0 12px;}
.jl-foot-cols a{display:block;color:#9fb2cd;font-size:13.5px;margin-bottom:9px;}
.jl-foot-cols a:hover{color:#fff;}
.jl-foot-bar{border-top:1px solid #1e2d44;padding:18px max(18px,env(safe-area-inset-left));text-align:center;color:#7f93b2;font-size:13px;max-width:1120px;margin:0 auto;}
/* RESPONSIVE */
@media (max-width:860px){
  .jl-hero-in,.jl-split-in,.jl-foot-in,.jl-js-in{grid-template-columns:1fr;}
  /* floating cards flow as a neat wrapping row above the copy — no absolute overlap on phones */
  .jl-hero-art{min-height:auto;order:-1;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:4px;}
  .jl-blob{display:none;}
  .jl-fc{position:static;flex:0 1 auto;}
  .jl-fc2 strong,.jl-fc3 strong{font-size:13px;}
  .jl-links{display:none;}
  .jl-foot-cols{grid-template-columns:repeat(2,1fr);}
}
@media (max-width:520px){
  .jl-sf,.jl-sf-loc,.jl-search-btn{flex:1 1 100%;}
  .jl-nav-cta .jl-btn-ghost{display:none;}
}
@media (prefers-color-scheme:dark){
  .jl{--ink:#eef3fb;--muted:#9fb0c9;--line:#243247;--sky:#111f38;--peach:#241a12;--bg:#0b1322;}
  .jl-nav{background:rgba(11,19,34,.9);}
  .jl-lang,.jl-btn-ghost,.jl-cat,.jl-job,.jl-why-c,.jl-split-card,.jl-search,.jl-tabs{background:#111c30;}
  .jl-sf{background:#0e1829;}
  .jl-sec-alt{background:#0e1627;}
  .jl-fc{background:#111c30;}
  .jl-tag{background:#13244a;color:#9ec1ff;}
  .jl-hero{background:radial-gradient(900px 420px at 85% -5%,rgba(37,99,235,.22),transparent),linear-gradient(180deg,#0e1829,var(--bg));}
}
`;
