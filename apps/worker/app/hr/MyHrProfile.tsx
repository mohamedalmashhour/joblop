"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/messages";
import { resolveDeniedKind } from "../resolveDenied";

type Cred = Readonly<{ id: string; credentialType: string; expiresAt: string | null; effectiveStatus: string }>;
type Intake = Readonly<{
  legalFirstName: string | null;
  legalLastName: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  hasDrivingLicence: boolean;
  licenceClass: string | null;
  licenceExpiry: string | null;
  hasVehicle: boolean;
  vehicleType: string | null;
  canTravelKm: number | null;
  transportNotes: string | null;
  marketingEmailOptIn?: boolean;
}>;
type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "needs_setup" }
  | { status: "error" }
  | { status: "ready"; standing: string; credentials: readonly Cred[]; intake: Intake | null };

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
      if (r.status === 401) return setState({ status: await resolveDeniedKind() });
      if (!r.ok) return setState({ status: "error" });
      const payload = (await r.json()) as { standing: string; credentials: Cred[]; intake: Intake | null };
      setState({ status: "ready", standing: payload.standing, credentials: payload.credentials, intake: payload.intake ?? null });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") return <div className="state">{t("common.loading")}</div>;
  if (state.status === "signed_out")
    return <div className="state">{t("hr.signInPrompt")}<div style={{ marginTop: 12 }}><a className="btn" href="/">{t("common.goToSearch")}</a></div></div>;
  if (state.status === "needs_setup")
    return <div className="state">{t("common.needsWorkerSetup")}<div style={{ marginTop: 12 }}><a className="btn" href="/onboarding">{t("common.setUpWorker")}</a></div></div>;
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

      {/* Worker-editable intake (seeded #5). Standing/credentials above/below stay read-only. */}
      <IntakeForm key={state.intake ? "loaded" : "empty"} initial={state.intake} onSaved={load} t={t} />

      {needsAction.length > 0 ? (
        <div className="card" style={{ marginBottom: 14, borderColor: "var(--danger)" }}>
          <div className="role">{t("hr.requiredActions")}</div>
          <p className="when">{t("hr.someNeedAttention")}</p>
          <div className="chips">
            {needsAction.map((c) => <span key={c.id} className={`chip status-${c.effectiveStatus === "expired" ? "rejected" : "pending"}`}>{c.credentialType}: {t(CRED_KEY[c.effectiveStatus] ?? "hr.credValid")}</span>)}
          </div>
        </div>
      ) : null}

      <div className="results" style={{ paddingBottom: 12 }}>
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

      {/* Certificates reuse the existing Documents feature — no separate uploader here. */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="role">{t("hr.certificates")}</div>
        <p className="when">{t("hr.certsIntro")}</p>
        <a className="btn ghost" href="/documents" style={{ alignSelf: "flex-start" }}>{t("hr.manageDocs")}</a>
      </div>

      <p className="notice">{t("hr.footer")}</p>
    </>
  );
}

function IntakeForm({ initial, onSaved, t }: { initial: Intake | null; onSaved: () => Promise<void>; t: (k: MessageKey, v?: Record<string, string | number>) => string }) {
  const [legalFirstName, setLegalFirstName] = useState(initial?.legalFirstName ?? "");
  const [legalLastName, setLegalLastName] = useState(initial?.legalLastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [addressLine, setAddressLine] = useState(initial?.addressLine ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [hasDrivingLicence, setHasDrivingLicence] = useState(Boolean(initial?.hasDrivingLicence));
  const [licenceClass, setLicenceClass] = useState(initial?.licenceClass ?? "");
  const [licenceExpiry, setLicenceExpiry] = useState(initial?.licenceExpiry ?? "");
  const [hasVehicle, setHasVehicle] = useState(Boolean(initial?.hasVehicle));
  const [vehicleType, setVehicleType] = useState(initial?.vehicleType ?? "");
  const [canTravelKm, setCanTravelKm] = useState(initial?.canTravelKm != null ? String(initial.canTravelKm) : "");
  const [transportNotes, setTransportNotes] = useState(initial?.transportNotes ?? "");
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(Boolean(initial?.marketingEmailOptIn));
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<"ok" | "err" | "consent" | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!consent) return setNotice("consent");
    setSaving(true);
    try {
      const body = {
        legalFirstName, legalLastName, phone, addressLine, city, province, postalCode,
        hasDrivingLicence,
        licenceClass: hasDrivingLicence ? licenceClass : null,
        licenceExpiry: hasDrivingLicence ? (licenceExpiry || null) : null,
        hasVehicle,
        vehicleType: hasVehicle ? vehicleType : null,
        canTravelKm: hasVehicle && canTravelKm.trim() !== "" ? Number(canTravelKm) : null,
        transportNotes,
        marketingEmailOptIn
      };
      const r = await fetch("/api/hr", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { setNotice("ok"); await onSaved(); } else { setNotice("err"); }
    } catch {
      setNotice("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" style={{ marginBottom: 14 }} onSubmit={submit}>
      <div className="role">{t("hr.intakeTitle")}</div>
      <p className="when">{t("hr.intakeIntro")}</p>

      <div className="auth-form" style={{ gap: 10 }}>
        <label htmlFor="hr-fn">{t("hr.fFirstName")}</label>
        <input id="hr-fn" type="text" value={legalFirstName} onChange={(e) => setLegalFirstName(e.target.value)} />
        <label htmlFor="hr-ln">{t("hr.fLastName")}</label>
        <input id="hr-ln" type="text" value={legalLastName} onChange={(e) => setLegalLastName(e.target.value)} />
        <label htmlFor="hr-ph">{t("hr.fPhone")}</label>
        <input id="hr-ph" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <p className="when" style={{ marginTop: -4, fontSize: 12, lineHeight: 1.4 }}>{t("hr.smsConsent")}</p>
        <label htmlFor="hr-addr">{t("hr.fAddress")}</label>
        <input id="hr-addr" type="text" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
        <label htmlFor="hr-city">{t("hr.fCity")}</label>
        <input id="hr-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} />
        <label htmlFor="hr-prov">{t("hr.fProvince")}</label>
        <input id="hr-prov" type="text" value={province} onChange={(e) => setProvince(e.target.value)} />
        <label htmlFor="hr-pc">{t("hr.fPostal")}</label>
        <input id="hr-pc" type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />

        <label className="checkfield" htmlFor="hr-haslic" style={{ marginTop: 6 }}>
          <input id="hr-haslic" type="checkbox" checked={hasDrivingLicence} onChange={(e) => setHasDrivingLicence(e.target.checked)} />
          {t("hr.hasLicence")}
        </label>
        {hasDrivingLicence ? (
          <>
            <label htmlFor="hr-licclass">{t("hr.fLicenceClass")}</label>
            <input id="hr-licclass" type="text" maxLength={16} value={licenceClass} onChange={(e) => setLicenceClass(e.target.value)} />
            <label htmlFor="hr-licexp">{t("hr.fLicenceExpiry")}</label>
            <input id="hr-licexp" type="date" value={licenceExpiry} onChange={(e) => setLicenceExpiry(e.target.value)} />
          </>
        ) : null}

        <label className="checkfield" htmlFor="hr-hasveh" style={{ marginTop: 6 }}>
          <input id="hr-hasveh" type="checkbox" checked={hasVehicle} onChange={(e) => setHasVehicle(e.target.checked)} />
          {t("hr.hasVehicle")}
        </label>
        {hasVehicle ? (
          <>
            <label htmlFor="hr-vtype">{t("hr.fVehicleType")}</label>
            <input id="hr-vtype" type="text" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} />
            <label htmlFor="hr-travel">{t("hr.fCanTravelKm")}</label>
            <input id="hr-travel" type="number" min={0} value={canTravelKm} onChange={(e) => setCanTravelKm(e.target.value)} />
          </>
        ) : null}

        <label htmlFor="hr-notes">{t("hr.fTransportNotes")}</label>
        <textarea id="hr-notes" rows={3} value={transportNotes} onChange={(e) => setTransportNotes(e.target.value)} />

        <label className="checkfield" htmlFor="hr-mktg" style={{ marginTop: 6 }}>
          <input id="hr-mktg" type="checkbox" checked={marketingEmailOptIn} onChange={(e) => setMarketingEmailOptIn(e.target.checked)} />
          {t("hr.marketingOptIn")}
        </label>

        <label className="checkfield" htmlFor="hr-consent" style={{ marginTop: 6 }}>
          <input id="hr-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {t("hr.consent")}
        </label>

        {notice === "err" ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{t("hr.saveError")}</p> : null}
        {notice === "consent" ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{t("hr.mustConsent")}</p> : null}
        {notice === "ok" ? (
          <div className="card" style={{ marginTop: 4, borderColor: "var(--accent)" }}>
            <p className="notice" role="status" style={{ color: "var(--accent)", margin: 0 }}>{t("hr.savedContinue")}</p>
            <a className="btn" href="/documents" style={{ alignSelf: "flex-start", marginTop: 8 }}>{t("hr.continueProfile")}</a>
          </div>
        ) : null}

        <button className="btn" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>{saving ? t("hr.saving") : t("hr.save")}</button>
      </div>
    </form>
  );
}

function badgeClass(status: string): string {
  if (status === "valid") return "verified";
  if (status === "expiring") return "pending";
  if (status === "expired" || status === "revoked") return "rejected";
  return "unverified";
}
