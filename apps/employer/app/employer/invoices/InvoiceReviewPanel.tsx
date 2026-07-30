"use client";

import { useEffect, useState } from "react";
import { invoiceBoundaries, invoiceDataTruth, invoiceStates } from "../invoiceWorkflowContent";
import { styles } from "../employerStyles";

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

export function InvoiceReviewPanel({ mode }: { mode: "list" | "detail" | "breakdown" }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

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
            message:
              response.status === 401
                ? "Sign in to review invoices."
                : "Invoice records are currently unavailable."
          });
          return;
        }
        const payload = (await response.json()) as { invoices?: unknown };
        if (!Array.isArray(payload.invoices)) throw new Error("invalid");
        setState({ status: "ready", invoices: payload.invoices as InvoiceSummary[] });
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: "Invoice records could not be loaded." });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const invoices = state.status === "ready" ? state.invoices : [];
  const selected = invoices[0] ?? null;
  return (
    <section style={styles.section}>
      <div style={styles.panel}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Authenticated invoice records</p>
          <h2 style={styles.sectionTitle}>
            {mode === "list" ? "Invoice list" : (selected?.invoiceNumber ?? "Invoice detail")}
          </h2>
          <p style={styles.sectionCopy}>
            Invoice issuance and employer payment remain separate. This view cannot charge a payment
            method, mark an invoice paid, or post accounting entries.
          </p>
          <span style={styles.statusBadgeWarning}>Read-only governed view</span>
        </div>

        {state.status === "loading" ? (
          <p aria-live="polite" style={styles.cardText}>
            Loading invoice records…
          </p>
        ) : state.status === "error" ? (
          <p role="alert" style={styles.cardText}>
            {state.message}
          </p>
        ) : invoices.length === 0 ? (
          <p style={styles.cardText}>No invoices are available for this organization.</p>
        ) : mode === "list" ? (
          <div style={styles.cardGrid}>
            {invoices.map((invoice) => (
              <article key={invoice.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{invoice.invoiceNumber ?? "Draft invoice"}</h3>
                <p style={styles.cardText}>Invoice state: {invoice.status}</p>
                <p style={styles.cardText}>Total: {formatCad(invoice.totalMinor)}</p>
                <p style={styles.cardText}>Due: {formatDate(invoice.dueAt)}</p>
                <a
                  href="/employer/invoices/detail"
                  style={{ ...styles.secondaryButton, marginTop: 12 }}
                >
                  Open detail
                </a>
              </article>
            ))}
          </div>
        ) : selected ? (
          <div style={styles.cardGrid}>
            {(mode === "breakdown"
              ? [
                  ["Subtotal", formatCad(selected.subtotalMinor)],
                  ["Tax", formatCad(selected.taxMinor)],
                  ["Credits", formatCad(selected.creditMinor)],
                  ["Total", formatCad(selected.totalMinor)]
                ]
              : [
                  ["Invoice number", selected.invoiceNumber ?? "Not issued"],
                  ["Invoice state", selected.status],
                  ["Issued", formatDate(selected.issuedAt)],
                  ["Due", formatDate(selected.dueAt)],
                  ["Created", formatDate(selected.createdAt)],
                  ["Total", formatCad(selected.totalMinor)]
                ]
            ).map(([label, value]) => (
              <article key={label} style={styles.card}>
                <span style={styles.metaLabel}>{label}</span>
                <p style={styles.cardText}>{value}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
      <section style={{ marginTop: 22 }}>
        <div style={styles.pillGrid}>
          {invoiceStates.map((item) => (
            <span key={item} style={styles.pill}>
              {item}
            </span>
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

function formatCad(amountMinor: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
    amountMinor / 100
  );
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(value))
    : "Not set";
}
