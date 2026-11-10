"use client";
/** @jsxRuntime automatic */
// (pragma: lets vitest render this component; Next.js already uses the automatic runtime)

import { useCallback, useEffect, useRef, useState } from "react";
import { useT, type Translate } from "./i18n/LocaleProvider";
import type { MessageKey } from "./i18n/messages";

const RESEND_COOLDOWN_SECONDS = 60;

export type AddEmailPhase = "form" | "sending" | "sent";

export type AddEmailCardViewProps = Readonly<{
  t: Translate;
  phase: AddEmailPhase;
  email: string;
  sentTo: string;
  cooldown: number;
  errorKey: MessageKey | null;
  devLink: string | null;
  onEmailChange: (value: string) => void;
  onSend: () => void;
  onChange: () => void;
}>;

/**
 * "Add your email" card, shown on the worker dashboard and HR profile while the account has no
 * confirmed email. Sign-in stays by texted code; the email is for confirmations and notices.
 * Pure view (no fetch) so tests can render it in every language.
 */
export function AddEmailCardView(props: AddEmailCardViewProps) {
  const { t, phase, email, sentTo, cooldown, errorKey, devLink } = props;
  const sending = phase === "sending";
  return (
    <section className="card" style={{ marginBottom: 14 }} aria-label={t("addEmail.title")} data-add-email-card="">
      <div className="role">{t("addEmail.title")}</div>
      {phase === "sent" ? (
        <>
          <p className="when" role="status" style={{ fontWeight: 700 }}>{t("addEmail.checkInbox")}</p>
          <p className="when">{t("addEmail.sentTo", { email: sentTo })}</p>
          {devLink ? (
            <p className="notice">
              {t("addEmail.devLink")}: <a href={devLink}>{devLink}</a>
            </p>
          ) : null}
          {errorKey ? <p className="state error" role="alert">{t(errorKey)}</p> : null}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btn" onClick={props.onSend} disabled={cooldown > 0}>
              {cooldown > 0 ? t("addEmail.resendIn", { seconds: cooldown }) : t("addEmail.resend")}
            </button>
            <button type="button" className="linkbtn" onClick={props.onChange}>{t("addEmail.change")}</button>
          </div>
        </>
      ) : (
        <form
          className="auth-form"
          style={{ gap: 10 }}
          onSubmit={(event) => {
            event.preventDefault();
            props.onSend();
          }}
        >
          <p className="when">{t("addEmail.body")}</p>
          <label htmlFor="add-email-input">{t("addEmail.label")}</label>
          <input
            id="add-email-input"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(event) => props.onEmailChange(event.target.value)}
            required
          />
          {errorKey ? <p className="state error" role="alert">{t(errorKey)}</p> : null}
          <div>
            <button type="submit" className="btn" disabled={sending}>
              {sending ? t("addEmail.sending") : t("addEmail.send")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function isPlausibleEmail(value: string): boolean {
  const v = value.trim();
  return v.length >= 6 && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(v);
}

/** Loads the session and shows the card only for a signed-in worker without a confirmed email. */
export function AddEmailCard() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<AddEmailPhase>("form");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: { user?: { emailVerified?: unknown; emailNormalized?: unknown } | null } | null) => {
        if (!active || !payload?.user) return;
        if (payload.user.emailVerified === true) return;
        const current = typeof payload.user.emailNormalized === "string" ? payload.user.emailNormalized : "";
        if (isPlausibleEmail(current)) setEmail(current);
        setVisible(true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  }, []);

  const send = useCallback(async () => {
    const value = email.trim();
    if (!isPlausibleEmail(value)) return setErrorKey("addEmail.invalid");
    setErrorKey(null);
    const wasSent = phase === "sent";
    if (!wasSent) setPhase("sending");
    try {
      const response = await fetch("/api/session/email/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value })
      });
      const payload = (await response.json().catch(() => ({}))) as { status?: unknown; email?: unknown; link?: unknown };
      if (response.ok && payload.status === "already_confirmed") return setVisible(false);
      if (response.ok) {
        setSentTo(typeof payload.email === "string" ? payload.email : value);
        setDevLink(typeof payload.link === "string" ? payload.link : null);
        setPhase("sent");
        startCooldown();
        return;
      }
      setPhase(wasSent ? "sent" : "form");
      setErrorKey(response.status === 409 ? "addEmail.inUse" : response.status === 400 ? "addEmail.invalid" : "addEmail.error");
    } catch {
      setPhase(wasSent ? "sent" : "form");
      setErrorKey("addEmail.error");
    }
  }, [email, phase, startCooldown]);

  if (!visible) return null;
  return (
    <AddEmailCardView
      t={t}
      phase={phase}
      email={email}
      sentTo={sentTo}
      cooldown={cooldown}
      errorKey={errorKey}
      devLink={devLink}
      onEmailChange={(value) => {
        setEmail(value);
        setErrorKey(null);
      }}
      onSend={() => void send()}
      onChange={() => {
        setPhase("form");
        setErrorKey(null);
        setDevLink(null);
      }}
    />
  );
}
