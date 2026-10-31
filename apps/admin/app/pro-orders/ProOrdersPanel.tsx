"use client";

import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  workerRef: string;
  plan: string;
  priceMinor: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
};
type State = "loading" | "denied" | "error" | "ready";

const money = (m: number, c: string) => (m / 100).toLocaleString("en-CA", { style: "currency", currency: c });

export function ProOrdersPanel() {
  const [state, setState] = useState<State>("loading");
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cv-pro-orders", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) return setState("denied");
      if (!res.ok) return setState("error");
      setOrders(((await res.json()) as { orders: Order[] }).orders ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = useCallback(async (id: string, action: "confirm" | "reject") => {
    setBusy(id); setMsg("");
    try {
      const res = await fetch(`/api/cv-pro-orders/${id}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!res.ok) { setMsg(`Could not ${action} the order.`); return; }
      setMsg(action === "confirm" ? "E-transfer confirmed — Worker Pro granted." : "Order rejected.");
      await load();
    } finally { setBusy(null); }
  }, [load]);

  if (state === "loading") return <p style={styles.text}>Loading the Pro order queue.</p>;
  if (state === "denied") return <p style={styles.text}>Administrator access required.</p>;
  if (state === "error") return <p style={styles.text}>The order queue could not be reached.</p>;

  return (
    <section style={styles.wrap}>
      {msg ? <p style={styles.notice} role="status">{msg}</p> : null}
      <p style={styles.lead}>Confirm an order only after you have verified the Interac e-transfer arrived at billing@joblop.com (match the reference = order id). Confirming grants Worker Pro.</p>
      {orders.length === 0 ? (
        <p style={styles.text}>No Worker Pro orders awaiting review.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr><th style={styles.th}>Order (reference)</th><th style={styles.th}>Worker</th><th style={styles.th}>Amount</th><th style={styles.th}>Method</th><th style={styles.th}>Status</th><th style={styles.th}>Actions</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={styles.tdMono}>{o.id}</td>
                <td style={styles.tdMono}>{o.workerRef.slice(0, 8)}…</td>
                <td style={styles.td}>{money(o.priceMinor, o.currency)}</td>
                <td style={styles.td}>{o.method === "e_transfer" ? "Interac e-transfer" : o.method}</td>
                <td style={styles.td}>{o.status === "payment_claimed" ? "Claimed sent" : o.status === "pending_payment" ? "Awaiting payment" : o.status}</td>
                <td style={styles.td}>
                  <button type="button" style={styles.confirm} disabled={busy === o.id} onClick={() => void act(o.id, "confirm")}>Confirm</button>
                  <button type="button" style={styles.reject} disabled={busy === o.id} onClick={() => void act(o.id, "reject")}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const styles = {
  wrap: { padding: "24px clamp(18px, 5vw, 64px)" },
  lead: { color: "#f4efe4", fontSize: 14, marginBottom: 14, maxWidth: 820 },
  notice: { color: "#f4efe4", fontSize: 14, fontWeight: 700 },
  text: { color: "#f4efe4", fontSize: 15, padding: "24px clamp(18px, 5vw, 64px)" },
  table: { background: "#fff", border: "1px solid rgba(201, 162, 75, 0.16)", borderCollapse: "collapse" as const, borderRadius: 14, width: "100%" },
  th: { borderBottom: "1px solid rgba(201, 162, 75, 0.16)", color: "#f4efe4", fontSize: 12, padding: 10, textAlign: "left" as const, textTransform: "uppercase" as const },
  td: { borderBottom: "1px solid rgba(201, 162, 75, 0.16)", color: "#f4efe4", fontSize: 14, padding: 10 },
  tdMono: { borderBottom: "1px solid rgba(201, 162, 75, 0.16)", color: "#f4efe4", fontFamily: "monospace", fontSize: 12, padding: 10 },
  confirm: { background: "#171511", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, marginRight: 8, padding: "8px 14px" },
  reject: { background: "#fff", border: "1px solid #b23b2e", borderRadius: 8, color: "#b23b2e", cursor: "pointer", fontWeight: 700, padding: "8px 12px" }
} as const;
