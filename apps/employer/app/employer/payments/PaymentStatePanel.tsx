"use client";

import { useEffect, useState } from "react";
import {
  employerPaymentStates,
  paymentBoundaries,
  paymentDataTruth
} from "../paymentWorkflowContent";
import { styles } from "../employerStyles";

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
            message:
              response.status === 401
                ? "Sign in to review employer payment state."
                : "Payment records are currently unavailable."
          });
          return;
        }
        const payload = (await response.json()) as { payments?: unknown };
        if (!Array.isArray(payload.payments)) throw new Error("invalid");
        setState({ status: "ready", payments: payload.payments as PaymentSummary[] });
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: "Payment records could not be loaded." });
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
      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Authenticated employer payment records</p>
          <h2 style={styles.sectionTitle}>{selected?.state ?? "Payment state"}</h2>
          <p style={styles.sectionCopy}>
            This is employer invoice collection state only. It is not worker payment, payroll,
            settlement proof, or authority to execute a provider operation.
          </p>
          <span style={styles.statusBadgeWarning}>Mutations disabled in this view</span>
        </div>
        {state.status === "loading" ? (
          <p aria-live="polite" style={styles.cardText}>
            Loading payment records…
          </p>
        ) : state.status === "error" ? (
          <p role="alert" style={styles.cardText}>
            {state.message}
          </p>
        ) : payments.length === 0 ? (
          <p style={styles.cardText}>No employer payment attempts exist for this organization.</p>
        ) : (
          <div style={styles.cardGrid}>
            {payments.map((payment) => (
              <article key={payment.id} style={styles.card}>
                <span style={styles.metaLabel}>Invoice {payment.invoiceId}</span>
                <p style={styles.cardText}>State: {payment.state}</p>
                <p style={styles.cardText}>Requested: {formatCad(payment.amountMinor)}</p>
                <p style={styles.cardText}>Allocated: {formatCad(payment.allocatedMinor)}</p>
                <p style={styles.cardText}>Refunded: {formatCad(payment.refundedMinor)}</p>
                <p style={styles.cardText}>
                  Authorization: {payment.authorizationReference ? "Recorded" : "Not recorded"}
                </p>
              </article>
            ))}
          </div>
        )}
        {["method", "authorization", "settlement", "receipt", "exceptions"].includes(mode) ? (
          <button
            aria-disabled="true"
            disabled
            style={{
              ...styles.secondaryButton,
              cursor: "not-allowed",
              marginTop: 18,
              opacity: 0.65
            }}
            type="button"
          >
            Governed payment action unavailable
          </button>
        ) : null}
      </div>
      <section style={{ marginTop: 22 }}>
        <div style={styles.pillGrid}>
          {employerPaymentStates.map((item) => (
            <span
              key={item}
              style={selected?.state === item.toLowerCase() ? styles.pill : styles.routeCard}
            >
              {item}
            </span>
          ))}
        </div>
      </section>
      <section style={{ marginTop: 22 }}>
        <div style={styles.cardGrid}>
          {[...paymentBoundaries, ...paymentDataTruth].map((item) => (
            <article key={item} style={styles.tintedCard}>
              <p style={styles.cardText}>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function formatCad(amountMinor: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
    amountMinor / 100
  );
}
