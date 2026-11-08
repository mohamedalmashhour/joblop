"use client";

import { useEffect, useState } from "react";
import { usePageText } from "../i18n/pageText";
import { ordersText } from "./text";

type Child = Readonly<{ jobRequestId: string; title: string; numberOfWorkers: number; status: string }>;
type Order = Readonly<{ id: string; orderNumber: string; organizationId: string; title: string; status: string; children: readonly Child[] }>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; orders: readonly Order[] };

export function AdminOrdersPanel() {
  const t = usePageText(ordersText);
  const statusLabel = (code: string) => t.statusLabel[code] ?? code.replaceAll("_", " ");
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

  if (state.status === "loading") return <p style={styles.text}>{t.listLoading}</p>;
  if (state.status === "denied") return <p style={styles.text}>{t.listDenied}</p>;
  if (state.status === "error") return <p style={styles.text}>{t.listError}</p>;
  if (state.orders.length === 0) return <p style={styles.text}>{t.listEmpty}</p>;

  // Advisory jobs scan — surfaces what needs attention across all orders (read-only).
  const pendingLines = state.orders.reduce((sum, o) => sum + o.children.filter((c) => c.status === "submitted" || c.status === "admin_review").length, 0);
  const ordersNeedingReview = state.orders.filter((o) => o.children.some((c) => c.status === "submitted" || c.status === "admin_review")).length;

  return (
    <div style={styles.grid}>
      <div style={{ ...styles.card, borderColor: pendingLines > 0 ? "rgba(248, 184, 8,0.5)" : undefined }}>
        <strong>{ordersNeedingReview > 0 ? t.scanPending(ordersNeedingReview, pendingLines) : t.scanClear}</strong>
        <p style={styles.meta}>{t.scanNote}</p>
      </div>
      {state.orders.map((order) => {
        const pending = order.children.filter((c) => c.status === "submitted" || c.status === "admin_review").length;
        return (
          <article key={order.id} style={styles.card}>
            <div style={styles.cardHead}>
              <h2 style={styles.h2}>{order.title}</h2>
              <span style={styles.badge}>{statusLabel(order.status)}</span>
            </div>
            <p style={styles.meta}>{t.orderMeta(order.orderNumber, order.children.length, pending)}</p>
            <ul style={styles.list}>
              {order.children.map((c) => (
                <li key={c.jobRequestId} style={styles.text}>{c.title} × {c.numberOfWorkers} <span style={styles.meta}>({statusLabel(c.status)})</span></li>
              ))}
            </ul>
            <a href={`/orders/${encodeURIComponent(order.id)}`} style={styles.button}>{t.reviewOrder}</a>
          </article>
        );
      })}
    </div>
  );
}

const styles = {
  grid: { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", padding: "32px clamp(18px, 5vw, 64px)" },
  card: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 14, boxShadow: "0 12px 30px rgba(0,0,0,.4)", padding: 22 },
  cardHead: { alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#f4efe4", fontSize: 22, margin: 0 },
  badge: { background: "#000000", borderRadius: 99, color: "#f4efe4", fontSize: 12, fontWeight: 900, padding: "7px 10px", textTransform: "uppercase" as const },
  meta: { color: "#f4efe4", fontSize: 13 },
  list: { margin: "10px 0" },
  text: { color: "#f4efe4", fontSize: 15, lineHeight: 1.5 },
  button: { alignItems: "center", background: "#171511", borderRadius: 8, color: "#fff", display: "inline-flex", fontWeight: 800, marginTop: 12, minHeight: 44, padding: "0 16px", textDecoration: "none" }
} as const;
