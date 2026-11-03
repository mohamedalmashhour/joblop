"use client";

import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import type {
  FinanceInvoice,
  FinancePayment
} from "../api/finance/financeBoundary";

type FinanceState =
  | { status: "idle" | "loading" }
  | { status: "denied" | "error" | "unavailable"; message: string }
  | {
      status: "ready";
      invoices: readonly FinanceInvoice[];
      payments: readonly FinancePayment[];
    };

export const governedMutationLabels = [
  "Approve or issue invoice",
  "Send invoice",
  "Create or capture payment",
  "Void or refund payment",
  "Mark settlement or reconciliation complete"
] as const;

export function FinanceDataPanel() {
  const [organizationId, setOrganizationId] = useState("");
  const [state, setState] = useState<FinanceState>({ status: "idle" });

  async function runLoad(rawId: string) {
    const id = rawId.trim();
    if (!id) return;
    setState({ status: "loading" });
    const query = `organizationId=${encodeURIComponent(id)}`;
    try {
      const [invoiceResponse, paymentResponse] = await Promise.all([
        fetch(`/api/finance/invoices?${query}`, { cache: "no-store" }),
        fetch(`/api/finance/payments?${query}`, { cache: "no-store" })
      ]);
      if (!invoiceResponse.ok || !paymentResponse.ok) {
        const status = Math.max(invoiceResponse.status, paymentResponse.status);
        setState({
          status: status === 401 ? "denied" : status === 503 ? "unavailable" : "error",
          message:
            status === 401
              ? "An authenticated administrator or authorized organization session is required."
              : "Finance records could not be loaded. No fixture records were substituted."
        });
        return;
      }
      const invoicePayload = (await invoiceResponse.json()) as { invoices?: unknown };
      const paymentPayload = (await paymentResponse.json()) as { payments?: unknown };
      if (!Array.isArray(invoicePayload.invoices) || !Array.isArray(paymentPayload.payments)) {
        throw new Error("Invalid finance response.");
      }
      setState({
        status: "ready",
        invoices: invoicePayload.invoices as readonly FinanceInvoice[],
        payments: paymentPayload.payments as readonly FinancePayment[]
      });
    } catch {
      setState({
        status: "error",
        message: "Finance records could not be loaded. No fixture records were substituted."
      });
    }
  }

  function load(event: FormEvent) {
    event.preventDefault();
    void runLoad(organizationId);
  }

  // Allow finance to be reached by a direct/bookmarkable link (e.g. ?organizationId=<uuid>),
  // not only by manually pasting the reference. Scope is still enforced by the backend.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("organizationId");
      if (fromUrl) {
        setOrganizationId(fromUrl);
        void runLoad(fromUrl);
      }
    } catch {
      // URL not readable — the operator can still enter the reference manually.
    }
    // Runs once on mount: reads the URL reference only.
  }, []);

  return (
    <section aria-labelledby="durable-finance-title" style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h2 id="durable-finance-title" style={styles.h2}>Persisted invoice and payment records</h2>
          <p style={styles.help}>
            Enter the exact authorized organization reference. Results are scoped by the backend;
            this page never searches across organizations.
          </p>
        </div>
        <span style={styles.badge}>Read only</span>
      </div>
      <form onSubmit={load} style={styles.form}>
        <label style={styles.label}>
          Organization reference
          <input
            aria-label="Organization reference"
            onChange={(event) => setOrganizationId(event.target.value)}
            placeholder="UUID"
            required
            style={styles.input}
            value={organizationId}
          />
        </label>
        <button disabled={state.status === "loading"} style={styles.button} type="submit">
          {state.status === "loading" ? "Loading…" : "Load authorized records"}
        </button>
      </form>

      <div aria-live="polite">
        {state.status === "idle" ? (
          <State title="Organization scope required">
            No finance data has been requested. No synthetic success state is displayed.
          </State>
        ) : null}
        {state.status === "loading" ? (
          <State title="Loading finance records">
            Waiting for both authoritative read paths. No prior result is presented as current.
          </State>
        ) : null}
        {state.status === "denied" || state.status === "error" || state.status === "unavailable" ? (
          <State title={state.status === "denied" ? "Access denied" : "Finance data unavailable"}>
            {state.message}
          </State>
        ) : null}
        {state.status === "ready" ? (
          <FinanceResults invoices={state.invoices} payments={state.payments} />
        ) : null}
      </div>

      <section aria-labelledby="governed-actions-title" style={styles.actions}>
        <h3 id="governed-actions-title" style={styles.h3}>Governed mutations unavailable here</h3>
        <div style={styles.actionGrid}>
          {governedMutationLabels.map((label) => (
            <button disabled key={label} style={styles.disabledButton} type="button">{label}</button>
          ))}
        </div>
        <p style={styles.help}>
          These actions require their separately governed owner workflows. This read integration
          cannot create, approve, issue, capture, void, refund, settle, or reconcile money records.
        </p>
      </section>
    </section>
  );
}

function FinanceResults({
  invoices,
  payments
}: Readonly<{
  invoices: readonly FinanceInvoice[];
  payments: readonly FinancePayment[];
}>) {
  if (invoices.length === 0 && payments.length === 0) {
    return (
      <State title="No finance records">
        No invoices or payment attempts exist in the authorized organization scope.
      </State>
    );
  }
  // Read-only summary: invoiced vs paid vs outstanding (client-side aggregation of the loaded scope).
  // Single active currency per country (Canada = CAD). No money is moved here — visibility only.
  const currency = invoices[0]?.currency ?? payments[0]?.currency ?? "CAD";
  const invoicedMinor = invoices.reduce((sum, i) => sum + i.totalMinor, 0);
  const paidMinor = payments.reduce((sum, p) => sum + p.allocatedMinor, 0);
  const outstandingMinor = Math.max(0, invoicedMinor - paidMinor);
  return (
    <>
      <section aria-label="Finance summary" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={styles.card}><small>Invoiced to clients</small><strong style={{ fontSize: 20 }}>{formatMoney(invoicedMinor, currency)}</strong></div>
        <div style={styles.card}><small>Paid</small><strong style={{ fontSize: 20 }}>{formatMoney(paidMinor, currency)}</strong></div>
        <div style={styles.card}><small>Outstanding</small><strong style={{ fontSize: 20 }}>{formatMoney(outstandingMinor, currency)}</strong></div>
        <div style={{ ...styles.card, maxWidth: 320 }}><small>Transfers / payouts are disabled (test mode). This view is read-only; no money is moved by Joblop.</small></div>
      </section>
    <div style={styles.columns}>
      <section aria-labelledby="invoice-results-title">
        <h3 id="invoice-results-title" style={styles.h3}>Invoices ({invoices.length})</h3>
        {invoices.length === 0 ? <p>No invoices found.</p> : invoices.map((invoice) => (
          <article key={invoice.id} style={styles.card}>
            <strong>{invoice.invoiceNumber ?? "Number not issued"}</strong>
            <span>{invoice.status.replaceAll("_", " ")}</span>
            <span>{formatMoney(invoice.totalMinor, invoice.currency)}</span>
            <small>Reference: {invoice.id}</small>
            <small>Due: {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "Not set"}</small>
          </article>
        ))}
      </section>
      <section aria-labelledby="payment-results-title">
        <h3 id="payment-results-title" style={styles.h3}>Payment attempts ({payments.length})</h3>
        {payments.length === 0 ? <p>No payment attempts found.</p> : payments.map((payment) => (
          <article key={payment.id} style={styles.card}>
            <strong>{payment.state.replaceAll("_", " ")}</strong>
            <span>{formatMoney(payment.amountMinor, payment.currency)}</span>
            <small>Reference: {payment.id}</small>
            <small>Invoice reference: {payment.invoiceId}</small>
            <small>
              Allocated {formatMoney(payment.allocatedMinor, payment.currency)} · Refunded{" "}
              {formatMoney(payment.refundedMinor, payment.currency)}
            </small>
            <small>Provider success is not represented as bank settlement.</small>
          </article>
        ))}
      </section>
    </div>
    </>
  );
}

function State({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return <div style={styles.state}><strong>{title}</strong><p style={styles.help}>{children}</p></div>;
}

function formatMoney(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

const styles: Record<string, CSSProperties> = {
  panel: { background: "#0c0c0c", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, marginTop: 18, padding: 18 },
  header: { alignItems: "start", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#f4efe4", fontSize: 21, margin: 0 },
  h3: { color: "#f4efe4", fontSize: 17, margin: "0 0 10px" },
  help: { color: "#f4efe4", fontSize: 13, lineHeight: 1.55, margin: "6px 0 0" },
  badge: { background: "#000000", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, fontSize: 12, fontWeight: 900, padding: "7px 10px" },
  form: { alignItems: "end", display: "grid", gap: 12, gridTemplateColumns: "minmax(240px, 1fr) auto", marginTop: 18 },
  label: { display: "grid", fontSize: 13, fontWeight: 800, gap: 6 },
  input: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, font: "inherit", minHeight: 44, padding: "0 12px" },
  button: { background: "#171511", border: 0, borderRadius: 8, color: "#fff", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  state: { background: "#000000", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, marginTop: 16, padding: 14 },
  columns: { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 18 },
  card: { border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, display: "grid", gap: 6, marginTop: 10, padding: 14 },
  actions: { borderTop: "1px solid rgba(201, 162, 75, 0.16)", marginTop: 20, paddingTop: 18 },
  actionGrid: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
  disabledButton: { minHeight: 44, padding: "0 12px" }
};
