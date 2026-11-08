"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtLocale, useLocale, useT } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";
import { styles } from "../employerStyles";

// Long-term job listings (paid in advance; only while EMPLOYER_PLANS_ENABLED is on). A long-term job
// is shown to workers only while its listing is active, so the employer sees each long-term job's
// status here — "Not listed — payment needed", "Free trial until …", "Listed until …" — with the
// "Publish your job" actions: start the company's one free trial, pay one month by card (Stripe TEST)
// or Interac e-transfer, and "Renew 1 month". Renders nothing while the feature is off.

type Price = Readonly<{ subtotalMinor: number; gstMinor: number; qstMinor: number; totalMinor: number }>;
type Order = Readonly<{ id: string; method: string; status: string }>;
type Listing = Readonly<{
  jobRequestId: string;
  title: string;
  status: "not_listed" | "trial" | "listed" | "expired";
  listedUntil: string | null;
  openOrder: Order | null;
}>;
type Overview = Readonly<{
  enabled: boolean;
  signedIn?: boolean;
  manager?: boolean;
  cardEnabled?: boolean;
  trialAvailable?: boolean;
  nextMonthPrice?: Price;
  listings?: readonly Listing[];
}>;
type ETransfer = Readonly<{ email: string; amount: string; breakdown: string; reference: string; orderId: string }>;

async function post(url: string, body: unknown): Promise<{ ok: boolean; payload: Record<string, unknown> | null }> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { ok: response.ok, payload: (await response.json().catch(() => null)) as Record<string, unknown> | null };
  } catch {
    return { ok: false, payload: null };
  }
}

export function LongTermListingsPanel({ onlyJobRequestId }: Readonly<{ onlyJobRequestId?: string }>) {
  const t = useT();
  const locale = useLocale();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [eTransfer, setETransfer] = useState<ETransfer | null>(null);

  const money = (minor: number) => (minor / 100).toLocaleString(fmtLocale(locale), { style: "currency", currency: "CAD" });
  const day = (iso: string) => new Date(iso).toLocaleDateString(fmtLocale(locale), { year: "numeric", month: "long", day: "numeric" });

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/job-listings", { cache: "no-store" });
      setOverview(response.ok ? ((await response.json()) as Overview) : { enabled: false });
    } catch {
      setOverview({ enabled: false });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      // Back from the Stripe TEST checkout: the API verifies the payment with Stripe, then we reload.
      const params = new URLSearchParams(window.location.search);
      const order = params.get("order");
      if (!onlyJobRequestId && params.get("listing") === "paid" && order) {
        const result = await post(`/api/job-listings/orders/${encodeURIComponent(order)}/complete`, {});
        setNotice(result.ok ? t("listing.paidOk") : t("listing.paidPending"));
        window.history.replaceState(null, "", window.location.pathname);
      }
      await load();
    })();
  }, [load, onlyJobRequestId, t]);

  async function act(url: string, body: unknown, success: (payload: Record<string, unknown> | null) => void) {
    setBusy(true);
    setNotice("");
    const result = await post(url, body);
    setBusy(false);
    if (!result.ok) {
      setNotice(t("plans.error"));
      return;
    }
    success(result.payload);
    await load();
  }

  const startTrial = (jobRequestId: string) =>
    act(`/api/job-listings/${encodeURIComponent(jobRequestId)}/trial`, {}, () => setNotice(t("listing.trialOk")));

  const pay = (jobRequestId: string, method: "e_transfer" | "stripe") =>
    act(`/api/job-listings/${encodeURIComponent(jobRequestId)}/pay`, { method }, (payload) => {
      if (method === "stripe") {
        const url = typeof payload?.checkoutUrl === "string" ? payload.checkoutUrl : null;
        if (url) window.location.assign(url);
        return;
      }
      const details = payload?.eTransfer as Record<string, unknown> | undefined;
      const order = payload?.order as Record<string, unknown> | undefined;
      if (details && order && typeof order.id === "string") {
        setETransfer({
          email: String(details.email ?? ""),
          amount: String(details.amount ?? ""),
          breakdown: String(details.breakdown ?? ""),
          reference: String(details.reference ?? order.id),
          orderId: order.id
        });
      }
    });

  const claimSent = (orderId: string) =>
    act(`/api/job-listings/orders/${encodeURIComponent(orderId)}/claim-etransfer`, {}, () => {
      setETransfer(null);
      setNotice(t("listing.etransferThanks"));
    });

  if (!overview?.enabled || overview.signedIn === false) return null;
  const listings = (overview.listings ?? []).filter((item) => !onlyJobRequestId || item.jobRequestId === onlyJobRequestId);
  if (onlyJobRequestId && listings.length === 0) return null;
  const price = overview.nextMonthPrice;
  const canPay = overview.manager === true;

  return (
    <section aria-labelledby="long-term-listings-title" id="long-term-listings" style={{ ...styles.tintedCard, marginBottom: 18 }}>
      <h2 id="long-term-listings-title" style={styles.cardTitle}>
        {onlyJobRequestId ? t("listing.publishTitle") : t("listing.title")}
      </h2>
      <p style={styles.cardText}>{onlyJobRequestId ? t("listing.publishText") : t("listing.intro")}</p>
      {price ? (
        <p style={styles.cardText}>
          {t("listing.nextPrice", { price: money(price.subtotalMinor), gst: money(price.gstMinor), qst: money(price.qstMinor), total: money(price.totalMinor) })}
        </p>
      ) : null}
      {notice ? <p role="status" style={styles.warning}>{notice}</p> : null}
      {eTransfer ? (
        <div style={styles.card}>
          <p style={styles.cardText}>
            {t("listing.etransferText", { amount: eTransfer.amount, breakdown: eTransfer.breakdown, email: eTransfer.email, reference: eTransfer.reference })}
          </p>
          <button type="button" style={styles.primaryButton} disabled={busy} onClick={() => void claimSent(eTransfer.orderId)}>
            {t("plans.etransferSent")}
          </button>
        </div>
      ) : null}
      {!canPay ? <p style={styles.cardText}>{t("listing.managerNeeded")}</p> : null}
      {listings.length === 0 ? <p style={styles.cardText}>{t("listing.empty")}</p> : null}
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {listings.map((item) => {
          const statusText =
            item.status === "trial" || item.status === "listed"
              ? t(`listing.status.${item.status}` as MessageKey, { date: day(item.listedUntil ?? "") })
              : item.status === "expired" && item.listedUntil
                ? t("listing.status.expired", { date: day(item.listedUntil) })
                : t("listing.status.not_listed");
          const listed = item.status === "trial" || item.status === "listed";
          return (
            <article key={item.jobRequestId} style={styles.card}>
              <p style={styles.metaLabel}>{item.title}</p>
              <p style={listed ? styles.statusBadge : styles.statusBadgeWarning}>{statusText}</p>
              {canPay ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {item.openOrder?.status === "payment_claimed" ? (
                    <p style={styles.cardText}>{t("listing.awaiting")}</p>
                  ) : item.openOrder?.method === "e_transfer" ? (
                    <button type="button" style={styles.secondaryButton} disabled={busy} onClick={() => void claimSent(item.openOrder?.id ?? "")}>
                      {t("plans.etransferSent")}
                    </button>
                  ) : (
                    <>
                      {!listed && overview.trialAvailable ? (
                        <button type="button" style={styles.primaryButton} disabled={busy} onClick={() => void startTrial(item.jobRequestId)}>
                          {t("listing.startTrial")}
                        </button>
                      ) : null}
                      {overview.cardEnabled ? (
                        <button type="button" style={styles.secondaryButton} disabled={busy} onClick={() => void pay(item.jobRequestId, "stripe")}>
                          {listed ? `${t("listing.renew")} — ${t("listing.payCard")}` : t("listing.payCard")}
                        </button>
                      ) : null}
                      <button type="button" style={styles.secondaryButton} disabled={busy} onClick={() => void pay(item.jobRequestId, "e_transfer")}>
                        {listed ? `${t("listing.renew")} — ${t("listing.payEtransfer")}` : t("listing.payEtransfer")}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
