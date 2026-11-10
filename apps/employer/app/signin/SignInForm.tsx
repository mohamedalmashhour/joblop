"use client";

import { useEffect, useState } from "react";

import { styles } from "../employer/employerStyles";
import { useT } from "../i18n/LocaleProvider";


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
        <form style={styles.authForm} onSubmit={(event) => void sendCode(event)}>
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
          <div style={styles.authActions}>
            <button type="submit" disabled={busy} style={styles.primaryButton}>
              {busy ? t("auth.sendingCode") : t("auth.textMeCode")}
            </button>
            <a href="/signup/employer" style={styles.secondaryButton}>
              {t("auth.createAccount")}
            </a>
          </div>
        </form>
      ) : (
        <form style={styles.authForm} onSubmit={(event) => void verify(event)}>
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
          <div style={styles.authActions}>
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
    </>
  );
}
