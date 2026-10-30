"use client";

import { useState } from "react";

type Lead = { id?: string; title: string; employer: string | null; city: string | null; province: string | null; salaryMaxMinor: number | null; url: string; score?: number; distanceKm?: number | null };

const money = (m: number | null) => (m ? `~${(m / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })}/yr` : "");

export function JobScannerFeed() {
  const [role, setRole] = useState("");
  const [city, setCity] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pro, setPro] = useState(false);

  const search = async () => {
    setBusy(true); setMsg("Searching jobs near you…");
    try {
      const qs = new URLSearchParams({ province: "QC", limit: "50" });
      if (role.trim()) qs.set("roleKeywords", role.trim());
      if (city.trim()) qs.set("city", city.trim());
      const res = await fetch(`/api/jobscanner/leads?${qs.toString()}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) { setMsg("Please sign in to see jobs."); return; }
      if (!res.ok) { setMsg("Could not load jobs."); return; }
      const d = (await res.json()) as { leads: Lead[]; pro?: boolean };
      setLeads(d.leads ?? []); setLoaded(true); setPro(Boolean(d.pro));
      setMsg(d.leads?.length ? `${d.leads.length} jobs found.` : "No jobs match yet — try a broader search.");
    } finally { setBusy(false); }
  };

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
            {l.employer ?? "—"} · {l.city}, {l.province}{money(l.salaryMaxMinor) ? ` · ${money(l.salaryMaxMinor)}` : ""}
            {typeof l.score === "number" ? ` · match ${(l.score * 100).toFixed(0)}%` : ""}
          </div>
          <div style={styles.actions}>
            <a style={styles.apply} href={l.url} target="_blank" rel="noreferrer">Apply on source ↗</a>
            <a style={styles.ghost} href="/cv-builder">Tailor my CV</a>
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
  cta: { background: "#b8862f", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, minHeight: 44, padding: "0 18px" },
  msg: { color: "#b8862f", fontSize: 14, fontWeight: 700 },
  proBanner: { background: "#faf6ec", border: "1px solid #f0e2c0", borderRadius: 8, color: "#8a5a00", fontSize: 13, fontWeight: 700, margin: "4px 0", padding: "8px 12px" },
  upsell: { background: "#fff6e6", border: "1px solid #f0d089", borderRadius: 8, color: "#8a5a00", fontSize: 13, margin: "4px 0", padding: "8px 12px" },
  note: { color: "#6b6356", fontSize: 13, margin: "4px 0 16px" },
  link: { color: "#b8862f", fontWeight: 700 },
  card: { background: "#fff", border: "1px solid #ece3d2", borderRadius: 12, marginBottom: 12, padding: 16 },
  title: { color: "#15110b", fontSize: 16 },
  meta: { color: "#6b6356", fontSize: 13, margin: "4px 0 10px" },
  actions: { alignItems: "center", display: "flex", gap: 14 },
  apply: { color: "#b23b2e", fontSize: 14, fontWeight: 800, textDecoration: "none" },
  ghost: { color: "#b8862f", fontSize: 14, fontWeight: 700, textDecoration: "none" }
} as const;
