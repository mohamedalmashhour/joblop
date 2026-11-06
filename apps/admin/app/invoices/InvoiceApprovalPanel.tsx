"use client";

import { useCallback, useEffect, useState } from "react";
import type { FinanceInvoice } from "../api/finance/financeBoundary";
import { invoiceIssueBody, nextInvoiceAction, type InvoiceStaffAction } from "./invoiceIssue";

type Organization = Readonly<{ id: string; displayName: string }>;
type State = { status: "idle" | "loading" | "denied" | "error" } | { status: "ready"; invoices: readonly FinanceInvoice[] };

const ACTION_LABEL: Record<InvoiceStaffAction, string> = { approve: "Approve invoice", issue: "Issue invoice" };

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);
}

export function InvoiceApprovalPanel() {
  const [organizations, setOrganizations] = useState<readonly Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/payroll/organizations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return setState({ status: response.status === 401 || response.status === 403 ? "denied" : "error" });
        const payload = (await response.json()) as { items?: Organization[] };
        setOrganizations(payload.items ?? []);
      })
      .catch(() => setState({ status: "error" }));
  }, []);

  const load = useCallback(async (id: string) => {
    if (!id) return setState({ status: "idle" });
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/finance/invoices?organizationId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (response.status === 401 || response.status === 403) return setState({ status: "denied" });
      if (!response.ok) return setState({ status: "error" });
      const payload = (await response.json()) as { invoices?: FinanceInvoice[] };
      setState({ status: "ready", invoices: payload.invoices ?? [] });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  const act = useCallback(async (invoice: FinanceInvoice, action: InvoiceStaffAction) => {
    setBusy(invoice.id);
    setMessage(action === "approve" ? "Approving the invoice." : "Issuing the invoice.");
    try {
      const body = action === "issue" ? invoiceIssueBody(invoice.organizationId, invoice.version, new Date()) : { expectedVersion: invoice.version };
      const response = await fetch(
        `/api/finance/invoices/${encodeURIComponent(invoice.id)}/${action}?organizationId=${encodeURIComponent(invoice.organizationId)}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!response.ok) {
        setMessage("That didn't go through. Someone may have changed this invoice, so the list has been refreshed.");
      } else {
        setMessage(action === "approve" ? "Invoice approved. It can be issued now." : "Invoice issued.");
      }
      await load(invoice.organizationId);
    } catch {
      setMessage("That didn't go through. Refresh and try again.");
    } finally {
      setBusy(null);
    }
  }, [load]);

  if (state.status === "denied") return <p style={styles.wrapText}>Your session has ended or this account has no access. <a href="/signin" style={{ color: "#fff1a8" }}>Sign in again</a>.</p>;

  return (
    <section style={styles.wrap}>
      <label style={styles.label}>
        Employer
        <select
          onChange={(event) => { setOrganizationId(event.target.value); setMessage(""); void load(event.target.value); }}
          style={styles.input}
          value={organizationId}
        >
          <option value="">Choose employer…</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.displayName}</option>
          ))}
        </select>
      </label>
      <p aria-live="polite" role="status" style={styles.text}>{message}</p>
      {state.status === "loading" ? <p style={styles.text}>Loading invoices.</p> : null}
      {state.status === "error" ? <p role="alert" style={styles.text}>The invoices could not be loaded.</p> : null}
      {state.status === "ready" && state.invoices.length === 0 ? <p style={styles.text}>This employer has no invoices.</p> : null}
      {state.status === "ready"
        ? state.invoices.map((invoice) => {
            const action = nextInvoiceAction(invoice.status);
            return (
              <article key={invoice.id} style={styles.card}>
                <h2 style={styles.heading}>{invoice.invoiceNumber ?? "Not issued yet"}</h2>
                <p style={styles.text}>{money(invoice.totalMinor, invoice.currency)}</p>
                <p style={styles.meta}>Status: {invoice.status.replaceAll("_", " ")}</p>
                {action ? (
                  <button disabled={busy !== null} onClick={() => void act(invoice, action)} style={styles.button} type="button">
                    {busy === invoice.id ? "Working…" : ACTION_LABEL[action]}
                  </button>
                ) : null}
              </article>
            );
          })
        : null}
    </section>
  );
}

const styles = {
  wrap: { display: "grid", gap: 16, maxWidth: 820, padding: "0 clamp(18px, 5vw, 64px) 64px" },
  wrapText: { color: "#faf6ec", fontSize: 16, padding: "0 clamp(18px, 5vw, 64px) 64px" },
  card: { background: "#141414", border: "1px solid #3a3a3a", borderRadius: 8, display: "grid", gap: 8, padding: 20 },
  heading: { color: "#fff", fontSize: 20, margin: 0 },
  meta: { color: "#d8d2c4", fontSize: 14, margin: 0 },
  text: { color: "#faf6ec", fontSize: 16, lineHeight: 1.5, margin: 0 },
  label: { color: "#faf6ec", display: "grid", fontSize: 14, gap: 6, maxWidth: 420 },
  input: { background: "#000000", border: "1px solid #6a6a6a", borderRadius: 6, color: "#faf6ec", font: "inherit", padding: 10 },
  button: { background: "#fff1a8", border: 0, borderRadius: 6, color: "#000000", cursor: "pointer", fontWeight: 800, justifySelf: "start", padding: "10px 16px" }
} as const;
