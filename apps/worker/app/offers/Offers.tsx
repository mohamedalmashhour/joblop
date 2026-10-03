"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "../i18n/LocaleProvider";
import type { RwosLocale } from "../i18n/config";
import type { MessageKey } from "../i18n/messages";

type Offer = Readonly<{
  workerOfferId: string;
  jobRequestId: string;
  status: string;
  expiresAt: string;
  title: string | null;
  summary: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string | null;
  compensationSummary: string | null;
  policySummary: string | null;
  termsVersionId: string | null;
  versionToken: number;
}>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error" }
  | { status: "ready"; items: readonly Offer[] };

// Statuses where the worker can still respond. Terminal states (accepted/declined/expired/
// withdrawn/cancelled) are read-only. `draft`/`approved` are pre-delivery and never worker-visible.
const RESPONDABLE = new Set(["sent", "delivered", "viewed"]);
const STATUS_LABEL_KEY: Record<string, MessageKey> = {
  draft: "offers.statusPreparing",
  approved: "offers.statusPreparing",
  sent: "offers.statusAwaiting",
  delivered: "offers.statusAwaiting",
  viewed: "offers.statusAwaiting",
  accepted: "offers.statusAccepted",
  declined: "offers.statusDeclined",
  expired: "offers.statusExpired",
  withdrawn: "offers.statusWithdrawn",
  cancelled: "offers.statusCancelled"
};
const STATUS_CHIP: Record<string, string> = {
  accepted: "status-verified",
  declined: "status-rejected",
  expired: "status-rejected",
  withdrawn: "status-rejected",
  cancelled: "status-rejected"
};

function when(startAt: string | null, endAt: string | null, tz: string | null, locale: RwosLocale, tbc: string): string {
  if (!startAt || !endAt) return tbc;
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", ...(tz ? { timeZone: tz } : {})
  };
  return `${new Date(startAt).toLocaleString(locale, opts)} – ${new Date(endAt).toLocaleString(locale, opts)}`;
}
function expiryWhen(expiresAt: string, locale: RwosLocale): string {
  return new Date(expiresAt).toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function Offers() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/offers", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) return setState({ status: r.status === 401 ? "signed_out" : "error" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { workerOffers: Offer[] };
      setState({ status: "ready", items: payload.workerOffers ?? [] });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const respond = useCallback(async (offer: Offer, action: "accept" | "decline") => {
    setBusyId(offer.workerOfferId);
    setNotice("");
    try {
      const r = await fetch(`/api/offers/${encodeURIComponent(offer.workerOfferId)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: offer.versionToken, expectedTermsVersionId: offer.termsVersionId ?? "" })
      });
      if (r.status === 409) {
        setNotice(t("offers.changed"));
        await load();
        return;
      }
      if (r.status === 401) return setState({ status: "signed_out" });
      if (!r.ok) {
        setNotice(t("offers.responseFailed"));
        return;
      }
      setNotice(action === "accept" ? t("offers.accepted") : t("offers.declined"));
      await load();
    } catch {
      setNotice(t("offers.responseFailed"));
    } finally {
      setBusyId(null);
    }
  }, [load, t]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out")
    return <div className="state">{t("offers.signInPrompt")}<div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("offers.loadError")}</div>;

  return (
    <>
      <section className="hero">
        <h1>{t("nav.offers")}</h1>
        <p>{t("offers.intro")}</p>
      </section>
      {notice ? <div className="state" role="status" style={{ marginBottom: 16 }}>{notice}</div> : null}

      {state.items.length === 0 ? (
        <div className="state">{t("offers.none")}</div>
      ) : (
        <div className="results" style={{ paddingBottom: 48 }}>
          {state.items.map((o) => {
            const respondable = RESPONDABLE.has(o.status);
            const busy = busyId === o.workerOfferId;
            return (
              <article className="card" key={o.workerOfferId}>
                <div className="role">{o.title ?? t("offers.shiftOffer")}</div>
                <div className="chips">
                  <span className={`chip ${STATUS_CHIP[o.status] ?? "status-pending"}`}>{t(STATUS_LABEL_KEY[o.status] ?? "offers.statusPreparing")}</span>
                </div>
                <dl className="agreement">
                  <dt>{t("offers.agreementTitle")}</dt>
                  <dd />
                  {o.summary ? (<><dt>{t("offers.whatYoullDo")}</dt><dd>{o.summary}</dd></>) : null}
                  <dt>{t("offers.scheduleLabel")}</dt>
                  <dd>{when(o.startAt, o.endAt, o.timezone, locale, t("offers.scheduleTbc"))}</dd>
                  {o.compensationSummary ? (<><dt>{t("offers.compensationLabel")}</dt><dd>{o.compensationSummary}</dd></>) : null}
                  {o.policySummary ? (<><dt>{t("offers.policyLabel")}</dt><dd>{o.policySummary}</dd></>) : null}
                  <dt>{t("offers.respondBy")}</dt>
                  <dd>{expiryWhen(o.expiresAt, locale)}</dd>
                </dl>
                {respondable ? (
                  <aside className="rights" aria-label={t("offers.rightsTitle")}>
                    <strong>{t("offers.rightsTitle")}</strong>
                    <ul>
                      <li>{t("offers.rightBinding")}</li>
                      <li>{t("offers.rightNoFee")}</li>
                      <li>{t("offers.rightRecorded")}</li>
                    </ul>
                    <p className="rights-note">{t("offers.allowancesNote")}</p>
                  </aside>
                ) : null}
                {respondable ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="btn" type="button" disabled={busy} onClick={() => void respond(o, "accept")}>
                      {busy ? t("offers.working") : t("offers.acceptOffer")}
                    </button>
                    <button className="btn ghost" type="button" disabled={busy} onClick={() => void respond(o, "decline")}>
                      {t("offers.decline")}
                    </button>
                    <a className="btn ghost" href={`/jobs/${encodeURIComponent(o.jobRequestId)}`}>{t("offers.viewJob")}</a>
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <a className="btn ghost" href={`/jobs/${encodeURIComponent(o.jobRequestId)}`}>{t("offers.viewJob")}</a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="notice">{t("offers.footer")}</p>
    </>
  );
}
