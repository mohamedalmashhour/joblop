"use client";

import { useEffect, useState } from "react";
import { styles } from "../employerStyles";
import { useT } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";
import { createContractMoney, formatMoney } from "@rwos/shared";

type Invoice = Readonly<{ id: string; invoiceNumber: string | null; status: string; totalMinor: number; createdAt: string }>;
type Payment = Readonly<{ id: string; state: string; allocatedMinor: number; refundedMinor: number }>;
type State = { status: "loading" } | { status: "denied" } | { status: "error" } | { status: "ready"; invoices: readonly Invoice[]; payments: readonly Payment[] };

const INVOICE_STATUS_KEY: Record<string, MessageKey> = {
  draft: "money.invDraft",
  approved: "money.invApproved",
  issued: "money.invIssued",
  sent: "money.invSent",
  viewed: "money.invViewed",
  partially_paid: "money.invPartlyPaid",
  paid: "money.invPaid",
  overdue: "money.invOverdue",
  disputed: "money.invDisputed",
  voided: "money.invVoided",
  refunded: "money.invRefunded"
};

const OPEN_STATUSES = ["approved", "issued", "sent", "viewed", "partially_paid", "overdue"];
const EXCLUDE_FROM_INVOICED = ["draft", "voided", "refunded"];

function cad(minor: number): string {
  return formatMoney(createContractMoney({ amountMinor: Math.max(0, minor), currency: "CAD" }));
}

export function EmployerMoneyPanel() {
  const t = useT();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const [invRes, payRes] = await Promise.all([
          fetch("/api/invoices", { cache: "no-store" }),
          fetch("/api/payments", { cache: "no-store" })
        ]);
        if (invRes.status === 401 || invRes.status === 409 || payRes.status === 401 || payRes.status === 409) {
          return setState({ status: "denied" });
        }
        if (!invRes.ok || !payRes.ok) return setState({ status: "error" });
        const invoices = ((await invRes.json()) as { invoices: Invoice[] }).invoices ?? [];
        const payments = ((await payRes.json()) as { payments: Payment[] }).payments ?? [];
        setState({ status: "ready", invoices, payments });
      } catch {
        setState({ status: "error" });
      }
    })();
  }, []);

  if (state.status === "loading") return <section style={styles.card}><p style={styles.cardText}>{t("common.loading")}</p></section>;
  if (state.status === "denied") return <section style={styles.card}><p style={styles.cardText}>{t("money.selectOrg")}</p></section>;
  if (state.status === "error") return <section style={styles.card}><p style={styles.cardText}>{t("money.loadError")}</p></section>;

  const invoicedMinor = state.invoices
    .filter((i) => !EXCLUDE_FROM_INVOICED.includes(i.status))
    .reduce((sum, i) => sum + i.totalMinor, 0);
  const paidMinor = state.payments.reduce((sum, p) => sum + Math.max(0, p.allocatedMinor - p.refundedMinor), 0);
  const outstandingMinor = Math.max(0, invoicedMinor - paidMinor);
  const openCount = state.invoices.filter((i) => OPEN_STATUSES.includes(i.status)).length;
  const recent = [...state.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <section style={styles.card}>
      <div style={styles.actionBar}>
        <div>
          <p style={styles.eyebrow}>{t("money.eyebrow")}</p>
          <h1 style={styles.cardTitle}>{t("money.title")}</h1>
          <p style={styles.cardText}>{t("money.lede")}</p>
        </div>
      </div>

      <div style={styles.cardGrid}>
        <div style={{ ...styles.card }}>
          <p style={styles.metaLabel}>{t("money.outstanding")}</p>
          <p style={{ ...styles.cardTitle, fontSize: 24 }}>{cad(outstandingMinor)}</p>
        </div>
        <div style={{ ...styles.card }}>
          <p style={styles.metaLabel}>{t("money.invoiced")}</p>
          <p style={styles.cardTitle}>{cad(invoicedMinor)}</p>
        </div>
        <div style={{ ...styles.card }}>
          <p style={styles.metaLabel}>{t("money.paid")}</p>
          <p style={styles.cardTitle}>{cad(paidMinor)}</p>
        </div>
        <div style={{ ...styles.card }}>
          <p style={styles.metaLabel}>{t("money.openInvoices")}</p>
          <p style={styles.cardTitle}>{openCount}</p>
        </div>
      </div>

      <h2 style={styles.cardTitle}>{t("money.recentInvoices")}</h2>
      {recent.length === 0 ? (
        <p style={styles.cardText}>{t("money.none")}</p>
      ) : (
        <ul>
          {recent.map((inv) => (
            <li key={inv.id} style={styles.cardText}>
              {inv.invoiceNumber ?? inv.id.slice(0, 8)} — {cad(inv.totalMinor)} <span style={styles.metaLabel}>({t(INVOICE_STATUS_KEY[inv.status] ?? "money.invIssued")})</span>
            </li>
          ))}
        </ul>
      )}

      <div style={styles.actionBar}>
        <a href="/employer/invoices" style={styles.footerLink}>{t("money.viewInvoices")}</a>
        <a href="/employer/payments" style={styles.footerLink}>{t("money.viewPayments")}</a>
      </div>
      <p style={styles.metaLabel}>{t("money.disclaimer")}</p>
    </section>
  );
}
