"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtLocale, useLocale, useT } from "../../../i18n/LocaleProvider";
import { styles } from "../../employerStyles";

type BonusOffer = Readonly<{
  bonusId: string;
  kind: "hourly" | "transport" | "one_time";
  amountMinor: number;
  currency: string;
  reason: string | null;
}>;

type State =
  | { status: "loading" }
  | { status: "none" }
  | { status: "offer"; offer: BonusOffer }
  | { status: "done"; outcome: "accepted" | "declined" };

// When no worker has taken the job, Joblop staff may offer a bonus that the employer pays.
// Shown only while an offer is waiting; the employer accepts (added to the invoice) or declines.
export function BonusOfferPanel({ requestId }: Readonly<{ requestId: string }>) {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-requests/${encodeURIComponent(requestId)}/bonus-offer`, { cache: "no-store" });
      if (!response.ok) return setState({ status: "none" });
      const payload = (await response.json()) as { offer?: BonusOffer | null };
      const offer = payload.offer;
      setState(offer && typeof offer.bonusId === "string" && offer.amountMinor > 0 ? { status: "offer", offer } : { status: "none" });
    } catch {
      setState({ status: "none" });
    }
  }, [requestId]);

  useEffect(() => { void load(); }, [load]);

  async function answer(offer: BonusOffer, action: "accept" | "decline") {
    if (action === "decline" && !window.confirm(t("bonusOffer.declineConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        action === "accept"
          ? `/api/bonuses/${encodeURIComponent(offer.bonusId)}/accept`
          : `/api/bonuses/${encodeURIComponent(offer.bonusId)}/decline`,
        { method: "POST" }
      );
      if (!response.ok) {
        setError(t(response.status === 409 ? "bonusOffer.conflict" : "bonusOffer.error"));
        return;
      }
      setState({ status: "done", outcome: action === "accept" ? "accepted" : "declined" });
    } catch {
      setError(t("bonusOffer.error"));
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "loading" || state.status === "none") return null;

  if (state.status === "done") {
    return (
      <p aria-live="polite" role="status" style={styles.cardText}>
        {t(state.outcome === "accepted" ? "bonusOffer.accepted" : "bonusOffer.declined")}
      </p>
    );
  }

  const { offer } = state;
  const money = (offer.amountMinor / 100).toLocaleString(locale, { style: "currency", currency: offer.currency || "CAD" });
  const amount =
    offer.kind === "hourly"
      ? t("bonusOffer.amountHourly", { amount: money })
      : offer.kind === "transport"
        ? t("bonusOffer.amountTransport", { amount: money })
        : t("bonusOffer.amountOneTime", { amount: money });

  return (
    <section aria-labelledby="bonus-offer-title" style={box}>
      <h3 id="bonus-offer-title" style={{ ...styles.cardTitle, color: "#111", margin: 0 }}>
        <span aria-hidden="true">★ </span>
        {t("bonusOffer.title")}
      </h3>
      <p style={{ margin: 0, color: "#2a2100", lineHeight: 1.5 }}>{t("bonusOffer.body", { amount })}</p>
      {offer.reason ? <p style={{ margin: 0, color: "#4a3b00", fontSize: 14 }}>{t("bonusOffer.reason", { reason: offer.reason })}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          disabled={busy}
          onClick={() => void answer(offer, "accept")}
          style={{ ...acceptButton, cursor: busy ? "wait" : "pointer" }}
          type="button"
        >
          {busy ? t("bonusOffer.working") : t("bonusOffer.accept")}
        </button>
        <button
          disabled={busy}
          onClick={() => void answer(offer, "decline")}
          style={{ ...declineButton, cursor: busy ? "wait" : "pointer" }}
          type="button"
        >
          {t("bonusOffer.decline")}
        </button>
      </div>
      {error ? (
        <p aria-live="assertive" role="alert" style={{ margin: 0, color: "#8a1c1c", fontWeight: 700 }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}

const box = {
  background: "#fff6d6",
  border: "2px solid #F8B808",
  borderRadius: 12,
  display: "grid",
  gap: 10,
  margin: "14px 0",
  padding: 16
} as const;

const acceptButton = {
  background: "#F8B808",
  border: 0,
  borderRadius: 8,
  color: "#111",
  fontWeight: 800,
  padding: "10px 18px"
} as const;

const declineButton = {
  background: "transparent",
  border: "1px solid #8a6d00",
  borderRadius: 8,
  color: "#4a3b00",
  fontWeight: 700,
  padding: "10px 18px"
} as const;
