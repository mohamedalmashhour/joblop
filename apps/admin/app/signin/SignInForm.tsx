"use client";

import { useState } from "react";

import { authStyles } from "../authStyles";

/**
 * Admin sign-in capsule (client). Posts to the same-origin `/api/session/sign-in` route, which sets
 * the httpOnly admin session cookie server-side. On success it lands on the request calendar. Sign-in
 * is available in every environment; only account creation is gated to non-production.
 */
export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("Sign in with your authorized administration account.");
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
      window.location.assign("/calendar");
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
    <form style={authStyles.form} onSubmit={submit}>
      <label style={authStyles.fieldLabel}>
        Work email
        <input
          style={authStyles.input}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.org"
        />
      </label>
      <label style={authStyles.fieldLabel}>
        Password
        <input
          style={authStyles.input}
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
        style={state === "error" ? authStyles.warning : authStyles.message}
      >
        {message}
      </p>
      <div style={authStyles.actions}>
        <button type="submit" disabled={state === "submitting"} style={authStyles.primaryButton}>
          {state === "submitting" ? "Signing in…" : "Sign in"}
        </button>
        {needsSignOut ? (
          <button type="button" onClick={signOut} style={authStyles.secondaryButton}>
            Sign out first
          </button>
        ) : (
          <a href="/signup" style={authStyles.secondaryButton}>
            Create an account
          </a>
        )}
      </div>
    </form>
  );
}
