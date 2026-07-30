"use client";

import { useState } from "react";

import { authStyles } from "../authStyles";
import { VerifyEmailPanel } from "./VerifyEmailPanel";

/**
 * Admin sign-up capsule (client). Posts to `/api/session/sign-up`, which delegates to the backend
 * the backend registration endpoint. Registration is gated to non-production, so when it is closed this
 * renders an honest "not open" state instead of a form that cannot succeed. Creating an account makes
 * a normal user login only — it does NOT grant administrative authority, which is provisioned
 * separately.
 */
export function SignUpForm({ registrationOpen }: { registrationOpen: boolean }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("Create an account to sign in to the workspace.");

  const continueToWorkspace = () => window.location.assign("/calendar");

  if (verifying) {
    return <VerifyEmailPanel onDone={continueToWorkspace} />;
  }

  if (!registrationOpen) {
    return (
      <div style={authStyles.form}>
        <p style={authStyles.warning}>
          Account creation is not open in this environment. Administration accounts are provisioned
          by the RWOS team.
        </p>
        <a href="/signin" style={authStyles.primaryButton}>
          Go to sign in
        </a>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("submitting");
    setMessage("Creating your account…");
    try {
      const response = await fetch("/api/session/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, displayName: fullName || null })
      });
      setPassword("");
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
    <form style={authStyles.form} onSubmit={submit}>
      <label style={authStyles.fieldLabel}>
        Work email
        <input
          style={authStyles.input}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.org"
        />
      </label>
      <label style={authStyles.fieldLabel}>
        Full name
        <input
          style={authStyles.input}
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Authorized contact"
        />
      </label>
      <label style={authStyles.fieldLabel}>
        Password
        <input
          style={authStyles.input}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
        />
      </label>
      <p style={state === "error" ? authStyles.warning : authStyles.message}>{message}</p>
      <div style={authStyles.actions}>
        <button type="submit" disabled={state === "submitting"} style={authStyles.primaryButton}>
          {state === "submitting" ? "Creating…" : "Create account"}
        </button>
        <a href="/signin" style={authStyles.secondaryButton}>
          I already have an account
        </a>
      </div>
    </form>
  );
}
