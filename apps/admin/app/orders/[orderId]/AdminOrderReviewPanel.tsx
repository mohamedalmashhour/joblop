"use client";

import { useCallback, useEffect, useState } from "react";
import { usePageText } from "../../i18n/pageText";
import { ordersText } from "../text";

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
  perks: string | null;
  status: string;
  timezone: string;
  startAt: string;
  endAt: string;
  children: readonly Child[];
}>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; order: Order };
type Action = "admin-review" | "request-information" | "approve-for-dispatch";

export function AdminOrderReviewPanel({ orderId }: Readonly<{ orderId: string }>) {
  const t = usePageText(ordersText);
  const statusLabel = (code: string) => t.statusLabel[code] ?? code.replaceAll("_", " ");
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
      setMessage(t.reasonTooShort);
      return;
    }
    let marginPpm: number | undefined;
    if (action === "approve-for-dispatch") {
      const pct = Number(cfg.margin);
      if (!Number.isFinite(pct) || pct < 0 || pct > 90) { setMessage(t.marginRange); return; }
      marginPpm = Math.round(pct * 10_000);
    }
    setBusy(child.jobRequestId);
    setMessage(t.applying);
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
      if (response.status === 409) { setMessage(t.roleChanged); await load(); return; }
      if (!response.ok) { setMessage(t.transitionFailed); return; }
      setMessage("");
      await load();
    } finally {
      setBusy(null);
    }
  }, [inputs, load, t]);

  const approveAll = useCallback(async () => {
    setBusy("__all__");
    setMessage(t.approvingAll);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/approve-standard`, {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      if (!response.ok) { setMessage(t.batchFailed); return; }
      const payload = (await response.json()) as { summary?: { approved: number; escalated: number; skipped: number } };
      const sm = payload.summary;
      setMessage(sm ? t.batchSummary(sm.approved, sm.escalated, sm.skipped) : "");
      await load();
    } finally {
      setBusy(null);
    }
  }, [orderId, load, t]);

  const escalate = useCallback(async (child: Child) => {
    const cfg = cfgFor(child);
    if (cfg.reason.trim().length < 4) { setMessage(t.escalateReasonTooShort); return; }
    setBusy(child.jobRequestId);
    setMessage(t.escalating);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/roles/${encodeURIComponent(child.jobRequestId)}/escalate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: cfg.reason.trim() })
      });
      if (!response.ok) { setMessage(response.status === 409 ? t.escalationOpen : t.escalationFailed); return; }
      setMessage(t.escalationRaised);
      await load();
    } finally {
      setBusy(null);
    }
  }, [orderId, inputs, load, t]);

  if (state.status === "loading") return <p style={styles.text}>{t.orderLoading}</p>;
  if (state.status === "denied") return <p style={styles.text}>{t.orderDenied}</p>;
  if (state.status === "error") return <p style={styles.text}>{t.orderError}</p>;

  const order = state.order;
  const schedule = `${new Date(order.startAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} – ${new Date(order.endAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} (${order.timezone})`;

  return (
    <section style={styles.wrap}>
      <div style={styles.cardHead}>
        <div>
          <h2 style={styles.h2}>{order.title}</h2>
          <p style={styles.meta}>{order.orderNumber} · {t.org} {order.organizationId.slice(0, 8)} · {schedule}</p>
        </div>
        <span style={styles.badge}>{statusLabel(order.status)}</span>
      </div>
      {message ? <p style={styles.notice} role="status">{message}</p> : null}
      {order.perks ? <p style={styles.meta}>{t.perks(order.perks)}</p> : null}

      <button type="button" style={styles.button} disabled={busy !== null} onClick={() => void approveAll()}>{t.approveAll}</button>

      {order.children.map((child) => {
        const cfg = cfgFor(child);
        const busyThis = busy === child.jobRequestId;
        return (
          <article key={child.jobRequestId} style={styles.card}>
            <div style={styles.cardHead}>
              <h3 style={styles.h3}>{child.title} × {child.numberOfWorkers}</h3>
              <span style={styles.badge}>{statusLabel(child.status)}</span>
            </div>
            <p style={styles.meta}>{child.jobRequestNumber}</p>
            <p style={child.recommendation === "escalate" ? styles.recEscalate : styles.recApprove}>
              {child.recommendation === "escalate" ? t.aiEscalate : t.aiApprove}
              {" \u00b7 "}
              {child.reasonCodes.map((code) => t.reasonText[code] ?? code).join(", ")}
            </p>
            {child.adminReviewReason ? <p style={styles.meta}>{t.infoRequested(child.adminReviewReason)}</p> : null}

            {child.status === "submitted" ? (
              <button type="button" style={styles.button} disabled={busyThis} onClick={() => void act(child, "admin-review")}>{t.beginReview}</button>
            ) : null}

            {child.status === "admin_review" ? (
              <div style={styles.actions}>
                <label style={styles.label}>{t.marginPercent}
                  <input style={styles.input} type="number" min={0} max={90} value={cfg.margin} onChange={(e) => setInput(child, { margin: e.target.value })} />
                </label>
                <button type="button" style={styles.button} disabled={busyThis} onClick={() => void act(child, "approve-for-dispatch")}>{t.approveForDispatch}</button>
                <label style={styles.label}>{t.reasonLabel}
                  <input style={styles.input} value={cfg.reason} onChange={(e) => setInput(child, { reason: e.target.value })} />
                </label>
                <button type="button" style={styles.buttonAlt} disabled={busyThis} onClick={() => void act(child, "request-information")}>{t.requestInformation}</button>
                <button type="button" style={styles.buttonAlt} disabled={busyThis} onClick={() => void escalate(child)}>{t.escalateToOwner}</button>
              </div>
            ) : null}
          </article>
        );
      })}

      <a href="/orders" style={styles.button}>{t.backToOrders}</a>
    </section>
  );
}

const styles = {
  wrap: { padding: "32px clamp(18px, 5vw, 64px)" },
  card: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 14, boxShadow: "0 12px 30px rgba(0,0,0,.4)", margin: "14px 0", padding: 22 },
  cardHead: { alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#f4efe4", fontSize: 26, margin: 0 },
  h3: { color: "#f4efe4", fontSize: 20, margin: 0 },
  badge: { background: "#000000", borderRadius: 99, color: "#f4efe4", fontSize: 12, fontWeight: 900, padding: "7px 10px", textTransform: "uppercase" as const },
  meta: { color: "#f4efe4", fontSize: 13 },
  text: { color: "#f4efe4", fontSize: 15, padding: "32px clamp(18px, 5vw, 64px)" },
  notice: { color: "#f4efe4", fontSize: 14, fontWeight: 700 },
  actions: { alignItems: "flex-end", display: "flex", flexWrap: "wrap" as const, gap: 12, marginTop: 10 },
  label: { color: "#f4efe4", display: "flex", flexDirection: "column" as const, fontSize: 13, fontWeight: 700, gap: 4 },
  input: { border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, minHeight: 40, padding: "0 10px" },
  button: { alignItems: "center", background: "#171511", borderRadius: 8, border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", fontWeight: 800, minHeight: 44, padding: "0 16px", textDecoration: "none" },
  buttonAlt: { alignItems: "center", background: "#b4541f", borderRadius: 8, border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  recApprove: { color: "#f4efe4", fontSize: 13, fontWeight: 800 },
  recEscalate: { color: "#b3a894", fontSize: 13, fontWeight: 800 }
} as const;
