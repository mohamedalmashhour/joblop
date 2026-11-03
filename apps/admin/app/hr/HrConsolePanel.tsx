"use client";

import { useCallback, useEffect, useState } from "react";

type Tab = "review" | "documents" | "expiring" | "restricted" | "search";

type CaseRow = { id: string; workerIdentityId: string; caseType: string; status: string; createdAt: string };
type CredRow = { id: string; workerIdentityId: string; credentialType: string; expiresAt: string | null; effectiveStatus: string };
type WorkerRow = { workerIdentityId: string; displayName: string | null; standing: string; updatedAt: string };
type DocRow = { id: string; workerIdentityId: string; documentType: string; expiresAt: string | null; effectiveStatus: string };

export function HrConsolePanel() {
  const [tab, setTab] = useState<Tab>("review");
  const [rows, setRows] = useState<unknown[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [q, setQ] = useState("");
  const [searchStanding, setSearchStanding] = useState("");
  const [searchCredStatus, setSearchCredStatus] = useState("");

  const load = useCallback(async (t: Tab) => {
    setStatus("loading");
    const url =
      t === "review" ? "/api/hr/queues/review?limit=25"
      : t === "documents" ? "/api/hr/documents/queue?kind=review&limit=25"
      : t === "expiring" ? "/api/hr/queues/expiring?limit=25&withinDays=45"
      : t === "restricted" ? "/api/hr/queues/standing?standings=restricted,suspended,inactive&limit=25"
      : `/api/hr/search?limit=25${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}${searchStanding ? `&standing=${searchStanding}` : ""}${searchCredStatus ? `&credentialStatus=${searchCredStatus}` : ""}`;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return setStatus(r.status === 401 || r.status === 403 ? "denied" : "unavailable");
      const payload = await r.json();
      setRows(payload.items ?? []);
      setStatus("ready");
    } catch {
      setStatus("unavailable");
    }
  }, [q, searchStanding, searchCredStatus]);

  useEffect(() => {
    if (tab !== "search") void load(tab);
  }, [tab, load]);

  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <p style={styles.eyebrow}>Resident Workforce OS / HR</p>
        <h1 style={styles.title}>HR console</h1>
        <p style={styles.lede}>Governed HR operations for HR administrators. HR consumes verification and eligibility — it never mutates marketplace, dispatch, or payroll. Every decision is audited.</p>
      </header>
      <div style={styles.tabs} role="tablist" aria-label="HR views">
        {(["review", "documents", "expiring", "restricted", "search"] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} style={tab === t ? styles.tabActive : styles.tab} onClick={() => setTab(t)}>
            {t === "review" ? "Case review" : t === "documents" ? "Documents to review" : t === "expiring" ? "Expiring credentials" : t === "restricted" ? "Restricted / suspended" : "Search"}
          </button>
        ))}
      </div>

      {tab === "search" ? (
        <form
          style={styles.searchBar}
          onSubmit={(e) => { e.preventDefault(); void load("search"); }}
        >
          <input aria-label="Search name" placeholder="Worker name…" value={q} onChange={(e) => setQ(e.target.value)} style={styles.input} />
          <select aria-label="Standing" value={searchStanding} onChange={(e) => setSearchStanding(e.target.value)} style={styles.input}>
            <option value="">Any standing</option>
            {["active", "review_required", "restricted", "suspended", "inactive"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
          </select>
          <select aria-label="Credential status" value={searchCredStatus} onChange={(e) => setSearchCredStatus(e.target.value)} style={styles.input}>
            <option value="">Any credential status</option>
            {["valid", "expiring", "expired", "replaced", "revoked"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" style={styles.button}>Search</button>
        </form>
      ) : null}

      {status === "loading" ? <p aria-live="polite">Loading…</p>
      : status === "denied" ? <p>HR administrator authorization is required.</p>
      : status === "unavailable" ? <p>HR data is unavailable. <button type="button" style={styles.button} onClick={() => void load(tab)}>Retry</button></p>
      : rows.length === 0 ? <p style={styles.muted}>Nothing in this view.</p>
      : (
        <ul style={styles.list}>
          {rows.map((row, i) => (
            <li key={i} style={styles.item}>
              {tab === "review" ? <ReviewRow r={row as CaseRow} />
              : tab === "documents" ? <DocumentRow r={row as DocRow} />
              : tab === "expiring" ? <ExpiringRow r={row as CredRow} />
              : <WorkerSummaryRow r={row as WorkerRow} />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function link(workerIdentityId: string) {
  return `/hr/workers/${encodeURIComponent(workerIdentityId)}`;
}

function ReviewRow({ r }: { r: CaseRow }) {
  return (
    <a href={link(r.workerIdentityId)} style={styles.rowLink}>
      <span><strong>Case · {r.caseType}</strong> <span style={styles.badge}>{r.status.replaceAll("_", " ")}</span></span>
      <span style={styles.dim}>{r.workerIdentityId.slice(0, 8)} · opened {new Date(r.createdAt).toLocaleDateString()}</span>
    </a>
  );
}
function ExpiringRow({ r }: { r: CredRow }) {
  return (
    <a href={link(r.workerIdentityId)} style={styles.rowLink}>
      <span><strong>{r.credentialType}</strong> <span style={r.effectiveStatus === "expired" ? styles.badgeBad : styles.badgeWarn}>{r.effectiveStatus}</span></span>
      <span style={styles.dim}>{r.workerIdentityId.slice(0, 8)}{r.expiresAt ? ` · expires ${new Date(r.expiresAt).toLocaleDateString()}` : ""}</span>
    </a>
  );
}
const AI_VERDICT_LABEL: Record<string, string> = {
  ai_approved: "AI: looks good (advisory)",
  needs_reupload: "AI: re-upload needed (advisory)",
  human_required: "AI: human review needed",
  error: "AI: unavailable"
};
function DocumentRow({ r }: { r: DocRow }) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const review = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/hr/documents/${encodeURIComponent(r.id)}/ai-review`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!res.ok) { setVerdict("error"); return; }
      const p = (await res.json()) as { verdict?: { status?: string } };
      setVerdict(p.verdict?.status ?? "human_required");
    } catch {
      setVerdict("error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ ...styles.rowLink, flexWrap: "wrap" }}>
      <span><strong>Doc · {r.documentType}</strong> <span style={styles.badgeWarn}>{r.effectiveStatus.replaceAll("_", " ")}</span></span>
      <span style={styles.dim}>{r.workerIdentityId.slice(0, 8)}{r.expiresAt ? ` · expires ${new Date(r.expiresAt).toLocaleDateString()}` : ""}</span>
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <a href={link(r.workerIdentityId)} style={styles.button}>Open worker</a>
        <button type="button" style={styles.button} disabled={busy} onClick={() => void review()}>{busy ? "AI reviewing…" : "AI review"}</button>
        {verdict ? <span style={styles.badge}>{AI_VERDICT_LABEL[verdict] ?? AI_VERDICT_LABEL.human_required}</span> : null}
      </span>
    </div>
  );
}
function WorkerSummaryRow({ r }: { r: WorkerRow }) {
  return (
    <a href={link(r.workerIdentityId)} style={styles.rowLink}>
      <span><strong>{r.displayName ?? "Worker"}</strong> <span style={styles.badge}>{r.standing.replaceAll("_", " ")}</span></span>
      <span style={styles.dim}>{r.workerIdentityId.slice(0, 8)}</span>
    </a>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "clamp(16px, 3vw, 32px)", fontFamily: "Inter, system-ui, sans-serif", color: "#f4efe4" },
  hero: { marginBottom: 16 },
  eyebrow: { color: "#f4efe4", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 },
  title: { fontSize: "clamp(24px, 4vw, 34px)", margin: "4px 0" },
  lede: { color: "#f4efe4", maxWidth: 760, margin: 0 },
  tabs: { display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" },
  tab: { border: "1px solid rgba(201, 162, 75, 0.16)", background: "transparent", color: "#f4efe4", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  tabActive: { border: "1px solid rgba(201, 162, 75, 0.16)", background: "#171511", color: "#fff", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  searchBar: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  input: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, padding: "8px 10px", fontSize: 14, minHeight: 38 },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  item: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 10, background: "#0c0c0c" },
  rowLink: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 14px", textDecoration: "none", color: "inherit" },
  badge: { background: "#000000", color: "#f4efe4", borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 700 },
  badgeWarn: { background: "#0c0c0c", color: "#b3a894", borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 700 },
  badgeBad: { background: "#fee2e2", color: "#b91c1c", borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 700 },
  dim: { color: "#ece3d2", fontSize: 12 },
  muted: { color: "#b3a894" },
  button: { border: "1px solid rgba(201, 162, 75, 0.16)", background: "#171511", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }
};
