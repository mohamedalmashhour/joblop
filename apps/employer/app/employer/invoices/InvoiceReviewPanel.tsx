"use client";

import { useEffect, useState } from "react";
import { invoiceBoundaries, invoiceDataTruth, invoiceStates } from "../invoiceWorkflowContent";
import { styles } from "../employerStyles";
import { LanguageSwitcher } from "../../i18n/LanguageSwitcher";
import { fmtLocale, useLocale, useT } from "../../i18n/LocaleProvider";
import { previewInvoicePaymentOptions } from "./invoicePaymentPreview";
import { findSelectedInvoice, invoiceDetailHref } from "./invoiceSelection";
import { confirmCardPayment, isInvoicePayable, startCardPayment } from "./invoiceCardPayment";
import type { RwosLocale } from "../../i18n/config";

type InvoiceSummary = Readonly<{
  id: string;
  invoiceNumber: string | null;
  status: string;
  currency: "CAD";
  subtotalMinor: number;
  taxMinor: number;
  creditMinor: number;
  totalMinor: number;
  issuedAt: string | null;
  dueAt: string | null;
  createdAt: string;
}>;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; invoices: readonly InvoiceSummary[] }
  | { status: "error"; message: string };

export function InvoiceReviewPanel({
  mode,
  invoiceId = null,
  paymentReturn = null
}: {
  mode: "list" | "detail" | "breakdown";
  invoiceId?: string | null;
  paymentReturn?: "success" | "cancel" | null;
}) {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [payBusy, setPayBusy] = useState(false);
  const [payMessage, setPayMessage] = useState<string | null>(
    paymentReturn === "cancel" ? t("inv.payCancelled") : paymentReturn === "success" ? t("inv.payConfirming") : null
  );

  // Back from Stripe's hosted page: the server checks the payment with Stripe before anything changes.
  useEffect(() => {
    if (paymentReturn !== "success" || !invoiceId) return;
    void confirmCardPayment(invoiceId, fetch).then((confirmed) => {
      setPayMessage(t(confirmed ? "inv.paySuccess" : "inv.payIncomplete"));
      setReloadKey((key) => key + 1);
    });
  }, [paymentReturn, invoiceId]);

  async function payByCard(id: string) {
    setPayBusy(true);
    setPayMessage(null);
    const url = await startCardPayment(id, fetch);
    if (url) {
      window.location.assign(url);
      return;
    }
    setPayMessage(t("inv.payUnavailable"));
    setPayBusy(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/invoices", {
          headers: { accept: "application/json" },
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) {
          setState({
            status: "error",
            message: response.status === 401 ? t("inv.signIn") : t("inv.unavailable")
          });
          return;
        }
        const payload = (await response.json()) as { invoices?: unknown };
        if (!Array.isArray(payload.invoices)) throw new Error("invalid");
        setState({ status: "ready", invoices: payload.invoices as InvoiceSummary[] });
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: t("inv.loadError") });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [reloadKey]);

  const invoices = state.status === "ready" ? state.invoices : [];
  const selected = findSelectedInvoice(invoices, invoiceId);
  const paymentPreview = selected ? previewInvoicePaymentOptions(selected) : null;
  return (
    <section style={styles.section}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <LanguageSwitcher />
      </div>
      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{t("inv.eyebrow")}</p>
          <h2 style={styles.sectionTitle}>
            {mode === "list" ? t("inv.listTitle") : (selected?.invoiceNumber ?? t("inv.detailTitle"))}
          </h2>
          <p style={styles.sectionCopy}>{t("inv.copy")}</p>
          <span style={styles.statusBadgeWarning}>{t("inv.readOnly")}</span>
        </div>
        {payMessage ? <p aria-live="polite" role="status" style={styles.cardText}>{payMessage}</p> : null}

        {state.status === "loading" ? (
          <p aria-live="polite" style={styles.cardText}>{t("inv.loading")}</p>
        ) : state.status === "error" ? (
          <p role="alert" style={styles.cardText}>{state.message}</p>
        ) : invoices.length === 0 ? (
          <p style={styles.cardText}>{t("inv.none")}</p>
        ) : mode === "list" ? (
          <div style={styles.cardGrid}>
            {invoices.map((invoice) => (
              <article key={invoice.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{invoice.invoiceNumber ?? t("inv.draft")}</h3>
                <p style={styles.cardText}>{t("inv.stateLine", { state: invoice.status })}</p>
                <p style={styles.cardText}>{t("inv.total", { amount: formatCad(invoice.totalMinor, locale) })}</p>
                <p style={styles.cardText}>{t("inv.due", { date: formatDate(invoice.dueAt, locale, t) })}</p>
                <a href={invoiceDetailHref(invoice.id)} style={{ ...styles.secondaryButton, marginTop: 12 }}>
                  {t("inv.openDetail")}
                </a>
              </article>
            ))}
          </div>
        ) : selected ? (
          <>
          <div style={styles.cardGrid}>
            {(mode === "breakdown"
              ? [
                  [t("inv.subtotal"), formatCad(selected.subtotalMinor, locale)],
                  [t("inv.tax"), formatCad(selected.taxMinor, locale)],
                  [t("inv.credits"), formatCad(selected.creditMinor, locale)],
                  [t("inv.totalLabel"), formatCad(selected.totalMinor, locale)]
                ]
              : [
                  [t("inv.number"), selected.invoiceNumber ?? t("inv.notIssued")],
                  [t("inv.stateLabel"), selected.status],
                  [t("inv.issued"), formatDate(selected.issuedAt, locale, t)],
                  [t("inv.dueLabel"), formatDate(selected.dueAt, locale, t)],
                  [t("inv.created"), formatDate(selected.createdAt, locale, t)],
                  [t("inv.totalLabel"), formatCad(selected.totalMinor, locale)]
                ]
            ).map(([label, value]) => (
              <article key={label} style={styles.card}>
                <span style={styles.metaLabel}>{label}</span>
                <p style={styles.cardText}>{value}</p>
              </article>
            ))}
          </div>
          {mode === "detail" && isInvoicePayable(selected.status) ? (
            <button disabled={payBusy} onClick={() => void payByCard(selected.id)} style={{ ...styles.primaryButton, marginTop: 18 }} type="button">
              {t("inv.payByCard")}
            </button>
          ) : null}
          {paymentPreview ? (
            <section style={{ marginTop: 18 }}>
              <p style={styles.eyebrowDark}>{t("inv.payTitle")}</p>
              <p style={styles.sectionCopy}>{t("inv.payNote")}</p>
              <div style={styles.cardGrid}>
                <article style={styles.card}>
                  <span style={styles.metaLabel}>{t("inv.payInterac")}</span>
                  <p style={styles.cardText}>{t("inv.payNoSurcharge")}</p>
                  <p style={styles.cardText}>
                    {t("inv.payTotalToPay", {
                      amount: formatCad(paymentPreview.interac.totalMinor, locale)
                    })}
                  </p>
                </article>
                <article style={styles.card}>
                  <span style={styles.metaLabel}>{t("inv.payCard")}</span>
                  <p style={styles.cardText}>
                    {t("inv.paySurcharge", {
                      amount: formatCad(
                        paymentPreview.card.surchargeMinor + paymentPreview.card.taxDeltaMinor,
                        locale
                      )
                    })}
                  </p>
                  <p style={styles.cardText}>
                    {t("inv.payTotalToPay", {
                      amount: formatCad(paymentPreview.card.totalMinor, locale)
                    })}
                  </p>
                </article>
              </div>
              <p style={styles.cardText}>{t("inv.payEstimate")}</p>
            </section>
          ) : null}
          </>
        ) : (
          <>
            <p style={styles.cardText}>{t("inv.chooseFromList")}</p>
            <a href="/employer/invoices" style={{ ...styles.secondaryButton, marginTop: 12 }}>
              {t("inv.backToList")}
            </a>
          </>
        )}
      </div>
      <section style={{ marginTop: 22 }}>
        <div style={styles.pillGrid}>
          {invoiceStates.map((item) => (
            <span key={item} style={styles.pill}>{item}</span>
          ))}
        </div>
      </section>
      <section style={{ marginTop: 22 }}>
        <div style={styles.cardGrid}>
          {[...invoiceBoundaries, ...invoiceDataTruth].map((item) => (
            <article key={item} style={styles.card}>
              <p style={styles.cardText}>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function formatCad(amountMinor: number, locale: RwosLocale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "CAD" }).format(amountMinor / 100);
}

function formatDate(value: string | null, locale: RwosLocale, t: (key: "inv.notSet") => string) {
  return value
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value))
    : t("inv.notSet");
}
