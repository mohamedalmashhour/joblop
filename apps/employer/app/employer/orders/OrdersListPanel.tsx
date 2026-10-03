"use client";

import { useEffect, useState } from "react";
import { styles } from "../employerStyles";
import { useT } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";

type Child = Readonly<{ jobRequestId: string; jobRequestNumber: string; title: string; numberOfWorkers: number; status: string }>;
type Order = Readonly<{
  id: string;
  orderNumber: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  children: readonly Child[];
}>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; orders: readonly Order[] };

const ORDER_STATUS_KEY: Record<string, MessageKey> = {
  draft: "order.statusDraft",
  submitted: "order.statusSubmitted",
  admin_review: "order.statusAdminReview",
  partially_approved: "order.statusPartiallyApproved",
  approved: "order.statusApproved",
  cancelled: "order.statusCancelled",
  expired: "order.statusExpired"
};

export function OrdersListPanel() {
  const t = useT();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        if (response.status === 401 || response.status === 409) return setState({ status: "denied" });
        if (!response.ok) return setState({ status: "error" });
        const payload = (await response.json()) as { orders: Order[] };
        setState({ status: "ready", orders: payload.orders ?? [] });
      } catch {
        setState({ status: "error" });
      }
    })();
  }, []);

  return (
    <section style={styles.card}>
      <div style={styles.actionBar}>
        <div>
          <p style={styles.eyebrow}>{t("order.navTitle")}</p>
          <h1 style={styles.cardTitle}>{t("order.listTitle")}</h1>
          <p style={styles.cardText}>{t("order.listLede")}</p>
        </div>
        <a href="/employer/orders/create" style={styles.input}>{t("order.newOrder")}</a>
      </div>

      {state.status === "loading" ? <p style={styles.cardText}>{t("common.loading")}</p> : null}
      {state.status === "denied" ? <p style={styles.cardText}>{t("order.msgSelectOrg")}</p> : null}
      {state.status === "error" ? <p style={styles.cardText}>{t("common.somethingWrong")}</p> : null}
      {state.status === "ready" && state.orders.length === 0 ? <p style={styles.cardText}>{t("order.none")}</p> : null}

      {state.status === "ready" && state.orders.length > 0 ? (
        <div style={styles.cardGrid}>
          {state.orders.map((order) => (
            <article key={order.id} style={{ ...styles.card, marginTop: 12 }}>
              <div style={styles.actionBar}>
                <h2 style={styles.cardTitle}>{order.title}</h2>
                <span style={styles.metaLabel}>{t(ORDER_STATUS_KEY[order.status] ?? "order.statusDraft")}</span>
              </div>
              <p style={styles.metaLabel}>{order.orderNumber}</p>
              <ul>
                {order.children.map((child) => (
                  <li key={child.jobRequestId} style={styles.cardText}>
                    {child.title} × {child.numberOfWorkers} <span style={styles.metaLabel}>({child.jobRequestNumber} · {child.status.replaceAll("_", " ")})</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
