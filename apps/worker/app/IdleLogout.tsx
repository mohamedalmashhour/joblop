"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "./i18n/LocaleProvider";

// R2-2: auto log-out after inactivity. After IDLE_MS with no user interaction the worker is signed out
// (server session cleared) and sent to the landing page. A short warning shows before it happens so the
// worker can stay signed in by moving. Harmless when signed out (sign-out is idempotent). Mounted once,
// app-wide, from the root layout.
const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const WARN_MS = 60 * 1000; // warn 60s before logout

export function IdleLogout() {
  const locale = useLocale();
  const [warning, setWarning] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function signOut() {
      try {
        await fetch("/api/session/sign-out", { method: "POST" });
      } catch {
        /* ignore — redirect regardless */
      }
      window.location.href = "/";
    }

    function schedule() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      setWarning(false);
      warnTimer.current = setTimeout(() => setWarning(true), IDLE_MS - WARN_MS);
      idleTimer.current = setTimeout(() => void signOut(), IDLE_MS);
    }

    function onActivity() {
      schedule();
    }

    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    schedule();
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
    };
  }, [locale]);

  if (!warning) return null;
  const msg =
    locale === "ar"
      ? "ستُسجَّل خروجك قريبًا بسبب عدم النشاط. حرّك المؤشر للبقاء."
      : locale.startsWith("fr")
        ? "Vous serez déconnecté sous peu pour inactivité. Bougez pour rester connecté."
        : "You'll be signed out soon due to inactivity. Move to stay signed in.";
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        insetInlineStart: 0,
        insetInlineEnd: 0,
        bottom: 0,
        zIndex: 1000,
        background: "#1a140a",
        color: "#f4efe4",
        borderTop: "1px solid rgba(201,162,75,.4)",
        padding: "10px 16px",
        fontSize: 14,
        textAlign: "center"
      }}
    >
      {msg}
    </div>
  );
}
