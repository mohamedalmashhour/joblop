"use client";

import { useCallback, useEffect, useState } from "react";

type Child = Readonly<{
  jobRequestId: string;
  jobRequestNumber: string;
  roleDefinitionId: string;
  title: string;
  numberOfWorkers: number;
  status: string;
  version: number;
  adminReviewReason: string | null;
  recommendation: "approve" | "escalate";
  suggestedMarginPpm: number;
  reasonCodes: readonly string[];
}>;
type Order = Readonly<{
  id: string;
  orderNumber: string;
  organizationId: string;
  title: string;
  status: string;
  timezone: string;
  startAt: string;
  endAt: string;
  children: readonly Child[];
}>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; order: Order };
type Action = "admin-review" | "request-information" | "approve-for-dispatch";

const REASON_TEXT: Record<string, string> = {
  standard: "Standard role",
  urgent_premium: "Urgent \u2014 +$5/hr premium applies",
  immediate_urgency: "Emergency (immediate) \u2014 owner review",
  high_headcount: "Large headcount \u2014 owner review"
};

export function AdminOrderReviewPanel({ orderId }: Readonly<{ orderId: string }>) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [inputs, setInputs] = useState<Record<string, { margin: string; reason: string }>>({});

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { order: Order };
      setState({ status: "ready", order: payload.order });
    } catch {
      setState({ status: "error" });
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  const cfgFor = (child: Child) => inputs[child.jobRequestId] ?? { margin: String(child.suggestedMarginPpm / 10_000), reason: "" };
  const setInput = (child: Child, patch: Partial<{ margin: string; reason: string }>) =>
    setInputs((cur) => ({ ...cur, [child.jobRequestId]: { ...cfgFor(child), ...patch } }));

  const act = useCallback(async (child: Child, action: Action) => {
    const cfg = cfgFor(child);
    if (action === "request-information" && cfg.reason.trim().length < 4) {
      setMessage("Enter a clear reason of at least four characters.");
      return;
    }
    let marginPpm: number | undefined;
    if (action === "approve-for-dispatch") {
      const pct = Number(cfg.margin);
      if (!Number.isFinite(pct) || pct < 0 || pct > 90) { setMessage("Margin must be between 0 and 90 percent."); return; }
      marginPpm = Math.round(pct * 10_000);
    }
    setBusy(child.jobRequestId);
    setMessage("Applying the governed intake transition.");
    try {
      const response = await fetch(`/api/intake/${encodeURIComponent(child.jobRequestId)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: child.version,
          ...(action === "request-information" ? { reason: cfg.reason.trim() } : {}),
          ...(marginPpm !== undefined ? { marginPpm } : {})
        })
      });
      if (response.status === 409) { setMessage("This role changed. Reloading the latest."); await load(); return; }
      if (!response.ok) { setMessage("The transition could not be applied."); return; }
      setMessage("");
      await load();
    } finally {
      setBusy(null);
    }
  }, [inputs, load]);

  if (state.status === "loading") return <p style={styles.text}>Loading the order.</p>;
  if (state.status === "denied") return <p style={styles.text}>Administrator access required.</p>;
  if (state.status === "error") return <p style={styles.text}>This order could not be reached.</p>;

  const order = state.order;
  const schedule = `${new Date(order.startAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} – ${new Date(order.endAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} (${order.timezone})`;

  return (
    <section style={styles.wrap}>
      <div style={styles.cardHead}>
        <div>
          <h2 style={styles.h2}>{order.title}</h2>
          <p style={styles.meta}>{order.orderNumber} · org {order.organizationId.slice(0, 8)} · {schedule}</p>
        </div>
        <span style={styles.badge}>{order.status.replaceAll("_", " ")}</span>
      </div>
      {message ? <p style={styles.notice} role="status">{message}</p> : null}

      {order.children.map((child) => {
        const cfg = cfgFor(child);
        const busyThis = busy === child.jobRequestId;
        return (
          <article key={child.jobRequestId} style={styles.card}>
            <div style={styles.cardHead}>
              <h3 style={styles.h3}>{child.title} × {child.numberOfWorkers}</h3>
              <span style={styles.badge}>{child.status.replaceAll("_", " ")}</span>
            </div>
            <p style={styles.meta}>{child.jobRequestNumber}</p>
            <p style={child.recommendation === "escalate" ? styles.recEscalate : styles.recApprove}>
              {child.recommendation === "escalate" ? "AI manager: escalate to owners" : "AI manager: approve"}
              {" \u00b7 "}
              {child.reasonCodes.map((code) => REASON_TEXT[code] ?? code).join(", ")}
            </p>
            {child.adminReviewReason ? <p style={styles.meta}>Info requested: {child.adminReviewReason}</p> : null}

            {child.status === "submitted" ? (
              <button type="button" style={styles.button} disabled={busyThis} onClick={() => void act(child, "admin-review")}>Begin review</button>
            ) : null}

            {child.status === "admin_review" ? (
              <div style={styles.actions}>
                <label style={styles.label}>Margin %
                  <input style={styles.input} type="number" min={0} max={90} value={cfg.margin} onChange={(e) => setInput(child, { margin: e.target.value })} />
                </label>
                <button type="button" style={styles.button} disabled={busyThis} onClick={() => void act(child, "approve-for-dispatch")}>Approve for dispatch</button>
                <label style={styles.label}>Reason (to request info)
                  <input style={styles.input} value={cfg.reason} onChange={(e) => setInput(child, { reason: e.target.value })} />
                </label>
                <button type="button" style={styles.buttonAlt} disabled={busyThis} onClick={() => void act(child, "request-information")}>Request information</button>
              </div>
            ) : null}
          </article>
        );
      })}

      <a href="/orders" style={styles.button}>Back to order review</a>
    </section>
  );
}

const styles = {
  wrap: { padding: "32px clamp(18px, 5vw, 64px)" },
  card: { background: "#fff", border: "1px solid #dbe4f0", borderRadius: 14, boxShadow: "0 12px 30px rgba(6,27,65,.08)", margin: "14px 0", padding: 22 },
  cardHead: { alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#061b41", fontSize: 26, margin: 0 },
  h3: { color: "#061b41", fontSize: 20, margin: 0 },
  badge: { background: "#e8f5f3", borderRadius: 99, color: "#075e58", fontSize: 12, fontWeight: 900, padding: "7px 10px", textTransform: "uppercase" as const },
  meta: { color: "#5a6b85", fontSize: 13 },
  text: { color: "#10233f", fontSize: 15, padding: "32px clamp(18px, 5vw, 64px)" },
  notice: { color: "#0f7f78", fontSize: 14, fontWeight: 700 },
  actions: { alignItems: "flex-end", display: "flex", flexWrap: "wrap" as const, gap: 12, marginTop: 10 },
  label: { color: "#10233f", display: "flex", flexDirection: "column" as const, fontSize: 13, fontWeight: 700, gap: 4 },
  input: { border: "1px solid #c3d0e4", borderRadius: 8, minHeight: 40, padding: "0 10px" },
  button: { alignItems: "center", background: "#0f7f78", borderRadius: 8, border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", fontWeight: 800, minHeight: 44, padding: "0 16px", textDecoration: "none" },
  buttonAlt: { alignItems: "center", background: "#b4541f", borderRadius: 8, border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  recApprove: { color: "#075e58", fontSize: 13, fontWeight: 800 },
  recEscalate: { color: "#b4541f", fontSize: 13, fontWeight: 800 }
} as const;
