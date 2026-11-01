"use client";

import { useEffect, useState } from "react";
import { trackConversion } from "./analytics";
import { useT } from "./i18n/LocaleProvider";
import { VerifyEmail } from "./VerifyEmail";

// Client-side strong-password generator for the "suggest a strong password" helper. 20 chars,
// crypto-random, at least one from each class, with look-alike characters (0/O, 1/l/I) left out.
function generatePassword(length = 20): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%^&*-_=+?"];
  const all = sets.join("");
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const chars: string[] = sets.map((s, i) => s.charAt((bytes[i] ?? 0) % s.length));
  for (let i = sets.length; i < length; i++) chars.push(all.charAt((bytes[i] ?? 0) % all.length));
  const order = new Uint32Array(length);
  crypto.getRandomValues(order);
  for (let i = length - 1; i > 0; i--) {
    const j = (order[i] ?? 0) % (i + 1);
    const a = chars[i] ?? "";
    const b = chars[j] ?? "";
    chars[i] = b;
    chars[j] = a;
  }
  return chars.join("");
}

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
          <a href="/browse" className="landing-browse" style={{ display: "inline-block", marginTop: 14, fontWeight: 700, color: "#b8862f", textDecoration: "none" }}>
            {t("land.browsePublic")}
          </a>
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
      <GoogleAuthButton />
    </div>
  );
}

// "Continue with Google" — shown only when the API reports Google OAuth is configured. It is a
// plain link (top-level navigation) to the BFF start route, which redirects to Google's consent.
function GoogleAuthButton() {
  const t = useT();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/google/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean } | null) => {
        if (active && d?.enabled) setEnabled(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!enabled) return null;
  return (
    <div className="auth-google">
      <div className="auth-or">{t("auth.or")}</div>
      <a className="btn google-btn" href="/api/auth/google/start">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.3 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v7.7h12.4c-.3 2.1-1.6 5.2-4.6 7.3l7.1 5.5c4.3-3.9 6.8-9.7 6.8-16.4z" />
          <path fill="#FBBC05" d="M10.5 28.3c-.5-1.5-.8-3-.8-4.3s.3-2.8.7-4.3l-7.9-6.1C.9 16.7 0 20.2 0 24s.9 7.3 2.6 10.4l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2 1.4-4.6 2.3-8.1 2.3-6.3 0-11.6-3.8-13.5-9.3l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {t("auth.continueWithGoogle")}
      </a>
    </div>
  );
}

function SignInForm({ onSignedIn, onNeedAccount }: { onSignedIn: () => void; onNeedAccount: () => void }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
      <input id="si-password" type={showPw ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="button" className="linkbtn" aria-pressed={showPw} onClick={() => setShowPw((v) => !v)} style={{ alignSelf: "flex-start", marginTop: 4 }}>{showPw ? t("auth.hidePassword") : t("auth.showPassword")}</button>
      {error ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? t("auth.signingIn") : t("auth.signIn")}</button>
      <p className="auth-switch">{t("auth.needAccount")} <button type="button" className="linkbtn" onClick={onNeedAccount}>{t("auth.tabCreate")}</button></p>
    </form>
  );
}

function SignUpForm({ onSignedIn, onHaveAccount }: { onSignedIn: () => void; onHaveAccount: () => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
          displayName: name.trim() || null,
          phone: phone.trim() || null,
          referralCode
        })
      });
      if (response.ok) { trackConversion("sign_up", { method: "worker" }); setRegistered(true); return; }
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

  if (registered) return <VerifyEmail onDone={onSignedIn} />;

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="su-name">{t("signup.name")}</label>
      <input id="su-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("signup.namePlaceholder")} />
      <label htmlFor="su-phone">{t("signup.phone")}</label>
      <input id="su-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("signup.phonePlaceholder")} />
      <label htmlFor="su-email">{t("auth.email")}</label>
      <input id="su-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label htmlFor="su-confirm-email">{t("signup.confirmEmail")}</label>
      <input id="su-confirm-email" type="email" autoComplete="username" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} required />
      <label htmlFor="su-password">{t("auth.password")}</label>
      <input id="su-password" type={showPw ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-describedby="su-password-hint" />
      <label htmlFor="su-confirm-password">{t("signup.confirmPassword")}</label>
      <input id="su-confirm-password" type={showPw ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
        <button type="button" className="linkbtn" aria-pressed={showPw} onClick={() => setShowPw((v) => !v)}>{showPw ? t("auth.hidePassword") : t("auth.showPassword")}</button>
        <button type="button" className="linkbtn" onClick={() => { const pw = generatePassword(); setPassword(pw); setConfirmPassword(pw); setShowPw(true); }}>{t("signup.suggestPassword")}</button>
      </div>
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
