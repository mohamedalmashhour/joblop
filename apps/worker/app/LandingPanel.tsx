"use client";

import { useEffect, useRef, useState } from "react";
import { safeReturnPath } from "./safeReturnPath";
import { trackConversion } from "./analytics";
import { withBrand } from "./Brand";
import { useT } from "./i18n/LocaleProvider";
import { VerifyEmail } from "./VerifyEmail";
import { NEXT_AFTER_SIGN_UP_KEY, OPEN_ACCOUNT_EVENT, prefersSmoothScroll, revealFormStart, type AccountTab } from "./authScroll";
import { findWorkHref } from "./findWorkUrl";

// Employer site — set NEXT_PUBLIC_EMPLOYER_URL in production.
const EMPLOYER_URL = process.env.NEXT_PUBLIC_EMPLOYER_URL ?? "http://localhost:3100";

/**
 * Signed-out home page, kept to one question so a stranger knows where to click within seconds:
 *   1. hero: "Find paid work near you, this week." with one search (what work + city) and a gold
 *      "Show jobs" button that opens Find work with those filters,
 *   2. howitworks: three steps (Search -> Create a free account -> Get the job),
 *   3. trust: a small row of plain facts,
 *   4. employer: a small "Hire on Joblop" link to the employer site.
 * The sign-up / sign-in card appears only when it is asked for (the menu's "Sign in", "Apply" on a
 * Joblop job, ?tab= or ?next=), in place of the home content, and opens at its first field.
 * On success it hands control back to the marketplace (and to the job the visitor came from).
 * The calendar, JobScanner and the job lists live on Find work; the videos on How it works.
 */
export function LandingPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<AccountTab>("signup");
  const [accountOpen, setAccountOpen] = useState(false);
  // Each request to open the form bumps this, so the card scrolls to its first field and focuses it
  // after the chosen tab has rendered.
  const [revealTick, setRevealTick] = useState(0);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const remember = (next: string) => {
    const safe = safeReturnPath(next);
    if (!safe) return;
    try {
      window.sessionStorage.setItem(NEXT_AFTER_SIGN_UP_KEY, safe);
    } catch {
      /* storage blocked: they still land on their home after signing up */
    }
  };
  const openAccount = (which: AccountTab) => {
    setTab(which);
    setAccountOpen(true);
    setRevealTick((n) => n + 1);
  };
  // The header's "Sign in" link asks for the form while the home page is already open.
  useEffect(() => {
    const onOpen = (event: Event) => openAccount((event as CustomEvent<unknown>).detail === "signin" ? "signin" : "signup");
    window.addEventListener(OPEN_ACCOUNT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ACCOUNT_EVENT, onOpen);
  }, []);
  // Arriving from "Apply" on a job ("?next=/job/…") or from "/signin" ("?tab=signin"): remember the job
  // (an on-site path only) so sign-up or sign-in brings the visitor back to it, and open the form.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const tabParam = params.get("tab");
    if (!next && tabParam !== "signin" && tabParam !== "signup" && window.location.hash !== "#auth-card") return;
    if (next) remember(next);
    openAccount(tabParam === "signin" ? "signin" : "signup");
  }, []);

  if (accountOpen) {
    return (
      <div className="home home-account">
        <a className="home-back" href="/" onClick={(e) => { e.preventDefault(); setAccountOpen(false); window.history.replaceState(null, "", "/"); }}>
          {t("nav.backHome")}
        </a>
        <p className="home-account-sub">{t("home.accountSub")}</p>
        <AuthCard tab={tab} setTab={setTab} onSignedIn={onSignedIn} revealTick={revealTick} />
      </div>
    );
  }

  const steps = [
    { title: t("home.s1"), body: t("home.s1d") },
    { title: t("home.s2"), body: t("home.s2d") },
    { title: t("home.s3"), body: t("home.s3d") }
  ];

  return (
    <div className="home">
      {/* 1 — One question, one search, one gold button */}
      <section className="home-hero" data-section="hero" aria-labelledby="home-title">
        <h1 id="home-title">{t("home.title")}</h1>
        <p className="home-sub">{t("home.sub")}</p>
        <form
          className="home-search"
          role="search"
          action="/find-work"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.assign(findWorkHref({ q, city }));
          }}
        >
          <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("home.whatPh")} aria-label={t("home.whatPh")} maxLength={80} />
          <input name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("home.cityPh")} aria-label={t("home.cityPh")} maxLength={80} autoComplete="address-level2" />
          <button type="submit" className="home-go">{t("home.show")}</button>
        </form>
      </section>

      {/* 2 — How it works, in three steps */}
      <section className="home-steps" data-section="howitworks" aria-labelledby="home-how">
        <h2 id="home-how">{t("home.how")}</h2>
        <ol>
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="home-num" aria-hidden="true">{i + 1}</span>
              <div>
                <strong>{s.title}</strong>
                <span>{s.body}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 3 — A small trust row */}
      <ul className="home-trust" data-section="trust" aria-label={t("home.trustLabel")}>
        <li>{t("home.t1")}</li>
        <li>{t("home.t2")}</li>
        <li>{t("home.t3")}</li>
      </ul>

      {/* 4 — Employers: a small link to the employer site */}
      <p className="home-emp" data-section="employer">
        <span>{t("home.emp")}</span> <a href={EMPLOYER_URL}>{t("home.empLink")}</a>
      </p>
    </div>
  );
}

function AuthCard({
  tab,
  setTab,
  onSignedIn,
  revealTick
}: {
  tab: AccountTab;
  setTab: (t: AccountTab) => void;
  onSignedIn: () => void;
  revealTick: number;
}) {
  const t = useT();
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Open the form at its start: the card's top just under the sticky header, first field focused.
  useEffect(() => {
    if (revealTick === 0) return;
    const frame = window.requestAnimationFrame(() => revealFormStart(cardRef.current, prefersSmoothScroll()));
    return () => window.cancelAnimationFrame(frame);
  }, [revealTick, tab]);
  // A new step inside the card (the texted code, the verify-email message) keeps the card's top
  // below the header and focuses its first field, so nothing hides behind the header.
  const stepChanged = () => {
    window.requestAnimationFrame(() => revealFormStart(cardRef.current, prefersSmoothScroll()));
  };
  return (
    <div className="auth-card" id="auth-card" ref={cardRef}>
      <div className="auth-tabs" role="tablist" aria-label={`${t("auth.tabSignIn")} / ${t("auth.tabCreate")}`}>
        <button role="tab" type="button" aria-selected={tab === "signin"} className={tab === "signin" ? "active" : ""} onClick={() => setTab("signin")}>
          {t("auth.tabSignIn")}
        </button>
        <button role="tab" type="button" aria-selected={tab === "signup"} className={tab === "signup" ? "active" : ""} onClick={() => setTab("signup")}>
          {t("auth.tabCreate")}
        </button>
      </div>
      {tab === "signin" ? <SignInForm onSignedIn={onSignedIn} onNeedAccount={() => setTab("signup")} onStep={stepChanged} /> : <SignUpForm onSignedIn={onSignedIn} onHaveAccount={() => setTab("signin")} onStep={stepChanged} />}
    </div>
  );
}


// Workers sign in with a mobile number and a texted code. The session stays in an httpOnly cookie.
function SignInForm({ onSignedIn, onNeedAccount, onStep }: { onSignedIn: () => void; onNeedAccount: () => void; onStep: () => void }) {
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
      onStep();
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

function SignUpForm({ onSignedIn, onHaveAccount, onStep }: { onSignedIn: () => void; onHaveAccount: () => void; onStep: () => void }) {
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
      if (response.ok) { trackConversion("sign_up", { method: "worker" }); setRegistered(true); onStep(); return; }
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
