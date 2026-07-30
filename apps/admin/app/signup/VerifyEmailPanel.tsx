"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { authStyles } from "../authStyles";

type Phase = "sending" | "ready" | "verifying" | "verified" | "unavailable";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Post-sign-up "verify your email" capsule (admin). Requests a code on mount, accepts it, and supports
 * resend with a cooldown. Verification is additive (non-blocking), so "Continue" is always available.
 * Until the backend endpoints are live a 404 flips this to an honest "not enabled yet" state.
 */
export function VerifyEmailPanel({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("sending");
  const [message, setMessage] = useState("Sending a verification code to your email…");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((seconds) => {
        if (seconds <= 1 && cooldownTimer.current) clearInterval(cooldownTimer.current);
        return Math.max(0, seconds - 1);
      });
    }, 1000);
  }, []);

  const sendCode = useCallback(async () => {
    setPhase("sending");
    setMessage("Sending a verification code to your email…");
    setDevCode(null);
    try {
      const response = await fetch("/api/session/email/send-code", { method: "POST" });
      if (response.status === 404) {
        setPhase("unavailable");
        return setMessage("Email verification isn’t enabled yet. You can continue for now.");
      }
      if (response.status === 429) {
        setPhase("ready");
        startCooldown();
        return setMessage("Please wait a moment before requesting another code.");
      }
      if (!response.ok) {
        setPhase("ready");
        return setMessage("Couldn’t send a code right now. You can retry or continue.");
      }
      const payload = (await response.json().catch(() => ({}))) as { code?: unknown };
      setPhase("ready");
      startCooldown();
      if (typeof payload.code === "string") {
        setDevCode(payload.code);
        return setMessage("Development mode: use the code shown below.");
      }
      return setMessage("We sent a code to your email. Enter it below.");
    } catch {
      setPhase("ready");
      setMessage("Couldn’t reach the verification service. You can retry or continue.");
    }
  }, [startCooldown]);

  useEffect(() => {
    void sendCode();
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, [sendCode]);

  const verify = async () => {
    if (!/^\d{4,8}$/.test(code.trim())) {
      return setMessage("Enter the numeric code from your email.");
    }
    setPhase("verifying");
    try {
      const response = await fetch("/api/session/email/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() })
      });
      if (response.status === 404) {
        setPhase("unavailable");
        return setMessage("Email verification isn’t enabled yet. You can continue for now.");
      }
      if (response.ok) {
        setPhase("verified");
        return setMessage("Email verified. Thank you!");
      }
      setPhase("ready");
      setMessage("That code didn’t match or has expired. Request a new one and try again.");
    } catch {
      setPhase("ready");
      setMessage("Couldn’t verify right now. Try again or continue.");
    }
  };

  return (
    <div style={authStyles.form}>
      <p style={authStyles.eyebrow}>Verify your email</p>
      <h2 style={authStyles.title}>Confirm you own this email.</h2>
      <p style={phase === "unavailable" ? authStyles.warning : authStyles.message}>{message}</p>
      {devCode ? <p style={authStyles.warning}>Code: {devCode}</p> : null}

      {phase !== "unavailable" && phase !== "verified" ? (
        <>
          <label style={authStyles.fieldLabel}>
            Verification code
            <input
              style={authStyles.input}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
            />
          </label>
          <div style={authStyles.actions}>
            <button
              type="button"
              onClick={() => void verify()}
              disabled={phase === "verifying" || phase === "sending"}
              style={authStyles.primaryButton}
            >
              {phase === "verifying" ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={cooldown > 0 || phase === "sending"}
              style={authStyles.secondaryButton}
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </button>
          </div>
        </>
      ) : null}

      <button type="button" onClick={onDone} style={authStyles.secondaryButton}>
        {phase === "verified" ? "Continue" : "Continue — verify later"}
      </button>
    </div>
  );
}
