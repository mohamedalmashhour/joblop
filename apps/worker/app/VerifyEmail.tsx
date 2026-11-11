"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./i18n/LocaleProvider";
import type { MessageKey } from "./i18n/messages";

type Phase = "sending" | "ready" | "verifying" | "verified" | "unavailable";
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Post-sign-up "verify your email" capsule for the worker app. Requests a code on mount, lets the
 * worker enter it, resend with cooldown. Additive/non-blocking — "Continue" is always available, and a
 * 404 (backend not enabled) flips to an honest "not enabled yet" state instead of an error.
 */
export function VerifyEmail({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("sending");
  const [message, setMessage] = useState<MessageKey>("verifyEmail.sending");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setCooldown((s) => { if (s <= 1 && timer.current) clearInterval(timer.current); return Math.max(0, s - 1); }), 1000);
  }, []);

  const sendCode = useCallback(async () => {
    setPhase("sending"); setMessage("verifyEmail.sending"); setDevCode(null);
    try {
      const res = await fetch("/api/session/email/send-code", { method: "POST" });
      if (res.status === 404) { setPhase("unavailable"); return setMessage("verifyEmail.unavailable"); }
      if (res.status === 429) { setPhase("ready"); startCooldown(); return setMessage("verifyEmail.wait"); }
      if (!res.ok) { setPhase("ready"); return setMessage("verifyEmail.sendFailed"); }
      const payload = (await res.json().catch(() => ({}))) as { code?: unknown };
      setPhase("ready"); startCooldown();
      if (typeof payload.code === "string") { setDevCode(payload.code); return setMessage("verifyEmail.devMode"); }
      return setMessage("verifyEmail.sent");
    } catch {
      setPhase("ready"); setMessage("verifyEmail.unreachable");
    }
  }, [startCooldown]);

  useEffect(() => { void sendCode(); return () => { if (timer.current) clearInterval(timer.current); }; }, [sendCode]);

  const verify = async () => {
    if (!/^\d{4,8}$/.test(code.trim())) return setMessage("verifyEmail.numeric");
    setPhase("verifying");
    try {
      const res = await fetch("/api/session/email/verify-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code.trim() }) });
      if (res.status === 404) { setPhase("unavailable"); return setMessage("verifyEmail.unavailable"); }
      if (res.ok) { setPhase("verified"); return setMessage("verifyEmail.verified"); }
      setPhase("ready"); setMessage("verifyEmail.mismatch");
    } catch {
      setPhase("ready"); setMessage("verifyEmail.verifyFailed");
    }
  };

  return (
    <section className="auth-form" aria-label={t("verifyEmail.eyebrow")}>
      <h2 style={{ margin: "0 0 4px", color: "#f4efe4" }}>{t("verifyEmail.title")}</h2>
      {/* Fixed-height live message: changing text never pushes the fields around. */}
      <p className="notice verify-message" role="status" aria-live="polite" style={{ margin: "0 0 10px" }}>{t(message)}</p>
      {devCode ? <p className="notice" style={{ color: "#8a5a00", fontWeight: 700 }}>{t("verifyEmail.devCode", { code: devCode })}</p> : null}
      {phase !== "unavailable" && phase !== "verified" ? (
        <>
          <label htmlFor="ve-code">{t("verifyEmail.codeLabel")}</label>
          <input id="ve-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" className="btn" onClick={() => void verify()} disabled={phase === "verifying" || phase === "sending"}>{phase === "verifying" ? t("verifyEmail.verifying") : t("verifyEmail.verify")}</button>
            <button type="button" className="linkbtn" onClick={() => void sendCode()} disabled={cooldown > 0 || phase === "sending"}>{cooldown > 0 ? t("verifyEmail.resendIn", { seconds: cooldown }) : t("verifyEmail.resend")}</button>
          </div>
        </>
      ) : null}
      <p className="auth-switch" style={{ marginTop: 12 }}>
        <button type="button" className="linkbtn" onClick={onDone}>{phase === "verified" ? t("verifyEmail.continue") : t("verifyEmail.later")}</button>
      </p>
    </section>
  );
}
