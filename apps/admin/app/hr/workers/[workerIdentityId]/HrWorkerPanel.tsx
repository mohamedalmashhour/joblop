"use client";

import { useCallback, useEffect, useState } from "react";

type Profile = { standing: string; standingReason: string | null };
type Cred = { id: string; credentialType: string; issuer: string | null; expiresAt: string | null; status: string; effectiveStatus: string; supersededById: string | null };
type Case = { id: string; caseType: string; status: string; reason: string | null; createdAt: string };
type Trust = { identity: string; backgroundCheck: string };
type Decision = { allowed: boolean; reasons: string[] };
type Record = { profile: Profile; credentials: Cred[]; cases: Case[]; verification: Trust; eligibility: { expressInterest: Decision; receiveOffer: Decision } };
type Event = { id: string; eventType: string; priorState: string | null; newState: string; reason: string | null; source: string; createdAt: string };

const STANDINGS = ["active", "review_required", "restricted", "suspended", "inactive"] as const;
const RESTRICTIVE = new Set(["restricted", "suspended", "inactive"]);
const CASE_NEXT: Record2 = {
  opened: ["under_review", "closed"],
  under_review: ["action_required", "resolved", "closed"],
  action_required: ["under_review", "resolved", "closed"],
  resolved: ["closed"],
  closed: []
};
type Record2 = { [k: string]: string[] };

export function HrWorkerPanel({ workerIdentityId }: { workerIdentityId: string }) {
  const [record, setRecord] = useState<Record | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "unavailable">("loading");
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // standing form
  const [newStanding, setNewStanding] = useState("review_required");
  const [standingReason, setStandingReason] = useState("");
  // credential form
  const [credType, setCredType] = useState("");
  const [credExpiry, setCredExpiry] = useState("");
  // case form
  const [caseType, setCaseType] = useState("");
  const [caseReason, setCaseReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [rec, ev] = await Promise.all([
        fetch(`/api/hr/workers/${encodeURIComponent(workerIdentityId)}`, { cache: "no-store" }),
        fetch(`/api/hr/workers/${encodeURIComponent(workerIdentityId)}/events?limit=50`, { cache: "no-store" })
      ]);
      if (!rec.ok) return setStatus(rec.status === 401 || rec.status === 403 ? "denied" : "unavailable");
      setRecord((await rec.json()) as Record);
      if (ev.ok) setEvents(((await ev.json()).items ?? []) as Event[]);
      setStatus("ready");
    } catch {
      setStatus("unavailable");
    }
  }, [workerIdentityId]);

  useEffect(() => { void load(); }, [load]);

  const post = useCallback(async (path: string, body: unknown, okMsg: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/hr/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) {
        const p = await r.json().catch(() => null);
        setNotice({ tone: "err", msg: p?.message ?? (r.status === 403 ? "HR authority is required." : "That action could not be completed.") });
        return false;
      }
      setNotice({ tone: "ok", msg: okMsg });
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (status === "loading") return <main style={styles.page}><p aria-live="polite">Loading worker HR record…</p></main>;
  if (status === "denied") return <main style={styles.page}><p>HR administrator authorization is required.</p></main>;
  if (status === "unavailable" || !record) return <main style={styles.page}><p role="alert">HR record unavailable. <button style={styles.btn} onClick={() => void load()}>Retry</button></p></main>;

  const changeStanding = async () => {
    if (RESTRICTIVE.has(newStanding) && !standingReason.trim()) { setNotice({ tone: "err", msg: "A reason is required for restrictive states." }); return; }
    if (RESTRICTIVE.has(newStanding) && !window.confirm(`Set standing to ${newStanding.replaceAll("_", " ")}? This is a restrictive action.`)) return;
    await post(`workers/${encodeURIComponent(workerIdentityId)}/standing`, { standing: newStanding, reason: standingReason.trim() || undefined }, "Standing updated.");
    setStandingReason("");
  };

  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <a href="/hr" style={styles.back}>← HR console</a>
        <h1 style={styles.title}>Worker HR profile</h1>
        <p style={styles.dim}>Worker identity {workerIdentityId}</p>
      </header>
      {notice ? <p role={notice.tone === "err" ? "alert" : "status"} style={notice.tone === "err" ? styles.err : styles.ok}>{notice.msg}</p> : null}

      <div style={styles.grid}>
        {/* Standing + verification indicators + eligibility impact */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Standing</h2>
          <p><span style={styles.badge}>{record.profile.standing.replaceAll("_", " ")}</span>{record.profile.standingReason ? <span style={styles.dim}> · {record.profile.standingReason}</span> : null}</p>
          <div style={styles.formRow}>
            <select aria-label="New standing" value={newStanding} onChange={(e) => setNewStanding(e.target.value)} style={styles.input}>
              {STANDINGS.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
            </select>
            <input aria-label="Reason" placeholder={RESTRICTIVE.has(newStanding) ? "Reason (required)" : "Reason (optional)"} value={standingReason} onChange={(e) => setStandingReason(e.target.value)} style={styles.input} />
            <button type="button" style={styles.btn} disabled={busy} onClick={() => void changeStanding()}>Update standing</button>
          </div>
          <h3 style={styles.h3}>Verification indicators (read-only)</h3>
          <div style={styles.chips}>
            <span style={styles.chip}>Identity: {record.verification.identity}</span>
            <span style={styles.chip}>Background: {record.verification.backgroundCheck}</span>
          </div>
          <h3 style={styles.h3}>Eligibility impact</h3>
          <p style={styles.dim}>
            Express interest: {record.eligibility.expressInterest.allowed ? "allowed" : `blocked (${record.eligibility.expressInterest.reasons.join(", ")})`} ·
            Receive offer: {record.eligibility.receiveOffer.allowed ? "allowed" : `blocked (${record.eligibility.receiveOffer.reasons.join(", ")})`}
          </p>
          <p style={styles.note}>HR shows eligibility for visibility only — it does not mutate marketplace or dispatch. Gating is centralized + currently off.</p>
        </section>

        {/* Credentials */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Credentials</h2>
          <ul style={styles.plainList}>
            {record.credentials.length === 0 ? <li style={styles.dim}>No credentials.</li> : record.credentials.map((c) => (
              <li key={c.id} style={styles.credItem}>
                <div>
                  <strong>{c.credentialType}</strong> <span style={credBadge(c.effectiveStatus)}>{c.effectiveStatus}</span>
                  {c.supersededById ? <span style={styles.dim}> · replaced</span> : null}
                  <div style={styles.dim}>{c.expiresAt ? `expires ${new Date(c.expiresAt).toLocaleDateString()}` : "no expiry"}</div>
                </div>
                {!["replaced", "revoked"].includes(c.status) ? (
                  <div style={styles.rowBtns}>
                    <button type="button" style={styles.btnSm} disabled={busy} onClick={() => void post(`credentials/${encodeURIComponent(c.id)}/renew`, { expiresAt: new Date(Date.now() + 365 * 864e5).toISOString() }, "Credential renewed.")}>Renew</button>
                    <button type="button" style={styles.btnGhostSm} disabled={busy} onClick={() => void post(`credentials/${encodeURIComponent(c.id)}/revoke`, { reason: "revoked by HR" }, "Credential revoked.")}>Revoke</button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div style={styles.formRow}>
            <input aria-label="Credential type" placeholder="Credential type" value={credType} onChange={(e) => setCredType(e.target.value)} style={styles.input} />
            <input aria-label="Expiry" type="date" value={credExpiry} onChange={(e) => setCredExpiry(e.target.value)} style={styles.input} />
            <button type="button" style={styles.btn} disabled={busy || !credType.trim()} onClick={async () => { if (await post(`workers/${encodeURIComponent(workerIdentityId)}/credentials`, { credentialType: credType.trim(), expiresAt: credExpiry ? new Date(credExpiry).toISOString() : undefined }, "Credential added.")) { setCredType(""); setCredExpiry(""); } }}>Add credential</button>
          </div>
        </section>

        {/* Cases */}
        <section style={styles.card}>
          <h2 style={styles.h2}>HR cases</h2>
          <ul style={styles.plainList}>
            {record.cases.length === 0 ? <li style={styles.dim}>No cases.</li> : record.cases.map((k) => (
              <li key={k.id} style={styles.credItem}>
                <div>
                  <strong>{k.caseType}</strong> <span style={styles.badge}>{k.status.replaceAll("_", " ")}</span>
                  {k.reason ? <div style={styles.dim}>{k.reason}</div> : null}
                </div>
                <div style={styles.rowBtns}>
                  {(CASE_NEXT[k.status] ?? []).map((to) => (
                    <button key={to} type="button" style={to === "closed" ? styles.btnGhostSm : styles.btnSm} disabled={busy} onClick={() => void post(`cases/${encodeURIComponent(k.id)}/transition`, { to }, `Case → ${to.replaceAll("_", " ")}.`)}>{to.replaceAll("_", " ")}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div style={styles.formRow}>
            <input aria-label="Case type" placeholder="Case type" value={caseType} onChange={(e) => setCaseType(e.target.value)} style={styles.input} />
            <input aria-label="Case reason" placeholder="Reason (optional)" value={caseReason} onChange={(e) => setCaseReason(e.target.value)} style={styles.input} />
            <button type="button" style={styles.btn} disabled={busy || !caseType.trim()} onClick={async () => { if (await post(`workers/${encodeURIComponent(workerIdentityId)}/cases`, { caseType: caseType.trim(), reason: caseReason.trim() || undefined }, "Case opened.")) { setCaseType(""); setCaseReason(""); } }}>Open case</button>
          </div>
        </section>

        {/* Timeline */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Audit timeline</h2>
          <ul style={styles.plainList}>
            {events.length === 0 ? <li style={styles.dim}>No events.</li> : events.map((e) => (
              <li key={e.id} style={styles.timelineItem}>
                <strong>{e.eventType.replaceAll("_", " ")}</strong> {e.priorState ? `${e.priorState} → ` : ""}{e.newState}
                <span style={styles.dim}> · {e.source} · {new Date(e.createdAt).toLocaleString()}{e.reason ? ` · ${e.reason}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function credBadge(status: string): React.CSSProperties {
  if (status === "expired" || status === "revoked") return { ...styles.badge, background: "#fee2e2", color: "#b91c1c" };
  if (status === "expiring") return { ...styles.badge, background: "#fef3c7", color: "#92400e" };
  if (status === "replaced") return { ...styles.badge, background: "#e2e8f0", color: "#475569" };
  return { ...styles.badge, background: "#dcfce7", color: "#15803d" };
}

const styles: Record2Style = {
  page: { padding: "clamp(16px, 3vw, 32px)", fontFamily: "Inter, system-ui, sans-serif", color: "#1e293b" },
  hero: { marginBottom: 12 },
  back: { color: "#0f766e", textDecoration: "none", fontWeight: 600, fontSize: 13 },
  title: { fontSize: "clamp(22px, 3.5vw, 30px)", margin: "6px 0 2px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  card: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#fff", display: "flex", flexDirection: "column", gap: 8 },
  h2: { fontSize: 16, margin: 0 },
  h3: { fontSize: 13, margin: "8px 0 2px", color: "#475569" },
  formRow: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  input: { border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", fontSize: 14, minHeight: 38 },
  plainList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  credItem: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, borderBottom: "1px solid #eef2f7", paddingBottom: 8 },
  timelineItem: { fontSize: 13, borderBottom: "1px solid #eef2f7", paddingBottom: 6 },
  rowBtns: { display: "flex", gap: 6, flexShrink: 0 },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: { background: "#eef2f7", color: "#334155", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  badge: { borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 700, background: "#f1f5f9", color: "#334155" },
  dim: { color: "#94a3b8", fontSize: 12 },
  note: { color: "#64748b", fontSize: 12, margin: 0 },
  btn: { border: "1px solid #0f766e", background: "#0f766e", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSm: { border: "1px solid #0f766e", background: "#0f766e", color: "#fff", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnGhostSm: { border: "1px solid #cbd5e1", background: "transparent", color: "#334155", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  ok: { color: "#15803d", fontSize: 13 },
  err: { color: "#b91c1c", fontSize: 13 }
};
type Record2Style = { [k: string]: React.CSSProperties };
