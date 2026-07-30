"use client";

import { useState } from "react";
import { authStyles } from "../authStyles";

export function PasswordResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("Choose a new password of at least 12 characters.");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) return setMessage("Passwords do not match.");
    setSubmitting(true);
    const response = await fetch("/api/session/password-reset/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, newPassword: password })
    }).catch(() => null);
    setPassword("");
    setConfirmation("");
    setSubmitting(false);
    if (!response?.ok) {
      return setMessage("This reset link is invalid, expired, or already used. Request a new one.");
    }
    setComplete(true);
    setMessage("Password reset. Existing sessions were signed out.");
  };
  return (
    <form style={authStyles.form} onSubmit={submit}>
      {!complete ? (
        <>
          <label style={authStyles.fieldLabel}>
            New password
            <input
              style={authStyles.input}
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label style={authStyles.fieldLabel}>
            Confirm new password
            <input
              style={authStyles.input}
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
        </>
      ) : null}
      <p aria-live="polite" role="status" style={authStyles.message}>
        {message}
      </p>
      {!complete ? (
        <button type="submit" disabled={submitting || !token} style={authStyles.primaryButton}>
          {submitting ? "Resetting…" : "Reset password"}
        </button>
      ) : (
        <a href="/signin" style={authStyles.primaryButton}>
          Sign in
        </a>
      )}
    </form>
  );
}
