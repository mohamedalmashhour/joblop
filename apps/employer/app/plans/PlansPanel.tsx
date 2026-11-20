"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PLATFORM_MARGIN_PPM,
  EMPLOYER_PLAN_CATALOG,
  employerPlanMonthlySavingMinor,
  jobListingMonthPrice,
  planBreakEvenHours,
  plansForTrack,
  quebecSalesTax,
  type EmployerPlanCode,
  type JobLength
} from "@rwos/shared";
import { fmtLocale, useLocale, useT, type Translate } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";
import { ETransferBox, readETransferDetails } from "./ETransferBox";

// Employer plans page. Short-term jobs: 3 plan cards with trial / subscribe / cancel and a savings
// calculator. Long-term jobs: no plan — an explanation of the paid listing (C$99/month in advance,
// 2-week free trial, 50% off the first month, taxes) and a link to the company's long-term jobs,
// where each listing is published or renewed. Prices show GST + QST. The page never shows Joblop's
// share: only the employer's discount and the prices. An open Interac order shows its instructions
// (short code, exact amount, copy buttons, one "I've sent it"); an active paid plan can be renewed for
// a month; paid months come with a receipt, listed at the bottom with a PDF download.

type TrackState = Readonly<{
  track: JobLength;
  plan: EmployerPlanCode;
  status: "none" | "active" | "trialing" | "expired";
  endsAt: string | null;
  cancelAtPeriodEnd: boolean;
  trialAvailable: boolean;
}>;

type Order = Readonly<{
  id: string;
  plan: string;
  track: JobLength | null;
  priceMinor: number;
  subtotalMinor?: number;
  gstMinor?: number;
  qstMinor?: number;
  totalMinor?: number;
  currency: string;
  method: string;
  status: string;
  reference?: string;
  eTransfer?: Record<string, unknown>;
}>;

type Receipt = Readonly<{
  id: string;
  receiptNumber: string;
  kind: string;
  itemCode: string;
  itemLabel: string;
  periodStart: string;
  periodEnd: string;
  totalMinor: number;
  paidAt: string;
}>;

type Overview = Readonly<{
  enabled: boolean;
  signedIn?: boolean;
  manager?: boolean;
  companyRequired?: boolean;
  cardEnabled?: boolean;
  tracks?: readonly TrackState[];
  orders?: readonly Order[];
  receipts?: readonly Receipt[];
}>;

const GOLD = "#f8b808";
const INK = "#f4efe4";
const MUTED = "#b3a894";
const LINE = "rgba(248, 184, 8, 0.16)";

function money(minor: number, locale: ReturnType<typeof useLocale>): string {
  return (minor / 100).toLocaleString(fmtLocale(locale), { style: "currency", currency: "CAD", maximumFractionDigits: minor % 100 === 0 ? 0 : 2 });
}

function day(iso: string, locale: ReturnType<typeof useLocale>): string {
  return new Date(iso).toLocaleDateString(fmtLocale(locale), { year: "numeric", month: "long", day: "numeric" });
}

function perkKeys(code: EmployerPlanCode): MessageKey[] {
  const count: Record<EmployerPlanCode, number> = {
    pay_per_shift: 1,
    shift_pro: 2,
    shift_business: 3
  };
  return Array.from({ length: count[code] }, (_, i) => `plans.perk.${code}.${i + 1}` as MessageKey);
}

async function post(url: string, body: unknown): Promise<{ ok: boolean; payload: Record<string, unknown> | null }> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return { ok: response.ok, payload };
  } catch {
    return { ok: false, payload: null };
  }
}

export function PlansPanel() {
  const t = useT();
  const locale = useLocale();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/employer-plan", { cache: "no-store" });
      setOverview(response.ok ? ((await response.json()) as Overview) : { enabled: false });
    } catch {
      setOverview({ enabled: false });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      // Back from the Stripe TEST checkout: ask the API to verify the payment, then reload.
      const params = new URLSearchParams(window.location.search);
      const order = params.get("order");
      if (params.get("paid") === "success" && order) {
        const result = await post(`/api/employer-plan/orders/${encodeURIComponent(order)}/complete`, {});
        setNotice(result.ok ? t("plans.paidOk") : t("plans.paidPending"));
        window.history.replaceState(null, "", "/plans");
      }
      await load();
    })();
  }, [load, t]);

  async function act(key: string, url: string, body: unknown, success: (payload: Record<string, unknown> | null) => void) {
    setBusy(key);
    setNotice("");
    const result = await post(url, body);
    setBusy(null);
    if (!result.ok) {
      setNotice(t("plans.error"));
      return;
    }
    success(result.payload);
    await load();
  }

  const startTrial = (plan: EmployerPlanCode) =>
    act(`trial-${plan}`, "/api/employer-plan/trial", { plan }, () => setNotice(t("plans.trialStarted")));

  // The Interac instructions come back with the open order on reload, shown inside the plan card.
  const subscribe = (plan: EmployerPlanCode, method: "e_transfer" | "stripe") =>
    act(`sub-${plan}-${method}`, "/api/employer-plan/subscribe", { plan, method }, (payload) => {
      if (method !== "stripe") return;
      const url = typeof payload?.checkoutUrl === "string" ? payload.checkoutUrl : null;
      if (url) window.location.assign(url);
    });

  const claimSent = (orderId: string) =>
    act(`claim-${orderId}`, `/api/employer-plan/orders/${encodeURIComponent(orderId)}/claim-etransfer`, {}, () => {
      setNotice(t("plans.etransferThanks"));
    });

  const cancel = (track: JobLength, endsAt: string | null) => {
    if (!window.confirm(t("plans.cancelConfirm", { date: endsAt ? day(endsAt, locale) : "" }))) return;
    return act(`cancel-${track}`, "/api/employer-plan/cancel", { track }, (payload) => {
      const withdrawn = payload?.withdrawn as { canceled?: number; refundCheck?: number } | undefined;
      const extra = [
        (withdrawn?.canceled ?? 0) > 0 ? t("plans.canceledWithdrawn") : "",
        (withdrawn?.refundCheck ?? 0) > 0 ? t("plans.canceledRefund") : ""
      ].filter(Boolean);
      setNotice([t("plans.canceled"), ...extra].join(" "));
    });
  };

  return (
    <main className="jp-page">
      <style>{css}</style>
      {/* The site header (logo, EN/FR/ع, menu) is rendered by the page; this row keeps the plan links. */}
      <nav aria-label="Plans navigation" className="jp-subnav">
        <a href="/pricing" className="jp-link">{t("plans.back")}</a>
        {overview?.signedIn === true ? (
          <a href="/employer/calendar" className="jp-link">{t("plans.myWorkspace")}</a>
        ) : (
          <a href="/signin" className="jp-link">{t("hub.signinButton")}</a>
        )}
      </nav>

      <section className="jp-hero">
        <p className="jp-eyebrow">{t("plans.eyebrow")}</p>
        <h1 className="jp-title">{t("plans.title")}</h1>
        <p className="jp-lede">{t("plans.lede")}</p>
        <p className="jp-strong">{t("plans.noHidden")} {t("plans.refundRule")}</p>
      </section>

      {overview === null ? (
        <p className="jp-section jp-muted">{t("common.loading")}</p>
      ) : !overview.enabled ? (
        <section className="jp-section" aria-labelledby="soon-title">
          <div className="jp-card jp-soon">
            <h2 id="soon-title" className="jp-h2">{t("plans.comingSoonTitle")}</h2>
            <p className="jp-muted">{t("plans.comingSoonText")}</p>
          </div>
        </section>
      ) : (
        <>
          {notice ? <p className="jp-notice" role="status">{notice}</p> : null}
          {overview.signedIn === false ? (
            <p className="jp-section-tight"><a href="/signin" className="jp-primary">{t("plans.signinToStart")}</a></p>
          ) : overview.companyRequired ? (
            <p className="jp-section-tight jp-muted">{t("plans.companyNeeded")}</p>
          ) : overview.manager === false ? (
            <p className="jp-section-tight jp-muted">{t("plans.managerNeeded")}</p>
          ) : null}
          <TrackSection
            track="short_term"
            t={t}
            locale={locale}
            overview={overview}
            busy={busy}
            onTrial={startTrial}
            onSubscribe={subscribe}
            onClaim={claimSent}
            onCancel={cancel}
          />
          <LongTermListingSection t={t} locale={locale} />
          {overview.signedIn === true && overview.manager === true ? <ReceiptsSection t={t} locale={locale} receipts={overview.receipts ?? []} /> : null}
          <p className="jp-section-tight jp-muted">{t("plans.taxNote")} {t("plans.noHidden")} {t("plans.refundRule")}</p>
        </>
      )}
    </main>
  );
}

function TrackSection({
  track,
  t,
  locale,
  overview,
  busy,
  onTrial,
  onSubscribe,
  onClaim,
  onCancel
}: Readonly<{
  track: JobLength;
  t: Translate;
  locale: ReturnType<typeof useLocale>;
  overview: Overview;
  busy: string | null;
  onTrial: (plan: EmployerPlanCode) => void;
  onSubscribe: (plan: EmployerPlanCode, method: "e_transfer" | "stripe") => void;
  onClaim: (orderId: string) => void;
  onCancel: (track: JobLength, endsAt: string | null) => void;
}>) {
  const state = overview.tracks?.find((item) => item.track === track) ?? null;
  const canAct = overview.signedIn === true && overview.manager === true && state !== null;
  const paidInForce = state !== null && (state.status === "active" || state.status === "trialing");
  const plans = plansForTrack(track);
  const titleId = `track-${track}`;

  return (
    <section className="jp-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="jp-h2">{t(`plans.track.${track}` as MessageKey)}</h2>
      <p className="jp-muted">{t(`plans.trackText.${track}` as MessageKey)}</p>
      <div className="jp-grid">
        {plans.map((plan) => {
          const isCurrent = state?.plan === plan.code;
          const paid = plan.monthlyPriceMinor > 0;
          const openOrder = overview.orders?.find((order) => order.plan === plan.code && (order.status === "pending_payment" || order.status === "payment_claimed"));
          return (
            <article key={plan.code} className={`jp-card${isCurrent ? " jp-current" : ""}`}>
              {isCurrent && canAct ? <p className="jp-badge">{t("plans.current")}</p> : null}
              <h3 className="jp-h3">{t(`plans.name.${plan.code}` as MessageKey)}</h3>
              <p className="jp-price">{paid ? t("plans.perMonth", { price: money(plan.monthlyPriceMinor, locale) }) : t("plans.noMonthly")}</p>
              {paid ? <p className="jp-muted">{t("plans.withTax", { total: money(quebecSalesTax(plan.monthlyPriceMinor).totalMinor, locale) })}</p> : null}
              <ul className="jp-list">
                {plan.employerDiscountPpm > 0 ? <li className="jp-strong">{t("plans.discount", { percent: plan.employerDiscountPpm / 10_000 })}</li> : null}
                {plan.urgentSurchargeFactorPpm < 1_000_000 ? <li>{t("plans.urgentHalf")}</li> : null}
                {perkKeys(plan.code).map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
              {isCurrent && paidInForce && state?.endsAt ? (
                <p className="jp-muted">
                  {state.cancelAtPeriodEnd
                    ? t("plans.endsNoRenew", { date: day(state.endsAt, locale) })
                    : state.status === "trialing"
                      ? t("plans.trialEnds", { date: day(state.endsAt, locale) })
                      : t("plans.paidUntil", { date: day(state.endsAt, locale) })}
                </p>
              ) : null}
              {canAct && paid ? (
                <div className="jp-actions">
                  {!paidInForce && state?.trialAvailable ? (
                    <button type="button" className="jp-primary" disabled={busy !== null} onClick={() => onTrial(plan.code)}>
                      {t("plans.trial")}
                    </button>
                  ) : null}
                  {!paidInForce && !state?.trialAvailable && state?.status !== "none" ? <p className="jp-muted">{t("plans.trialUsed")}</p> : null}
                  {openOrder?.status === "payment_claimed" ? (
                    <p className="jp-muted">{t("plans.awaitingConfirm")}</p>
                  ) : openOrder?.method === "e_transfer" && readETransferDetails(openOrder) ? (
                    <ETransferBox
                      details={readETransferDetails(openOrder)!}
                      startsText={t("plans.etransferStartsOnConfirm")}
                      busy={busy !== null}
                      onSent={() => onClaim(openOrder.id)}
                      primaryClassName="jp-primary"
                    />
                  ) : openOrder?.method === "e_transfer" ? (
                    <button type="button" className="jp-ghost" disabled={busy !== null} onClick={() => onClaim(openOrder.id)}>
                      {t("plans.etransferSent")}
                    </button>
                  ) : isCurrent && state?.status === "active" && !state.cancelAtPeriodEnd ? (
                    // Active paid plan: pay the next month ahead; it starts when the paid month ends.
                    <>
                      <button type="button" className="jp-ghost" disabled={busy !== null} onClick={() => onSubscribe(plan.code, "e_transfer")}>
                        {t("plans.renewEtransfer")}
                      </button>
                      {overview.cardEnabled ? (
                        <button type="button" className="jp-ghost" disabled={busy !== null} onClick={() => onSubscribe(plan.code, "stripe")}>
                          {t("plans.renewCard")}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {isCurrent && state?.status === "trialing" ? <p className="jp-muted">{t("plans.paidStartsAtTrialEnd")}</p> : null}
                      <button type="button" className="jp-ghost" disabled={busy !== null} onClick={() => onSubscribe(plan.code, "e_transfer")}>
                        {t("plans.subscribeEtransfer")}
                      </button>
                      {overview.cardEnabled ? (
                        <button type="button" className="jp-ghost" disabled={busy !== null} onClick={() => onSubscribe(plan.code, "stripe")}>
                          {t("plans.subscribeCard")}
                        </button>
                      ) : null}
                    </>
                  )}
                  {isCurrent && paidInForce && !state?.cancelAtPeriodEnd ? (
                    <button type="button" className="jp-danger" disabled={busy !== null} onClick={() => onCancel(track, state?.endsAt ?? null)}>
                      {t("plans.cancel")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <SavingsCalculator track={track} t={t} locale={locale} />
    </section>
  );
}

function SavingsCalculator({ track, t, locale }: Readonly<{ track: JobLength; t: Translate; locale: ReturnType<typeof useLocale> }>) {
  const [rate, setRate] = useState("30");
  const [hours, setHours] = useState("80");
  const rateMinor = Math.max(0, Math.round(Number(rate) * 100) || 0);
  const hoursPerMonth = Math.max(0, Number(hours) || 0);
  // Uses the default share only to apply the same clamp the invoice uses; the share itself is never
  // shown.
  const margin = DEFAULT_PLATFORM_MARGIN_PPM;
  const paidPlans = plansForTrack(track).filter((plan) => plan.monthlyPriceMinor > 0);
  const idRate = `calc-rate-${track}`;
  const idHours = `calc-hours-${track}`;

  return (
    <div className="jp-card jp-calc">
      <h3 className="jp-h3">{t("plans.calcTitle")}</h3>
      <div className="jp-calc-fields">
        <label htmlFor={idRate} className="jp-label">
          {t("plans.calcRate")}
          <input id={idRate} className="jp-input" inputMode="decimal" type="number" min="0" step="0.5" value={rate} onChange={(event) => setRate(event.target.value)} />
        </label>
        <label htmlFor={idHours} className="jp-label">
          {t("plans.calcHours")}
          <input id={idHours} className="jp-input" inputMode="numeric" type="number" min="0" step="1" value={hours} onChange={(event) => setHours(event.target.value)} />
        </label>
      </div>
      <ul className="jp-list" aria-live="polite">
        {paidPlans.map((plan) => {
          const name = t(`plans.name.${plan.code}` as MessageKey);
          const saving = employerPlanMonthlySavingMinor({ plan: plan.code, employerHourlyRateMinor: rateMinor, hoursPerMonth, marginPpm: margin });
          const breakEven = planBreakEvenHours(plan.code, rateMinor, margin);
          return (
            <li key={plan.code}>
              {t("plans.calcSaving", { plan: name, saving: money(saving, locale), price: money(EMPLOYER_PLAN_CATALOG[plan.code].monthlyPriceMinor, locale) })}
              {breakEven ? <> {t("plans.calcPaysFor", { plan: name, hours: breakEven })}</> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Long-term jobs: a paid listing, not a plan. Explains the price and links to the company's jobs. */
function LongTermListingSection({ t, locale }: Readonly<{ t: Translate; locale: ReturnType<typeof useLocale> }>) {
  const full = jobListingMonthPrice(false);
  const half = jobListingMonthPrice(true);
  return (
    <section className="jp-section" aria-labelledby="track-long_term">
      <h2 id="track-long_term" className="jp-h2">{t("plans.track.long_term")}</h2>
      <p className="jp-muted">{t("plans.trackText.long_term")}</p>
      <div className="jp-card jp-listing">
        <p className="jp-price">{t("plans.perMonth", { price: money(full.subtotalMinor, locale) })}</p>
        <ul className="jp-list">
          <li className="jp-strong">{t("listing.price", { total: money(full.totalMinor, locale) })}</li>
          <li>{t("listing.trial")}</li>
          <li>{t("listing.firstMonth", { price: money(half.subtotalMinor, locale), total: money(half.totalMinor, locale) })}</li>
          <li>{t("listing.intro")}</li>
          <li>{t("listing.noRenew")}</li>
        </ul>
        <p className="jp-muted">{t("plans.refundRule")}</p>
        <a href="/employer/calendar" className="jp-primary">{t("listing.seeJobs")}</a>
      </div>
    </section>
  );
}

/** Receipts for paid plan months and paid listing months, newest first, each with a PDF download. */
function ReceiptsSection({ t, locale, receipts }: Readonly<{ t: Translate; locale: ReturnType<typeof useLocale>; receipts: readonly Receipt[] }>) {
  const cents = (minor: number) =>
    (minor / 100).toLocaleString(fmtLocale(locale), { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <section className="jp-section" aria-labelledby="receipts-title">
      <h2 id="receipts-title" className="jp-h2">{t("plans.receiptsTitle")}</h2>
      <p className="jp-muted">{t("plans.receiptsNote")}</p>
      {receipts.length === 0 ? (
        <p className="jp-muted">{t("plans.receiptsEmpty")}</p>
      ) : (
        <ul className="jp-receipts">
          {receipts.map((receipt) => (
            <li key={receipt.id} className="jp-card jp-receipt">
              <p className="jp-strong" dir="ltr">{receipt.receiptNumber}</p>
              <p>
                {receipt.kind === "job_listing"
                  ? t("plans.receiptItemListing", { title: receipt.itemLabel })
                  : t("plans.receiptItemPlan", { plan: receipt.itemLabel })}
              </p>
              <p className="jp-muted">{t("plans.receiptPeriod", { start: day(receipt.periodStart, locale), end: day(receipt.periodEnd, locale) })}</p>
              <p className="jp-muted">
                {cents(receipt.totalMinor)} · {t("plans.receiptPaid", { date: day(receipt.paidAt, locale) })}
              </p>
              <a className="jp-ghost" href={`/api/receipts/${encodeURIComponent(receipt.id)}/pdf`}>{t("plans.receiptDownload")}</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const css = `
  .jp-page { background: #000000; color: ${INK}; font-family: Inter, system-ui, sans-serif; min-height: 100vh; }
  .jp-subnav { align-items: center; border-bottom: 1px solid ${LINE}; display: flex; flex-wrap: wrap; gap: 4px 18px; padding: 4px clamp(16px, 4vw, 40px); }
  .jp-link { align-items: center; color: ${INK}; display: inline-flex; font-size: 14px; font-weight: 700; min-height: 44px; text-decoration: none; }
  .jp-hero { background: #1b160e; display: grid; gap: 12px; padding: clamp(32px, 6vw, 64px) clamp(16px, 4vw, 40px); }
  .jp-eyebrow { color: ${GOLD}; font-size: 13px; font-weight: 900; margin: 0; text-transform: uppercase; }
  .jp-title { font-size: clamp(32px, 5vw, 54px); line-height: 1.05; margin: 0; max-width: 900px; }
  .jp-lede { color: #f0e8d8; font-size: 18px; line-height: 1.6; margin: 0; max-width: 760px; }
  .jp-section { padding: 36px clamp(16px, 4vw, 40px) 8px; }
  .jp-section-tight { padding: 12px clamp(16px, 4vw, 40px); }
  .jp-h2 { font-size: clamp(24px, 3.5vw, 36px); margin: 0 0 6px; }
  .jp-h3 { font-size: 20px; margin: 0; }
  .jp-muted { color: ${MUTED}; line-height: 1.55; margin: 6px 0 0; }
  .jp-strong { font-weight: 800; }
  .jp-notice { background: #0c0c0c; border: 1px solid ${GOLD}; border-radius: 8px; font-weight: 800; margin: 18px clamp(16px, 4vw, 40px) 0; padding: 12px 14px; }
  .jp-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-top: 18px; }
  .jp-card { background: #0c0c0c; border: 1px solid ${LINE}; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; padding: 20px; }
  .jp-current { border-color: ${GOLD}; box-shadow: 0 0 0 1px ${GOLD} inset; }
  .jp-soon { max-width: 760px; }
  .jp-listing { margin-top: 18px; max-width: 760px; }
  .jp-badge { align-self: flex-start; background: ${GOLD}; border-radius: 999px; color: #000; font-size: 12px; font-weight: 900; margin: 0; padding: 3px 10px; text-transform: uppercase; }
  .jp-price { color: ${GOLD}; font-size: 22px; font-weight: 900; margin: 0; }
  .jp-list { display: grid; gap: 6px; line-height: 1.45; margin: 0; padding-inline-start: 20px; }
  .jp-actions { display: grid; gap: 8px; margin-top: auto; padding-top: 8px; }
  .jp-primary, .jp-ghost, .jp-danger { border-radius: 10px; cursor: pointer; display: inline-block; font: inherit; font-size: 15px; font-weight: 800; min-height: 44px; padding: 10px 16px; text-align: center; text-decoration: none; }
  .jp-primary { background: ${GOLD}; border: 0; color: #000; }
  .jp-ghost { background: transparent; border: 1px solid rgba(248, 184, 8, 0.34); color: ${INK}; }
  .jp-danger { background: transparent; border: 1px solid #e5a4a4; color: #e5a4a4; }
  .jp-primary:disabled, .jp-ghost:disabled, .jp-danger:disabled { cursor: wait; opacity: 0.6; }
  .jp-calc { margin-top: 14px; }
  .jp-receipts { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); list-style: none; margin: 14px 0 0; padding: 0; }
  .jp-receipt p { margin: 0; }
  .jp-calc-fields { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
  .jp-label { display: grid; font-size: 14px; font-weight: 800; gap: 6px; }
  .jp-input { background: #000; border: 1px solid ${LINE}; border-radius: 8px; color: ${INK}; font: inherit; min-height: 44px; padding: 0 12px; }
`;
