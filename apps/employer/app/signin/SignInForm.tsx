"use client";

import { useState } from "react";

import { styles } from "../employer/employerStyles";

/**
 * Employer sign-in capsule (client). Wires to the existing same-origin session route
 * `/api/session/sign-in`, which sets the httpOnly employer session cookie server-side. Sign-in works
 * in every environment (unlike registration, which the backend gates to non-production). On success
 * it lands the employer on the implemented employer dashboard.
 */
export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("Sign in to your employer workspace.");
  const [needsSignOut, setNeedsSignOut] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("submitting");
    setNeedsSignOut(false);
    setMessage("Signing in…");
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
          return setMessage("You are already signed in. Sign out before switching accounts.");
        }
        if (response.status === 429) {
          return setMessage("Too many attempts. Please wait a moment and try again.");
        }
        return setMessage("Sign-in failed. Check your email and password.");
      }
      window.location.assign("/employer/dashboard");
    } catch {
      setState("error");
      setMessage("Sign-in service is unavailable. Try again.");
    }
  };

  const signOut = async () => {
    await fetch("/api/session/sign-out", { method: "POST" }).catch(() => undefined);
    setNeedsSignOut(false);
    setState("idle");
    setMessage("Signed out. You can sign in now.");
  };

  return (
    <form style={styles.formGrid} onSubmit={submit}>
      <label style={styles.fieldLabel}>
        Work email
        <input
          style={styles.input}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="manager@example.org"
        />
      </label>
      <label style={styles.fieldLabel}>
        Password
        <input
          style={styles.input}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
        />
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
          {state === "submitting" ? "Signing in…" : "Sign in"}
        </button>
        {needsSignOut ? (
          <button type="button" onClick={signOut} style={styles.secondaryButton}>
            Sign out first
          </button>
        ) : (
          <a href="/signup/employer" style={styles.secondaryButton}>
            Create an employer account
          </a>
        )}
      </div>
    </form>
  );
}
