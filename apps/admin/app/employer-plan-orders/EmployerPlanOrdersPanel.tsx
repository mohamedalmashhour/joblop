"use client";

import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  organizationId: string;
  organizationName: string;
  plan: string;
  track: string | null;
  priceMinor: number;
  subtotalMinor?: number;
  gstMinor?: number;
  qstMinor?: number;
  totalMinor?: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
};
type State = "loading" | "denied" | "off" | "error" | "ready";

const PLAN_NAME: Record<string, string> = {
  shift_pro: "Shift Pro",
  shift_business: "Shift Business",
  contract_plus: "Contract Plus (retired — reject)"
};

const money = (m: number, c: string) => (m / 100).toLocaleString("en-CA", { style: "currency", currency: c });

/** Total to expect on the e-transfer, with the GST/QST breakdown. */
function amountCell(o: Readonly<{ priceMinor?: number; subtotalMinor?: number; gstMinor?: number; qstMinor?: number; totalMinor?: number; currency: string }>) {
  const subtotal = o.subtotalMinor ?? o.priceMinor ?? 0;
  if (o.totalMinor === undefined) return `${money(subtotal, o.currency)} + taxes`;
  return `${money(o.totalMinor, o.currency)} (${money(subtotal, o.currency)} + GST ${money(o.gstMinor ?? 0, o.currency)} + QST ${money(o.qstMinor ?? 0, o.currency)})`;
}

/** The question staff must answer "yes" to before an order is marked paid. */
export function confirmPaymentQuestion(o: Readonly<{ organizationName: string; method: string; priceMinor?: number; subtotalMinor?: number; totalMinor?: number; currency: string }>): string {
  const amount = money(o.totalMinor ?? o.subtotalMinor ?? o.priceMinor ?? 0, o.currency);
  return o.method === "e_transfer"
    ? `Confirm you received ${amount} by Interac for ${o.organizationName}?`
    : `Confirm the card payment of ${amount} for ${o.organizationName}?`;
}

export function EmployerPlanOrdersPanel() {
  const [state, setState] = useState<State>("loading");
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/employer-plan-orders", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) return setState("denied");
      if (res.status === 404) return setState("off");
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
      const res = await fetch(`/api/employer-plan-orders/${id}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!res.ok) { setMsg(`Could not ${action} the order.`); return; }
      setMsg(action === "confirm" ? "E-transfer confirmed — the plan is on for one month." : "Order rejected.");
      await load();
    } finally { setBusy(null); }
  }, [load]);

  if (state === "loading") return <p style={styles.text}>Loading the employer plan order queue.</p>;
  if (state === "denied") return <p style={styles.text}>Administrator access required.</p>;
  if (state === "off") return <p style={styles.text}>Employer plans are switched off.</p>;
  if (state === "error") return <p style={styles.text}>The order queue could not be reached.</p>;

  return (
    <section style={styles.wrap}>
      {msg ? <p style={styles.notice} role="status">{msg}</p> : null}
      {orders.length === 0 ? (
        <p style={styles.text}>No employer plan orders awaiting review.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr><th style={styles.th}>Order (reference)</th><th style={styles.th}>Company</th><th style={styles.th}>Plan</th><th style={styles.th}>Amount</th><th style={styles.th}>Method</th><th style={styles.th}>Status</th><th style={styles.th}>Actions</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={styles.tdMono}>{o.id}</td>
                <td style={styles.td}>{o.organizationName}</td>
                <td style={styles.td}>{PLAN_NAME[o.plan] ?? o.plan}</td>
                <td style={styles.td}>{amountCell(o)}</td>
                <td style={styles.td}>{o.method === "e_transfer" ? "Interac e-transfer" : "Card (test)"}</td>
                <td style={styles.td}>{o.status === "payment_claimed" ? "Claimed sent" : o.status === "pending_payment" ? "Awaiting payment" : o.status}</td>
                <td style={styles.td}>
                  <button type="button" style={styles.confirm} disabled={busy === o.id} onClick={() => { if (window.confirm(confirmPaymentQuestion(o))) void act(o.id, "confirm"); }}>Confirm</button>
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
  wrap: { padding: "24px clamp(18px, 5vw, 64px)", overflowX: "auto" as const },
  notice: { color: "#f4efe4", fontSize: 14, fontWeight: 700 },
  h2: { color: "#fff1a8", fontSize: 20, margin: "0 0 12px" },
  textInline: { color: "#f4efe4", fontSize: 15 },
  text: { color: "#f4efe4", fontSize: 15, padding: "24px clamp(18px, 5vw, 64px)" },
  table: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderCollapse: "collapse" as const, borderRadius: 14, width: "100%" },
  th: { borderBottom: "1px solid rgba(248, 184, 8, 0.16)", color: "#f4efe4", fontSize: 12, padding: 10, textAlign: "left" as const, textTransform: "uppercase" as const },
  td: { borderBottom: "1px solid rgba(248, 184, 8, 0.16)", color: "#f4efe4", fontSize: 14, padding: 10 },
  tdMono: { borderBottom: "1px solid rgba(248, 184, 8, 0.16)", color: "#f4efe4", fontFamily: "monospace", fontSize: 12, padding: 10 },
  confirm: { background: "#171511", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, marginRight: 8, padding: "8px 14px" },
  reject: { background: "#0c0c0c", border: "1px solid #e5a4a4", borderRadius: 8, color: "#e5a4a4", cursor: "pointer", fontWeight: 700, padding: "8px 12px" }
} as const;

type ListingOrder = {
  id: string;
  organizationName: string;
  jobTitle: string;
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  totalMinor: number;
  currency: string;
  discountKind: string;
  method: string;
  status: string;
};

/** Long-term job listing orders (C$99/month paid in advance). Confirming publishes the job for a month. */
export function JobListingOrdersPanel() {
  const [state, setState] = useState<State>("loading");
  const [orders, setOrders] = useState<ListingOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/job-listing-orders", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) return setState("denied");
      if (res.status === 404) return setState("off");
      if (!res.ok) return setState("error");
      setOrders(((await res.json()) as { orders: ListingOrder[] }).orders ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = useCallback(async (id: string, action: "confirm" | "reject") => {
    setBusy(id); setMsg("");
    try {
      const res = await fetch(`/api/job-listing-orders/${id}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!res.ok) { setMsg(`Could not ${action} the listing order.`); return; }
      setMsg(action === "confirm" ? "E-transfer confirmed — the job is listed for one more month." : "Listing order rejected.");
      await load();
    } finally { setBusy(null); }
  }, [load]);

  if (state === "loading") return <p style={styles.text}>Loading the long-term listing order queue.</p>;
  if (state === "denied" || state === "off") return null;
  if (state === "error") return <p style={styles.text}>The listing order queue could not be reached.</p>;

  return (
    <section style={styles.wrap}>
      <h2 style={styles.h2}>Long-term job listing orders</h2>
      {msg ? <p style={styles.notice} role="status">{msg}</p> : null}
      {orders.length === 0 ? (
        <p style={styles.textInline}>No long-term listing orders awaiting review.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr><th style={styles.th}>Order (reference)</th><th style={styles.th}>Company</th><th style={styles.th}>Job</th><th style={styles.th}>Amount</th><th style={styles.th}>Method</th><th style={styles.th}>Status</th><th style={styles.th}>Actions</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={styles.tdMono}>{o.id}</td>
                <td style={styles.td}>{o.organizationName}</td>
                <td style={styles.td}>{o.jobTitle}{o.discountKind === "first_month_half" ? " (first month 50% off)" : ""}</td>
                <td style={styles.td}>{amountCell(o)}</td>
                <td style={styles.td}>{o.method === "e_transfer" ? "Interac e-transfer" : "Card (test)"}</td>
                <td style={styles.td}>{o.status === "payment_claimed" ? "Claimed sent" : o.status === "pending_payment" ? "Awaiting payment" : o.status}</td>
                <td style={styles.td}>
                  <button type="button" style={styles.confirm} disabled={busy === o.id} onClick={() => { if (window.confirm(confirmPaymentQuestion(o))) void act(o.id, "confirm"); }}>Confirm</button>
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
