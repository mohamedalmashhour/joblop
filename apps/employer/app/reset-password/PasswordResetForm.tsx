"use client";

import { useState } from "react";
import { styles } from "../employer/employerStyles";

export function PasswordResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Choose a new password of at least 12 characters.");
  const [complete, setComplete] = useState(false);

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
    <form style={styles.formGrid} onSubmit={submit}>
      {!complete ? (
        <>
          <label style={styles.fieldLabel}>
            New password
            <input
              style={styles.input}
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label style={styles.fieldLabel}>
            Confirm new password
            <input
              style={styles.input}
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
      <p aria-live="polite" role="status" style={styles.sectionCopy}>
        {message}
      </p>
      {!complete ? (
        <button type="submit" disabled={submitting || !token} style={styles.primaryButton}>
          {submitting ? "Resetting…" : "Reset password"}
        </button>
      ) : (
        <a href="/signin" style={styles.primaryButton}>
          Sign in
        </a>
      )}
    </form>
  );
}
