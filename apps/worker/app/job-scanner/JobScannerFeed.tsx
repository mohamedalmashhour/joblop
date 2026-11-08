"use client";

import { useEffect, useState } from "react";

type Lead = { id?: string; title: string; employer: string | null; city: string | null; province: string | null; salaryMaxMinor: number | null; url: string; source?: string; score?: number; distanceKm?: number | null };

// Hourly pay is stored in cents per hour (small numbers); yearly salaries are large.
const money = (m: number | null) => {
  if (!m) return "";
  if (m < 20000) return `~$${(m / 100).toFixed(2).replace(/\.00$/, "")}/h`;
  return `~${(m / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })}/yr`;
};

export function JobScannerFeed() {
  const [role, setRole] = useState("");
  const [city, setCity] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pro, setPro] = useState(false);
  // Visitors without an account still get real results (a preview); applying asks them to sign up.
  const [visitor, setVisitor] = useState(false);

  const search = async (override?: string) => {
    setBusy(true); setMsg("Searching jobs near you…");
    try {
      const qs = new URLSearchParams({ province: "QC", limit: "50" });
      const roleText = (override ?? role).trim();
      if (roleText) qs.set("roleKeywords", roleText);
      if (city.trim()) qs.set("city", city.trim());
      const res = await fetch(`/api/jobscanner/leads?${qs.toString()}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        const pub = new URLSearchParams({ limit: "12" });
        if (roleText) pub.set("q", roleText);
        if (city.trim()) pub.set("city", city.trim());
        const pr = await fetch(`/api/public/jobscanner/leads?${pub.toString()}`, { cache: "no-store" });
        const pd = (await pr.json().catch(() => ({}))) as { leads?: Array<{ title: string; employer: string | null; areaLabel: string; salaryMaxMinor: number | null; source: string }>; total?: number };
        const list = (pd.leads ?? []).map((l) => ({ title: l.title, employer: l.employer, city: l.areaLabel, province: null, salaryMaxMinor: l.salaryMaxMinor, url: "", source: l.source }));
        setLeads(list); setLoaded(true); setVisitor(true);
        setMsg(list.length ? `${pd.total ?? list.length} jobs found. Create a free account to see the full list and apply.` : "No jobs match yet — try a broader search.");
        return;
      }
      if (!res.ok) { setMsg("Could not load jobs."); return; }
      const d = (await res.json()) as { leads: Lead[]; pro?: boolean };
      setLeads(d.leads ?? []); setLoaded(true); setPro(Boolean(d.pro));
      setMsg(d.leads?.length ? `${d.leads.length} jobs found.` : "No jobs match yet — try a broader search.");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    // Search straight away (using ?q= when coming from the front page), so the page is never empty.
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setRole(q);
    void search(q ?? undefined);
  }, []);

  return (
    <section>
      <div style={styles.searchRow}>
        <input style={styles.input} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role or skill — e.g. chef, PSW, cariste" />
        <input style={styles.input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional) — Montréal, Laval…" />
        <button type="button" style={styles.cta} disabled={busy} onClick={() => void search()}>{busy ? "Searching…" : "Find jobs"}</button>
      </div>
      {msg ? <p style={styles.msg}>{msg}</p> : null}
      {loaded && pro ? (
        <p style={styles.proBanner}>⭐ Worker Pro — showing the best-paying and most urgent jobs first.</p>
      ) : loaded ? (
        <p style={styles.upsell}>🔒 <strong>Worker Pro</strong> members see the best-paying and emergency jobs first. <a href="/cv-builder" style={styles.link}>Learn about Pro →</a></p>
      ) : null}
      <p style={styles.note}>These are external job postings from partner sources. You apply on the source site. Want a CV first? <a href="/cv-builder" style={styles.link}>Build your CV →</a></p>

      {leads.map((l, i) => (
        <article key={l.id ?? i} style={styles.card}>
          <strong style={styles.title}>{l.title}</strong>
          <div style={styles.meta}>
            {l.employer ?? "—"} · {l.province ? `${l.city}, ${l.province}` : l.city}{money(l.salaryMaxMinor) ? ` · ${money(l.salaryMaxMinor)}` : ""}
            {typeof l.score === "number" ? ` · match ${(l.score * 100).toFixed(0)}%` : ""}
          </div>
          <div style={styles.actions}>
            {visitor ? (
              <a style={styles.apply} href="/#auth-card">Create a free account to apply</a>
            ) : (
              <a style={styles.apply} href={l.url} target="_blank" rel="noreferrer">Apply on source ↗</a>
            )}
            <a style={styles.ghost} href="/cv-builder">Tailor my CV</a>
            {l.source === "adzuna" ? (
              <a style={styles.adzuna} href="https://www.adzuna.ca" target="_blank" rel="noreferrer">Adzuna</a>
            ) : null}
          </div>
        </article>
      ))}
      {loaded && leads.length === 0 ? <p style={styles.msg}>Nothing yet — try a different role or remove the city.</p> : null}
    </section>
  );
}

const styles = {
  searchRow: { display: "flex", flexWrap: "wrap" as const, gap: 10, margin: "12px 0" },
  input: { border: "1px solid #e3d7c0", borderRadius: 8, flex: "1 1 220px", minHeight: 42, minWidth: 0, padding: "0 12px" },
  cta: { background: "#e0a500", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, minHeight: 44, padding: "0 18px" },
  msg: { color: "#e0a500", fontSize: 14, fontWeight: 700 },
  proBanner: { background: "#faf6ec", border: "1px solid #f0e2c0", borderRadius: 8, color: "#8a5a00", fontSize: 13, fontWeight: 700, margin: "4px 0", padding: "8px 12px" },
  upsell: { background: "#fff6e6", border: "1px solid #f0d089", borderRadius: 8, color: "#8a5a00", fontSize: 13, margin: "4px 0", padding: "8px 12px" },
  note: { color: "#b3a894", fontSize: 13, margin: "4px 0 16px" },
  link: { color: "#e0a500", fontWeight: 700 },
  adzuna: { alignItems: "center", background: "#f3f0ea", borderRadius: 6, color: "#2b2b2b", display: "inline-flex", fontSize: 14, fontWeight: 700, justifyContent: "center", marginInlineStart: "auto", minHeight: 24, minWidth: 116, padding: "0 10px", textDecoration: "none" },
  card: { background: "#fff", border: "1px solid #ece3d2", borderRadius: 12, marginBottom: 12, padding: 16 },
  title: { color: "#15110b", fontSize: 16 },
  meta: { color: "#6b6356", fontSize: 13, margin: "4px 0 10px" },
  actions: { alignItems: "center", display: "flex", gap: 14 },
  apply: { color: "#b23b2e", fontSize: 14, fontWeight: 800, textDecoration: "none" },
  ghost: { color: "#e0a500", fontSize: 14, fontWeight: 700, textDecoration: "none" }
} as const;
