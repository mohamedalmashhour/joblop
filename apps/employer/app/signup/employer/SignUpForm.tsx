"use client";

import { useState } from "react";

import { styles } from "../../employer/employerStyles";
import { useT } from "../../i18n/LocaleProvider";
import { VerifyEmailPanel } from "./VerifyEmailPanel";

/**
 * Employer sign-up capsule (client). Posts to `/api/session/sign-up`, which delegates to the backend
 * registration endpoint. Registration is gated to non-production, so when it is closed this renders an
 * honest "not open" state instead of a form that can't succeed. On success the account exists and a
 * session cookie is set, so we advance into organization onboarding. All copy is localized (en/fr).
 */
export function SignUpForm({ registrationOpen }: { registrationOpen: boolean }) {
  const t = useT();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedNotices, setAcceptedNotices] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState(() => t("auth.signUpIntro"));

  const continueToOnboarding = () => window.location.assign("/employer/onboarding/company");

  if (verifying) {
    return <VerifyEmailPanel onDone={continueToOnboarding} />;
  }

  if (!registrationOpen) {
    return (
      <div style={styles.formGrid}>
        <p style={styles.warning}>{t("auth.regClosed")}</p>
        <a href="/signin" style={styles.primaryButton}>
          {t("auth.goToSignIn")}
        </a>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setState("error");
      return setMessage(t("auth.emailMismatch"));
    }
    if (password !== confirmPassword) {
      setState("error");
      return setMessage(t("auth.passwordMismatch"));
    }
    if (!acceptedNotices) {
      setState("error");
      return setMessage(t("auth.acceptNotices"));
    }
    setState("submitting");
    setMessage(t("auth.creatingAccount"));
    try {
      const response = await fetch("/api/session/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          confirmEmail,
          password,
          confirmPassword,
          acceptedNotices,
          displayName: fullName || null
        })
      });
      setPassword("");
      setConfirmPassword("");
      if (!response.ok) {
        setState("error");
        if (response.status === 404) return setMessage(t("auth.regNotOpen"));
        if (response.status === 409) return setMessage(t("auth.emailRegistered"));
        if (response.status === 400) return setMessage(t("auth.strongerPassword"));
        if (response.status === 429) return setMessage(t("auth.tooManyAttempts"));
        if (response.status === 503) return setMessage(t("auth.signUpUnavailable"));
        return setMessage(t("auth.createFailed"));
      }
      setState("idle");
      setVerifying(true);
    } catch {
      setState("error");
      setMessage(t("auth.signUpUnavailable"));
    }
  };

  return (
    <form style={styles.formGrid} onSubmit={submit}>
      <label style={styles.fieldLabel}>
        {t("auth.workEmail")}
        <input
          style={styles.input}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("auth.emailPlaceholder")}
          required
        />
      </label>
      <label style={styles.fieldLabel}>
        {t("auth.confirmEmail")}
        <input
          style={styles.input}
          type="email"
          autoComplete="email"
          value={confirmEmail}
          onChange={(event) => setConfirmEmail(event.target.value)}
          placeholder={t("auth.emailPlaceholder")}
          required
        />
      </label>
      <label style={styles.fieldLabel}>
        {t("auth.fullName")}
        <input
          style={styles.input}
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={t("auth.fullNamePlaceholder")}
        />
      </label>
      <label style={styles.fieldLabel}>
        {t("auth.password")}
        <input
          style={styles.input}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t("auth.createPassword")}
          minLength={12}
          required
        />
      </label>
      <label style={styles.fieldLabel}>
        {t("auth.confirmPassword")}
        <input
          style={styles.input}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={t("auth.repeatPassword")}
          minLength={12}
          required
        />
      </label>
      <label style={{ ...styles.fieldLabel, gridTemplateColumns: "auto 1fr", alignItems: "start" }}>
        <input
          type="checkbox"
          checked={acceptedNotices}
          onChange={(event) => setAcceptedNotices(event.target.checked)}
          required
        />
        <span>
          {t("auth.acceptPre")}
          <a href="/terms">{t("auth.terms")}</a>
          {t("auth.acceptMid")}
          <a href="/privacy">{t("auth.privacy")}</a>
          {t("auth.acceptPost")}
        </span>
      </label>
      <p style={state === "error" ? styles.warning : styles.sectionCopy}>{message}</p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="submit" disabled={state === "submitting"} style={styles.primaryButton}>
          {state === "submitting" ? t("auth.creating") : t("auth.createEmployerAccount")}
        </button>
        <a href="/signin" style={styles.secondaryButton}>
          {t("auth.haveAccount")}
        </a>
      </div>
    </form>
  );
}
