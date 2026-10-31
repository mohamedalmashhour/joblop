"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "sending" | "ready" | "verifying" | "verified" | "unavailable";
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Post-sign-up "verify your email" capsule for the worker app. Requests a code on mount, lets the
 * worker enter it, resend with cooldown. Additive/non-blocking — "Continue" is always available, and a
 * 404 (backend not enabled) flips to an honest "not enabled yet" state instead of an error.
 */
export function VerifyEmail({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("sending");
  const [message, setMessage] = useState("Sending a verification code to your email…");
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
    setPhase("sending"); setMessage("Sending a verification code to your email…"); setDevCode(null);
    try {
      const res = await fetch("/api/session/email/send-code", { method: "POST" });
      if (res.status === 404) { setPhase("unavailable"); return setMessage("Email verification isn’t enabled yet. You can continue for now."); }
      if (res.status === 429) { setPhase("ready"); startCooldown(); return setMessage("Please wait a moment before requesting another code."); }
      if (!res.ok) { setPhase("ready"); return setMessage("Couldn’t send a code right now. You can retry or continue."); }
      const payload = (await res.json().catch(() => ({}))) as { code?: unknown };
      setPhase("ready"); startCooldown();
      if (typeof payload.code === "string") { setDevCode(payload.code); return setMessage("Development mode: use the code shown below."); }
      return setMessage("We sent a code to your email. Enter it below.");
    } catch {
      setPhase("ready"); setMessage("Couldn’t reach the verification service. You can retry or continue.");
    }
  }, [startCooldown]);

  useEffect(() => { void sendCode(); return () => { if (timer.current) clearInterval(timer.current); }; }, [sendCode]);

  const verify = async () => {
    if (!/^\d{4,8}$/.test(code.trim())) return setMessage("Enter the numeric code from your email.");
    setPhase("verifying");
    try {
      const res = await fetch("/api/session/email/verify-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code.trim() }) });
      if (res.status === 404) { setPhase("unavailable"); return setMessage("Email verification isn’t enabled yet. You can continue for now."); }
      if (res.ok) { setPhase("verified"); return setMessage("Email verified. Thank you!"); }
      setPhase("ready"); setMessage("That code didn’t match or has expired. Request a new one and try again.");
    } catch {
      setPhase("ready"); setMessage("Couldn’t verify right now. Try again or continue.");
    }
  };

  return (
    <section className="auth-form" aria-label="Verify your email">
      <h2 style={{ margin: "0 0 4px", color: "#000000" }}>Confirm your email</h2>
      <p className="notice" style={{ margin: "0 0 10px" }}>{message}</p>
      {devCode ? <p className="notice" style={{ color: "#8a5a00", fontWeight: 700 }}>Code: {devCode}</p> : null}
      {phase !== "unavailable" && phase !== "verified" ? (
        <>
          <label htmlFor="ve-code">Verification code</label>
          <input id="ve-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" className="btn" onClick={() => void verify()} disabled={phase === "verifying" || phase === "sending"}>{phase === "verifying" ? "Verifying…" : "Verify"}</button>
            <button type="button" className="linkbtn" onClick={() => void sendCode()} disabled={cooldown > 0 || phase === "sending"}>{cooldown > 0 ? `Resend (${cooldown}s)` : "Resend code"}</button>
          </div>
        </>
      ) : null}
      <p className="auth-switch" style={{ marginTop: 12 }}>
        <button type="button" className="linkbtn" onClick={onDone}>{phase === "verified" ? "Continue" : "Continue — verify later"}</button>
      </p>
    </section>
  );
}
