"use client";

import { useEffect, useState } from "react";

// Admin console for Platform Greetings & Certificates. Everything here goes through the admin BFF
// (/api/greetings*, /api/certificates), which proxies to the authority-gated platform API. Nothing is
// sent until the admin presses Send / Issue, and the result (recipient count + email outcome) is shown.

type Holiday = { key: string; en: string; fr: string; date: string; daysUntil: number };
type Recipient = { userId: string; name: string; kind: "worker" | "employer"; email: string | null };
type SentGreeting = { id: string; title: string; occasionKey: string | null; audienceScope: string; recipientCount: number; sentAt: string };
type IssuedCert = { id: string; recipientName: string; recipientKind: string; kind: string; title: string; serial: string; issuedAt: string };

type AudienceScope = "all" | "workers" | "employers" | "selected";
const CERT_KINDS = [
  { key: "super_worker", label: "Super Worker" },
  { key: "most_reliable", label: "Most Reliable" },
  { key: "employee_of_month", label: "Employee of the Month" },
  { key: "top_employer", label: "Top Employer" },
  { key: "custom", label: "Custom…" }
] as const;
const TEMPLATES = [
  { key: "holiday", label: "Holiday card" },
  { key: "thank_you", label: "Thank you" },
  { key: "welcome", label: "Welcome" },
  { key: "custom", label: "Plain" }
] as const;

export function AdminGreetingsPanel() {
  const [tab, setTab] = useState<"greetings" | "certificates">("greetings");
  return (
    <section style={styles.wrap}>
      <div style={styles.tabs}>
        <button type="button" style={{ ...styles.tab, ...(tab === "greetings" ? styles.tabOn : {}) }} onClick={() => setTab("greetings")}>Greeting cards</button>
        <button type="button" style={{ ...styles.tab, ...(tab === "certificates" ? styles.tabOn : {}) }} onClick={() => setTab("certificates")}>Certificates</button>
      </div>
      {tab === "greetings" ? <GreetingsTab /> : <CertificatesTab />}
    </section>
  );
}

// ── recipient picker (shared by both tabs) ────────────────────────────────────────────────────────
function RecipientPicker({ single, selected, onChange }: { single?: boolean; selected: Recipient[]; onChange: (r: Recipient[]) => void }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "worker" | "employer">("all");
  const [results, setResults] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    let active = true;
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/greetings/recipients?q=${encodeURIComponent(q.trim())}&kind=${kind}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (active) setResults((d.recipients ?? []) as Recipient[]); })
        .catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [q, kind]);

  const add = (r: Recipient) => {
    if (single) { onChange([r]); setQ(""); setResults([]); return; }
    if (!selected.some((s) => s.userId === r.userId)) onChange([...selected, r]);
  };
  const remove = (userId: string) => onChange(selected.filter((s) => s.userId !== userId));

  return (
    <div>
      <div style={styles.row}>
        <input style={styles.input} placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={styles.input} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="all">Workers &amp; employers</option>
          <option value="worker">Workers</option>
          <option value="employer">Employers</option>
        </select>
      </div>
      {searching ? <p style={styles.hint}>Searching…</p> : null}
      {results.length > 0 ? (
        <ul style={styles.results}>
          {results.map((r) => (
            <li key={r.userId} style={styles.resultItem}>
              <span>{r.name} <span style={styles.kindTag}>{r.kind}</span>{r.email ? <span style={styles.hint}> · {r.email}</span> : null}</span>
              <button type="button" style={styles.addBtn} onClick={() => add(r)}>Add</button>
            </li>
          ))}
        </ul>
      ) : null}
      {selected.length > 0 ? (
        <div style={styles.chips}>
          {selected.map((s) => (
            <span key={s.userId} style={styles.chip}>{s.name} <button type="button" style={styles.chipX} onClick={() => remove(s.userId)} aria-label="Remove">✕</button></span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GreetingsTab() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [occasionKey, setOccasionKey] = useState<string>("");
  const [templateKey, setTemplateKey] = useState<string>("holiday");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scope, setScope] = useState<AudienceScope>("all");
  const [selected, setSelected] = useState<Recipient[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState<SentGreeting[]>([]);

  const loadSent = () => { fetch("/api/greetings", { cache: "no-store" }).then((r) => r.json()).then((d) => setSent((d.greetings ?? []) as SentGreeting[])).catch(() => undefined); };
  useEffect(() => {
    fetch("/api/greetings/holidays", { cache: "no-store" }).then((r) => r.json()).then((d) => setHolidays((d.holidays ?? []) as Holiday[])).catch(() => undefined);
    loadSent();
  }, []);

  const pickOccasion = (key: string) => {
    setOccasionKey(key);
    const h = holidays.find((x) => x.key === key);
    if (h) {
      setTemplateKey("holiday");
      if (!title.trim()) setTitle(`Happy ${h.en}!`);
      if (!message.trim()) setMessage(`Wishing you a wonderful ${h.en} from all of us at Joblop. Thank you for being part of our community.`);
    }
  };

  const send = async () => {
    if (!title.trim() || !message.trim()) { setMsg("Add a title and a message."); return; }
    if (scope === "selected" && selected.length === 0) { setMsg("Select at least one recipient."); return; }
    setBusy(true); setMsg("Sending…");
    try {
      const res = await fetch("/api/greetings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ occasionKey: occasionKey || null, templateKey, title: title.trim(), message: message.trim(), audienceScope: scope, recipientUserIds: selected.map((s) => s.userId) })
      });
      const d = await res.json();
      if (d.error) { setMsg(d.message ?? "Could not send."); return; }
      const emailBit = d.emailConfigured ? ` · emailed ${d.emailSent}${d.emailError ? `, ${d.emailError} failed` : ""}` : " · email not configured (in-app only)";
      setMsg(`✓ Sent to ${d.delivered} recipient${d.delivered === 1 ? "" : "s"}${emailBit}.`);
      setTitle(""); setMessage(""); setOccasionKey(""); setSelected([]);
      loadSent();
    } catch { setMsg("Could not send. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.h2}>Compose a greeting</h2>
      <div style={styles.row}>
        <label style={styles.label}>Occasion
          <select style={styles.input} value={occasionKey} onChange={(e) => pickOccasion(e.target.value)}>
            <option value="">Custom (no holiday)</option>
            {holidays.map((h) => <option key={h.key} value={h.key}>{h.en} — {h.date}{h.daysUntil === 0 ? " (today)" : ` (in ${h.daysUntil}d)`}</option>)}
          </select>
        </label>
        <label style={styles.label}>Card design
          <select style={styles.input} value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
            {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>
      </div>
      <label style={styles.labelFull}>Title
        <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Happy Canada Day!" maxLength={160} />
      </label>
      <label style={styles.labelFull}>Message
        <textarea style={{ ...styles.input, minHeight: 110, paddingTop: 10 }} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your greeting…" maxLength={2000} />
      </label>
      <h2 style={styles.h2}>Who receives it</h2>
      <div style={styles.audience}>
        {([["all", "Everyone"], ["workers", "All workers"], ["employers", "All employers"], ["selected", "Selected by name"]] as const).map(([v, l]) => (
          <label key={v} style={styles.radio}><input type="radio" name="scope" checked={scope === v} onChange={() => setScope(v)} /> {l}</label>
        ))}
      </div>
      {scope === "selected" ? <RecipientPicker selected={selected} onChange={setSelected} /> : null}
      <div style={styles.actions}>
        <button type="button" style={styles.cta} disabled={busy} onClick={() => void send()}>{busy ? "Sending…" : "Send greeting"}</button>
        {msg ? <span style={styles.notice}>{msg}</span> : null}
      </div>

      <h2 style={{ ...styles.h2, marginTop: 28 }}>Recently sent</h2>
      {sent.length === 0 ? <p style={styles.hint}>No greetings sent yet.</p> : (
        <ul style={styles.history}>
          {sent.map((g) => <li key={g.id} style={styles.historyItem}><strong>{g.title}</strong> <span style={styles.hint}>· {g.audienceScope} · {g.recipientCount} recipient{g.recipientCount === 1 ? "" : "s"} · {new Date(g.sentAt).toLocaleString()}</span></li>)}
        </ul>
      )}
    </div>
  );
}

function CertificatesTab() {
  const [selected, setSelected] = useState<Recipient[]>([]);
  const [kind, setKind] = useState<string>("super_worker");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [issued, setIssued] = useState<IssuedCert[]>([]);

  const loadIssued = () => { fetch("/api/certificates", { cache: "no-store" }).then((r) => r.json()).then((d) => setIssued((d.certificates ?? []) as IssuedCert[])).catch(() => undefined); };
  useEffect(() => { loadIssued(); }, []);

  const issue = async () => {
    const recipient = selected[0];
    if (!recipient) { setMsg("Pick a recipient."); return; }
    setBusy(true); setMsg("Issuing…");
    try {
      const res = await fetch("/api/certificates", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientUserId: recipient.userId, kind, title: title.trim() || null, note: note.trim() || null })
      });
      const d = await res.json();
      if (d.error) { setMsg(d.message ?? "Could not issue."); return; }
      setMsg(`✓ Issued "${d.certificate.title}" to ${d.certificate.recipientName} (serial ${d.certificate.serial}).`);
      setSelected([]); setTitle(""); setNote("");
      loadIssued();
    } catch { setMsg("Could not issue. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.h2}>Issue a certificate</h2>
      <p style={styles.hint}>Awarded to one worker or employer. It appears in their account and is printable; it&rsquo;s emailed too when email is configured.</p>
      <RecipientPicker single selected={selected} onChange={setSelected} />
      <div style={styles.row}>
        <label style={styles.label}>Certificate
          <select style={styles.input} value={kind} onChange={(e) => setKind(e.target.value)}>
            {CERT_KINDS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        {kind === "custom" ? (
          <label style={styles.label}>Title
            <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Certificate of Appreciation" maxLength={120} />
          </label>
        ) : null}
      </div>
      <label style={styles.labelFull}>Note / citation <span style={styles.hint}>(optional)</span>
        <textarea style={{ ...styles.input, minHeight: 80, paddingTop: 10 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For outstanding reliability over the past quarter." maxLength={400} />
      </label>
      <div style={styles.actions}>
        <button type="button" style={styles.cta} disabled={busy} onClick={() => void issue()}>{busy ? "Issuing…" : "Issue certificate"}</button>
        {msg ? <span style={styles.notice}>{msg}</span> : null}
      </div>

      <h2 style={{ ...styles.h2, marginTop: 28 }}>Recently issued</h2>
      {issued.length === 0 ? <p style={styles.hint}>No certificates issued yet.</p> : (
        <ul style={styles.history}>
          {issued.map((c) => <li key={c.id} style={styles.historyItem}><strong>{c.title}</strong> → {c.recipientName} <span style={styles.hint}>· {c.recipientKind} · {c.serial} · {new Date(c.issuedAt).toLocaleString()}</span></li>)}
        </ul>
      )}
    </div>
  );
}

const styles = {
  wrap: { background: "#0b0b0b", color: "#f4efe4", padding: "0 clamp(18px, 5vw, 64px) 56px" },
  tabs: { display: "flex", gap: 8, marginBottom: 18 },
  tab: { background: "transparent", border: "1px solid #2b2b2b", borderRadius: 10, color: "#c9c2b4", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "10px 18px" },
  tabOn: { background: "#b8862f", borderColor: "#b8862f", color: "#000" },
  card: { background: "#141414", border: "1px solid #262626", borderRadius: 14, maxWidth: 820, padding: 24 },
  h2: { color: "#fff", fontSize: 18, margin: "6px 0 12px" },
  row: { display: "flex", flexWrap: "wrap" as const, gap: 12, marginBottom: 12 },
  label: { color: "#d6cfc0", display: "flex", flex: "1 1 220px", flexDirection: "column" as const, fontSize: 12, fontWeight: 700, gap: 6 },
  labelFull: { color: "#d6cfc0", display: "flex", flexDirection: "column" as const, fontSize: 12, fontWeight: 700, gap: 6, marginBottom: 12 },
  input: { background: "#0e0e0e", border: "1px solid #333", borderRadius: 8, color: "#f4efe4", fontSize: 14, minHeight: 42, padding: "0 12px" },
  audience: { display: "flex", flexWrap: "wrap" as const, gap: 16, marginBottom: 12 },
  radio: { alignItems: "center", color: "#e6e0d2", display: "flex", fontSize: 14, fontWeight: 600, gap: 6 },
  results: { listStyle: "none", margin: "8px 0", maxHeight: 220, overflow: "auto" as const, padding: 0 },
  resultItem: { alignItems: "center", borderBottom: "1px solid #222", display: "flex", fontSize: 14, justifyContent: "space-between", padding: "8px 0" },
  kindTag: { background: "#2a2a2a", borderRadius: 6, color: "#c9a24b", fontSize: 11, fontWeight: 700, marginLeft: 6, padding: "2px 6px" },
  addBtn: { background: "#1f1f1f", border: "1px solid #3a3a3a", borderRadius: 8, color: "#f4efe4", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "6px 12px" },
  chips: { display: "flex", flexWrap: "wrap" as const, gap: 8, marginTop: 10 },
  chip: { alignItems: "center", background: "#b8862f", borderRadius: 999, color: "#000", display: "inline-flex", fontSize: 13, fontWeight: 700, gap: 6, padding: "6px 12px" },
  chipX: { background: "transparent", border: "none", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 900 },
  actions: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 12, marginTop: 8 },
  cta: { background: "#b8862f", border: "none", borderRadius: 10, color: "#000", cursor: "pointer", fontSize: 15, fontWeight: 800, padding: "12px 24px" },
  notice: { color: "#f0d089", fontSize: 13, fontWeight: 700 },
  hint: { color: "#8f887a", fontSize: 12, fontWeight: 500 },
  history: { listStyle: "none", margin: 0, padding: 0 },
  historyItem: { borderBottom: "1px solid #222", color: "#e6e0d2", fontSize: 14, padding: "10px 0" }
} as const;
