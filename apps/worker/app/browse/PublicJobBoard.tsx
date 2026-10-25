"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Public, no-sign-in job board: browse JobLop's open offers across all of Canada and filter by
// province or search by city/role. Area-level only (city + province) — no exact address, client, or
// pay. A funnel: every card and the header invite the visitor to sign up and apply. Bilingual (Bill 96).

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
    title: "Find work across Canada",
    subtitle: "Browse open jobs near you — free, no account needed. Sign up when you're ready to apply.",
    allCanada: "All of Canada",
    province: "Province",
    search: "Search city or role",
    searchPh: "e.g. Montréal, nurse, cook…",
    openings: (n: number) => `${n} opening${n === 1 ? "" : "s"}`,
    urgent: "Urgent",
    starts: "Starts",
    apply: "Sign up to apply",
    none: "No open jobs match your search right now. Try another province or clear the search.",
    loading: "Loading jobs…",
    count: (n: number) => `${n} open job${n === 1 ? "" : "s"}`,
    signin: "Sign in"
  },
  fr: {
    title: "Trouvez du travail partout au Canada",
    subtitle: "Parcourez les offres près de chez vous — gratuitement, sans compte. Inscrivez-vous pour postuler.",
    allCanada: "Tout le Canada",
    province: "Province",
    search: "Rechercher une ville ou un rôle",
    searchPh: "p. ex. Montréal, infirmière, cuisinier…",
    openings: (n: number) => `${n} poste${n === 1 ? "" : "s"}`,
    urgent: "Urgent",
    starts: "Début",
    apply: "Inscrivez-vous pour postuler",
    none: "Aucune offre ne correspond à votre recherche. Essayez une autre province ou effacez la recherche.",
    loading: "Chargement des offres…",
    count: (n: number) => `${n} offre${n === 1 ? "" : "s"} ouverte${n === 1 ? "" : "s"}`,
    signin: "Se connecter"
  }
} as const;

const C = {
  bg: "#f6f8fb", card: "#ffffff", ink: "#132035", muted: "#5c6b82", line: "#e2e8f2",
  brand: "#1f6feb", urgent: "#e8562a", chip: "#eef3fb", chipInk: "#1f4e8f"
};

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

  // Debounce the text search; province changes apply immediately.
  useEffect(() => {
    const h = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(h);
  }, [load, q]);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink }}>
      <header style={{ background: C.card, borderBottom: `1px solid ${C.line}`, padding: "14px max(16px, env(safe-area-inset-left)) 14px max(16px, env(safe-area-inset-right))", display: "flex", alignItems: "center", gap: 12 }}>
        <strong style={{ fontSize: 18, color: C.brand }}>JobLop</strong>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setLang(lang === "en" ? "fr" : "en")} style={{ ...btnGhost }}>{lang === "en" ? "FR" : "EN"}</button>
          <a href="/" style={{ ...btnGhost, textDecoration: "none", color: C.ink }}>{t.signin}</a>
        </div>
      </header>

      <main style={{ maxWidth: 940, margin: "0 auto", padding: "22px max(16px, env(safe-area-inset-left)) 48px max(16px, env(safe-area-inset-right))" }}>
        <h1 style={{ fontSize: "clamp(24px, 5vw, 34px)", margin: "6px 0", textWrap: "balance" }}>{t.title}</h1>
        <p style={{ color: C.muted, margin: "0 0 18px", maxWidth: 620 }}>{t.subtitle}</p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <select aria-label={t.province} value={province} onChange={(e) => setProvince(e.target.value)} style={field}>
            <option value="">{t.allCanada}</option>
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>{lang === "fr" ? p.fr : p.en}</option>
            ))}
          </select>
          <input aria-label={t.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh} style={{ ...field, flex: 1, minWidth: 180 }} />
        </div>

        {jobs === null ? (
          <p style={{ color: C.muted }}>{t.loading}</p>
        ) : jobs.length === 0 ? (
          <p style={{ color: C.muted }}>{t.none}</p>
        ) : (
          <>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 12px" }}>{t.count(jobs.length)}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {jobs.map((j) => (
                <article key={j.jobCode} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ fontSize: 16 }}>{j.role}</strong>
                    {j.urgency === "urgent" || j.urgency === "immediate" ? (
                      <span style={{ marginLeft: "auto", background: C.urgent, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{t.urgent}</span>
                    ) : null}
                  </div>
                  <div style={{ color: C.muted, fontSize: 14 }}>📍 {j.areaLabel}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={chip}>{t.openings(j.openings)}</span>
                    <span style={chip}>{t.starts} {fmtDate(j.startAt)}</span>
                  </div>
                  <a href="/" style={{ marginTop: 6, textAlign: "center", background: C.brand, color: "#fff", textDecoration: "none", fontWeight: 600, padding: "9px 12px", borderRadius: 9 }}>{t.apply}</a>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const field: React.CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px", fontSize: 15, background: "#fff", color: C.ink };
const chip: React.CSSProperties = { background: C.chip, color: C.chipInk, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 999 };
const btnGhost: React.CSSProperties = { border: `1px solid ${C.line}`, background: "#fff", color: C.ink, borderRadius: 8, padding: "6px 12px", fontSize: 14, cursor: "pointer" };
