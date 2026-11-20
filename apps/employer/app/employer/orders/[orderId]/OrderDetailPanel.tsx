"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney, formatRwosDateTime } from "@rwos/shared";
import { styles } from "../../employerStyles";
import type { OrderLateCancellationDto } from "../../../api/orders/lateCancellationBoundary";
import { fmtLocale, useLocale, useT } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/messages";

type Child = Readonly<{ jobRequestId: string; jobRequestNumber: string; title: string; numberOfWorkers: number; status: string }>;
type Order = Readonly<{
  id: string;
  orderNumber: string;
  title: string;
  note: string | null;
  perks: string | null;
  urgency: string;
  requestType: string;
  timezone: string;
  startAt: string;
  endAt: string;
  status: string;
  children: readonly Child[];
}>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; order: Order };

const ORDER_STATUS_KEY: Record<string, MessageKey> = {
  draft: "order.statusDraft",
  submitted: "order.statusSubmitted",
  admin_review: "order.statusAdminReview",
  partially_approved: "order.statusPartiallyApproved",
  approved: "order.statusApproved",
  cancelled: "order.statusCancelled",
  expired: "order.statusExpired"
};

export function OrderDetailPanel({ orderId }: { orderId: string }) {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  // Late-cancellation warning, read from the server when the cancel box opens ("loading" until then).
  const [late, setLate] = useState<OrderLateCancellationDto | "loading" | null>(null);

  const openCancel = useCallback(async () => {
    setCancelOpen(true);
    setLate("loading");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      });
      const payload = response.ok ? ((await response.json()) as { lateCancellation?: OrderLateCancellationDto }) : null;
      setLate(payload?.lateCancellation ?? null);
    } catch {
      setLate(null);
    }
  }, [orderId]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      if (response.status === 401 || response.status === 409) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { order: Order };
      setState({ status: "ready", order: payload.order });
    } catch {
      setState({ status: "error" });
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  const submit = useCallback(async () => {
    setBusy(true);
    setMessage(t("order.submitting"));
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/submit`, { method: "POST", headers: { "content-type": "application/json" } });
      if (!response.ok) setMessage(t("order.submitFailed"));
      else { await load(); setMessage(""); }
    } finally {
      setBusy(false);
    }
  }, [orderId, t, load]);

  const cancel = useCallback(async () => {
    if (reason.trim().length === 0) return;
    setBusy(true);
    setMessage(t("order.cancelling"));
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (!response.ok) setMessage(t("order.cancelFailed"));
      else { setCancelOpen(false); setReason(""); await load(); setMessage(""); }
    } finally {
      setBusy(false);
    }
  }, [orderId, reason, t, load]);

  if (state.status === "loading") return <section style={styles.card}><p style={styles.cardText}>{t("common.loading")}</p></section>;
  if (state.status === "denied") return <section style={styles.card}><p style={styles.cardText}>{t("order.msgSelectOrg")}</p></section>;
  if (state.status === "error") return <section style={styles.card}><p style={styles.cardText}>{t("order.detailLoadError")}</p></section>;

  const order = state.order;
  // Shown in the order's own time zone (the label used to say Toronto while the times followed the device).
  const when = (iso: string) =>
    formatRwosDateTime(iso, { dateStyle: "medium", timeStyle: "short", timeZone: order.timezone || "America/Toronto", locale: fmtLocale(locale) });
  const schedule = `${when(order.startAt)} – ${when(order.endAt)} (${order.timezone})`;
  const canCancel = order.status !== "cancelled" && order.status !== "expired";
  const canSubmit = order.status === "draft";

  return (
    <section style={styles.card}>
      <div style={styles.actionBar}>
        <div>
          <p style={styles.eyebrow}>{t("order.detailTitle")}</p>
          <h1 style={styles.cardTitle}>{order.title}</h1>
          <p style={styles.metaLabel}>{order.orderNumber}</p>
        </div>
        <span style={styles.metaLabel}>{t(ORDER_STATUS_KEY[order.status] ?? "order.statusDraft")}</span>
      </div>

      {message ? <p style={styles.cardText} role="status">{message}</p> : null}

      <p style={styles.cardText}>{t("order.schedule")}: {schedule}</p>
      {order.note ? <p style={styles.cardText}>{order.note}</p> : null}
      {order.perks ? <p style={styles.cardText}>{t("order.perks")}: {order.perks}</p> : null}

      <h2 style={styles.cardTitle}>{t("order.roleLines")}</h2>
      <ul>
        {order.children.map((child) => (
          <li key={child.jobRequestId} style={styles.cardText}>
            {child.title} × {child.numberOfWorkers} <span style={styles.metaLabel}>({child.jobRequestNumber} · {child.status.replaceAll("_", " ")})</span>
          </li>
        ))}
      </ul>

      <div style={styles.actionBar}>
        {canSubmit ? <button type="button" style={styles.input} disabled={busy} onClick={() => void submit()}>{t("order.submitForReview")}</button> : null}
        {canCancel && !cancelOpen ? <button type="button" style={styles.footerLink} disabled={busy} onClick={() => void openCancel()}>{t("order.cancel")}</button> : null}
        <a href="/employer/orders" style={styles.footerLink}>{t("order.backToList")}</a>
      </div>

      {cancelOpen ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {late === "loading" ? <p style={styles.cardText} aria-live="polite">{t("order.lateCancelChecking")}</p> : null}
          {late !== "loading" && late?.applies ? (
            <div style={styles.warning} role="alert">
              <strong>{t("order.lateCancelTitle")}</strong>
              <p style={{ ...styles.cardText, marginTop: 4 }}>
                {t("order.lateCancelWarning", {
                  cutoff: late.cutoffHours,
                  hours: late.chargeHours,
                  workers: late.confirmedWorkers,
                  amount: formatMoney({ amountMinor: late.estimatedSubtotalMinor, currency: late.currency === "USD" ? "USD" : "CAD" })
                })}
              </p>
            </div>
          ) : null}
          <label style={styles.fieldLabel}>{t("order.cancelReason")}
            <textarea style={styles.input} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("order.cancelReasonPlaceholder")} />
          </label>
          <div style={styles.actionBar}>
            <button type="button" style={styles.input} disabled={busy || late === "loading" || reason.trim().length === 0} onClick={() => void cancel()}>{t(late !== "loading" && late?.applies ? "order.confirmLateCancel" : "order.confirmCancel")}</button>
            <button type="button" style={styles.footerLink} onClick={() => { setCancelOpen(false); setReason(""); setLate(null); }}>{t("order.keepOrder")}</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
