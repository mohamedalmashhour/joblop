"use client";

import { useState } from "react";

import { styles } from "../../employer/employerStyles";
import { VerifyEmailPanel } from "./VerifyEmailPanel";

/**
 * Employer sign-up capsule (client). Posts to `/api/session/sign-up`, which delegates to the backend
 * the backend registration endpoint. Registration is gated to non-production, so when it is closed this
 * renders an honest "not open" state instead of a form that can't succeed. On success the account
 * exists and a session cookie is set, so we advance into organization onboarding.
 */
export function SignUpForm({ registrationOpen }: { registrationOpen: boolean }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedNotices, setAcceptedNotices] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState(
    "Create your employer account to begin organization setup."
  );

  const continueToOnboarding = () => window.location.assign("/employer/onboarding/company");

  if (verifying) {
    return <VerifyEmailPanel onDone={continueToOnboarding} />;
  }

  if (!registrationOpen) {
    return (
      <div style={styles.formGrid}>
        <p style={styles.warning}>
          Account creation is not open in this environment yet. Employer accounts are provisioned by
          the RWOS team during onboarding.
        </p>
        <a href="/signin" style={styles.primaryButton}>
          Go to sign in
        </a>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setState("error");
      return setMessage("Email addresses do not match.");
    }
    if (password !== confirmPassword) {
      setState("error");
      return setMessage("Passwords do not match.");
    }
    if (!acceptedNotices) {
      setState("error");
      return setMessage("Accept the Terms and Privacy Notice before creating an account.");
    }
    setState("submitting");
    setMessage("Creating your account…");
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
        if (response.status === 404) return setMessage("Account creation is not open yet.");
        if (response.status === 409) {
          return setMessage("That email is already registered — try signing in instead.");
        }
        if (response.status === 400) return setMessage("Choose a stronger password and try again.");
        if (response.status === 429) {
          return setMessage("Too many attempts. Please wait a moment and try again.");
        }
        if (response.status === 503) {
          return setMessage("Sign-up service is unavailable. Try again.");
        }
        return setMessage("Could not create the account. Check your details and try again.");
      }
      setState("idle");
      setVerifying(true);
    } catch {
      setState("error");
      setMessage("Sign-up service is unavailable. Try again.");
    }
  };

  return (
    <form style={styles.formGrid} onSubmit={submit}>
      <label style={styles.fieldLabel}>
        Work email
        <input
          style={styles.input}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="manager@example.org"
          required
        />
      </label>
      <label style={styles.fieldLabel}>
        Confirm work email
        <input
          style={styles.input}
          type="email"
          autoComplete="email"
          value={confirmEmail}
          onChange={(event) => setConfirmEmail(event.target.value)}
          placeholder="manager@example.org"
          required
        />
      </label>
      <label style={styles.fieldLabel}>
        Full name
        <input
          style={styles.input}
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Authorized contact"
        />
      </label>
      <label style={styles.fieldLabel}>
        Password
        <input
          style={styles.input}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          minLength={12}
          required
        />
      </label>
      <label style={styles.fieldLabel}>
        Confirm password
        <input
          style={styles.input}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
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
          I accept the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Notice</a>.
        </span>
      </label>
      <p style={state === "error" ? styles.warning : styles.sectionCopy}>{message}</p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="submit" disabled={state === "submitting"} style={styles.primaryButton}>
          {state === "submitting" ? "Creating…" : "Create employer account"}
        </button>
        <a href="/signin" style={styles.secondaryButton}>
          I already have an account
        </a>
      </div>
    </form>
  );
}
