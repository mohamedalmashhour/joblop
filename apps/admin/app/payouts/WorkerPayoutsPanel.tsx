"use client";

import { useCallback, useEffect, useState } from "react";
import { canSendTestPayout, payoutStatusLabel, type StaffPayout } from "./payoutCopy";

type State =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "ready"; items: readonly StaffPayout[]; testPayoutEnabled: boolean };

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function WorkerPayoutsPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/worker-payouts", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { items?: StaffPayout[]; testPayoutEnabled?: boolean };
      setState({
        status: "ready",
        items: payload.items ?? [],
        testPayoutEnabled: payload.testPayoutEnabled === true
      });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sendTestPayout = useCallback(async (id: string) => {
    setBusy(id);
    setMessage("Sending the test payout.");
    try {
      const response = await fetch(`/api/worker-payouts/${encodeURIComponent(id)}/test-payout`, { method: "POST" });
      if (!response.ok) {
        setMessage("The test payout did not go through, and the payout was not marked paid. Refresh and try again.");
        return;
      }
      setMessage("Test payout sent. No real money moved.");
      await load();
    } catch {
      setMessage("The test payout could not be confirmed. Refresh to check its status before trying again.");
    } finally {
      setBusy(null);
    }
  }, [load]);

  if (state.status === "loading") return <p style={styles.text}>Loading worker payouts.</p>;
  if (state.status === "denied") return <p style={styles.text}>Your session has ended or this account has no access.</p>;
  if (state.status === "error") return <p style={styles.text}>Worker payouts could not be reached.</p>;

  return (
    <section style={styles.wrap}>
      <p aria-live="polite" role="status" style={styles.text}>{message}</p>
      {state.testPayoutEnabled ? null : (
        <p style={styles.text}>Test payouts are switched off, so payouts can be viewed here but not sent.</p>
      )}
      {state.items.length === 0 ? <p style={styles.text}>No worker payouts yet.</p> : null}
      {state.items.map((payout) => (
        <article key={payout.id} style={styles.card}>
          <h2 style={styles.heading}>
            {payout.workerDisplayName ?? "Worker"} · {money(payout.amountMinor, payout.currency)}
          </h2>
          <p style={styles.meta}>{payout.organizationName ?? "Employer"} · {payoutStatusLabel(payout.status)}</p>
          <p style={styles.meta}>
            {payout.paidAt ? `Paid ${day(payout.paidAt)}` : `Hold ends ${day(payout.holdUntil)}`}
            {payout.paymentRef ? ` · Reference ${payout.paymentRef}` : ""}
          </p>
          {canSendTestPayout(payout, state.testPayoutEnabled) ? (
            <button disabled={busy !== null} onClick={() => void sendTestPayout(payout.id)} style={styles.button} type="button">
              {busy === payout.id ? "Sending…" : "Send test payout"}
            </button>
          ) : null}
        </article>
      ))}
    </section>
  );
}

const styles = {
  wrap: { display: "grid", gap: 16, maxWidth: 820, padding: "0 clamp(18px, 5vw, 64px) 64px" },
  card: { background: "#141414", border: "1px solid #3a3a3a", borderRadius: 8, display: "grid", gap: 8, padding: 20 },
  heading: { color: "#fff", fontSize: 20, margin: 0 },
  meta: { color: "#d8d2c4", fontSize: 14, margin: 0 },
  text: { color: "#faf6ec", fontSize: 16, lineHeight: 1.5, margin: 0 },
  button: { background: "#fff1a8", border: 0, borderRadius: 6, color: "#000000", cursor: "pointer", fontWeight: 800, justifySelf: "start", padding: "10px 16px" }
} as const;
