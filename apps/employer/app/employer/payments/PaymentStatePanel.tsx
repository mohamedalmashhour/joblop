"use client";

import { useEffect, useState } from "react";
import {
  employerPaymentStates,
} from "../paymentWorkflowContent";
import { styles } from "../employerStyles";
import { LanguageSwitcher } from "../../i18n/LanguageSwitcher";
import { fmtLocale, useLocale, useT } from "../../i18n/LocaleProvider";
import type { RwosLocale } from "../../i18n/config";

type PaymentSummary = Readonly<{
  id: string;
  invoiceId: string;
  state: string;
  amountMinor: number;
  allocatedMinor: number;
  refundedMinor: number;
  currency: "CAD";
  authorizationReference: string | null;
  version: number;
}>;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; payments: readonly PaymentSummary[] }
  | { status: "error"; message: string };

export function PaymentStatePanel({
  mode
}: {
  mode: "overview" | "method" | "authorization" | "settlement" | "receipt" | "exceptions";
}) {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/payments", {
          headers: { accept: "application/json" },
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) {
          setState({
            status: "error",
            message: response.status === 401 ? t("pay.signIn") : t("pay.unavailable")
          });
          return;
        }
        const payload = (await response.json()) as { payments?: unknown };
        if (!Array.isArray(payload.payments)) throw new Error("invalid");
        setState({ status: "ready", payments: payload.payments as PaymentSummary[] });
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: t("pay.loadError") });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const payments = state.status === "ready" ? state.payments : [];
  const selected = payments[0] ?? null;
  return (
    <section style={styles.section}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <LanguageSwitcher />
      </div>
      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{t("pay.eyebrow")}</p>
          <h2 style={styles.sectionTitle}>{selected?.state ?? t("pay.stateTitle")}</h2>
          <p style={styles.sectionCopy}>{t("pay.copy")}</p>
          <span style={styles.statusBadgeWarning}>{t("pay.mutationsDisabled")}</span>
        </div>
        {state.status === "loading" ? (
          <p aria-live="polite" style={styles.cardText}>{t("pay.loading")}</p>
        ) : state.status === "error" ? (
          <p role="alert" style={styles.cardText}>{state.message}</p>
        ) : payments.length === 0 ? (
          <p style={styles.cardText}>{t("pay.none")}</p>
        ) : (
          <div style={styles.cardGrid}>
            {payments.map((payment) => (
              <article key={payment.id} style={styles.card}>
                <span style={styles.metaLabel}>{t("pay.invoiceLabel", { id: payment.invoiceId })}</span>
                <p style={styles.cardText}>{t("pay.state", { state: payment.state })}</p>
                <p style={styles.cardText}>{t("pay.requested", { amount: formatCad(payment.amountMinor, locale) })}</p>
                <p style={styles.cardText}>{t("pay.allocated", { amount: formatCad(payment.allocatedMinor, locale) })}</p>
                <p style={styles.cardText}>{t("pay.refunded", { amount: formatCad(payment.refundedMinor, locale) })}</p>
                <p style={styles.cardText}>
                  {t("pay.authorization", { status: payment.authorizationReference ? t("pay.recorded") : t("pay.notRecorded") })}
                </p>
              </article>
            ))}
          </div>
        )}
        {["method", "authorization", "settlement", "receipt", "exceptions"].includes(mode) ? (
          <button
            aria-disabled="true"
            disabled
            style={{ ...styles.secondaryButton, cursor: "not-allowed", marginTop: 18, opacity: 0.65 }}
            type="button"
          >
            {t("pay.actionUnavailable")}
          </button>
        ) : null}
      </div>
      <section style={{ marginTop: 22 }}>
        <div style={styles.pillGrid}>
          {employerPaymentStates.map((item) => (
            <span key={item} style={selected?.state === item.toLowerCase() ? styles.pill : styles.routeCard}>
              {item}
            </span>
          ))}
        </div>
      </section>
    </section>
  );
}

function formatCad(amountMinor: number, locale: RwosLocale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "CAD" }).format(amountMinor / 100);
}
