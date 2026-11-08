"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT, fmtLocale } from "../i18n/LocaleProvider";
import type { RwosLocale } from "../i18n/config";
import type { MessageKey } from "../i18n/messages";
import type { Translate } from "../i18n/LocaleProvider";

type Deduction = Readonly<{ category: string; code: string; description: string; amountMinor: number; currency: string }>;
type Earning = Readonly<{ classification: string; description: string; quantityMinutes: number | null; rateMinor: number | null; amountMinor: number; currency: string }>;
type Statement = Readonly<{
  calculationId: string;
  revision: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  jurisdiction: { country: string; region: string };
  currency: string;
  grossPayMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
  earningLines: readonly Earning[];
  deductions: readonly Deduction[];
}>;
type Summary = Readonly<{ statementCount: number; totalGrossMinor: number; totalDeductionsMinor: number; totalNetMinor: number; currency: string }>;
type PayState = { status: "loading" } | { status: "signed_out" } | { status: "error" } | { status: "ready"; items: readonly Statement[]; summary: Summary | null; workerClassification: string; notice: string };

type Payout = Readonly<{
  id: string;
  payrollCalculationId: string;
  organizationId: string;
  currency: string;
  amountMinor: number;
  status: string;
  holdUntil: string;
  releasedAt: string | null;
  paidAt: string | null;
  heldReason: string | null;
  paymentRef: string | null;
  // Two-timer hold: the 48h dispute/confirmation window + when the amount was registered. `stage` is
  // the worker-facing state: review_window → registered → paid (or held).
  completionAt: string | null;
  disputeWindowEndsAt: string | null;
  registeredAt: string | null;
  stage: PayoutStage;
  periodStart: string;
  periodEnd: string;
}>;
type PayoutStage = "review_window" | "registered" | "paid" | "held" | "cancelled";
type PayoutSummary = Readonly<{ currency: string; toPayMinor: number; paidMinor: number }>;
type PayoutsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; toPay: readonly Payout[]; paid: readonly Payout[]; summary: PayoutSummary };

type Dispute = Readonly<{
  id: string;
  payrollCalculationId: string;
  organizationId: string;
  status: string;
  category: string;
  reason: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}>;
type DisputesState = { status: "loading" } | { status: "error" } | { status: "ready"; items: readonly Dispute[] };

type Tab = "earnings" | "topay" | "paid" | "calendar" | "disputes";

// Worker-facing stage labels — the three stages of the two-timer hold, plus paused.
const PAYOUT_STAGE_KEY: Record<PayoutStage, MessageKey> = {
  review_window: "pay.stageReviewWindow",
  registered: "pay.stageRegistered",
  paid: "pay.statusPaid",
  held: "pay.statusHeld",
  cancelled: "pay.statusHeld"
};
const DISPUTE_STATUS_KEY: Record<string, MessageKey> = {
  open: "pay.disputeStatusOpen",
  resolved: "pay.disputeStatusResolved",
  withdrawn: "pay.disputeStatusWithdrawn"
};
const DISPUTE_CATEGORY_KEY: Record<string, MessageKey> = {
  hours: "pay.disputeCatHours",
  pay_amount: "pay.disputeCatPay",
  conditions: "pay.disputeCatConditions",
  other: "pay.disputeCatOther"
};
const DISPUTE_CATEGORIES = ["hours", "pay_amount", "conditions", "other"] as const;

function money(minor: number, currency: string, locale: RwosLocale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
}
function period(startAt: string, endAt: string, tz: string, locale: RwosLocale): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: tz };
  return `${new Date(startAt).toLocaleDateString(locale, opts)} – ${new Date(endAt).toLocaleDateString(locale, opts)}`;
}
function shortPeriod(startAt: string, endAt: string, locale: RwosLocale): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(startAt).toLocaleDateString(locale, opts)} – ${new Date(endAt).toLocaleDateString(locale, opts)}`;
}
function shortDate(iso: string, locale: RwosLocale): string {
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}
function hours(minutes: number): string {
  return (minutes / 60).toFixed(2);
}
function payoutBadge(stage: PayoutStage): string {
  if (stage === "registered" || stage === "paid") return "verified";
  if (stage === "review_window") return "pending";
  if (stage === "held") return "rejected";
  return "unverified";
}
// The date a payment lands on the calendar: when it was sent, else when it is expected to release.
function payoutAnchor(p: Payout): string {
  return p.paidAt ?? p.holdUntil;
}

export function MyPay() {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [state, setState] = useState<PayState>({ status: "loading" });
  const [payouts, setPayouts] = useState<PayoutsState>({ status: "loading" });
  const [disputes, setDisputes] = useState<DisputesState>({ status: "loading" });
  const [tab, setTab] = useState<Tab>("earnings");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/payroll?limit=25", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) return setState({ status: r.status === 401 ? "signed_out" : "error" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { items: Statement[]; summary?: Summary; workerClassification?: string; notice?: string };
      setState({ status: "ready", items: payload.items, summary: payload.summary ?? null, workerClassification: payload.workerClassification ?? "employee", notice: payload.notice ?? "" });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    try {
      const r = await fetch("/api/payments", { cache: "no-store" });
      if (!r.ok) return setPayouts({ status: "error" });
      const payload = (await r.json()) as { toPay: Payout[]; paid: Payout[]; summary: PayoutSummary };
      setPayouts({ status: "ready", toPay: payload.toPay ?? [], paid: payload.paid ?? [], summary: payload.summary ?? { currency: "CAD", toPayMinor: 0, paidMinor: 0 } });
    } catch {
      setPayouts({ status: "error" });
    }
  }, []);

  const loadDisputes = useCallback(async () => {
    try {
      const r = await fetch("/api/disputes", { cache: "no-store" });
      if (!r.ok) return setDisputes({ status: "error" });
      const payload = (await r.json()) as { items: Dispute[] };
      setDisputes({ status: "ready", items: payload.items ?? [] });
    } catch {
      setDisputes({ status: "error" });
    }
  }, []);

  const choose = useCallback(async (classification: "employee" | "contractor") => {
    try {
      const r = await fetch("/api/profile/classification", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classification })
      });
      if (r.ok) void load();
    } catch {
      // keep the current value on failure
    }
  }, [load]);

  const raiseDispute = useCallback(async (payrollCalculationId: string, category: string, reason: string): Promise<boolean> => {
    setActionNotice(null);
    try {
      const r = await fetch("/api/disputes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payrollCalculationId, category, reason })
      });
      if (!r.ok) {
        setActionNotice(t("pay.disputeError"));
        return false;
      }
      setActionNotice(t("pay.disputeRaised"));
      await Promise.all([loadPayouts(), loadDisputes()]);
      return true;
    } catch {
      setActionNotice(t("pay.disputeError"));
      return false;
    }
  }, [t, loadPayouts, loadDisputes]);

  const withdrawDispute = useCallback(async (disputeId: string) => {
    setActionNotice(null);
    try {
      const r = await fetch(`/api/disputes/${encodeURIComponent(disputeId)}/withdraw`, {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      if (!r.ok) {
        setActionNotice(t("pay.disputeError"));
        return;
      }
      setActionNotice(t("pay.disputeWithdrawn"));
      await Promise.all([loadPayouts(), loadDisputes()]);
    } catch {
      setActionNotice(t("pay.disputeError"));
    }
  }, [t, loadPayouts, loadDisputes]);

  useEffect(() => { void load(); void loadPayouts(); void loadDisputes(); }, [load, loadPayouts, loadDisputes]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out") return <div className="state">{t("pay.signInPrompt")}<div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("pay.loadError")}</div>;

  const allPayouts: readonly Payout[] = payouts.status === "ready" ? [...payouts.toPay, ...payouts.paid] : [];
  const openDisputedCalcIds = new Set(
    disputes.status === "ready" ? disputes.items.filter((d) => d.status === "open").map((d) => d.payrollCalculationId) : []
  );

  return (
    <>
      <section className="hero">
        <h1>{t("nav.pay")}</h1>
        <p>{t("pay.defaultNotice")}</p>
      </section>
      <div className="chips" style={{ marginBottom: 16 }}>
        <span className="chip status-rejected">{t("pay.syntheticChip")}</span>
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        <button type="button" className={`chip ${tab === "earnings" ? "status-verified" : ""}`} onClick={() => setTab("earnings")}>{t("pay.tabEarnings")}</button>
        <button type="button" className={`chip ${tab === "topay" ? "status-verified" : ""}`} onClick={() => setTab("topay")}>{t("pay.tabToPay")}</button>
        <button type="button" className={`chip ${tab === "paid" ? "status-verified" : ""}`} onClick={() => setTab("paid")}>{t("pay.tabPaid")}</button>
        <button type="button" className={`chip ${tab === "calendar" ? "status-verified" : ""}`} onClick={() => setTab("calendar")}>{t("pay.tabCalendar")}</button>
        <button type="button" className={`chip ${tab === "disputes" ? "status-verified" : ""}`} onClick={() => setTab("disputes")}>{t("pay.tabDisputes")}</button>
      </div>

      {actionNotice ? <p className="notice" style={{ color: "var(--accent)" }}>{actionNotice}</p> : null}

      {tab === "earnings" ? <EarningsTab state={state} choose={choose} t={t} locale={locale} /> : null}
      {tab === "topay" ? <ToPayTab payouts={payouts} openDisputed={openDisputedCalcIds} onRaise={raiseDispute} t={t} locale={locale} /> : null}
      {tab === "paid" ? <PaidTab payouts={payouts} openDisputed={openDisputedCalcIds} onRaise={raiseDispute} t={t} locale={locale} /> : null}
      {tab === "calendar" ? <PaymentsCalendar payouts={payouts} items={allPayouts} openDisputed={openDisputedCalcIds} onRaise={raiseDispute} t={t} locale={locale} /> : null}
      {tab === "disputes" ? <DisputesTab disputes={disputes} onWithdraw={withdrawDispute} t={t} locale={locale} /> : null}

      <p className="notice">{t("pay.footer")}</p>
    </>
  );
}

function EarningsTab({ state, choose, t, locale }: { state: Extract<PayState, { status: "ready" }>; choose: (c: "employee" | "contractor") => void; t: Translate; locale: RwosLocale }) {
  return (
    <>
      {state.summary ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="role">{t("pay.summaryTitle")}</div>
          <div className="when" style={{ fontSize: 18 }}>{t("pay.totalNet")}: <strong>{money(state.summary.totalNetMinor, state.summary.currency, locale)}</strong></div>
          <div className="when">{t("pay.totalGross")}: {money(state.summary.totalGrossMinor, state.summary.currency, locale)}</div>
          <div className="when">{t("pay.totalDeductions")}: −{money(state.summary.totalDeductionsMinor, state.summary.currency, locale)}</div>
          <div className="when">{t("pay.statementCount")}: {state.summary.statementCount}</div>
        </section>
      ) : null}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="role">{t("pay.workTypeTitle")}</div>
        <div className="chips" style={{ marginTop: 6 }}>
          <button
            type="button"
            className={`chip ${state.workerClassification !== "contractor" ? "status-verified" : ""}`}
            onClick={() => void choose("employee")}
          >
            {t("pay.typeEmployee")}
          </button>
          <button
            type="button"
            className={`chip ${state.workerClassification === "contractor" ? "status-verified" : ""}`}
            onClick={() => void choose("contractor")}
          >
            {t("pay.typeAutonomous")}
          </button>
        </div>
        <div className="when">{state.workerClassification === "contractor" ? t("pay.typeAutonomousDesc") : t("pay.typeEmployeeDesc")}</div>
        <div className="when">{t("pay.slipType", { slip: state.workerClassification === "contractor" ? "T4A" : "T4" })}</div>
      </section>

      {state.items.length === 0 ? (
        <div className="state">{t("pay.none")}</div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {state.items.map((s) => (
            <article className="card" key={s.calculationId}>
              <div className="role">{period(s.periodStart, s.periodEnd, s.timezone, locale)}</div>
              <a className="muted" href={`/contact?topic=pay&relatedType=pay&relatedId=${encodeURIComponent(s.calculationId)}`}>{t("contact.askAbout")}</a>
              <div className="chips">
                <span className="chip status-verified">{statusLabel(s.status, t)}</span>
                <span className="chip">{s.jurisdiction.country}/{s.jurisdiction.region}</span>
                <span className="chip">{t("pay.rev", { n: s.revision })}</span>
              </div>
              <div className="when">{t("pay.gross")} <strong>{money(s.grossPayMinor, s.currency, locale)}</strong></div>
              <div className="when">{t("pay.deductions", { amount: money(s.totalDeductionsMinor, s.currency, locale) })}</div>
              <div className="when" style={{ fontSize: 18 }}>{t("pay.net")} <strong>{money(s.netPayMinor, s.currency, locale)}</strong></div>
              {s.earningLines.length > 0 ? (
                <>
                  <div className="when" style={{ marginTop: 6 }}>{t("pay.earningsTitle")}</div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13 }}>
                    {s.earningLines.map((e, i) => (
                      <li key={`${e.classification}-${i}`}>{lineLabel("earning", e.classification, e.description, t)}: {money(e.amountMinor, e.currency, locale)} <span style={{ opacity: 0.7 }}>({e.quantityMinutes === null || e.quantityMinutes === undefined ? "—" : t("pay.hours", { hours: hours(e.quantityMinutes) })} · {e.rateMinor === null || e.rateMinor === undefined ? "—" : t("pay.rateHr", { rate: money(e.rateMinor, e.currency, locale) })})</span></li>
                    ))}
                  </ul>
                </>
              ) : null}
              {s.deductions.length > 0 ? (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--text-muted)" }}>
                  {s.deductions.map((d) => (
                    <li key={d.code}>{lineLabel("deduction", d.code, d.description, t)}: −{money(d.amountMinor, d.currency, locale)}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function PaymentCard({ p, openDisputed, onRaise, t, locale }: { p: Payout; openDisputed: ReadonlySet<string>; onRaise: (calcId: string, category: string, reason: string) => Promise<boolean>; t: Translate; locale: RwosLocale }) {
  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState<string>("hours");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const isDisputed = openDisputed.has(p.payrollCalculationId) || p.status === "held";
  const canDispute = !isDisputed && (p.status === "pending" || p.status === "released");
  // Date line per stage: in the 48h window → when it confirms; registered/awaiting → expected transfer;
  // paid → the date it was sent. Never show "confirmed earnings" copy during the review window.
  const dateLine = p.stage === "paid" && p.paidAt
    ? t("pay.paidOn", { date: shortDate(p.paidAt, locale) })
    : p.stage === "review_window"
      ? t("pay.confirmsOn", { date: shortDate(p.disputeWindowEndsAt ?? p.holdUntil, locale) })
      : t("pay.expectedDate", { date: shortDate(p.holdUntil, locale) });

  const submit = async () => {
    if (reason.trim().length === 0) return;
    setBusy(true);
    const ok = await onRaise(p.payrollCalculationId, category, reason.trim());
    setBusy(false);
    if (ok) { setFormOpen(false); setReason(""); }
  };

  return (
    <article className="card">
      <div className="when" style={{ fontSize: 20 }}><strong>{money(p.amountMinor, p.currency, locale)}</strong></div>
      <div className="chips">
        <span className={`chip status-${payoutBadge(p.stage)}`}>{t(PAYOUT_STAGE_KEY[p.stage] ?? "pay.stageReviewWindow")}</span>
        {isDisputed ? <span className="chip status-rejected">{t("pay.disputedChip")}</span> : null}
      </div>
      <div className="when">{t("pay.forPeriod", { period: shortPeriod(p.periodStart, p.periodEnd, locale) })}</div>
      <div className="when">{dateLine}</div>
      {p.stage === "review_window" ? <div className="when" style={{ color: "var(--text-muted)" }}>{t("pay.reviewWindowNote")}</div> : null}
      {p.stage === "paid" && p.paymentRef ? <div className="when" style={{ color: "var(--text-muted)" }}>{t("pay.reference", { ref: p.paymentRef })}</div> : null}
      {p.status === "held" && p.heldReason ? <div className="when" style={{ color: "var(--text-muted)" }}>{t("pay.heldReason", { reason: p.heldReason })}</div> : null}

      {canDispute && !formOpen ? (
        <button type="button" className="btn" style={{ alignSelf: "flex-start", marginTop: 6 }} onClick={() => setFormOpen(true)}>{t("pay.disputeRaise")}</button>
      ) : null}

      {formOpen ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="role">{t("pay.disputeForPayment", { period: shortPeriod(p.periodStart, p.periodEnd, locale) })}</div>
          <label className="when">{t("pay.disputeCategory")}
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ display: "block", marginTop: 4, width: "100%", padding: 6 }}>
              {DISPUTE_CATEGORIES.map((c) => <option key={c} value={c}>{t(DISPUTE_CATEGORY_KEY[c] ?? "pay.disputeCatOther")}</option>)}
            </select>
          </label>
          <label className="when">{t("pay.disputeReason")}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("pay.disputeReasonPlaceholder")} rows={3} style={{ display: "block", marginTop: 4, width: "100%", padding: 6 }} />
          </label>
          <div className="chips">
            <button type="button" className="btn" disabled={busy || reason.trim().length === 0} onClick={() => void submit()}>{busy ? "…" : t("pay.disputeSubmit")}</button>
            <button type="button" className="chip" onClick={() => { setFormOpen(false); setReason(""); }}>{t("pay.disputeCancel")}</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ToPayTab({ payouts, openDisputed, onRaise, t, locale }: { payouts: PayoutsState; openDisputed: ReadonlySet<string>; onRaise: (calcId: string, category: string, reason: string) => Promise<boolean>; t: Translate; locale: RwosLocale }) {
  if (payouts.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (payouts.status === "error") return <div className="state error" role="alert">{t("pay.paymentsLoadError")}</div>;
  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="role">{t("pay.toPayTitle")}</div>
        <div className="when" style={{ fontSize: 18 }}>{t("pay.toPayTotal")}: <strong>{money(payouts.summary.toPayMinor, payouts.summary.currency, locale)}</strong></div>
        <div className="when" style={{ color: "var(--text-muted)" }}>{t("pay.holdExplain")}</div>
      </section>
      {payouts.toPay.length === 0 ? (
        <div className="state">{t("pay.toPayNone")}</div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {payouts.toPay.map((p) => <PaymentCard key={p.id} p={p} openDisputed={openDisputed} onRaise={onRaise} t={t} locale={locale} />)}
        </div>
      )}
    </>
  );
}

function PaidTab({ payouts, openDisputed, onRaise, t, locale }: { payouts: PayoutsState; openDisputed: ReadonlySet<string>; onRaise: (calcId: string, category: string, reason: string) => Promise<boolean>; t: Translate; locale: RwosLocale }) {
  if (payouts.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (payouts.status === "error") return <div className="state error" role="alert">{t("pay.paymentsLoadError")}</div>;
  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="role">{t("pay.paidTotalTitle")}</div>
        <div className="when" style={{ fontSize: 18 }}>{t("pay.paidTotal")}: <strong>{money(payouts.summary.paidMinor, payouts.summary.currency, locale)}</strong></div>
      </section>
      {payouts.paid.length === 0 ? (
        <div className="state">{t("pay.paidNone")}</div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {payouts.paid.map((p) => <PaymentCard key={p.id} p={p} openDisputed={openDisputed} onRaise={onRaise} t={t} locale={locale} />)}
        </div>
      )}
    </>
  );
}

function DisputesTab({ disputes, onWithdraw, t, locale }: { disputes: DisputesState; onWithdraw: (id: string) => void; t: Translate; locale: RwosLocale }) {
  if (disputes.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (disputes.status === "error") return <div className="state error" role="alert">{t("pay.disputesLoadError")}</div>;
  if (disputes.items.length === 0) return <div className="state">{t("pay.disputesNone")}</div>;
  return (
    <div className="results" style={{ paddingBottom: 48 }}>
      {disputes.items.map((d) => (
        <article className="card" key={d.id}>
          <div className="chips">
            <span className={`chip status-${d.status === "open" ? "pending" : d.status === "resolved" ? "verified" : "unverified"}`}>{t(DISPUTE_STATUS_KEY[d.status] ?? "pay.disputeStatusOpen")}</span>
            <span className="chip">{t(DISPUTE_CATEGORY_KEY[d.category] ?? "pay.disputeCatOther")}</span>
          </div>
          <div className="when">{d.reason}</div>
          <div className="when" style={{ color: "var(--text-muted)" }}>{shortDate(d.createdAt, locale)}</div>
          {d.resolution ? <div className="when" style={{ color: "var(--text-muted)" }}>{d.resolution}</div> : null}
          {d.status === "open" ? (
            <button type="button" className="chip" style={{ alignSelf: "flex-start" }} onClick={() => onWithdraw(d.id)}>{t("pay.disputeWithdraw")}</button>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function PaymentsCalendar({ payouts, items, openDisputed, onRaise, t, locale }: { payouts: PayoutsState; items: readonly Payout[]; openDisputed: ReadonlySet<string>; onRaise: (calcId: string, category: string, reason: string) => Promise<boolean>; t: Translate; locale: RwosLocale }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState<string | null>(null);

  if (payouts.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (payouts.status === "error") return <div className="state error" role="alert">{t("pay.paymentsLoadError")}</div>;

  const year = month.getFullYear();
  const m = month.getMonth();
  const startWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const counts = new Map<string, number>();
  for (const p of items) {
    const d = new Date(payoutAnchor(p));
    if (d.getFullYear() === year && d.getMonth() === m) {
      const k = dayKey(d);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const monthLabel = new Date(year, m, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: "narrow" }));
  const cells: (number | null)[] = [...Array<null>(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = dayKey(new Date());
  const dayPayouts = selected ? items.filter((p) => dayKey(new Date(payoutAnchor(p))) === selected) : [];

  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="chips" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="chip" onClick={() => setMonth(new Date(year, m - 1, 1))} aria-label={t("sched.prevMonth")}>&#8249;</button>
          <div className="role">{monthLabel}</div>
          <button type="button" className="chip" onClick={() => setMonth(new Date(year, m + 1, 1))} aria-label={t("sched.nextMonth")}>&#8250;</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginTop: 10 }}>
          {weekdays.map((w, i) => (
            <div key={`wd-${i}`} style={{ textAlign: "center", fontSize: 12, opacity: 0.7 }}>{w}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`b-${i}`} />;
            const k = `${year}-${m}-${day}`;
            const count = counts.get(k) ?? 0;
            const isToday = k === todayKey;
            const isSel = k === selected;
            return (
              <button
                key={`d-${day}`}
                type="button"
                onClick={() => setSelected(isSel ? null : k)}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 8,
                  border: isToday ? "2px solid var(--accent)" : "1px solid var(--border, rgba(127,127,127,0.3))",
                  background: isSel ? "var(--accent)" : count > 0 ? "var(--accent-soft, rgba(127,127,127,0.12))" : "transparent",
                  color: isSel ? "#fff" : "inherit",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13
                }}
              >
                <span>{day}</span>
                {count > 0 ? <span style={{ fontSize: 10, marginTop: 2 }}>&#9679;{count > 1 ? ` ${count}` : ""}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="when" style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>{t("pay.calLegend")}</div>
      </section>
      {selected ? (
        dayPayouts.length > 0 ? (
          <div className="results" style={{ paddingBottom: 48 }}>
            {dayPayouts.map((p) => <PaymentCard key={p.id} p={p} openDisputed={openDisputed} onRaise={onRaise} t={t} locale={locale} />)}
          </div>
        ) : (
          <div className="state">{t("pay.calNoneDay")}</div>
        )
      ) : (
        <p className="notice">{t("pay.calPickDay")}</p>
      )}
    </>
  );
}

// Pay lines arrive with English test names such as "Federal tax (synthetic)". Known lines get the
// worker's language; anything else keeps its own name without the test marker.
function lineLabel(kind: "earning" | "deduction", code: string, description: string, t: Translate): string {
  const key = `pay.line.${code}` as MessageKey;
  const translated = t(key);
  return translated !== key ? translated : description.replace(/\s*\(synthetic\)\s*$/iu, "");
}

function statusLabel(status: string, t: Translate): string {
  const key = `pay.status.${status}` as MessageKey;
  const translated = t(key);
  return translated !== key ? translated : status.replaceAll("_", " ");
}
