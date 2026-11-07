"use client";

import { useEffect, useMemo, useState } from "react";
import { ProUpgrade } from "./ProUpgrade";
import { toJsonResume, type CvProfile } from "./jsonResume";

// Worker-facing guided CV builder. Same flow as the admin demo, but on worker endpoints: the signed-in
// worker builds their own CV, and CV attachments are keyed to their session server-side (no workerRef
// is ever sent from the browser). Advisory output — the worker reviews and applies themselves.

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
const DESIGNS = [{ key: "service", label: "Service / Trades" }, { key: "healthcare", label: "Healthcare" }, { key: "professional", label: "Professional" }];

type GeneratedCv = { headline: string; cvMarkdown: string; coverLetterMarkdown: string; tailoredTo: string | null };
type CvAsset = { id: string; kind: "certificate" | "photo"; label: string | null; filename: string; contentType: string; size: number };

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
        return <button key={o} type="button" onClick={() => onToggle(o)} style={{ ...styles.chip, ...(on ? styles.chipOn : {}) }}>{on && multi ? "✓ " : ""}{o}</button>;
      })}
    </div>
  );
}

export function CvBuilder() {
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
  const [cvPro, setCvPro] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [assets, setAssets] = useState<CvAsset[]>([]);
  const [upKind, setUpKind] = useState<"certificate" | "photo">("certificate");
  const [upLabel, setUpLabel] = useState("");

  const [cardMsg, setCardMsg] = useState("");
  // Build CV is a signed-in worker feature — a signed-out visitor is guided to create/sign in first.
  const [authState, setAuthState] = useState<"loading" | "signed_in" | "signed_out">("loading");
  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => (active ? setAuthState(r.ok ? "signed_in" : "signed_out") : undefined))
      .catch(() => (active ? setAuthState("signed_out") : undefined));
    return () => { active = false; };
  }, []);

  // Finalize a card payment on return from Stripe's hosted Checkout (?pro=success&order=…). Runs at the
  // always-mounted page level (ProUpgrade only mounts after a CV is built). The API verifies the payment.
  useEffect(() => {
    let params: URLSearchParams;
    try { params = new URLSearchParams(window.location.search); } catch { return; }
    const pro = params.get("pro");
    const orderId = params.get("order");
    if (pro === "success" && orderId) {
      setCardMsg("Confirming your card payment…");
      void (async () => {
        try {
          // The cross-site return from Stripe omits the SameSite=Strict session cookie on the first hit;
          // a one-time same-site reload restores it. Guard so we reload at most once.
          const reloaded = (() => { try { return sessionStorage.getItem("jl_pro_return") === "1"; } catch { return false; } })();
          const s = await fetch("/api/session", { cache: "no-store" });
          if (s.status === 401 && !reloaded) {
            try { sessionStorage.setItem("jl_pro_return", "1"); } catch { /* ignore */ }
            window.location.reload();
            return;
          }
          try { sessionStorage.removeItem("jl_pro_return"); } catch { /* ignore */ }
          const res = await fetch(`/api/cv/orders/${encodeURIComponent(orderId)}/complete`, { method: "POST", headers: { "content-type": "application/json" } });
          if (res.ok) { setCvPro(true); setCardMsg("✓ Payment confirmed — Worker Pro is active."); window.history.replaceState({}, "", "/cv-builder"); }
          else if (res.status === 401) { setCardMsg("Your payment went through. Please sign in to activate Worker Pro."); }
          else { setCardMsg("We couldn't confirm the payment yet. If you were charged, refresh in a moment."); }
        } catch { setCardMsg("We couldn't confirm the payment. Please refresh."); }
      })();
    } else if (pro === "cancel") {
      setCardMsg("Card checkout cancelled — no charge was made.");
      try { window.history.replaceState({}, "", "/cv-builder"); } catch { /* ignore */ }
    }
  }, []);

  const category = useMemo(() => CATEGORIES.find((c) => c.key === cat)!, [cat]);
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const loadAssets = async () => {
    try { const r = await fetch("/api/cv-assets", { cache: "no-store" }); if (r.ok) setAssets(((await r.json()) as { assets: CvAsset[] }).assets ?? []); } catch { /* ignore */ }
  };
  const uploadFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setMsg("File is over 5 MB."); return; }
    const dataBase64 = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] ?? ""); r.onerror = () => reject(new Error("read failed")); r.readAsDataURL(file); });
    setBusy(true); setMsg(`Uploading ${file.name}…`);
    try {
      const res = await fetch("/api/cv-assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: upKind, label: upLabel.trim() || null, filename: file.name, contentType: file.type, dataBase64 }) });
      if (res.status === 201) { setMsg(`Uploaded ${file.name}.`); setUpLabel(""); await loadAssets(); }
      else { const d = await res.json().catch(() => ({})); setMsg(`Upload rejected${d.reason ? `: ${d.reason}` : ""} (PDF/PNG/JPEG, ≤5 MB).`); }
    } finally { setBusy(false); }
  };
  const removeAsset = async (id: string) => { await fetch(`/api/cv-assets/${id}`, { method: "DELETE" }); await loadAssets(); };

  const generate = async () => {
    if (!name.trim()) { setMsg("Please enter your name."); return; }
    setBusy(true); setMsg("Building your CV…");
    const summary = `${exp} of experience as ${category.label}${city ? ` in the ${city} area` : ""}. Available: ${avail.join(", ") || "flexible"}.`;
    const certifications = assets.filter((a) => a.kind === "certificate").map((a) => a.label?.trim() || a.filename);
    const profile = { fullName: name.trim(), headline: category.label, location: `${city}, QC`, summary, skills, languages: langs, language: outLang, certifications, education: edu && edu !== "No diploma" ? [{ credential: edu, institution: "", year: "" }] : [], experience: lastJob.trim() ? [{ role: category.label, employer: lastJob.trim(), start: "", highlights: [] }] : [] };
    try {
      const res = await fetch("/api/cv", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile, job: { title: category.label } }) });
      if (!res.ok) { setMsg("CV generation failed."); return; }
      const d = (await res.json()) as { cv: GeneratedCv; providerKind?: string; pro?: boolean; saved?: boolean };
      setCv(d.cv); setProvider(d.providerKind ?? ""); setCvPro(Boolean(d.pro));
      setMsg(`CV ready${d.providerKind?.startsWith("claude") ? " (AI-written)" : ""}${d.saved ? " — saved to your account" : ""}.`);
    } finally { setBusy(false); }
  };

  // R2-12b: export a standards-compliant JSON Resume file. The worker can render it with ANY free,
  // MIT-licensed JSON Resume theme (jsonresume.org/themes). In-app theme rendering is a follow-up.
  const downloadJsonResume = () => {
    if (!name.trim()) { setMsg("Please enter your name."); return; }
    const summary = `${exp} of experience as ${category.label}${city ? ` in the ${city} area` : ""}. Available: ${avail.join(", ") || "flexible"}.`;
    const certifications = assets.filter((a) => a.kind === "certificate").map((a) => a.label?.trim() || a.filename);
    const profile: CvProfile = {
      fullName: name.trim(),
      headline: category.label,
      location: city,
      summary,
      skills,
      languages: langs,
      certifications,
      education: edu && edu !== "No diploma" ? [{ credential: edu, institution: "", year: "" }] : [],
      experience: lastJob.trim() ? [{ role: category.label, employer: lastJob.trim(), start: "", highlights: [] }] : []
    };
    try {
      const blob = new Blob([JSON.stringify(toJsonResume(profile), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.trim().replace(/\s+/g, "_") || "resume"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Downloaded resume.json — use it with any free JSON Resume theme.");
    } catch {
      setMsg("Could not prepare the download. Please try again.");
    }
  };

  const set = (k: "fullName" | "lastJob", v: string) => (k === "fullName" ? setName(v) : setLastJob(v));

  // CV tester — a free, deterministic score of how strong/complete this CV is, with the concrete gaps
  // that cost points. Advisory only; it never blocks. The upgrade to Pro is how a worker turns the gaps
  // into a professionally written, job-tailored CV. No AI call, no money.
  const certCount = assets.filter((a) => a.kind === "certificate").length;
  const scoreCard = (() => {
    const parts: { ok: boolean; pts: number; gap: string }[] = [
      { ok: name.trim().length > 1, pts: 10, gap: "Add your full name" },
      { ok: exp.length > 0, pts: 15, gap: "Set your years of experience" },
      { ok: skills.length >= 3, pts: 20, gap: `Add ${Math.max(0, 3 - skills.length)} more skill${3 - skills.length === 1 ? "" : "s"}` },
      { ok: certCount >= 2, pts: 20, gap: certCount === 0 ? "Upload your certificates (MAPAQ, RCR, cariste…)" : "Add one more certificate" },
      { ok: edu !== "" && edu !== "No diploma", pts: 10, gap: "Add your education / training" },
      { ok: langs.length >= 2, pts: 10, gap: "Add a second language you speak" },
      { ok: lastJob.trim().length > 1, pts: 10, gap: "Add your most recent employer" },
      { ok: avail.length > 0, pts: 5, gap: "Set your availability" }
    ];
    const score = parts.reduce((s, p) => s + (p.ok ? p.pts : 0), 0);
    const gaps = parts.filter((p) => !p.ok).map((p) => p.gap);
    const grade = score >= 80 ? "Strong" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs work";
    const color = score >= 80 ? "#e0a500" : score >= 60 ? "#a8842f" : score >= 40 ? "#b8860b" : "#b23b2e";
    return { score, gaps, grade, color };
  })();

  if (authState === "loading") return <section style={styles.wrap}><p style={styles.hint}>Loading…</p></section>;
  if (authState === "signed_out")
    return (
      <section style={styles.wrap}>
        <div style={{ textAlign: "center", padding: "36px 16px" }}>
          <h2 style={{ margin: "0 0 8px" }}>Create a free account to build your CV</h2>
          <p style={styles.hint}>Build CV is part of your Joblop worker account. Sign in or create a free account to build and save your CV.</p>
          <a href="/" style={{ display: "inline-block", marginTop: 14, background: "#a8842f", color: "#fff", textDecoration: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 800 }}>Create / sign in</a>
        </div>
      </section>
    );

  return (
    <section style={styles.wrap}>
      {cardMsg ? <div style={styles.cardBanner}>{cardMsg}</div> : null}
      <article style={styles.card}>
        <h2 style={styles.step}>1 · What kind of work?</h2>
        <Chips options={CATEGORIES.map((c) => c.label)} value={[category.label]} onToggle={(l) => { const c = CATEGORIES.find((x) => x.label === l)!; setCat(c.key); setSkills([]); }} />
        <h2 style={styles.step}>2 · Your details</h2>
        <div style={styles.row}>
          <label style={styles.label}>Full name<input style={styles.input} value={name} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Marie Tremblay" /></label>
          <label style={styles.label}>CV language<select style={styles.input} value={outLang} onChange={(e) => setOutLang(e.target.value)}><option value="en">English</option><option value="fr">Français</option></select></label>
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
        <input style={{ ...styles.input, width: "100%" }} value={lastJob} onChange={(e) => set("lastJob", e.target.value)} placeholder="e.g. Bistro Laval" />
        <h2 style={styles.step}>9 · Documents &amp; photo <span style={styles.hint}>(optional)</span></h2>
        <p style={styles.q}>Upload certificates (MAPAQ, RCR, cariste, licence…). They&rsquo;ll be listed on your CV.</p>
        <div style={styles.row}>
          <label style={styles.label}>Type<select style={styles.input} value={upKind} onChange={(e) => setUpKind(e.target.value as "certificate" | "photo")}><option value="certificate">Certificate</option><option value="photo">Photo</option></select></label>
          <label style={styles.label}>Label <span style={styles.hint}>(e.g. MAPAQ)</span><input style={styles.input} value={upLabel} onChange={(e) => setUpLabel(e.target.value)} placeholder="Food safety (MAPAQ)" /></label>
          <label style={styles.label}>File (PDF/PNG/JPEG)<input style={styles.input} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) void (async () => { for (const f of files) await uploadFile(f); })(); e.currentTarget.value = ""; }} /></label>
        </div>
        {upKind === "photo" ? <p style={styles.warn}>⚠️ In Québec, a photo on a CV is generally not recommended and some employers discard CVs with photos. Only add one if the job specifically expects it.</p> : null}
        {assets.length > 0 ? (
          <ul style={styles.assetList}>
            {assets.map((a) => (<li key={a.id} style={styles.assetItem}><span>{a.kind === "photo" ? "🖼️" : "📄"} {a.label || a.filename} <span style={styles.hint}>({Math.round(a.size / 1024)} KB)</span></span><button type="button" style={styles.remove} onClick={() => void removeAsset(a.id)}>Remove</button></li>))}
          </ul>
        ) : null}
        <h2 style={styles.step}>10 · Design</h2>
        <Chips options={DESIGNS.map((d) => d.label)} value={[DESIGNS.find((d) => d.key === design)!.label]} onToggle={(l) => setDesign(DESIGNS.find((d) => d.label === l)!.key)} />
        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={styles.cta} disabled={busy} onClick={() => void generate()}>{busy ? "Building…" : "Build my CV"}</button>
          <button type="button" style={{ ...styles.cta, background: "transparent", border: "1px solid #a8842f", color: "#f8b808" }} onClick={downloadJsonResume}>Download JSON Resume</button>
          {msg ? <span style={styles.notice}>{msg}</span> : null}
        </div>
        <p style={styles.hint}>
          Your CV data in the open <a href="https://jsonresume.org/themes" target="_blank" rel="noopener noreferrer" style={{ color: "#f8b808" }}>JSON Resume</a> format — render it free in dozens of designs with any JSON Resume theme.
        </p>
        {cv ? (
          <div style={styles.scoreWrap}>
            <div style={styles.scoreHead}>
              <div>
                <span style={styles.scoreLabel}>Your CV score</span>
                <div><span style={{ ...styles.scoreNum, color: scoreCard.color }}>{scoreCard.score}</span><span style={styles.scoreOf}>/100 · {scoreCard.grade}</span></div>
              </div>
              <div style={styles.scoreBarTrack}><div style={{ ...styles.scoreBarFill, width: `${scoreCard.score}%`, background: scoreCard.color }} /></div>
            </div>
            {scoreCard.gaps.length > 0 ? (
              <div style={styles.scoreGaps}>
                <strong>Raise your score:</strong>
                <ul style={styles.scoreGapList}>{scoreCard.gaps.slice(0, 4).map((g) => <li key={g}>{g}</li>)}</ul>
              </div>
            ) : <p style={styles.scoreMax}>✓ Your CV covers the basics. Worker Pro makes it stand out.</p>}
            {!cvPro ? <p style={styles.scoreUpsell}>⭐ <strong>Worker Pro</strong> rewrites your CV professionally and tailors it to each job — the fastest way to a top score.</p> : null}
          </div>
        ) : null}
        {cv && !cvPro ? <ProUpgrade /> : null}
      </article>

      {cv ? (
        <article style={{ ...styles.card, ...designStyle(design) }}>
          <div dangerouslySetInnerHTML={{ __html: mdToHtml(cv.cvMarkdown) }} />
          <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid currentColor", opacity: 0.2 }} />
          <h3 style={{ marginTop: 0 }}>Cover letter</h3>
          <div dangerouslySetInnerHTML={{ __html: mdToHtml(cv.coverLetterMarkdown || "—") }} />
          <p style={styles.prov}>{provider.startsWith("claude") ? `AI-written by ${provider}` : "Draft — review and edit before applying"}. Advisory.</p>
        </article>
      ) : null}
    </section>
  );
}

function designStyle(key: string): Record<string, string> {
  if (key === "healthcare") return { fontFamily: "Georgia, serif", color: "#1b160e", background: "#fbf9f4", borderTop: "6px solid #e0a500" };
  if (key === "professional") return { fontFamily: "Inter, system-ui, sans-serif", color: "#171511", background: "#fff", borderTop: "6px solid #2a2114" };
  return { fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#1b160e", background: "#fffdf7", borderTop: "6px solid #e0a500" };
}

const styles = {
  wrap: { padding: "8px 0 40px" },
  cardBanner: { background: "#faf6ec", border: "1px solid #f0e2c0", borderRadius: 10, color: "#8a5a00", fontSize: 14, fontWeight: 700, marginBottom: 16, padding: "12px 16px" },
  card: { background: "#fff", border: "1px solid #ece3d2", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.06)", marginBottom: 18, padding: 22 },
  step: { color: "#15110b", fontSize: 16, margin: "18px 0 8px" },
  hint: { color: "#8a8070", fontSize: 12, fontWeight: 500 },
  q: { color: "#6b6356", fontSize: 13, fontWeight: 700, margin: "10px 0 6px" },
  row: { display: "flex", flexWrap: "wrap" as const, gap: 12 },
  label: { color: "#1b160e", display: "flex", flexDirection: "column" as const, fontSize: 12, fontWeight: 700, gap: 4 },
  input: { border: "1px solid #e3d7c0", borderRadius: 8, minHeight: 40, padding: "0 10px", minWidth: 180 },
  chips: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  chip: { background: "#f6efdd", border: "1px solid #ece3d2", borderRadius: 999, color: "#1b160e", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "8px 14px" },
  chipOn: { background: "#e0a500", borderColor: "#e0a500", color: "#fff" },
  cta: { background: "#e0a500", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800, padding: "12px 22px" },
  notice: { color: "#e0a500", fontSize: 13, fontWeight: 700, marginLeft: 12 },
  prov: { fontSize: 11, marginTop: 16, opacity: 0.7 },
  warn: { background: "#fff6e6", border: "1px solid #f0d089", borderRadius: 8, color: "#8a5a00", fontSize: 12, marginTop: 8, padding: "8px 12px" },
  upsell: { background: "#fff6e6", border: "1px solid #f0d089", borderRadius: 10, color: "#8a5a00", fontSize: 13, lineHeight: 1.5, marginTop: 16, padding: "12px 14px" },
  billing: { color: "#a07a2a", fontSize: 11, marginTop: 6 },
  assetList: { listStyle: "none", margin: "12px 0 0", padding: 0 },
  assetItem: { alignItems: "center", borderBottom: "1px solid #f6efdd", color: "#1b160e", display: "flex", fontSize: 13, justifyContent: "space-between", padding: "8px 0" },
  remove: { background: "none", border: "none", color: "#b23b2e", cursor: "pointer", fontSize: 12, fontWeight: 700 },
  scoreWrap: { background: "#fbf9f4", border: "1px solid #ece3d2", borderRadius: 12, marginTop: 16, padding: "14px 16px" },
  scoreHead: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: "8px 18px", justifyContent: "space-between" },
  scoreLabel: { color: "#6b6356", fontSize: 12, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase" as const },
  scoreNum: { fontSize: 32, fontWeight: 800, lineHeight: 1 },
  scoreOf: { color: "#6b6356", fontSize: 14, fontWeight: 700, marginLeft: 6 },
  scoreBarTrack: { background: "#f0e8d8", borderRadius: 999, flex: "1 1 160px", height: 10, minWidth: 140, overflow: "hidden" as const },
  scoreBarFill: { borderRadius: 999, height: "100%", transition: "width .4s ease" },
  scoreGaps: { color: "#1b160e", fontSize: 13, marginTop: 12 },
  scoreGapList: { margin: "6px 0 0", paddingLeft: 18 },
  scoreMax: { color: "#e0a500", fontSize: 13, fontWeight: 700, margin: "12px 0 0" },
  scoreUpsell: { background: "#fff6e6", border: "1px solid #f0d089", borderRadius: 8, color: "#8a5a00", fontSize: 12.5, lineHeight: 1.5, margin: "12px 0 0", padding: "9px 12px" }
} as const;
