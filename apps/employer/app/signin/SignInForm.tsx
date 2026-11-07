"use client";

import { useEffect, useState } from "react";

import { styles } from "../employer/employerStyles";
import { useT } from "../i18n/LocaleProvider";

// "Continue with Google" — rendered only when the API reports Google OAuth is configured. Plain
// link (top-level navigation) to the BFF start route, which redirects to Google's consent screen.
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
    <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
      <div
        aria-hidden="true"
        style={{ textAlign: "center", color: "#b3a894", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        {t("auth.or")}
      </div>
      <a
        href="/api/auth/google/start"
        style={{
          ...styles.secondaryButton,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.6rem",
          background: "#fff",
          color: "#000000"
        }}
      >
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

/**
 * Employer sign-in: a mobile number, then a code sent by text. The session stays in an httpOnly
 * cookie set by the same-origin routes. All copy is localized.
 */
export function SignInForm() {
  const t = useT();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState(() => t("auth.signInIntro"));
  const [needsSignOut, setNeedsSignOut] = useState(false);
  const busy = state === "submitting";

  // Someone already signed in never needs this form: send them to their workspace.
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => {
        if (response.ok) window.location.replace("/employer/dashboard");
      })
      .catch(() => undefined);
  }, []);

  const sendCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setState("submitting");
    setNeedsSignOut(false);
    try {
      const response = await fetch("/api/session/phone/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (!response.ok) {
        setState("error");
        return setMessage(t("auth.numberUnusable"));
      }
      setStep("code");
      setCode("");
      setState("idle");
      setMessage(t("auth.codeOnWay"));
    } catch {
      setState("error");
      setMessage(t("auth.signInUnavailable"));
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("submitting");
    setNeedsSignOut(false);
    try {
      const response = await fetch("/api/session/phone/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code: code.trim() })
      });
      if (!response.ok) {
        setState("error");
        if (response.status === 409) {
          setNeedsSignOut(true);
          return setMessage(t("auth.alreadySignedIn"));
        }
        return setMessage(t("auth.signInFailed"));
      }
      window.location.assign("/employer/dashboard");
    } catch {
      setState("error");
      setMessage(t("auth.signInUnavailable"));
    }
  };

  const signOut = async () => {
    await fetch("/api/session/sign-out", { method: "POST" }).catch(() => undefined);
    setNeedsSignOut(false);
    setState("idle");
    setMessage(t("auth.signedOut"));
  };

  const status = (
    <p
      aria-live="polite"
      role={state === "error" ? "alert" : "status"}
      style={state === "error" ? styles.warning : styles.sectionCopy}
    >
      {message}
    </p>
  );

  return (
    <>
      {step === "phone" ? (
        <form style={styles.formGrid} onSubmit={(event) => void sendCode(event)}>
          <label style={styles.fieldLabel}>
            {t("auth.phone")}
            <input
              style={styles.input}
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t("auth.phonePlaceholder")}
            />
          </label>
          {status}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="submit" disabled={busy} style={styles.primaryButton}>
              {busy ? t("auth.sendingCode") : t("auth.textMeCode")}
            </button>
            <a href="/signup/employer" style={styles.secondaryButton}>
              {t("auth.createAccount")}
            </a>
          </div>
        </form>
      ) : (
        <form style={styles.formGrid} onSubmit={(event) => void verify(event)}>
          <label style={styles.fieldLabel}>
            {t("auth.codeLabel")}
            <input
              style={styles.input}
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          {status}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="submit" disabled={busy} style={styles.primaryButton}>
              {busy ? t("auth.signingIn") : t("auth.signIn")}
            </button>
            {needsSignOut ? (
              <button type="button" onClick={() => void signOut()} style={styles.secondaryButton}>
                {t("auth.signOutFirst")}
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={() => void sendCode()} style={styles.secondaryButton}>
              {t("auth.sendNewCode")}
            </button>
            <button type="button" disabled={busy} onClick={() => setStep("phone")} style={styles.secondaryButton}>
              {t("auth.changeNumber")}
            </button>
          </div>
        </form>
      )}
      <GoogleAuthButton />
    </>
  );
}
