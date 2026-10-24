"use client";

import { useMemo, useState } from "react";

// Guided CV wizard: short chip-answer questions -> a worker profile -> AI CV (synthetic now, Claude when
// keyed) -> rendered in a chosen design. Built for low-friction use by service/trade workers.

type JobCat = { key: string; label: string; skills: string[] };
const CATEGORIES: JobCat[] = [
  { key: "kitchen", label: "Kitchen / Chef", skills: ["Menu design", "Food safety (MAPAQ)", "Team leadership", "Grill & sauté", "Prep & mise en place", "Cost control", "Pastry", "Banquet service"] },
  { key: "care", label: "Healthcare / PSW", skills: ["Personal care", "Mobility assistance", "RCR / First aid", "Vital signs", "Dementia care", "Charting", "Medication reminders", "Infection control"] },
  { key: "cleaning", label: "Cleaning / Housekeeping", skills: ["Room cleaning", "SIMDUT / WHMIS", "Floor care", "Laundry", "Sanitization", "Inventory", "Attention to detail"] },
  { key: "warehouse", label: "Warehouse / Logistics", skills: ["Forklift / cariste", "Order picking", "Packing", "Inventory", "Shipping/receiving", "Pallet jack", "Safety (SIMDUT)"] },
  { key: "driver", label: "Driver / Delivery", skills: ["Class 5 licence", "Route planning", "Safe driving record", "Loading/unloading", "Customer service", "GPS navigation"] },
  { key: "security", label: "Security", skills: ["BSP licence", "Access control", "Patrol", "Incident reports", "CCTV monitoring", "Conflict de-escalation"] },
  { key: "retail", label: "Retail / Service", skills: ["Customer service", "Cash handling (POS)", "Merchandising", "Bilingual service", "Upselling", "Stock management"] },
  { key: "construction", label: "Construction / Trades", skills: ["ASP Construction card", "Framing", "Finishing", "Power tools", "Blueprint reading", "Site safety"] }
];

const EXPERIENCE = ["< 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];
const CITIES = ["Montréal", "Laval", "Longueuil", "Québec City", "Gatineau", "Other"];
const LANGUAGES = ["Français", "English", "العربية", "Español"];
const EDUCATION = ["No diploma", "High school / DES", "DEP (vocational)", "CEGEP / DEC", "University", "Other"];
const AVAILABILITY = ["Full-time", "Part-time", "Weekends", "Evenings / nights", "On-call"];
const DESIGNS = [
  { key: "service", label: "Service / Trades" },
  { key: "healthcare", label: "Healthcare" },
  { key: "professional", label: "Professional" }
];

type GeneratedCv = { headline: string; cvMarkdown: string; coverLetterMarkdown: string; tailoredTo: string | null };

// Minimal, safe Markdown -> HTML (headings, bold, italic, bullets). Escapes first.
function mdToHtml(md: string): string {
  const esc = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = esc.split("\n");
  const out: string[] = [];
  let inList = false;
  const inline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em>$1</em>");
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h4>${inline(line.replace(/^###\s+/, ""))}</h4>`); }
    else if (/^##\s+/.test(line)) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h3>${inline(line.replace(/^##\s+/, ""))}</h3>`); }
    else if (/^#\s+/.test(line)) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h2>${inline(line.replace(/^#\s+/, ""))}</h2>`); }
    else if (/^[-*]\s+/.test(line)) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`); }
    else if (line === "") { if (inList) { out.push("</ul>"); inList = false; } }
    else { if (inList) { out.push("</ul>"); inList = false; } out.push(`<p>${inline(line)}</p>`); }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function Chips({ options, value, onToggle, multi }: { options: string[]; value: string[]; onToggle: (v: string) => void; multi?: boolean }) {
  return (
    <div style={styles.chips}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)} style={{ ...styles.chip, ...(on ? styles.chipOn : {}) }}>
            {on && multi ? "✓ " : ""}{o}
          </button>
        );
      })}
    </div>
  );
}

export function CvWizard() {
  const [cat, setCat] = useState("kitchen");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Laval");
  const [exp, setExp] = useState("5–10 years");
  const [langs, setLangs] = useState<string[]>(["Français", "English"]);
  const [skills, setSkills] = useState<string[]>([]);
  const [edu, setEdu] = useState("DEP (vocational)");
  const [avail, setAvail] = useState<string[]>(["Full-time"]);
  const [lastJob, setLastJob] = useState("");
  const [outLang, setOutLang] = useState("en");
  const [design, setDesign] = useState("service");
  const [cv, setCv] = useState<GeneratedCv | null>(null);
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const category = useMemo(() => CATEGORIES.find((c) => c.key === cat)!, [cat]);
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const generate = async () => {
    if (!name.trim()) { setMsg("Please enter the worker's name."); return; }
    setBusy(true); setMsg("Building the CV…");
    const summary = `${exp} of experience as ${category.label}${city ? ` in the ${city} area` : ""}. Available: ${avail.join(", ") || "flexible"}.`;
    const profile = {
      fullName: name.trim(),
      headline: category.label,
      location: `${city}, QC`,
      summary,
      skills,
      languages: langs,
      language: outLang,
      education: edu && edu !== "No diploma" ? [{ credential: edu, institution: "", year: "" }] : [],
      experience: lastJob.trim() ? [{ role: category.label, employer: lastJob.trim(), start: "", highlights: [] }] : []
    };
    try {
      const res = await fetch("/api/jobscanner/cv", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, job: { title: category.label } })
      });
      if (!res.ok) { setMsg("CV generation failed."); return; }
      const d = (await res.json()) as { cv: GeneratedCv; providerKind?: string };
      setCv(d.cv); setProvider(d.providerKind ?? "");
      setMsg(`CV ready${d.providerKind?.startsWith("claude") ? " (AI-written)" : " (draft)"}.`);
    } finally { setBusy(false); }
  };

  return (
    <section style={styles.wrap}>
      <article style={styles.card}>
        <h2 style={styles.step}>1 · What kind of work?</h2>
        <Chips options={CATEGORIES.map((c) => c.label)} value={[category.label]} onToggle={(l) => { const c = CATEGORIES.find((x) => x.label === l)!; setCat(c.key); setSkills([]); }} />

        <h2 style={styles.step}>2 · Your details</h2>
        <div style={styles.row}>
          <label style={styles.label}>Full name<input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marie Tremblay" /></label>
          <label style={styles.label}>CV language
            <select style={styles.input} value={outLang} onChange={(e) => setOutLang(e.target.value)}><option value="en">English</option><option value="fr">Français</option></select>
          </label>
        </div>
        <p style={styles.q}>City</p>
        <Chips options={CITIES} value={[city]} onToggle={setCity} />

        <h2 style={styles.step}>3 · Experience</h2>
        <Chips options={EXPERIENCE} value={[exp]} onToggle={setExp} />

        <h2 style={styles.step}>4 · Languages</h2>
        <Chips options={LANGUAGES} value={langs} onToggle={(v) => toggle(langs, setLangs, v)} multi />

        <h2 style={styles.step}>5 · Your skills <span style={styles.hint}>(tap all that apply)</span></h2>
        <Chips options={category.skills} value={skills} onToggle={(v) => toggle(skills, setSkills, v)} multi />

        <h2 style={styles.step}>6 · Education / training</h2>
        <Chips options={EDUCATION} value={[edu]} onToggle={setEdu} />

        <h2 style={styles.step}>7 · Availability</h2>
        <Chips options={AVAILABILITY} value={avail} onToggle={(v) => toggle(avail, setAvail, v)} multi />

        <h2 style={styles.step}>8 · Most recent employer <span style={styles.hint}>(optional)</span></h2>
        <input style={{ ...styles.input, width: "100%" }} value={lastJob} onChange={(e) => setLastJob(e.target.value)} placeholder="e.g. Bistro Laval" />

        <h2 style={styles.step}>9 · Design</h2>
        <Chips options={DESIGNS.map((d) => d.label)} value={[DESIGNS.find((d) => d.key === design)!.label]} onToggle={(l) => setDesign(DESIGNS.find((d) => d.label === l)!.key)} />

        <div style={{ marginTop: 18 }}>
          <button type="button" style={styles.cta} disabled={busy} onClick={() => void generate()}>{busy ? "Building…" : "Build my CV"}</button>
          {msg ? <span style={styles.notice}>{msg}</span> : null}
        </div>
        <p style={styles.upload}>📎 Document uploads (MAPAQ, RCR, cariste, licence) and optional photo — coming in the next step.</p>
      </article>

      {cv ? (
        <article style={{ ...styles.card, ...designStyle(design) }}>
          <div className="cv-rendered" dangerouslySetInnerHTML={{ __html: mdToHtml(cv.cvMarkdown) }} />
          <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid currentColor", opacity: 0.2 }} />
          <h3 style={{ marginTop: 0 }}>Cover letter</h3>
          <div className="cv-rendered" dangerouslySetInnerHTML={{ __html: mdToHtml(cv.coverLetterMarkdown || "—") }} />
          <p style={styles.prov}>{provider.startsWith("claude") ? `AI-written by ${provider}` : "Draft (synthetic — add ANTHROPIC_API_KEY for AI-written CVs)"}. Advisory — review and edit before applying.</p>
        </article>
      ) : null}
    </section>
  );
}

function designStyle(key: string): Record<string, string> {
  if (key === "healthcare") return { fontFamily: "Georgia, serif", color: "#0b3b52", background: "#f7fbfd", borderTop: "6px solid #1a7f9e" };
  if (key === "professional") return { fontFamily: "Inter, system-ui, sans-serif", color: "#1a1a2e", background: "#fff", borderTop: "6px solid #2b2d6e" };
  return { fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#13303a", background: "#fffdf7", borderTop: "6px solid #0f7f78" }; // service/trades
}

const styles = {
  wrap: { padding: "24px clamp(18px, 5vw, 64px)" },
  card: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.06)", marginBottom: 18, padding: 22 },
  step: { color: "#061b41", fontSize: 16, margin: "18px 0 8px" },
  hint: { color: "#8696ad", fontSize: 12, fontWeight: 500 },
  q: { color: "#5a6b85", fontSize: 13, fontWeight: 700, margin: "10px 0 6px" },
  row: { display: "flex", flexWrap: "wrap" as const, gap: 12 },
  label: { color: "#10233f", display: "flex", flexDirection: "column" as const, fontSize: 12, fontWeight: 700, gap: 4 },
  input: { border: "1px solid #c3d0e4", borderRadius: 8, minHeight: 40, padding: "0 10px", minWidth: 200 },
  chips: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  chip: { background: "#f1f5fb", border: "1px solid #d4deec", borderRadius: 999, color: "#10233f", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "8px 14px" },
  chipOn: { background: "#0f7f78", borderColor: "#0f7f78", color: "#fff" },
  cta: { background: "#0f7f78", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800, padding: "12px 22px" },
  notice: { color: "#0f7f78", fontSize: 13, fontWeight: 700, marginLeft: 12 },
  upload: { color: "#8696ad", fontSize: 12, marginTop: 14 },
  prov: { fontSize: 11, marginTop: 16, opacity: 0.7 }
} as const;
