"use client";
/** @jsxRuntime automatic */
// (pragma: lets vitest render this component; Next.js already uses the automatic runtime)

import { useCallback, useEffect, useRef, useState } from "react";
import { useT, type Translate } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n/messages";
import { styles } from "../employerStyles";

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
 * "Add your email" card for an employer user whose account has no confirmed email (item 45).
 * Sign-in stays by texted code; invoices and receipts go to this email. Pure view for tests.
 */
export function AddEmailCardView(props: AddEmailCardViewProps) {
  const { t, phase, email, sentTo, cooldown, errorKey, devLink } = props;
  const sending = phase === "sending";
  const error = errorKey ? (
    <p role="alert" style={{ ...styles.cardText, color: "#ffb4a8" }}>{t(errorKey)}</p>
  ) : null;
  return (
    <section style={{ ...styles.section, paddingBottom: 0 }} aria-label={t("addEmail.title")} data-add-email-card="">
      <div style={{ ...styles.panel, display: "grid", gap: 12, maxWidth: 620 }}>
        <h2 style={styles.cardTitle}>{t("addEmail.title")}</h2>
        {phase === "sent" ? (
          <>
            <p role="status" style={{ ...styles.cardText, color: "#f4efe4" }}>{t("addEmail.checkInbox")}</p>
            <p style={styles.cardText}>{t("addEmail.sentTo", { email: sentTo })}</p>
            {devLink ? (
              <p style={styles.cardText}>
                {t("addEmail.devLink")}: <a href={devLink} style={{ color: "#f8b808" }}>{devLink}</a>
              </p>
            ) : null}
            {error}
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button
                disabled={cooldown > 0}
                onClick={props.onSend}
                style={cooldown > 0 ? styles.disabledAction : styles.primaryButton}
                type="button"
              >
                {cooldown > 0 ? t("addEmail.resendIn", { seconds: cooldown }) : t("addEmail.resend")}
              </button>
              <button onClick={props.onChange} style={styles.secondaryButton} type="button">
                {t("addEmail.change")}
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              props.onSend();
            }}
            style={{ display: "grid", gap: 12 }}
          >
            <p style={styles.cardText}>{t("addEmail.body")}</p>
            <label style={styles.fieldLabel}>
              {t("addEmail.label")}
              <input
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                onChange={(event) => props.onEmailChange(event.target.value)}
                required
                style={styles.input}
                type="email"
                value={email}
              />
            </label>
            {error}
            <div>
              <button disabled={sending} style={sending ? styles.disabledAction : styles.primaryButton} type="submit">
                {sending ? t("addEmail.sending") : t("addEmail.send")}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export function isPlausibleEmail(value: string): boolean {
  const v = value.trim();
  return v.length >= 6 && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(v);
}

/** Loads the session and shows the card only for a signed-in employer user without a confirmed email. */
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
