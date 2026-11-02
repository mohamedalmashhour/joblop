"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT, type Translate } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";
import { resolveDeniedKind } from "../resolveDenied";

type Item = Readonly<{ status: string; requestedAt: string | null; completedAt: string | null; expiresAt: string | null; provider: string | null }>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "needs_setup" }
  | { status: "error" }
  | { status: "ready"; identity: Item; backgroundCheck: Item };

const STATUS_LABEL_KEY: Record<string, MessageKey> = {
  unverified: "ver.statusNotStarted",
  pending: "ver.statusInReview",
  verified: "ver.statusVerified",
  review: "ver.statusNeedsReview",
  expired: "ver.statusExpired",
  rejected: "ver.statusNotApproved"
};
function nextStepKey(kind: "identity" | "background_check", status: string): MessageKey {
  if (status === "verified") return "ver.stepAllSet";
  if (status === "pending") return "ver.stepReviewing";
  if (status === "review") return "ver.stepCloserLook";
  if (status === "expired") return "ver.stepExpired";
  if (status === "rejected") return "ver.stepRejected";
  return kind === "identity" ? "ver.stepIdentityDefault" : "ver.stepBackgroundDefault";
}

export function VerificationPanel() {
  const t = useT();
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/verification", { cache: "no-store" });
      if (r.status === 401) return setState({ status: await resolveDeniedKind() });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { identity: Item; backgroundCheck: Item };
      setState({ status: "ready", identity: payload.identity, backgroundCheck: payload.backgroundCheck });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const request = useCallback(async (verificationType: "identity" | "background_check") => {
    setBusy(verificationType);
    try {
      const r = await fetch("/api/verification/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ verificationType }) });
      if (r.ok) await load();
    } finally {
      setBusy(null);
    }
  }, [load]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out")
    return (
      <div className="state">
        {t("ver.signInPrompt")}
        <div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div>
      </div>
    );
  if (state.status === "needs_setup")
    return (
      <div className="state">
        {t("common.needsWorkerSetup")}
        <div style={{ marginTop: 12 }}><a className="btn" href="/onboarding">{t("common.setUpWorker")}</a></div>
      </div>
    );
  if (state.status === "error") return <div className="state error" role="alert">{t("ver.loadError")}</div>;

  return (
    <>
      <section className="hero">
        <h1>{t("nav.verification")}</h1>
        <p>{t("ver.intro")}</p>
      </section>

      <div className="results" style={{ paddingBottom: 48 }}>
        <VerificationCard kind="identity" title={t("ver.identity")} item={state.identity} busy={busy === "identity"} onRequest={() => request("identity")} t={t} locale={locale} />
        <VerificationCard kind="background_check" title={t("ver.backgroundCheck")} item={state.backgroundCheck} busy={busy === "background_check"} onRequest={() => request("background_check")} t={t} locale={locale} />
      </div>

      <p className="notice">{t("ver.footer")}</p>
    </>
  );
}

function VerificationCard({ kind, title, item, busy, onRequest, t, locale }: { kind: "identity" | "background_check"; title: string; item: Item; busy: boolean; onRequest: () => void; t: Translate; locale: string }) {
  const canStart = item.status === "unverified" || item.status === "expired" || item.status === "rejected";
  return (
    <article className="card">
      <div className="role">{title}</div>
      <div className="chips">
        <span className={`chip status-${item.status}`}>{t(STATUS_LABEL_KEY[item.status] ?? "ver.statusNotStarted")}</span>
        {item.expiresAt && item.status === "verified" ? <span className="chip">{t("ver.validUntil", { date: new Date(item.expiresAt).toLocaleDateString(locale) })}</span> : null}
      </div>
      <p className="when">{t(nextStepKey(kind, item.status))}</p>
      {canStart ? (
        <button className="btn" type="button" onClick={onRequest} disabled={busy} style={{ alignSelf: "flex-start" }}>
          {busy ? t("ver.starting") : item.status === "expired" ? t("ver.renew") : t("ver.start")}
        </button>
      ) : null}
    </article>
  );
}
