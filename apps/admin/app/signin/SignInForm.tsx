"use client";

import { useEffect, useState } from "react";

import { authStyles } from "../authStyles";

/**
 * Staff sign-in: a phone number, then a code sent by text. The code and session are handled
 * server-side through same-origin routes; the session stays in an httpOnly cookie.
 */
export function SignInForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const [message, setMessage] = useState("Enter your staff mobile number. We will text you a code.");

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
        return setMessage("That number could not be used. Check it and try again.");
      }
      setStep("code");
      setCode("");
      setMessage("If this is a staff number, a 6-digit code is on its way. It expires in 10 minutes.");
    } catch {
      setProblem(true);
      setMessage("Sign-in is unavailable. Try again.");
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
        return setMessage("That code did not work. Check it, or ask for a new one.");
      }
      window.location.assign("/calendar");
    } catch {
      setProblem(true);
      setMessage("Sign-in is unavailable. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const status = (
    <p aria-live="polite" role={problem ? "alert" : "status"} style={problem ? authStyles.warning : authStyles.message}>
      {message}
    </p>
  );

  if (step === "phone") {
    return (
      <form style={authStyles.form} onSubmit={(event) => void sendCode(event)}>
        <label style={authStyles.fieldLabel}>
          Mobile number
          <input
            autoComplete="tel"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="514 555 0100"
            required
            style={authStyles.input}
            type="tel"
            value={phone}
          />
        </label>
        {status}
        <div style={authStyles.actions}>
          <button disabled={busy} style={authStyles.primaryButton} type="submit">
            {busy ? "Sending…" : "Text me a code"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form style={authStyles.form} onSubmit={(event) => void verify(event)}>
      <label style={authStyles.fieldLabel}>
        6-digit code
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
          {busy ? "Checking…" : "Sign in"}
        </button>
        <button disabled={busy} onClick={() => void sendCode()} style={authStyles.secondaryButton} type="button">
          Send a new code
        </button>
        <button disabled={busy} onClick={() => setStep("phone")} style={authStyles.secondaryButton} type="button">
          Change number
        </button>
      </div>
    </form>
  );
}
