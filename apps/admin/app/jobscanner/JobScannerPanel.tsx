"use client";

import { useCallback, useState } from "react";

type Lead = {
  id?: string;
  source: string;
  title: string;
  employer: string | null;
  city: string | null;
  province: string | null;
  salaryMaxMinor: number | null;
  url: string;
  score?: number;
  distanceKm?: number | null;
};

type GeneratedCv = {
  headline: string;
  cvMarkdown: string;
  coverLetterMarkdown: string;
  tailoredTo: string | null;
  matchedSkills: string[];
};

const money = (minor: number | null) =>
  minor ? `~${(minor / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })}/yr` : "";

export function JobScannerPanel() {
  const [profile, setProfile] = useState({
    fullName: "Marie Tremblay",
    headline: "Chef de cuisine",
    location: "Laval, QC",
    skills: "Menu design, Food safety (MAPAQ), Team leadership, Cost control",
    summary: "10 years leading busy kitchen brigades in Montréal and Laval.",
    language: "en"
  });
  const [city, setCity] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cvByLead, setCvByLead] = useState<Record<string, GeneratedCv>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const roleKeywords = () =>
    [profile.headline, ...profile.skills.split(",")].map((s) => s.trim()).filter(Boolean).join(",");

  const loadLeads = useCallback(async () => {
    setBusy(true); setMsg("Loading stored leads…");
    try {
      const qs = new URLSearchParams({ province: "QC", limit: "50", roleKeywords: roleKeywords() });
      if (city.trim()) qs.set("city", city.trim());
      const res = await fetch(`/api/jobscanner/leads?${qs.toString()}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) { setMsg("Administrator access required."); return; }
      if (!res.ok) { setMsg("Could not load leads."); return; }
      const data = (await res.json()) as { leads: Lead[]; leadCount: number };
      setLeads(data.leads ?? []);
      setMsg(`${data.leads?.length ?? 0} leads (ranked for this worker).`);
    } finally { setBusy(false); }
  }, [city, profile]);

  const scanLive = useCallback(async () => {
    setBusy(true); setMsg("Scanning Adzuna live (uses 1 API call)…");
    try {
      const res = await fetch("/api/jobscanner/scan", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ what: profile.headline, where: city.trim() || "Montreal", resultsPerPage: 12 })
      });
      if (!res.ok) { setMsg("Live scan failed (check API budget)."); return; }
      const d = (await res.json()) as { persisted?: { inserted: number; updated: number }; mode: string };
      setMsg(`Scanned (${d.mode}). New ${d.persisted?.inserted ?? 0}, updated ${d.persisted?.updated ?? 0}. Loading…`);
      await loadLeads();
    } finally { setBusy(false); }
  }, [city, profile, loadLeads]);

  const buildCv = useCallback(async (lead: Lead) => {
    if (!lead.id) return;
    setBusy(true); setMsg(`Building CV for “${lead.title}”…`);
    try {
      const res = await fetch("/api/jobscanner/cv", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          profile: {
            fullName: profile.fullName,
            headline: profile.headline,
            location: profile.location,
            summary: profile.summary,
            skills: profile.skills.split(",").map((s) => s.trim()).filter(Boolean),
            language: profile.language
          }
        })
      });
      if (!res.ok) { setMsg("CV generation failed."); return; }
      const d = (await res.json()) as { cv: GeneratedCv };
      setCvByLead((m) => ({ ...m, [lead.id!]: d.cv }));
      setMsg(`CV tailored to “${lead.title}”.`);
    } finally { setBusy(false); }
  }, [profile]);

  const set = (k: keyof typeof profile) => (v: string) => setProfile((p) => ({ ...p, [k]: v }));

  return (
    <section style={styles.wrap}>
      <article style={styles.card}>
        <h2 style={styles.h2}>Worker profile</h2>
        <div style={styles.formRow}>
          <label style={styles.label}>Name<input style={styles.input} value={profile.fullName} onChange={(e) => set("fullName")(e.target.value)} /></label>
          <label style={styles.label}>Headline / target role<input style={styles.input} value={profile.headline} onChange={(e) => set("headline")(e.target.value)} /></label>
          <label style={styles.label}>Location<input style={styles.input} value={profile.location} onChange={(e) => set("location")(e.target.value)} /></label>
          <label style={styles.label}>Language
            <select style={styles.input} value={profile.language} onChange={(e) => set("language")(e.target.value)}>
              <option value="en">English</option><option value="fr">Français</option>
            </select>
          </label>
        </div>
        <label style={{ ...styles.label, width: "100%" }}>Skills (comma-separated)
          <input style={{ ...styles.input, width: "100%" }} value={profile.skills} onChange={(e) => set("skills")(e.target.value)} />
        </label>
        <label style={{ ...styles.label, width: "100%" }}>Summary
          <input style={{ ...styles.input, width: "100%" }} value={profile.summary} onChange={(e) => set("summary")(e.target.value)} />
        </label>
        <div style={styles.formRow}>
          <label style={styles.label}>City filter (optional)<input style={styles.input} placeholder="Montréal / Laval" value={city} onChange={(e) => setCity(e.target.value)} /></label>
          <button type="button" style={styles.button} disabled={busy} onClick={() => void loadLeads()}>Find matching jobs</button>
          <button type="button" style={styles.buttonGhost} disabled={busy} onClick={() => void scanLive()}>Scan live (1 Adzuna call)</button>
        </div>
        {msg ? <p style={styles.notice} role="status">{msg}</p> : null}
      </article>

      {leads.map((lead, i) => {
        const cv = lead.id ? cvByLead[lead.id] : undefined;
        return (
          <article key={lead.id ?? i} style={styles.card}>
            <div style={styles.leadHead}>
              <div>
                <strong style={styles.leadTitle}>{lead.title}</strong>
                <div style={styles.leadMeta}>
                  {lead.employer ?? "—"} · {lead.city}, {lead.province} {money(lead.salaryMaxMinor) ? `· ${money(lead.salaryMaxMinor)}` : ""}
                  {typeof lead.score === "number" ? ` · match ${(lead.score * 100).toFixed(0)}%` : ""}
                  {typeof lead.distanceKm === "number" ? ` · ~${lead.distanceKm.toFixed(0)}km` : ""}
                </div>
              </div>
              <div style={styles.leadActions}>
                <button type="button" style={styles.button} disabled={busy || !lead.id} onClick={() => void buildCv(lead)}>Build CV + cover letter</button>
                <a style={styles.applyLink} href={lead.url} target="_blank" rel="noreferrer">Review &amp; apply on source ↗</a>
              </div>
            </div>
            {cv ? (
              <div style={styles.cvWrap}>
                <p style={styles.cvNote}>Tailored to “{cv.tailoredTo}”. Matched skills: {cv.matchedSkills.join(", ") || "—"}. <em>Advisory draft — the worker reviews and edits, then applies themselves.</em></p>
                <div style={styles.cvGrid}>
                  <div><h3 style={styles.h3}>CV</h3><pre style={styles.pre}>{cv.cvMarkdown}</pre></div>
                  <div><h3 style={styles.h3}>Cover letter</h3><pre style={styles.pre}>{cv.coverLetterMarkdown}</pre></div>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

const styles = {
  wrap: { padding: "24px clamp(18px, 5vw, 64px)" },
  card: { background: "#fff", border: "1px solid #faf6ec", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.06)", marginBottom: 16, padding: 20 },
  h2: { color: "#000000", fontSize: 20, marginTop: 0 },
  h3: { color: "#000000", fontSize: 14, margin: "0 0 6px" },
  formRow: { alignItems: "flex-end", display: "flex", flexWrap: "wrap" as const, gap: 12, marginBottom: 10 },
  label: { color: "#171511", display: "flex", flexDirection: "column" as const, fontSize: 12, fontWeight: 700, gap: 4 },
  input: { border: "1px solid #ece3d2", borderRadius: 8, minHeight: 38, padding: "0 10px", minWidth: 160 },
  button: { background: "#171511", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, minHeight: 40, padding: "0 14px" },
  buttonGhost: { background: "#fff", border: "1px solid #171511", borderRadius: 8, color: "#171511", cursor: "pointer", fontWeight: 800, minHeight: 40, padding: "0 14px" },
  notice: { color: "#171511", fontSize: 13, fontWeight: 700, marginBottom: 0 },
  leadHead: { alignItems: "flex-start", display: "flex", flexWrap: "wrap" as const, gap: 12, justifyContent: "space-between" },
  leadTitle: { color: "#000000", fontSize: 16 },
  leadMeta: { color: "#171511", fontSize: 13, marginTop: 4 },
  leadActions: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 10 },
  applyLink: { color: "#b23b2e", fontSize: 13, fontWeight: 800, textDecoration: "none" },
  cvWrap: { borderTop: "1px solid #fbf9f4", marginTop: 14, paddingTop: 12 },
  cvNote: { color: "#171511", fontSize: 12, marginTop: 0 },
  cvGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" },
  pre: { background: "#fbf9f4", border: "1px solid #faf6ec", borderRadius: 8, fontSize: 12, lineHeight: 1.5, margin: 0, overflowX: "auto" as const, padding: 12, whiteSpace: "pre-wrap" as const }
} as const;
