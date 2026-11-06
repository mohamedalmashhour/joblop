"use client";

import { useCallback, useEffect, useState } from "react";

type Dispute = Readonly<{
  id: string;
  category: string;
  reason: string;
  createdAt: string;
  workerDisplayName: string | null;
  organizationName: string | null;
  payout: Readonly<{ status: string; amountMinor: number; currency: string }> | null;
}>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; items: readonly Dispute[] };

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);
}

export function WorkerDisputesPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/worker-disputes", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { items: Dispute[] };
      setState({ status: "ready", items: payload.items ?? [] });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resolve = useCallback(async (id: string) => {
    setBusy(id);
    setMessage("Settling the dispute.");
    try {
      const response = await fetch(`/api/worker-disputes/${encodeURIComponent(id)}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolution: notes[id]?.trim() ?? "" })
      });
      if (!response.ok) { setMessage("The dispute could not be settled. Refresh and try again."); return; }
      setMessage("Dispute settled. The payout is back in the normal flow.");
      await load();
    } catch {
      setMessage("The dispute could not be settled. Refresh and try again.");
    } finally {
      setBusy(null);
    }
  }, [notes, load]);

  if (state.status === "loading") return <p style={styles.text}>Loading worker disputes.</p>;
  if (state.status === "denied") return <p style={styles.text}>Your session has ended or this account has no access. <a href="/signin" style={{ color: "#fff1a8" }}>Sign in again</a>.</p>;
  if (state.status === "error") return <p style={styles.text}>The dispute queue could not be reached.</p>;

  return (
    <section style={styles.wrap}>
      <p aria-live="polite" role="status" style={styles.text}>{message}</p>
      {state.items.length === 0 ? <p style={styles.text}>No open disputes.</p> : null}
      {state.items.map((dispute) => {
        const note = notes[dispute.id] ?? "";
        return (
          <article key={dispute.id} style={styles.card}>
            <h2 style={styles.heading}>{dispute.workerDisplayName ?? "Worker"}</h2>
            <p style={styles.meta}>
              {dispute.organizationName ?? "Organization"} · {dispute.category.replaceAll("_", " ")} · raised {new Date(dispute.createdAt).toLocaleDateString()}
            </p>
            <p style={styles.text}>{dispute.reason}</p>
            <p style={styles.meta}>
              {dispute.payout
                ? `Payout ${money(dispute.payout.amountMinor, dispute.payout.currency)}, currently ${dispute.payout.status}`
                : "No payout record for this dispute."}
            </p>
            <label style={styles.label}>
              How was this settled? The worker sees this.
              <textarea
                onChange={(event) => setNotes((prev) => ({ ...prev, [dispute.id]: event.target.value }))}
                rows={3}
                style={styles.input}
                value={note}
              />
            </label>
            <button disabled={busy !== null || note.trim().length === 0} onClick={() => void resolve(dispute.id)} style={styles.button} type="button">
              {busy === dispute.id ? "Settling…" : "Settle dispute and release hold"}
            </button>
          </article>
        );
      })}
    </section>
  );
}

const styles = {
  wrap: { display: "grid", gap: 16, maxWidth: 820, padding: "0 clamp(18px, 5vw, 64px) 64px" },
  card: { background: "#141414", border: "1px solid #3a3a3a", borderRadius: 8, display: "grid", gap: 8, padding: 20 },
  heading: { color: "#fff", fontSize: 20, margin: 0 },
  meta: { color: "#d8d2c4", fontSize: 14, margin: 0 },
  text: { color: "#faf6ec", fontSize: 16, lineHeight: 1.5, margin: 0 },
  label: { color: "#faf6ec", display: "grid", fontSize: 14, gap: 6 },
  input: { background: "#000000", border: "1px solid #6a6a6a", borderRadius: 6, color: "#faf6ec", font: "inherit", padding: 10 },
  button: { background: "#fff1a8", border: 0, borderRadius: 6, color: "#000000", cursor: "pointer", fontWeight: 800, justifySelf: "start", padding: "10px 16px" }
} as const;
