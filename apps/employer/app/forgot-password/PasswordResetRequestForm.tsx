"use client";

import { useState } from "react";
import { styles } from "../employer/employerStyles";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Enter the email used for your account.");

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
    <form style={styles.formGrid} onSubmit={submit}>
      <label style={styles.fieldLabel}>
        Work email
        <input
          style={styles.input}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <p aria-live="polite" role="status" style={styles.sectionCopy}>
        {message}
      </p>
      <button type="submit" disabled={submitting} style={styles.primaryButton}>
        {submitting ? "Requesting…" : "Send reset instructions"}
      </button>
      <a href="/signin" style={styles.secondaryButton}>
        Back to sign in
      </a>
    </form>
  );
}
