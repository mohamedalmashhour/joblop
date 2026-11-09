"use client";

import { useEffect, useState } from "react";
import { NEXT_AFTER_SIGN_UP_KEY, PublicJobSearch } from "./PublicJobSearch";
import { safeReturnPath } from "./safeReturnPath";
import { trackConversion } from "./analytics";
import { withBrand } from "./Brand";
import { useLocale, useT } from "./i18n/LocaleProvider";
import { VerifyEmail } from "./VerifyEmail";
import { VideoCard } from "./VideoCard";

/** Signed-out worker front door: value proposition + how-it-works, with a sign-in / create-account
 *  card. Fully bilingual (fr-CA / en-CA). On success it hands control back to the marketplace. */
export function LandingPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const t = useT();
  const locale = useLocale();
  // Create account comes first (owner rule): returning workers switch to "Sign in" in one tap.
  const [tab, setTab] = useState<"signin" | "signup">("signup");
  const remember = (next: string) => {
    const safe = safeReturnPath(next);
    if (!safe) return;
    try {
      window.sessionStorage.setItem(NEXT_AFTER_SIGN_UP_KEY, safe);
    } catch {
      /* storage blocked: they still land on the search after signing up */
    }
  };
  const wantDetails = (next: string) => {
    remember(next);
    setTab("signup");
    document.getElementById("auth-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  // Arriving from a public job page ("Create an account to take this job" or "Sign in"): remember the
  // job (an on-site path only) so sign-up or sign-in brings the visitor back to it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (!next) return;
    remember(next);
    setTab(params.get("tab") === "signin" ? "signin" : "signup");
    document.getElementById("auth-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const steps = [
    { title: t("land.step1Title"), body: t("land.step1Body") },
    { title: t("land.step2Title"), body: t("land.step2Body") },
    { title: t("land.step3Title"), body: t("land.step3Body") },
    { title: t("land.step4Title"), body: t("land.step4Body") }
  ];
  const values = [t("land.v1"), t("land.v2"), t("land.v3"), t("land.v4")];

  return (
    <div className="landing">
      <PublicJobSearch onWantDetails={wantDetails} />
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>{withBrand(t("land.heroTitle"))}</h1>
          <p>{withBrand(t("land.heroSub"))}</p>
          <ul className="landing-values">
            {values.map((v) => (
              <li key={v}>
                <span className="landing-tick" aria-hidden="true">✓</span>
                <span>{withBrand(v)}</span>
              </li>
            ))}
          </ul>
          <a href="/browse" className="landing-browse" style={{ display: "inline-block", marginTop: 14, fontWeight: 700, color: "#e0a500", textDecoration: "none" }}>
            {t("land.browsePublic")}
          </a>
          <a href="/how-it-works" className="landing-guide" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, padding: "9px 14px", border: "1px solid rgba(248,184,8,.4)", borderRadius: 999, fontWeight: 700, color: "#f4efe4", textDecoration: "none" }}>
            <span aria-hidden="true" style={{ color: "#f8b808" }}>?</span>
            {locale === "ar" ? "كيف يعمل جوب‑لوب — الدليل الكامل" : locale.startsWith("fr") ? "Comment fonctionne Joblop — le guide complet" : "How Joblop works — the full guide"}
          </a>
        </div>
        <div className="landing-hero-side">
          <AuthCard tab={tab} setTab={setTab} onSignedIn={onSignedIn} />
        </div>
        <div className="landing-hero-video">
          <VideoCard
            src="/media/workers-ready.mp4"
            poster="/media/workers-ready.jpg"
            label={t("land.videoReadyLabel")}
            playLabel={t("land.videoPlay")}
          />
        </div>
      </section>

      <section className="landing-steps">
        <h2>{t("land.howItWorks")}</h2>
        <div className="landing-steps-body">
          <VideoCard
            src="/media/how-joblop-works.mp4"
            poster="/media/how-joblop-works.jpg"
            label={t("land.videoHowLabel")}
            soundLabel={t("land.videoSoundOn")}
            muteLabel={t("land.videoSoundOff")}
            playLabel={t("land.videoPlay")}
            withSound
          />
        <ol>
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="step-n" aria-hidden="true">{i + 1}</span>
              <div>
                <h3>{withBrand(s.title)}</h3>
                <p>{withBrand(s.body)}</p>
              </div>
            </li>
          ))}
        </ol>
        </div>
      </section>
    </div>
  );
}

function AuthCard({
  tab,
  setTab,
  onSignedIn
}: {
  tab: "signin" | "signup";
  setTab: (t: "signin" | "signup") => void;
  onSignedIn: () => void;
}) {
  const t = useT();
  return (
    <div className="auth-card" id="auth-card">
      <div className="auth-tabs" role="tablist" aria-label="Sign in or create account">
        <button role="tab" type="button" aria-selected={tab === "signin"} className={tab === "signin" ? "active" : ""} onClick={() => setTab("signin")}>
          {t("auth.tabSignIn")}
        </button>
        <button role="tab" type="button" aria-selected={tab === "signup"} className={tab === "signup" ? "active" : ""} onClick={() => setTab("signup")}>
          {t("auth.tabCreate")}
        </button>
      </div>
      {tab === "signin" ? <SignInForm onSignedIn={onSignedIn} onNeedAccount={() => setTab("signup")} /> : <SignUpForm onSignedIn={onSignedIn} onHaveAccount={() => setTab("signin")} />}
    </div>
  );
}


// Workers sign in with a mobile number and a texted code. The session stays in an httpOnly cookie.
function SignInForm({ onSignedIn, onNeedAccount }: { onSignedIn: () => void; onNeedAccount: () => void }) {
  const t = useT();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/session/phone/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (!response.ok) return setError(t("auth.numberUnusable"));
      setStep("code");
      setCode("");
    } catch {
      setError(t("common.somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/session/phone/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code: code.trim() })
      });
      if (response.ok) return onSignedIn();
      setError(t("auth.signInFailed"));
    } catch {
      setError(t("common.somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  const problem = error ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null;

  if (step === "phone") {
    return (
      <form className="auth-form" onSubmit={(event) => void sendCode(event)}>
        <label htmlFor="si-phone">{t("auth.mobileNumber")}</label>
        <input id="si-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("signup.phonePlaceholder")} required />
        {problem}
        <button className="btn" type="submit" disabled={busy}>{busy ? t("auth.sendingCode") : t("auth.textMeCode")}</button>
        <p className="auth-switch">{withBrand(t("auth.needAccount"))} <button type="button" className="linkbtn" onClick={onNeedAccount}>{t("auth.tabCreate")}</button></p>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={(event) => void verify(event)}>
      <p className="notice" role="status">{t("auth.codeOnWay")}</p>
      <label htmlFor="si-code">{t("auth.codeLabel")}</label>
      <input id="si-code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(e) => setCode(e.target.value)} required />
      {problem}
      <button className="btn" type="submit" disabled={busy}>{busy ? t("auth.signingIn") : t("auth.signIn")}</button>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <button type="button" className="linkbtn" disabled={busy} onClick={() => void sendCode()}>{t("auth.sendNewCode")}</button>
        <button type="button" className="linkbtn" disabled={busy} onClick={() => setStep("phone")}>{t("auth.changeNumber")}</button>
      </div>
    </form>
  );
}

function SignUpForm({ onSignedIn, onHaveAccount }: { onSignedIn: () => void; onHaveAccount: () => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  // Invite-a-friend: capture ?ref=CODE once and remember it (survives tab switches / the email step).
  const [referralCode, setReferralCode] = useState<string | null>(null);
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("ref");
      if (fromUrl) { setReferralCode(fromUrl); try { localStorage.setItem("jl_ref", fromUrl); } catch { /* ignore */ } return; }
      const stored = (() => { try { return localStorage.getItem("jl_ref"); } catch { return null; } })();
      if (stored) setReferralCode(stored);
    } catch { /* ignore */ }
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) return setError(t("signup.emailMismatch"));
    if (!accepted) return setError(t("signup.mustAccept"));
    setBusy(true);
    try {
      const response = await fetch("/api/session/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          confirmEmail,
          acceptedNotices: true,
          displayName: name.trim() || null,
          phone: phone.trim(),
          referralCode
        })
      });
      if (response.ok) { trackConversion("sign_up", { method: "worker" }); setRegistered(true); return; }
      if (response.status === 404) setError(t("signup.closed"));
      else if (response.status === 409) setError(t("signup.conflict"));
      else if (response.status === 400) setError(t("auth.numberUnusable"));
      else if (response.status === 429) setError(t("signup.rateLimited"));
      else setError(t("signup.failed"));
    } catch {
      setError(t("common.somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  if (registered) return <VerifyEmail onDone={onSignedIn} />;

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="su-name">{t("signup.name")}</label>
      <input id="su-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("signup.namePlaceholder")} />
      <label htmlFor="su-phone">{t("signup.phone")}</label>
      <input id="su-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("signup.phonePlaceholder")} required />
      <p id="su-sms-consent" className="notice" style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.4 }}>{withBrand(t("hr.smsConsent"))}</p>
      <label htmlFor="su-email">{t("auth.email")}</label>
      <input id="su-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="su-confirm-email">{t("signup.confirmEmail")}</label>
      <input id="su-confirm-email" type="email" autoComplete="username" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} required />
      <label className="checkfield" htmlFor="su-accept" style={{ marginTop: 6 }}>
        <input id="su-accept" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        {t("signup.accept")}
      </label>
      {error ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? t("signup.creating") : t("signup.submit")}</button>
      <p className="notice" style={{ margin: "4px 0 0" }}>{t("signup.noFeeNote")}</p>
      <p className="auth-switch">{t("auth.haveAccount")} <button type="button" className="linkbtn" onClick={onHaveAccount}>{t("auth.tabSignIn")}</button></p>
    </form>
  );
}
