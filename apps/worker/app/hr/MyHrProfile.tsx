"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";

type Cred = Readonly<{ id: string; credentialType: string; expiresAt: string | null; effectiveStatus: string }>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error" }
  | { status: "ready"; standing: string; credentials: readonly Cred[] };

const STANDING_KEY: Record<string, MessageKey> = {
  active: "hr.standingActive",
  review_required: "hr.standingReview",
  restricted: "hr.standingRestricted",
  suspended: "hr.standingSuspended",
  inactive: "hr.standingInactive"
};
const CRED_KEY: Record<string, MessageKey> = {
  valid: "hr.credValid",
  expiring: "hr.credExpiring",
  expired: "hr.credExpired",
  replaced: "hr.credReplaced",
  revoked: "hr.credRevoked"
};

export function MyHrProfile() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/hr", { cache: "no-store" });
      if (r.status === 401) return setState({ status: "signed_out" });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { standing: string; credentials: Cred[] };
      setState({ status: "ready", standing: payload.standing, credentials: payload.credentials });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out")
    return <div className="state">{t("hr.signInPrompt")}<div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div></div>;
  if (state.status === "error") return <div className="state error" role="alert">{t("hr.loadError")}</div>;

  const needsAction = state.credentials.filter((c) => c.effectiveStatus === "expired" || c.effectiveStatus === "expiring");

  return (
    <>
      <section className="hero">
        <h1>{t("hr.title")}</h1>
        <p>{t("hr.intro")}</p>
      </section>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="role">{t("hr.standing")}</div>
        <div className="chips">
          <span className={`chip status-${state.standing}`}>{state.standing.replaceAll("_", " ")}</span>
        </div>
        <p className="when">{t(STANDING_KEY[state.standing] ?? "hr.standingInactive")}</p>
      </div>

      {needsAction.length > 0 ? (
        <div className="card" style={{ marginBottom: 14, borderColor: "var(--danger)" }}>
          <div className="role">{t("hr.requiredActions")}</div>
          <p className="when">{t("hr.someNeedAttention")}</p>
          <div className="chips">
            {needsAction.map((c) => <span key={c.id} className={`chip status-${c.effectiveStatus === "expired" ? "rejected" : "pending"}`}>{c.credentialType}: {t(CRED_KEY[c.effectiveStatus] ?? "hr.credValid")}</span>)}
          </div>
        </div>
      ) : null}

      <div className="results" style={{ paddingBottom: 48 }}>
        <div className="role" style={{ marginBottom: 4 }}>{t("hr.credentials")}</div>
        {state.credentials.length === 0 ? (
          <div className="state">{t("hr.noCredentials")}</div>
        ) : (
          state.credentials.map((c) => (
            <article key={c.id} className="card">
              <div className="role">{c.credentialType}</div>
              <div className="chips">
                <span className={`chip status-${badgeClass(c.effectiveStatus)}`}>{t(CRED_KEY[c.effectiveStatus] ?? "hr.credValid")}</span>
                {c.expiresAt ? <span className="chip">{t("common.expires", { date: new Date(c.expiresAt).toLocaleDateString(locale) })}</span> : null}
              </div>
            </article>
          ))
        )}
      </div>

      <p className="notice">{t("hr.footer")}</p>
    </>
  );
}

function badgeClass(status: string): string {
  if (status === "valid") return "verified";
  if (status === "expiring") return "pending";
  if (status === "expired" || status === "revoked") return "rejected";
  return "unverified";
}
