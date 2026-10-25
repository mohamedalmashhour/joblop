"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Public, no-sign-in landing + job board: browse JobLop's open offers across all of Canada, filter by
// province, search by city/role. Area-level only (city + province) — no exact address, client, or pay.
// A funnel front door: hero search, trust cues, live job grid, and sign-up CTAs. Bilingual (Bill 96).

type Job = {
  jobCode: string;
  role: string;
  city: string | null;
  province: string | null;
  areaLabel: string;
  openings: number;
  startAt: string;
  urgency: string;
};
type Lang = "en" | "fr";

const PROVINCES: { code: string; en: string; fr: string }[] = [
  { code: "AB", en: "Alberta", fr: "Alberta" },
  { code: "BC", en: "British Columbia", fr: "Colombie-Britannique" },
  { code: "MB", en: "Manitoba", fr: "Manitoba" },
  { code: "NB", en: "New Brunswick", fr: "Nouveau-Brunswick" },
  { code: "NL", en: "Newfoundland and Labrador", fr: "Terre-Neuve-et-Labrador" },
  { code: "NS", en: "Nova Scotia", fr: "Nouvelle-Écosse" },
  { code: "NT", en: "Northwest Territories", fr: "Territoires du Nord-Ouest" },
  { code: "NU", en: "Nunavut", fr: "Nunavut" },
  { code: "ON", en: "Ontario", fr: "Ontario" },
  { code: "PE", en: "Prince Edward Island", fr: "Île-du-Prince-Édouard" },
  { code: "QC", en: "Quebec", fr: "Québec" },
  { code: "SK", en: "Saskatchewan", fr: "Saskatchewan" },
  { code: "YT", en: "Yukon", fr: "Yukon" }
];

const T = {
  en: {
    nav: "How it works", signin: "Sign in",
    heroTitle: "Real work near you,", heroTitle2: "right across Canada.",
    heroSub: "Browse thousands of open shifts at trusted employers — free, and without an account. Sign up only when you're ready to apply.",
    allCanada: "All of Canada", searchPh: "Search city or role — e.g. Montréal, nurse, cook",
    searchBtn: "Search jobs",
    trust1: "Free to browse", trust2: "No account needed", trust3: "Every province",
    statJobs: "open jobs", statProvinces: "provinces hiring", statFree: "to apply",
    openings: (n: number) => `${n} opening${n === 1 ? "" : "s"}`, urgent: "Urgent",
    starts: "Starts", apply: "Sign up to apply",
    none: "No open jobs match your search right now. Try another province or clear the search.",
    loading: "Finding jobs…", resultsIn: (p: string) => `Open jobs in ${p}`, resultsAll: "Open jobs across Canada",
    ctaTitle: "Ready to start earning?", ctaSub: "Create a free account to apply, get matched to shifts, and have your hours recorded fairly.",
    ctaBtn: "Create free account", why1t: "Trusted employers", why1b: "Verified workplaces, clear terms before you accept.",
    why2t: "Get paid fairly", why2b: "Your hours come from your own clock-in / clock-out.", why3t: "No fees, ever", why3b: "JobLop never takes a cut of your pay.",
    footer: "Workforce & staffing across Canada."
  },
  fr: {
    nav: "Comment ça marche", signin: "Se connecter",
    heroTitle: "Du vrai travail près de chez vous,", heroTitle2: "partout au Canada.",
    heroSub: "Parcourez des milliers de quarts ouverts chez des employeurs de confiance — gratuitement et sans compte. Inscrivez-vous seulement pour postuler.",
    allCanada: "Tout le Canada", searchPh: "Ville ou rôle — p. ex. Montréal, infirmière, cuisinier",
    searchBtn: "Rechercher",
    trust1: "Gratuit à consulter", trust2: "Aucun compte requis", trust3: "Toutes les provinces",
    statJobs: "offres ouvertes", statProvinces: "provinces qui embauchent", statFree: "pour postuler",
    openings: (n: number) => `${n} poste${n === 1 ? "" : "s"}`, urgent: "Urgent",
    starts: "Début", apply: "Inscrivez-vous pour postuler",
    none: "Aucune offre ne correspond à votre recherche. Essayez une autre province ou effacez la recherche.",
    loading: "Recherche en cours…", resultsIn: (p: string) => `Offres ouvertes — ${p}`, resultsAll: "Offres ouvertes partout au Canada",
    ctaTitle: "Prêt à commencer à gagner ?", ctaSub: "Créez un compte gratuit pour postuler, être jumelé à des quarts et faire enregistrer vos heures équitablement.",
    ctaBtn: "Créer un compte gratuit", why1t: "Employeurs de confiance", why1b: "Milieux vérifiés, conditions claires avant d'accepter.",
    why2t: "Payé équitablement", why2b: "Vos heures proviennent de votre propre pointage.", why3t: "Jamais de frais", why3b: "JobLop ne prend aucune part de votre paie.",
    footer: "Main-d'œuvre et dotation partout au Canada."
  }
} as const;

export function PublicJobBoard() {
  const [lang, setLang] = useState<Lang>("en");
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
    params.set("limit", "60");
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

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric" });
    } catch { return iso; }
  };

  const provinceName = province ? (PROVINCES.find((p) => p.code === province)?.[lang] ?? province) : null;
  const provinceCount = jobs ? new Set(jobs.map((j) => j.province).filter(Boolean)).size : 0;

  return (
    <div className="pjb">
      <style>{CSS}</style>

      <header className="pjb-nav">
        <a href="/" className="pjb-logo">JobLop</a>
        <nav className="pjb-navlinks">
          <a href="#how">{t.nav}</a>
          <button className="pjb-lang" onClick={() => setLang(lang === "en" ? "fr" : "en")}>{lang === "en" ? "FR" : "EN"}</button>
          <a href="/" className="pjb-signin">{t.signin}</a>
        </nav>
      </header>

      <section className="pjb-hero">
        <div className="pjb-hero-inner">
          <h1>{t.heroTitle}<br /><span className="pjb-grad">{t.heroTitle2}</span></h1>
          <p className="pjb-hero-sub">{t.heroSub}</p>

          <form className="pjb-search" onSubmit={(e) => { e.preventDefault(); void load(); }}>
            <div className="pjb-field pjb-field-prov">
              <span className="pjb-field-ic" aria-hidden="true">📍</span>
              <select aria-label={t.allCanada} value={province} onChange={(e) => setProvince(e.target.value)}>
                <option value="">{t.allCanada}</option>
                {PROVINCES.map((p) => <option key={p.code} value={p.code}>{lang === "fr" ? p.fr : p.en}</option>)}
              </select>
            </div>
            <div className="pjb-field pjb-field-q">
              <span className="pjb-field-ic" aria-hidden="true">🔍</span>
              <input aria-label={t.searchPh} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh} />
            </div>
            <button type="submit" className="pjb-search-btn">{t.searchBtn}</button>
          </form>

          <div className="pjb-trust">
            <span>✓ {t.trust1}</span><span>✓ {t.trust2}</span><span>✓ {t.trust3}</span>
          </div>

          <div className="pjb-stats">
            <div><strong>{jobs ? jobs.length : "—"}</strong><span>{t.statJobs}</span></div>
            <div><strong>{provinceCount || "—"}</strong><span>{t.statProvinces}</span></div>
            <div><strong>$0</strong><span>{t.statFree}</span></div>
          </div>
        </div>
      </section>

      <main className="pjb-main">
        <h2 className="pjb-results-title">{provinceName ? t.resultsIn(provinceName) : t.resultsAll}</h2>
        {jobs === null ? (
          <p className="pjb-muted">{t.loading}</p>
        ) : jobs.length === 0 ? (
          <p className="pjb-muted">{t.none}</p>
        ) : (
          <div className="pjb-grid">
            {jobs.map((j) => {
              const urgent = j.urgency === "urgent" || j.urgency === "immediate";
              return (
                <article key={j.jobCode} className="pjb-card">
                  <div className="pjb-card-top">
                    <h3>{j.role}</h3>
                    {urgent ? <span className="pjb-badge">{t.urgent}</span> : null}
                  </div>
                  <div className="pjb-card-loc">📍 {j.areaLabel}</div>
                  <div className="pjb-card-chips">
                    <span>{t.openings(j.openings)}</span>
                    <span>{t.starts} {fmtDate(j.startAt)}</span>
                  </div>
                  <a href="/" className="pjb-card-cta">{t.apply}</a>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <section id="how" className="pjb-why">
        <div className="pjb-why-inner">
          <div className="pjb-why-card"><div className="pjb-why-ic">🤝</div><h4>{t.why1t}</h4><p>{t.why1b}</p></div>
          <div className="pjb-why-card"><div className="pjb-why-ic">⏱️</div><h4>{t.why2t}</h4><p>{t.why2b}</p></div>
          <div className="pjb-why-card"><div className="pjb-why-ic">🚫</div><h4>{t.why3t}</h4><p>{t.why3b}</p></div>
        </div>
      </section>

      <section className="pjb-cta">
        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaSub}</p>
        <a href="/" className="pjb-cta-btn">{t.ctaBtn}</a>
      </section>

      <footer className="pjb-footer">
        <strong>JobLop</strong><span>{t.footer}</span>
      </footer>
    </div>
  );
}

const CSS = `
.pjb{--ink:#0f1b2d;--muted:#5c6b82;--line:#e6ebf3;--brand:#2b5fd9;--brand2:#0ea5a3;--urgent:#e8562a;--bg:#f7f9fc;
  color:var(--ink);background:var(--bg);min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
.pjb *{box-sizing:border-box;}
.pjb a{color:inherit;}
.pjb-nav{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:16px;background:rgba(255,255,255,.9);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);
  padding:12px max(16px,env(safe-area-inset-left)) 12px max(16px,env(safe-area-inset-right));}
.pjb-logo{font-weight:800;font-size:20px;color:var(--brand);text-decoration:none;letter-spacing:-.02em;}
.pjb-navlinks{margin-left:auto;display:flex;align-items:center;gap:14px;}
.pjb-navlinks a{text-decoration:none;font-weight:600;font-size:14px;color:var(--muted);}
.pjb-navlinks a:hover{color:var(--ink);}
.pjb-lang{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 11px;font-size:13px;font-weight:700;cursor:pointer;color:var(--ink);}
.pjb-signin{background:var(--ink)!important;color:#fff!important;padding:8px 16px;border-radius:9px;}
.pjb-hero{background:radial-gradient(1200px 500px at 50% -10%,rgba(43,95,217,.16),transparent),linear-gradient(180deg,#fff,var(--bg));
  padding:clamp(40px,8vw,84px) max(16px,env(safe-area-inset-left)) clamp(28px,5vw,48px) max(16px,env(safe-area-inset-right));border-bottom:1px solid var(--line);}
.pjb-hero-inner{max-width:880px;margin:0 auto;text-align:center;}
.pjb-hero h1{font-size:clamp(30px,6vw,56px);line-height:1.05;letter-spacing:-.03em;margin:0 0 16px;text-wrap:balance;font-weight:800;}
.pjb-grad{background:linear-gradient(90deg,var(--brand),var(--brand2));-webkit-background-clip:text;background-clip:text;color:transparent;}
.pjb-hero-sub{font-size:clamp(16px,2.2vw,19px);color:var(--muted);max-width:620px;margin:0 auto 28px;line-height:1.5;}
.pjb-search{display:flex;gap:8px;flex-wrap:wrap;max-width:720px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:16px;padding:8px;box-shadow:0 12px 40px -18px rgba(15,27,45,.35);}
.pjb-field{display:flex;align-items:center;gap:8px;background:#f2f5fa;border-radius:11px;padding:0 12px;min-width:0;}
.pjb-field-prov{flex:0 0 auto;}
.pjb-field-q{flex:1 1 220px;}
.pjb-field-ic{font-size:14px;opacity:.7;}
.pjb-field select,.pjb-field input{border:0;background:transparent;outline:none;font-size:15px;color:var(--ink);padding:13px 2px;min-width:0;width:100%;font-family:inherit;}
.pjb-field select{cursor:pointer;}
.pjb-search-btn{flex:0 0 auto;border:0;background:var(--brand);color:#fff;font-weight:700;font-size:15px;border-radius:11px;padding:0 22px;cursor:pointer;min-height:48px;}
.pjb-search-btn:hover{background:#2250c0;}
.pjb-trust{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;margin:18px 0 6px;color:var(--muted);font-size:13.5px;font-weight:600;}
.pjb-stats{display:flex;gap:28px;flex-wrap:wrap;justify-content:center;margin-top:22px;}
.pjb-stats div{display:flex;flex-direction:column;align-items:center;}
.pjb-stats strong{font-size:26px;font-weight:800;color:var(--ink);letter-spacing:-.02em;}
.pjb-stats span{font-size:12.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;}
.pjb-main{max-width:1060px;margin:0 auto;padding:clamp(28px,5vw,44px) max(16px,env(safe-area-inset-left)) 12px max(16px,env(safe-area-inset-right));}
.pjb-results-title{font-size:clamp(18px,3vw,24px);margin:0 0 18px;letter-spacing:-.02em;}
.pjb-muted{color:var(--muted);}
.pjb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:14px;}
.pjb-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:9px;min-width:0;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;}
.pjb-card:hover{transform:translateY(-2px);box-shadow:0 14px 34px -20px rgba(15,27,45,.45);border-color:#cfdaec;}
.pjb-card-top{display:flex;align-items:center;gap:8px;}
.pjb-card-top h3{font-size:16.5px;margin:0;letter-spacing:-.01em;}
.pjb-badge{margin-left:auto;background:var(--urgent);color:#fff;font-size:10.5px;font-weight:800;letter-spacing:.03em;padding:3px 9px;border-radius:999px;text-transform:uppercase;}
.pjb-card-loc{color:var(--muted);font-size:14px;}
.pjb-card-chips{display:flex;gap:7px;flex-wrap:wrap;}
.pjb-card-chips span{background:#eef3fb;color:#1f4e8f;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;}
.pjb-card-cta{margin-top:6px;text-align:center;background:#fff;border:1.5px solid var(--brand);color:var(--brand);text-decoration:none;font-weight:700;font-size:14px;padding:10px;border-radius:10px;transition:background .12s,color .12s;}
.pjb-card-cta:hover{background:var(--brand);color:#fff;}
.pjb-why{padding:clamp(28px,5vw,52px) max(16px,env(safe-area-inset-left));}
.pjb-why-inner{max-width:1060px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;}
.pjb-why-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;}
.pjb-why-ic{font-size:24px;}
.pjb-why-card h4{margin:10px 0 6px;font-size:17px;letter-spacing:-.01em;}
.pjb-why-card p{margin:0;color:var(--muted);font-size:14.5px;line-height:1.5;}
.pjb-cta{max-width:1060px;margin:12px auto clamp(28px,5vw,48px);padding:clamp(32px,6vw,56px) 24px;text-align:center;border-radius:22px;
  background:linear-gradient(120deg,#13224a,#1f3a8a 55%,#0ea5a3);color:#fff;margin-left:max(16px,env(safe-area-inset-left));margin-right:max(16px,env(safe-area-inset-right));}
.pjb-cta h2{font-size:clamp(22px,4vw,32px);margin:0 0 10px;letter-spacing:-.02em;}
.pjb-cta p{margin:0 auto 22px;max-width:520px;opacity:.9;line-height:1.5;}
.pjb-cta-btn{display:inline-block;background:#fff;color:#13224a;text-decoration:none;font-weight:800;font-size:16px;padding:14px 28px;border-radius:12px;}
.pjb-cta-btn:hover{transform:translateY(-1px);}
.pjb-footer{border-top:1px solid var(--line);padding:24px max(16px,env(safe-area-inset-left));display:flex;gap:12px;align-items:center;justify-content:center;color:var(--muted);font-size:14px;flex-wrap:wrap;}
.pjb-footer strong{color:var(--brand);}
@media (max-width:560px){.pjb-search{border-radius:14px;}.pjb-field-prov,.pjb-field-q{flex:1 1 100%;}.pjb-search-btn{flex:1 1 100%;}}
@media (prefers-color-scheme:dark){
  .pjb{--ink:#eef3fb;--muted:#9fb0c9;--line:#243247;--bg:#0b1322;}
  .pjb-nav{background:rgba(13,22,38,.85);}
  .pjb-lang,.pjb-card,.pjb-why-card,.pjb-field{background:#111c30;}
  .pjb-field{background:#0e1829;}
  .pjb-search{background:#111c30;}
  .pjb-signin{background:#eef3fb!important;color:#0b1322!important;}
  .pjb-card-chips span{background:#13244a;color:#9ec1ff;}
  .pjb-hero{background:radial-gradient(1200px 500px at 50% -10%,rgba(43,95,217,.22),transparent),linear-gradient(180deg,#0e1829,var(--bg));}
}
`;
