"use client";

import { useState } from "react";
import { authStyles } from "../authStyles";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Enter your authorized administration email.");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    await fetch("/api/session/password-reset/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    }).catch(() => undefined);
    setSubmitting(false);
    setMessage("If an account matches that email, password reset instructions will be sent.");
  };
  return (
    <form style={authStyles.form} onSubmit={submit}>
      <label style={authStyles.fieldLabel}>
        Administration email
        <input
          style={authStyles.input}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <p aria-live="polite" role="status" style={authStyles.message}>
        {message}
      </p>
      <div style={authStyles.actions}>
        <button type="submit" disabled={submitting} style={authStyles.primaryButton}>
          {submitting ? "Requesting…" : "Send reset instructions"}
        </button>
        <a href="/signin" style={authStyles.secondaryButton}>
          Back to sign in
        </a>
      </div>
    </form>
  );
}
