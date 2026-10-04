"use client";

import { useState } from "react";

import { styles } from "../employer/employerStyles";
import { useT } from "../i18n/LocaleProvider";

/**
 * Employer sign-in capsule (client). Wires to the existing same-origin session route
 * `/api/session/sign-in`, which sets the httpOnly employer session cookie server-side. Sign-in works
 * in every environment (unlike registration, which the backend gates to non-production). On success
 * it lands the employer on the implemented employer dashboard. All copy is localized (en-CA/fr-CA).
 */
export function SignInForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState(() => t("auth.signInIntro"));
  const [needsSignOut, setNeedsSignOut] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("submitting");
    setNeedsSignOut(false);
    setMessage(t("auth.signingIn"));
    try {
      const response = await fetch("/api/session/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      setPassword("");
      if (!response.ok) {
        setState("error");
        if (response.status === 409) {
          setNeedsSignOut(true);
          return setMessage(t("auth.alreadySignedIn"));
        }
        if (response.status === 429) {
          return setMessage(t("auth.tooManyAttempts"));
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

  return (
    <form style={styles.formGrid} onSubmit={submit}>
      <label style={styles.fieldLabel}>
        {t("auth.workEmail")}
        <input
          style={styles.input}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("auth.emailPlaceholder")}
        />
      </label>
      <label style={styles.fieldLabel}>
        {t("auth.password")}
        <input
          style={styles.input}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t("auth.yourPassword")}
        />
      </label>
      <label style={{ ...styles.fieldLabel, gridTemplateColumns: "auto 1fr", alignItems: "center" }}>
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
        />
        {t("auth.showPassword")}
      </label>
      <p
        aria-live="polite"
        role={state === "error" ? "alert" : "status"}
        style={state === "error" ? styles.warning : styles.sectionCopy}
      >
        {message}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="submit" disabled={state === "submitting"} style={styles.primaryButton}>
          {state === "submitting" ? t("auth.signingIn") : t("auth.signIn")}
        </button>
        {needsSignOut ? (
          <button type="button" onClick={signOut} style={styles.secondaryButton}>
            {t("auth.signOutFirst")}
          </button>
        ) : (
          <a href="/signup/employer" style={styles.secondaryButton}>
            {t("auth.createAccount")}
          </a>
        )}
        <a href="/forgot-password" style={styles.secondaryButton}>
          {t("auth.forgotPassword")}
        </a>
      </div>
    </form>
  );
}
