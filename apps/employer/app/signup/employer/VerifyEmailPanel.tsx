"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { styles } from "../../employer/employerStyles";
import { useT } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";

type Phase = "sending" | "ready" | "verifying" | "verified" | "unavailable";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Post-sign-up "verify your email" capsule. Requests a code on mount, lets the employer enter it, and
 * supports resend with a cooldown. Email verification is additive (non-blocking), so "Continue" is
 * always available. The backend endpoints may not be live yet — a 404 flips this to an honest
 * "not enabled yet" state rather than an error, and the employer can simply continue.
 */
export function VerifyEmailPanel({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("sending");
  const [message, setMessage] = useState<MessageKey>("verifyEmail.sending");
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
    setMessage("verifyEmail.sending");
    setDevCode(null);
    try {
      const response = await fetch("/api/session/email/send-code", { method: "POST" });
      if (response.status === 404) {
        setPhase("unavailable");
        return setMessage("verifyEmail.unavailable");
      }
      if (response.status === 429) {
        setPhase("ready");
        startCooldown();
        return setMessage("verifyEmail.wait");
      }
      if (!response.ok) {
        setPhase("ready");
        return setMessage("verifyEmail.sendFailed");
      }
      const payload = (await response.json().catch(() => ({}))) as { code?: unknown };
      setPhase("ready");
      startCooldown();
      if (typeof payload.code === "string") {
        setDevCode(payload.code);
        return setMessage("verifyEmail.devMode");
      }
      return setMessage("verifyEmail.sent");
    } catch {
      setPhase("ready");
      setMessage("verifyEmail.unreachable");
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
      return setMessage("verifyEmail.numeric");
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
        return setMessage("verifyEmail.unavailable");
      }
      if (response.ok) {
        setPhase("verified");
        setMessage("verifyEmail.verified");
        return;
      }
      setPhase("ready");
      setMessage("verifyEmail.mismatch");
    } catch {
      setPhase("ready");
      setMessage("verifyEmail.verifyFailed");
    }
  };

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <p style={styles.eyebrowDark}>{t("verifyEmail.eyebrow")}</p>
        <h2 style={styles.sectionTitle}>{t("verifyEmail.heading")}</h2>
        <p style={styles.sectionCopy}>{t(message)}</p>
        {devCode ? <p style={styles.warning}>{t("verifyEmail.devCode", { code: devCode })}</p> : null}
      </div>

      {phase !== "unavailable" && phase !== "verified" ? (
        <div style={styles.authForm}>
          <label style={styles.fieldLabel}>
            {t("verifyEmail.codeLabel")}
            <input
              style={styles.input}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
            />
          </label>
          <div style={styles.authActions}>
            <button
              type="button"
              onClick={() => void verify()}
              disabled={phase === "verifying" || phase === "sending"}
              style={styles.primaryButton}
            >
              {phase === "verifying" ? t("verifyEmail.verifying") : t("verifyEmail.verify")}
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={cooldown > 0 || phase === "sending"}
              style={styles.secondaryButton}
            >
              {cooldown > 0 ? t("verifyEmail.resendIn", { seconds: cooldown }) : t("verifyEmail.resend")}
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: "1rem" }}>
        <button type="button" onClick={onDone} style={styles.secondaryButton}>
          {phase === "verified" ? t("verifyEmail.continue") : t("verifyEmail.later")}
        </button>
      </div>
    </section>
  );
}
