"use client";

import { useCallback, useEffect, useState } from "react";
import type { FinanceInvoice } from "../api/finance/financeBoundary";
import { usePageText } from "../i18n/pageText";
import { useLocale } from "../i18n/LocaleProvider";
import { adminMoney } from "../i18n/adminFormat";
import { invoiceActionPath, invoiceIssueBody, invoiceSendBody, nextInvoiceAction, type InvoiceStaffAction } from "./invoiceIssue";
import { invoicesText } from "./text";
import { SignedOut } from "../shared/SignedOut";

type Organization = Readonly<{ id: string; displayName: string }>;
type State = { status: "idle" | "loading" | "denied" | "error" } | { status: "ready"; invoices: readonly FinanceInvoice[] };

function actionBody(invoice: FinanceInvoice, action: InvoiceStaffAction) {
  if (action === "issue") return invoiceIssueBody(invoice.organizationId, invoice.version, new Date());
  if (action === "send") return invoiceSendBody(invoice.id, invoice.version);
  return { expectedVersion: invoice.version };
}

type InvoicesCopy = (typeof invoicesText)["en"];

function doneMessage(t: InvoicesCopy, action: InvoiceStaffAction, employerNotice: unknown): string {
  if (action === "approve") return t.approved;
  if (action === "issue") return t.issued;
  return employerNotice === "sent" ? t.sentEmailed : t.sentNoEmail;
}


export function InvoiceApprovalPanel() {
  const t = usePageText(invoicesText);
  const adminLocale = useLocale();
  const money = (minor: number, currency: string) => adminMoney(minor, currency, adminLocale);
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
    setMessage(t.actionProgress[action]);
    try {
      const response = await fetch(
        `/api/finance/invoices/${encodeURIComponent(invoice.id)}/${invoiceActionPath(action)}?organizationId=${encodeURIComponent(invoice.organizationId)}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(actionBody(invoice, action)) }
      );
      if (!response.ok) {
        setMessage(t.changedRefreshed);
      } else {
        const payload = (await response.json().catch(() => ({}))) as { employerNotice?: unknown };
        setMessage(doneMessage(t, action, payload.employerNotice));
      }
      await load(invoice.organizationId);
    } catch {
      setMessage(t.failedRetry);
    } finally {
      setBusy(null);
    }
  }, [load, t]);

  if (state.status === "denied") return <SignedOut compact />;

  return (
    <section style={styles.wrap}>
      <label style={styles.label}>
        {t.employer}
        <select
          onChange={(event) => { setOrganizationId(event.target.value); setMessage(""); void load(event.target.value); }}
          style={styles.input}
          value={organizationId}
        >
          <option value="">{t.chooseEmployer}</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.displayName}</option>
          ))}
        </select>
      </label>
      <p aria-live="polite" role="status" style={styles.text}>{message}</p>
      {state.status === "loading" ? <p style={styles.text}>{t.loading}</p> : null}
      {state.status === "error" ? <p role="alert" style={styles.text}>{t.loadError}</p> : null}
      {state.status === "ready" && state.invoices.length === 0 ? <p style={styles.text}>{t.empty}</p> : null}
      {state.status === "ready"
        ? state.invoices.map((invoice) => {
            const action = nextInvoiceAction(invoice.status);
            return (
              <article key={invoice.id} style={styles.card}>
                <h2 style={styles.heading}>{invoice.invoiceNumber ?? t.notIssued}</h2>
                <p style={styles.text}>{money(invoice.totalMinor, invoice.currency)}</p>
                <p style={styles.meta}>{t.status(t.statusLabel[invoice.status] ?? invoice.status.replaceAll("_", " "))}</p>
                {action ? (
                  <button disabled={busy !== null} onClick={() => void act(invoice, action)} style={styles.button} type="button">
                    {busy === invoice.id ? t.working : t.actionLabel[action]}
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
