"use client";

import { useState } from "react";
import { useT } from "./i18n/LocaleProvider";

/** Signed-out worker front door: value proposition + how-it-works, with a sign-in / create-account
 *  card. Fully bilingual (fr-CA / en-CA). On success it hands control back to the marketplace. */
export function LandingPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const steps = [
    { title: t("land.step1Title"), body: t("land.step1Body") },
    { title: t("land.step2Title"), body: t("land.step2Body") },
    { title: t("land.step3Title"), body: t("land.step3Body") },
    { title: t("land.step4Title"), body: t("land.step4Body") }
  ];
  const values = [t("land.v1"), t("land.v2"), t("land.v3"), t("land.v4")];

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>{t("land.heroTitle")}</h1>
          <p>{t("land.heroSub")}</p>
          <ul className="landing-values">
            {values.map((v) => (
              <li key={v}><span aria-hidden="true">✓</span> {v}</li>
            ))}
          </ul>
        </div>
        <AuthCard tab={tab} setTab={setTab} onSignedIn={onSignedIn} />
      </section>

      <section className="landing-steps">
        <h2>{t("land.howItWorks")}</h2>
        <ol>
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="step-n" aria-hidden="true">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
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
    <div className="auth-card">
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

function SignInForm({ onSignedIn, onNeedAccount }: { onSignedIn: () => void; onNeedAccount: () => void }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/session/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (response.ok) return onSignedIn();
      setError(response.status === 429 ? t("auth.tooManyAttempts") : t("auth.signInFailed"));
    } catch {
      setError(t("common.somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="si-email">{t("auth.email")}</label>
      <input id="si-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="si-password">{t("auth.password")}</label>
      <input id="si-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? t("auth.signingIn") : t("auth.signIn")}</button>
      <p className="auth-switch">{t("auth.needAccount")} <button type="button" className="linkbtn" onClick={onNeedAccount}>{t("auth.tabCreate")}</button></p>
    </form>
  );
}

function SignUpForm({ onSignedIn, onHaveAccount }: { onSignedIn: () => void; onHaveAccount: () => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) return setError(t("signup.emailMismatch"));
    if (password !== confirmPassword) return setError(t("signup.passwordMismatch"));
    if (!accepted) return setError(t("signup.mustAccept"));
    setBusy(true);
    try {
      const response = await fetch("/api/session/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          confirmEmail,
          password,
          confirmPassword,
          acceptedNotices: true,
          displayName: name.trim() || null
        })
      });
      if (response.ok) return onSignedIn();
      if (response.status === 404) setError(t("signup.closed"));
      else if (response.status === 409) setError(t("signup.conflict"));
      else if (response.status === 400) setError(t("signup.weakPassword"));
      else if (response.status === 429) setError(t("signup.rateLimited"));
      else setError(t("signup.failed"));
    } catch {
      setError(t("common.somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="su-name">{t("signup.name")}</label>
      <input id="su-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("signup.namePlaceholder")} />
      <label htmlFor="su-email">{t("auth.email")}</label>
      <input id="su-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="su-confirm-email">{t("signup.confirmEmail")}</label>
      <input id="su-confirm-email" type="email" autoComplete="username" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} required />
      <label htmlFor="su-password">{t("auth.password")}</label>
      <input id="su-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-describedby="su-password-hint" />
      <label htmlFor="su-confirm-password">{t("signup.confirmPassword")}</label>
      <input id="su-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      <p id="su-password-hint" className="notice" style={{ margin: "2px 0 0" }}>{t("signup.passwordHint")}</p>
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
