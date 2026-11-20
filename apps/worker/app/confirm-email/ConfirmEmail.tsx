"use client";
/** @jsxRuntime automatic */
// (pragma: lets vitest render this component; Next.js already uses the automatic runtime)

import { useState } from "react";
import { useT, type Translate } from "../i18n/LocaleProvider";

export type ConfirmEmailPhase = "ready" | "working" | "done" | "failed" | "missing";

export function isConfirmToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{32,256}$/u.test(value);
}

/** Pure view so tests can render every state in every language. */
export function ConfirmEmailView({
  t,
  phase,
  onConfirm
}: Readonly<{ t: Translate; phase: ConfirmEmailPhase; onConfirm: () => void }>) {
  return (
    <section className="card" style={{ maxWidth: 560, margin: "24px auto" }} aria-label={t("confirmEmail.title")}>
      <h1 style={{ margin: 0, fontSize: 24 }}>{t("confirmEmail.title")}</h1>
      {phase === "done" ? (
        <p role="status" style={{ fontWeight: 700 }}>{t("confirmEmail.done")}</p>
      ) : phase === "failed" ? (
        <p role="alert">{t("confirmEmail.failed")}</p>
      ) : phase === "missing" ? (
        <p role="alert">{t("confirmEmail.missing")}</p>
      ) : (
        <>
          <p className="when">{t("confirmEmail.body")}</p>
          <div>
            <button type="button" className="btn" onClick={onConfirm} disabled={phase === "working"}>
              {phase === "working" ? t("confirmEmail.working") : t("confirmEmail.button")}
            </button>
          </div>
        </>
      )}
      {phase === "done" || phase === "failed" || phase === "missing" ? (
        <p>
          <a href="/" className="linkbtn">{t("confirmEmail.home")}</a>
        </p>
      ) : null}
    </section>
  );
}

export function ConfirmEmail({ token }: Readonly<{ token: string }>) {
  const t = useT();
  const [phase, setPhase] = useState<ConfirmEmailPhase>(isConfirmToken(token) ? "ready" : "missing");

  async function confirm() {
    setPhase("working");
    try {
      const response = await fetch("/api/session/email/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });
      setPhase(response.ok ? "done" : "failed");
    } catch {
      setPhase("failed");
    }
  }

  return <ConfirmEmailView t={t} phase={phase} onConfirm={() => void confirm()} />;
}
