"use client";

import { useState } from "react";
import { styles } from "../employer/employerStyles";
import { useT } from "../i18n/LocaleProvider";

export function PasswordResetRequestForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(() => t("auth.resetIntro"));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    await fetch("/api/session/password-reset/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    }).catch(() => undefined);
    setSubmitting(false);
    setMessage(t("auth.resetSent"));
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
          required
        />
      </label>
      <p aria-live="polite" role="status" style={styles.sectionCopy}>
        {message}
      </p>
      <button type="submit" disabled={submitting} style={styles.primaryButton}>
        {submitting ? t("auth.requesting") : t("auth.sendReset")}
      </button>
      <a href="/signin" style={styles.secondaryButton}>
        {t("auth.backToSignIn")}
      </a>
    </form>
  );
}
