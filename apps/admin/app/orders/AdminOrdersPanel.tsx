"use client";

import { useEffect, useState } from "react";

type Child = Readonly<{ jobRequestId: string; title: string; numberOfWorkers: number; status: string }>;
type Order = Readonly<{ id: string; orderNumber: string; organizationId: string; title: string; status: string; children: readonly Child[] }>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; orders: readonly Order[] };

export function AdminOrdersPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
        if (!response.ok) return setState({ status: "error" });
        const payload = (await response.json()) as { orders: Order[] };
        setState({ status: "ready", orders: payload.orders ?? [] });
      } catch {
        setState({ status: "error" });
      }
    })();
  }, []);

  if (state.status === "loading") return <p style={styles.text}>Loading the order-review queue.</p>;
  if (state.status === "denied") return <p style={styles.text}>Administrator access required. Sign in with an authorized platform account.</p>;
  if (state.status === "error") return <p style={styles.text}>The order-review queue could not be reached.</p>;
  if (state.orders.length === 0) return <p style={styles.text}>No orders are awaiting review.</p>;

  return (
    <div style={styles.grid}>
      {state.orders.map((order) => {
        const pending = order.children.filter((c) => c.status === "submitted" || c.status === "admin_review").length;
        return (
          <article key={order.id} style={styles.card}>
            <div style={styles.cardHead}>
              <h2 style={styles.h2}>{order.title}</h2>
              <span style={styles.badge}>{order.status.replaceAll("_", " ")}</span>
            </div>
            <p style={styles.meta}>{order.orderNumber} · {order.children.length} role line(s) · {pending} awaiting action</p>
            <ul style={styles.list}>
              {order.children.map((c) => (
                <li key={c.jobRequestId} style={styles.text}>{c.title} × {c.numberOfWorkers} <span style={styles.meta}>({c.status.replaceAll("_", " ")})</span></li>
              ))}
            </ul>
            <a href={`/orders/${encodeURIComponent(order.id)}`} style={styles.button}>Review order</a>
          </article>
        );
      })}
    </div>
  );
}

const styles = {
  grid: { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", padding: "32px clamp(18px, 5vw, 64px)" },
  card: { background: "#fff", border: "1px solid #faf6ec", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.08)", padding: 22 },
  cardHead: { alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#000000", fontSize: 22, margin: 0 },
  badge: { background: "#faf6ec", borderRadius: 99, color: "#171511", fontSize: 12, fontWeight: 900, padding: "7px 10px", textTransform: "uppercase" as const },
  meta: { color: "#171511", fontSize: 13 },
  list: { margin: "10px 0" },
  text: { color: "#171511", fontSize: 15, lineHeight: 1.5 },
  button: { alignItems: "center", background: "#171511", borderRadius: 8, color: "#fff", display: "inline-flex", fontWeight: 800, marginTop: 12, minHeight: 44, padding: "0 16px", textDecoration: "none" }
} as const;
