"use client";

import { useCallback, useEffect, useState } from "react";
import { usePageText } from "../i18n/pageText";
import { planOrdersText, type PlanOrdersCopy } from "./text";
import { SignedOut } from "../shared/SignedOut";

// Staff queue for employer fees paid by Interac e-transfer: short-term plans and long-term job
// listings. "Waiting" lists open orders (and orders the employer canceled after saying the money was
// sent, which must not be confirmed: staff check the refund and close them). "Done" is the history of
// confirmed, rejected and canceled orders. Confirming asks for the Interac reference and the amount
// received, then asks "are you sure"; the API refuses a short amount, a canceled-by-employer order and
// a half-price order whose discount was already used.

type Kind = "plan" | "listing";
type View = "open" | "done";
type State = "loading" | "denied" | "off" | "error" | "ready";

type Order = {
  id: string;
  organizationName: string;
  plan?: string;
  jobTitle?: string;
  priceMinor?: number;
  subtotalMinor?: number;
  gstMinor?: number;
  qstMinor?: number;
  totalMinor?: number;
  currency: string;
  discountKind?: string;
  method: string;
  status: string;
  reference?: string;
  paymentRef?: string | null;
  cancelReason?: string | null;
  amountReceivedMinor?: number | null;
  receiptNumber?: string | null;
  createdAt: string;
  claimedAt?: string | null;
  canceledAt?: string | null;
  paidAt?: string | null;
  updatedAt?: string;
};

const PLAN_NAME: Record<string, string> = {
  shift_pro: "Shift Pro",
  shift_business: "Shift Business",
  contract_plus: "Contract Plus (retired — reject)"
};

const money = (m: number, c: string) => (m / 100).toLocaleString("en-CA", { style: "currency", currency: c });

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function totalOf(o: Readonly<{ priceMinor?: number; subtotalMinor?: number; totalMinor?: number }>): number {
  return o.totalMinor ?? o.subtotalMinor ?? o.priceMinor ?? 0;
}

/** Total to expect on the e-transfer, with the GST/QST breakdown. */
function amountCell(o: Readonly<{ priceMinor?: number; subtotalMinor?: number; gstMinor?: number; qstMinor?: number; totalMinor?: number; currency: string }>) {
  const subtotal = o.subtotalMinor ?? o.priceMinor ?? 0;
  if (o.totalMinor === undefined) return `${money(subtotal, o.currency)} + taxes`;
  return `${money(o.totalMinor, o.currency)} (${money(subtotal, o.currency)} + GST ${money(o.gstMinor ?? 0, o.currency)} + QST ${money(o.qstMinor ?? 0, o.currency)})`;
}

/** The question staff must answer "yes" to before an order is marked paid. */
export function confirmPaymentQuestion(
  o: Readonly<{ organizationName: string; method: string; priceMinor?: number; subtotalMinor?: number; totalMinor?: number; currency: string }>,
  copy: Pick<PlanOrdersCopy, "question"> = planOrdersText.en
): string {
  return copy.question(money(totalOf(o), o.currency), o.organizationName, o.method !== "e_transfer");
}

/** What staff see in the Status column. */
export function statusLabel(o: Readonly<{ status: string; cancelReason?: string | null }>, copy: PlanOrdersCopy): string {
  if (o.status === "canceled" && o.cancelReason === "employer_canceled") return copy.canceledByEmployer;
  if (o.status === "canceled" && o.cancelReason === "staff_rejected") return copy.rejectedByStaff;
  return copy.status[o.status] ?? o.status;
}

export function EmployerPlanOrdersPanels() {
  const copy = usePageText(planOrdersText);
  const [view, setView] = useState<View>("open");
  return (
    <>
      <div role="tablist" aria-label={copy.title} style={styles.tabs}>
        {(["open", "done"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} style={view === v ? styles.tabOn : styles.tab} onClick={() => setView(v)}>
            {v === "open" ? copy.tabOpen : copy.tabDone}
          </button>
        ))}
      </div>
      <OrdersPanel key={`plan-${view}`} kind="plan" view={view} copy={copy} />
      <OrdersPanel key={`listing-${view}`} kind="listing" view={view} copy={copy} />
    </>
  );
}

function OrdersPanel({ kind, view, copy }: Readonly<{ kind: Kind; view: View; copy: PlanOrdersCopy }>) {
  const base = kind === "plan" ? "/api/employer-plan-orders" : "/api/job-listing-orders";
  const [state, setState] = useState<State>("loading");
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [interac, setInterac] = useState("");
  const [received, setReceived] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${base}${view === "done" ? "?view=done" : ""}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) return setState("denied");
      if (res.status === 404) return setState("off");
      if (!res.ok) return setState("error");
      setOrders(((await res.json()) as { orders: Order[] }).orders ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [base, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = useCallback(
    async (id: string, action: "confirm" | "reject", body: Record<string, unknown>, done: string) => {
      setBusy(id);
      setMsg("");
      try {
        const res = await fetch(`${base}/${id}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          setMsg((payload?.error && copy.errors[payload.error]) || copy.failed);
          return;
        }
        setMsg(done);
        setConfirming(null);
        await load();
      } finally {
        setBusy(null);
      }
    },
    [base, copy, load]
  );

  if (state === "loading") return <p style={styles.text}>{copy.loading}</p>;
  if (state === "denied") return kind === "plan" ? <SignedOut compact /> : null;
  if (state === "off") return kind === "plan" ? <p style={styles.text}>{copy.off}</p> : null;
  if (state === "error") return <p style={styles.text}>{copy.error}</p>;

  const done = view === "done";
  return (
    <section style={styles.wrap}>
      <h2 style={styles.h2}>{kind === "plan" ? copy.plansHeading : copy.listingsHeading}</h2>
      {msg ? <p style={styles.notice} role="status">{msg}</p> : null}
      {orders.length === 0 ? (
        <p style={styles.textInline}>{done ? copy.emptyDone : copy.emptyOpen}</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>{copy.colReference}</th>
              <th style={styles.th}>{copy.colCompany}</th>
              <th style={styles.th}>{kind === "plan" ? copy.colPlan : copy.colJob}</th>
              <th style={styles.th}>{copy.colAmount}</th>
              <th style={styles.th}>{copy.colMethod}</th>
              <th style={styles.th}>{copy.colStatus}</th>
              <th style={styles.th}>{copy.colCreated}</th>
              <th style={styles.th}>{copy.colClaimed}</th>
              {done ? (
                <>
                  <th style={styles.th}>{copy.colClosed}</th>
                  <th style={styles.th}>{copy.colInterac}</th>
                  <th style={styles.th}>{copy.colReceived}</th>
                  <th style={styles.th}>{copy.colReceipt}</th>
                </>
              ) : (
                <th style={styles.th}>{copy.colActions}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={styles.tdMono}>{o.reference ?? o.id}</td>
                <td style={styles.td}>{o.organizationName}</td>
                <td style={styles.td}>
                  {kind === "plan" ? PLAN_NAME[o.plan ?? ""] ?? o.plan : o.jobTitle}
                  {o.discountKind === "first_month_half" ? ` (${copy.firstMonthHalf})` : ""}
                </td>
                <td style={styles.td}>{amountCell(o)}</td>
                <td style={styles.td}>{o.method === "e_transfer" ? copy.methodEtransfer : copy.methodCard}</td>
                <td style={o.status === "refund_check" ? styles.tdWarn : styles.td}>{statusLabel(o, copy)}</td>
                <td style={styles.td}>{when(o.createdAt)}</td>
                <td style={styles.td}>{when(o.claimedAt)}</td>
                {done ? (
                  <>
                    <td style={styles.td}>{when(o.paidAt ?? o.canceledAt ?? o.updatedAt)}</td>
                    <td style={styles.tdMono}>{o.status === "paid" && o.paymentRef && !o.paymentRef.startsWith("etransfer-confirmed-") ? o.paymentRef : "—"}</td>
                    <td style={styles.td}>{o.amountReceivedMinor !== null && o.amountReceivedMinor !== undefined ? money(o.amountReceivedMinor, o.currency) : "—"}</td>
                    <td style={styles.tdMono}>{o.receiptNumber ?? "—"}</td>
                  </>
                ) : (
                  <td style={styles.td}>
                    {o.status === "refund_check" ? (
                      <button type="button" style={styles.reject} disabled={busy === o.id} onClick={() => void post(o.id, "reject", {}, copy.closed)}>
                        {copy.closeRefund}
                      </button>
                    ) : confirming === o.id ? (
                      <form
                        style={styles.form}
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!window.confirm(confirmPaymentQuestion(o, copy))) return;
                          void post(o.id, "confirm", { interacReference: interac, amountReceived: received }, kind === "plan" ? copy.confirmedPlan : copy.confirmedListing);
                        }}
                      >
                        <label style={styles.label}>
                          {copy.interacLabel}
                          <input style={styles.input} value={interac} maxLength={64} placeholder={copy.interacHint} onChange={(event) => setInterac(event.target.value)} />
                        </label>
                        <label style={styles.label}>
                          {copy.receivedLabel}
                          <input style={styles.input} value={received} inputMode="decimal" placeholder={copy.receivedHint} onChange={(event) => setReceived(event.target.value)} />
                        </label>
                        <div>
                          <button type="submit" style={styles.confirm} disabled={busy === o.id}>{copy.confirmPayment}</button>
                          <button type="button" style={styles.reject} onClick={() => setConfirming(null)}>{copy.cancel}</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          style={styles.confirm}
                          disabled={busy === o.id}
                          onClick={() => {
                            setConfirming(o.id);
                            setInterac("");
                            setReceived((totalOf(o) / 100).toFixed(2));
                          }}
                        >
                          {copy.confirm}
                        </button>
                        <button type="button" style={styles.reject} disabled={busy === o.id} onClick={() => void post(o.id, "reject", {}, copy.rejected)}>
                          {copy.reject}
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const cell = { borderBottom: "1px solid rgba(248, 184, 8, 0.16)", color: "#f4efe4", fontSize: 14, padding: 10, verticalAlign: "top" as const };

const styles = {
  tabs: { display: "flex", gap: 8, padding: "16px clamp(18px, 5vw, 64px) 0" },
  tab: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.34)", borderRadius: 999, color: "#f4efe4", cursor: "pointer", fontWeight: 800, padding: "8px 16px" },
  tabOn: { background: "#f8b808", border: "1px solid #f8b808", borderRadius: 999, color: "#000", cursor: "pointer", fontWeight: 900, padding: "8px 16px" },
  wrap: { padding: "24px clamp(18px, 5vw, 64px)", overflowX: "auto" as const },
  notice: { color: "#f4efe4", fontSize: 14, fontWeight: 700 },
  h2: { color: "#fff1a8", fontSize: 20, margin: "0 0 12px" },
  textInline: { color: "#f4efe4", fontSize: 15 },
  text: { color: "#f4efe4", fontSize: 15, padding: "24px clamp(18px, 5vw, 64px)" },
  table: { background: "#0c0c0c", border: "1px solid rgba(248, 184, 8, 0.16)", borderCollapse: "collapse" as const, borderRadius: 14, width: "100%" },
  th: { borderBottom: "1px solid rgba(248, 184, 8, 0.16)", color: "#f4efe4", fontSize: 12, padding: 10, textAlign: "start" as const, textTransform: "uppercase" as const },
  td: cell,
  tdWarn: { ...cell, color: "#f6c66b", fontWeight: 800 },
  tdMono: { ...cell, fontFamily: "monospace", fontSize: 12 },
  form: { display: "grid", gap: 8, minWidth: 220 },
  label: { display: "grid", fontSize: 12, fontWeight: 800, gap: 4 },
  input: { background: "#000", border: "1px solid rgba(248, 184, 8, 0.34)", borderRadius: 8, color: "#f4efe4", font: "inherit", minHeight: 36, padding: "4px 10px" },
  confirm: { background: "#171511", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 800, marginInlineEnd: 8, padding: "8px 14px" },
  reject: { background: "#0c0c0c", border: "1px solid #e5a4a4", borderRadius: 8, color: "#e5a4a4", cursor: "pointer", fontWeight: 700, padding: "8px 12px" }
} as const;
