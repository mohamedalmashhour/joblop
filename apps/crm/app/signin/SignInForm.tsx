"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ui } from "../ui";

type Step = "phone" | "code";

// Same-site return path only (leading single slash, no "//" or scheme), so ?next can never redirect
// off-site. Defaults to the pipeline board.
function safeReturnPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const destination = safeReturnPath(params.get("next"));
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in → go straight to the destination.
  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (active && payload && payload.authenticated === true) router.replace(destination);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [router, destination]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/session/phone/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() })
      });
      if (response.status === 202) {
        setStep("code");
      } else {
        setError("Could not request a code. Check the number and try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/session/phone/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() })
      });
      if (response.ok) {
        router.replace(destination);
      } else {
        setError("That code was not accepted. Request a new one if it has expired.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={step === "phone" ? requestCode : verifyCode} style={{ display: "grid", gap: 14 }}>
      {step === "phone" ? (
        <label style={styles.label}>
          Staff phone number
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 514 555 0100"
            required
            style={styles.input}
          />
        </label>
      ) : (
        <label style={styles.label}>
          One-time code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            required
            style={styles.input}
          />
          <button type="button" onClick={() => setStep("phone")} style={styles.linkButton}>
            Use a different number
          </button>
        </label>
      )}
      {error ? <p style={styles.error}>{error}</p> : null}
      <button type="submit" disabled={busy} style={styles.submit}>
        {busy ? "Please wait…" : step === "phone" ? "Send code" : "Sign in"}
      </button>
    </form>
  );
}

const styles = {
  label: { display: "grid", gap: 8, fontSize: 13, fontWeight: 700, color: ui.muted },
  input: {
    background: ui.black,
    border: `1px solid ${ui.hairlineSoft}`,
    borderRadius: 10,
    color: ui.text,
    fontSize: 16,
    padding: "12px 14px"
  },
  submit: {
    background: ui.gold,
    border: "none",
    borderRadius: 10,
    color: ui.onGold,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 800,
    padding: "13px 16px"
  },
  linkButton: {
    background: "none",
    border: "none",
    color: ui.gold,
    cursor: "pointer",
    fontSize: 12,
    justifySelf: "start" as const,
    padding: 0,
    textDecoration: "underline"
  },
  error: { color: "#ff9d9d", fontSize: 13, margin: 0 }
} as const;
