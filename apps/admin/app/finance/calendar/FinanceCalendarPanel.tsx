"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import type { FinanceInvoice, FinancePayment } from "../../api/finance/financeBoundary";

// Admin finance calendar: lays the authorized organization's invoices (and their payment attempts)
// on a month grid by the date each invoice was issued (falling back to its due date). It reuses the
// same governed read endpoints as the finance data panel and never creates, approves, issues,
// captures, voids, refunds, settles, or reconciles money. Read-only, organization-scoped.

type CalendarState =
  | { status: "idle" | "loading" }
  | { status: "denied" | "error" | "unavailable"; message: string }
  | { status: "ready"; invoices: readonly FinanceInvoice[]; payments: readonly FinancePayment[] };

// Map an invoice status to a readable swatch that works on a dark surface.
function statusTone(status: string): { bg: string; fg: string } {
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

function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// The anchor date for an invoice on the calendar: issued date if present, else due date.
function anchorDate(invoice: FinanceInvoice): Date | null {
  const raw = invoice.issuedAt ?? invoice.dueAt;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function FinanceCalendarPanel() {
  const [organizationId, setOrganizationId] = useState("");
  const [state, setState] = useState<CalendarState>({ status: "idle" });
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

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
        {state.status === "denied" || state.status === "error" || state.status === "unavailable" ? (
          <p style={styles.state}>{state.message}</p>
        ) : null}
        {state.status === "ready" ? (
          <CalendarGrid
            invoices={state.invoices}
            payments={state.payments}
            view={view}
            today={today}
            onPrev={() => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }))}
            onNext={() => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }))}
          />
        ) : null}
      </div>
    </section>
  );
}

function CalendarGrid({
  invoices,
  payments,
  view,
  today,
  onNext,
  onPrev
}: Readonly<{
  invoices: readonly FinanceInvoice[];
  payments: readonly FinancePayment[];
  view: { year: number; month: number };
  today: Date;
  onNext: () => void;
  onPrev: () => void;
}>) {
  const paymentsByInvoice = useMemo(() => {
    const map = new Map<string, FinancePayment[]>();
    for (const p of payments) {
      const list = map.get(p.invoiceId) ?? [];
      list.push(p);
      map.set(p.invoiceId, list);
    }
    return map;
  }, [payments]);

  const byDay = useMemo(() => {
    const map = new Map<string, FinanceInvoice[]>();
    for (const invoice of invoices) {
      const d = anchorDate(invoice);
      if (!d) continue;
      const key = isoDay(d);
      const list = map.get(key) ?? [];
      list.push(invoice);
      map.set(key, list);
    }
    return map;
  }, [invoices]);

  const unscheduled = invoices.filter((i) => anchorDate(i) === null);

  const first = new Date(view.year, view.month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthTitle = first.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  const todayKey = isoDay(today);

  return (
    <div style={styles.calendarWrap}>
      <div style={styles.monthBar}>
        <button aria-label="Previous month" onClick={onPrev} style={styles.navButton} type="button">←</button>
        <strong style={styles.monthTitle}>{monthTitle}</strong>
        <button aria-label="Next month" onClick={onNext} style={styles.navButton} type="button">→</button>
      </div>

      <div style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <span key={w} style={styles.weekday}>{w}</span>
        ))}
      </div>

      <div style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} style={styles.emptyCell} />;
          const key = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayInvoices = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div key={key} style={{ ...styles.dayCell, ...(isToday ? styles.dayCellToday : {}) }}>
              <span style={styles.dayNumber}>{day}</span>
              <div style={styles.dayInvoices}>
                {dayInvoices.map((invoice) => {
                  const tone = statusTone(invoice.status);
                  const paid = (paymentsByInvoice.get(invoice.id) ?? []).some((p) => p.state === "captured" || p.state === "settled");
                  return (
                    <div
                      key={invoice.id}
                      style={{ ...styles.invoiceChip, background: tone.bg, color: tone.fg }}
                      title={`${invoice.invoiceNumber ?? "Draft"} · ${invoice.status} · ${money(invoice.totalMinor, invoice.currency)}`}
                    >
                      <span style={styles.chipAmount}>{money(invoice.totalMinor, invoice.currency)}</span>
                      <span style={styles.chipStatus}>{invoice.status.replaceAll("_", " ")}{paid ? " · paid" : ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.legend}>
        {([
          ["paid", "Paid"],
          ["issued", "Issued / sent"],
          ["approved", "Approved"],
          ["overdue", "Overdue / disputed"],
          ["draft", "Draft / other"]
        ] as const).map(([status, label]) => {
          const tone = statusTone(status);
          return (
            <span key={status} style={styles.legendItem}>
              <span style={{ ...styles.legendSwatch, background: tone.bg, border: `1px solid ${tone.fg}` }} />
              {label}
            </span>
          );
        })}
      </div>

      {unscheduled.length > 0 ? (
        <div style={styles.unscheduled}>
          <strong style={styles.unschedTitle}>No scheduled date ({unscheduled.length})</strong>
          <p style={styles.help}>
            These invoices have neither an issue date nor a due date yet, so they cannot be placed on
            the calendar.
          </p>
          <div style={styles.unschedList}>
            {unscheduled.map((invoice) => {
              const tone = statusTone(invoice.status);
              return (
                <span key={invoice.id} style={{ ...styles.invoiceChip, background: tone.bg, color: tone.fg }}>
                  <span style={styles.chipAmount}>{invoice.invoiceNumber ?? "Draft"} · {money(invoice.totalMinor, invoice.currency)}</span>
                  <span style={styles.chipStatus}>{invoice.status.replaceAll("_", " ")}</span>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: { background: "#000000", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, marginTop: 18, padding: 18 },
  header: { alignItems: "start", display: "flex", gap: 12, justifyContent: "space-between" },
  h2: { color: "#f4efe4", fontSize: 21, margin: 0 },
  help: { color: "#b4b2a9", fontSize: 13, lineHeight: 1.55, margin: "6px 0 0" },
  badge: { background: "#000000", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 12, fontWeight: 900, padding: "7px 10px" },
  form: { alignItems: "end", display: "grid", gap: 12, gridTemplateColumns: "minmax(240px, 1fr) auto", marginTop: 18 },
  label: { color: "#f4efe4", display: "grid", fontSize: 13, fontWeight: 800, gap: 6 },
  input: { background: "#0c0c0c", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, color: "#f4efe4", font: "inherit", minHeight: 44, padding: "0 12px" },
  button: { background: "#171511", border: 0, borderRadius: 8, color: "#fff", fontWeight: 800, minHeight: 44, padding: "0 16px" },
  state: { background: "#0c0c0c", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 13, marginTop: 16, padding: 14 },
  calendarWrap: { marginTop: 18 },
  monthBar: { alignItems: "center", display: "flex", gap: 14, justifyContent: "center", marginBottom: 12 },
  monthTitle: { color: "#f4efe4", fontSize: 18, minWidth: 180, textAlign: "center" },
  navButton: { background: "#171511", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, color: "#f4efe4", fontSize: 16, minHeight: 36, minWidth: 44, padding: "0 10px" },
  weekRow: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 },
  weekday: { color: "#b4b2a9", fontSize: 12, fontWeight: 800, textAlign: "center" },
  grid: { display: "grid", gap: 6, gridTemplateColumns: "repeat(7, 1fr)" },
  emptyCell: { background: "transparent", borderRadius: 8, minHeight: 92 },
  dayCell: { background: "#0c0c0c", border: "1px solid rgba(201, 162, 75, 0.16)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4, minHeight: 92, padding: 6 },
  dayCellToday: { border: "1px solid #ba9044" },
  dayNumber: { color: "#f4efe4", fontSize: 12, fontWeight: 800 },
  dayInvoices: { display: "flex", flexDirection: "column", gap: 4 },
  invoiceChip: { borderRadius: 6, display: "grid", gap: 1, padding: "4px 6px" },
  chipAmount: { fontSize: 12, fontWeight: 800 },
  chipStatus: { fontSize: 11, fontWeight: 600, textTransform: "capitalize" },
  legend: { display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 },
  legendItem: { alignItems: "center", color: "#b4b2a9", display: "inline-flex", fontSize: 12, gap: 6 },
  legendSwatch: { borderRadius: 3, display: "inline-block", height: 12, width: 12 },
  unscheduled: { borderTop: "1px solid rgba(201, 162, 75, 0.16)", marginTop: 18, paddingTop: 16 },
  unschedTitle: { color: "#f4efe4", fontSize: 14 },
  unschedList: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }
};
