"use client";

import { useCallback, useEffect, useState } from "react";

type Escalation = Readonly<{
  id: string;
  jobRequestId: string;
  reason: string;
  jobRequestNumber: string | null;
  jobRequestTitle: string | null;
  jobRequestStatus: string | null;
  orderNumber: string | null;
  createdAt: string;
}>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; items: readonly Escalation[] };

export function AdminEscalationsPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/escalations", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { escalations: Escalation[] };
      setState({ status: "ready", items: payload.escalations ?? [] });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const close = useCallback(async (id: string, dismiss: boolean) => {
    setBusy(id);
    setMessage(dismiss ? "Dismissing the escalation." : "Resolving the escalation.");
    try {
      const response = await fetch(`/api/escalations/${encodeURIComponent(id)}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolution: notes[id]?.trim() || null, dismiss })
      });
      if (!response.ok) { setMessage("The escalation could not be closed."); return; }
      setMessage(dismiss ? "Dismissed." : "Resolved.");
      await load();
    } finally {
      setBusy(null);
    }
  }, [notes, load]);

  if (state.status === "loading") return <p style={styles.text}>Loading owner escalations.</p>;
  if (state.status === "denied") return <p style={styles.text}>Administrator access required.</p>;
  if (state.status === "error") return <p style={styles.text}>The escalation queue could not be reached.</p>;
  if (state.items.length === 0) return <p style={styles.text}>No open escalations. The owners are all caught up.</p>;

  return (
    <section style={styles.wrap}>
      {message ? <p style={styles.notice} role="status">{message}</p> : null}
      {state.items.map((e) => (
        <article key={e.id} style={styles.card}>
          <div style={styles.cardHead}>
            <h2 style={styles.h2}>{e.jobRequestTitle ?? e.jobRequestId.slice(0, 8)}</h2>
            <span style={styles.badge}>{e.jobRequestStatus?.replaceAll("_", " ") ?? "escalated"}</span>
          </div>
          <p style={styles.meta}>{[e.jobRequestNumber, e.orderNumber].filter(Boolean).join(" · ")}</p>
          <p style={styles.text}>Reason: {e.reason}</p>
          <label style={styles.label}>Resolution note (optional)
            <input style={styles.input} value={notes[e.id] ?? ""} onChange={(ev) => setNotes((n) => ({ ...n, [e.id]: ev.target.value }))} />
          </label>
          <div style={styles.actions}>
            <button type="button" style={styles.button} disabled={busy === e.id} onClick={() => void close(e.id, false)}>Mark resolved</button>
            <button type="button" style={styles.buttonAlt} disabled={busy === e.id} onClick={() => void close(e.id, true)}>Dismiss</button>
          </div>
        </article>
      ))}
    </section>
  );
}

const styles = {
  wrap: { padding: "32px clamp(18px, 5vw, 64px)" },
  card: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.08)", margin: "14px 0", padding: 22 },
  cardHead: { alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#061b41", fontSize: 22, margin: 0 },
  badge: { background: "#fde8d6", borderRadius: 99, color: "#b4541f", fontSize: 12, fontWeight: 900, padding: "7px 10px", textTransform: "uppercase" as const },
  meta: { color: "#5a6b85", fontSize: 13 },
  text: { color: "#10233f", fontSize: 15, lineHeight: 1.5 },
  notice: { color: "#0f7f78", fontSize: 14, fontWeight: 700 },
  label: { color: "#10233f", display: "flex", flexDirection: "column" as const, fontSize: 13, fontWeight: 700, gap: 4, marginTop: 8 },
  input: { border: "1px solid #c3d0e4", borderRadius: 8, minHeight: 40, padding: "0 10px" },
  actions: { display: "flex", gap: 12, marginTop: 12 },
  button: { alignItems: "center", background: "#0f7f78", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", display: "inline-flex", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  buttonAlt: { alignItems: "center", background: "#55617a", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", display: "inline-flex", fontWeight: 800, minHeight: 44, padding: "0 16px" }
} as const;
