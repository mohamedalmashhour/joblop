"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import type { FinanceInvoice, FinancePayment } from "../../api/finance/financeBoundary";
import { MonthCalendar, type CalendarEntry, type CalendarLegendItem, type CalendarTone } from "../../calendar/MonthCalendar";
import { SignedOut } from "../../shared/SignedOut";

// Admin finance billing calendar: lays the authorized organization's invoices on a month grid by the
// date each was issued (falling back to its due date), coloured by status, with a paid marker from
// its payment attempts and an unscheduled list for invoices lacking any date. It reuses the same
// governed read endpoints as the finance data panel and never executes money. Read-only, org-scoped.
// The grid itself is the shared MonthCalendar component.

type CalendarState =
  | { status: "idle" | "loading" }
  | { status: "denied" | "error" | "unavailable"; message: string }
  | { status: "ready"; invoices: readonly FinanceInvoice[]; payments: readonly FinancePayment[] };

function statusTone(status: string): CalendarTone {
  switch (status) {
    case "paid":
      return { bg: "#143d2b", fg: "#9fe1cb" };
    case "issued":
    case "sent":
    case "viewed":
      return { bg: "#10324f", fg: "#b5d4f4" };
    case "approved":
    case "partially_paid":
      return { bg: "#3f2a08", fg: "#fac775" };
    case "overdue":
    case "disputed":
      return { bg: "#3f1414", fg: "#f7c1c1" };
    case "voided":
    case "refunded":
      return { bg: "#26262a", fg: "#b4b2a9" };
    default:
      return { bg: "#26262a", fg: "#d3d1c7" };
  }
}

const LEGEND: readonly CalendarLegendItem[] = [
  { label: "Paid", tone: statusTone("paid") },
  { label: "Issued / sent", tone: statusTone("issued") },
  { label: "Approved", tone: statusTone("approved") },
  { label: "Overdue / disputed", tone: statusTone("overdue") },
  { label: "Draft / other", tone: statusTone("draft") }
];

function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

// The anchor date for an invoice on the calendar: issued date if present, else due date.
function anchor(invoice: FinanceInvoice): string | null {
  return invoice.issuedAt ?? invoice.dueAt ?? null;
}

export function FinanceCalendarPanel() {
  const [organizationId, setOrganizationId] = useState("");
  const [state, setState] = useState<CalendarState>({ status: "idle" });

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
  }, []);

  const paidInvoiceIds = useMemo(() => {
    const ids = new Set<string>();
    if (state.status !== "ready") return ids;
    for (const p of state.payments) {
      if (p.state === "captured" || p.state === "settled") ids.add(p.invoiceId);
    }
    return ids;
  }, [state]);

  const entries = useMemo<readonly CalendarEntry[]>(() => {
    if (state.status !== "ready") return [];
    return state.invoices
      .filter((invoice) => anchor(invoice) !== null)
      .map((invoice) => {
        const paid = paidInvoiceIds.has(invoice.id);
        return {
          id: invoice.id,
          date: anchor(invoice) as string,
          tone: statusTone(invoice.status),
          primary: money(invoice.totalMinor, invoice.currency),
          secondary: `${invoice.status.replaceAll("_", " ")}${paid ? " · paid" : ""}`,
          title: `${invoice.invoiceNumber ?? "Draft"} · ${invoice.status} · ${money(invoice.totalMinor, invoice.currency)}`
        };
      });
  }, [state, paidInvoiceIds]);

  const unscheduled = state.status === "ready" ? state.invoices.filter((i) => anchor(i) === null) : [];

  return (
    <section aria-labelledby="finance-calendar-title" style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h2 id="finance-calendar-title" style={styles.h2}>Billing calendar</h2>
          <p style={styles.help}>
            Invoices placed on the month they were issued (or their due date). Read only and scoped to
            the authorized organization; this view never executes money.
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
          {state.status === "loading" ? "Loading…" : "Load calendar"}
        </button>
      </form>

      <div aria-live="polite">
        {state.status === "idle" ? (
          <p style={styles.state}>Enter an authorized organization reference to view its billing calendar.</p>
        ) : null}
        {state.status === "loading" ? <p style={styles.state}>Loading finance records…</p> : null}
        {state.status === "denied" ? <SignedOut compact /> : null}
        {state.status === "error" || state.status === "unavailable" ? (
          <p style={styles.state}>{state.message}</p>
        ) : null}
        {state.status === "ready" ? (
          <>
            <MonthCalendar entries={entries} legend={LEGEND} />
            {unscheduled.length > 0 ? (
              <div style={styles.unscheduled}>
                <strong style={styles.unschedTitle}>No scheduled date ({unscheduled.length})</strong>
                <p style={styles.help}>
                  These invoices have neither an issue date nor a due date yet, so they cannot be placed
                  on the calendar.
                </p>
                <div style={styles.unschedList}>
                  {unscheduled.map((invoice) => {
                    const tone = statusTone(invoice.status);
                    return (
                      <span key={invoice.id} style={{ ...styles.chip, background: tone.bg, color: tone.fg }}>
                        <span style={styles.chipPrimary}>{invoice.invoiceNumber ?? "Draft"} · {money(invoice.totalMinor, invoice.currency)}</span>
                        <span style={styles.chipSecondary}>{invoice.status.replaceAll("_", " ")}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, marginTop: 18, padding: 18 },
  header: { alignItems: "start", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#f4efe4", fontSize: 21, margin: 0 },
  help: { color: "#b4b2a9", fontSize: 13, lineHeight: 1.55, margin: "6px 0 0" },
  badge: { background: "#000000", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 12, fontWeight: 900, padding: "7px 10px" },
  form: { alignItems: "end", display: "grid", gap: 12, gridTemplateColumns: "minmax(240px, 1fr) auto", marginTop: 18 },
  label: { color: "#f4efe4", display: "grid", fontSize: 13, fontWeight: 800, gap: 6 },
  input: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", font: "inherit", minHeight: 44, padding: "0 12px" },
  button: { background: "#171511", border: 0, borderRadius: 8, color: "#fff", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  state: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 13, marginTop: 16, padding: 14 },
  unscheduled: { borderTop: "1px solid rgba(248, 184, 8, 0.16)", marginTop: 18, paddingTop: 16 },
  unschedTitle: { color: "#f4efe4", fontSize: 14 },
  unschedList: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { borderRadius: 6, display: "grid", gap: 1, padding: "4px 6px" },
  chipPrimary: { fontSize: 12, fontWeight: 800 },
  chipSecondary: { fontSize: 11, fontWeight: 600, textTransform: "capitalize" }
};
