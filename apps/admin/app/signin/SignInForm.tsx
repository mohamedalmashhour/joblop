"use client";

import { useEffect, useState } from "react";

import { authStyles } from "../authStyles";
import { usePageText } from "../i18n/pageText";

import { signInText } from "./text";

type MessageKey = "intro" | "numberRejected" | "codeSent" | "unavailable" | "codeRejected";

/**
 * Staff sign-in: a phone number, then a code sent by text. The code and session are handled
 * server-side through same-origin routes; the session stays in an httpOnly cookie.
 */
export function SignInForm() {
  const t = usePageText(signInText);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const [message, setMessage] = useState<MessageKey>("intro");

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => {
        if (response.ok) window.location.replace("/calendar");
      })
      .catch(() => undefined);
  }, []);

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setProblem(false);
    try {
      const response = await fetch("/api/session/phone/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (!response.ok) {
        setProblem(true);
        return setMessage("numberRejected");
      }
      setStep("code");
      setCode("");
      setMessage("codeSent");
    } catch {
      setProblem(true);
      setMessage("unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(false);
    try {
      const response = await fetch("/api/session/phone/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code: code.trim() })
      });
      if (!response.ok) {
        setProblem(true);
        return setMessage("codeRejected");
      }
      window.location.assign("/calendar");
    } catch {
      setProblem(true);
      setMessage("unavailable");
    } finally {
      setBusy(false);
    }
  }

  const status = (
    <p aria-live="polite" role={problem ? "alert" : "status"} style={problem ? authStyles.warning : authStyles.message}>
      {t[message]}
    </p>
  );

  if (step === "phone") {
    return (
      <form style={authStyles.form} onSubmit={(event) => void sendCode(event)}>
        <label style={authStyles.fieldLabel}>
          {t.mobileNumber}
          <input
            autoComplete="tel"
            onChange={(event) => setPhone(event.target.value)}
            placeholder={t.phonePlaceholder}
            required
            style={authStyles.input}
            type="tel"
            value={phone}
          />
        </label>
        {status}
        <div style={authStyles.actions}>
          <button disabled={busy} style={authStyles.primaryButton} type="submit">
            {busy ? t.sending : t.textMeACode}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form style={authStyles.form} onSubmit={(event) => void verify(event)}>
      <label style={authStyles.fieldLabel}>
        {t.codeLabel}
        <input
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value)}
          pattern="[0-9]{6}"
          required
          style={authStyles.input}
          value={code}
        />
      </label>
      {status}
      <div style={authStyles.actions}>
        <button disabled={busy} style={authStyles.primaryButton} type="submit">
          {busy ? t.checking : t.signIn}
        </button>
        <button disabled={busy} onClick={() => void sendCode()} style={authStyles.secondaryButton} type="button">
          {t.sendNewCode}
        </button>
        <button disabled={busy} onClick={() => setStep("phone")} style={authStyles.secondaryButton} type="button">
          {t.changeNumber}
        </button>
      </div>
    </form>
  );
}
