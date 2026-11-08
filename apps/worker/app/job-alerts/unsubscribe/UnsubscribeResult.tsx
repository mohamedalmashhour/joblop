"use client";

import { useEffect, useState } from "react";
import { useLocale } from "../../i18n/LocaleProvider";

// One-click unsubscribe from job alert emails. The link in every alert email carries ?token=…;
// the API turns the alert off (idempotent), so opening the link twice is harmless.

type State = "working" | "done" | "error";
type Lang = "en" | "fr" | "ar";

const TEXT = {
  en: {
    title: "Job alert emails",
    working: "One moment…",
    done: "You will no longer receive Joblop job alert emails.",
    error: "We could not stop the emails with this link. It may be incomplete or expired.",
    contact: "Contact Joblop and we will stop them for you.",
    back: "Back to Joblop"
  },
  fr: {
    title: "Courriels d’alerte d’emploi",
    working: "Un instant…",
    done: "Vous ne recevrez plus les courriels d’alerte d’emploi de Joblop.",
    error: "Nous n’avons pas pu arrêter les courriels avec ce lien. Il est peut-être incomplet ou expiré.",
    contact: "Contactez Joblop et nous les arrêterons pour vous.",
    back: "Retour à Joblop"
  },
  ar: {
    title: "رسائل تنبيه الوظائف",
    working: "لحظة من فضلك…",
    done: "لن تصلك بعد الآن رسائل تنبيه الوظائف من Joblop.",
    error: "تعذّر إيقاف الرسائل بهذا الرابط. قد يكون ناقصاً أو منتهي الصلاحية.",
    contact: "تواصل مع Joblop وسنوقفها لك.",
    back: "العودة إلى Joblop"
  }
} as const;

export function UnsubscribeResult() {
  const locale = useLocale();
  const lang: Lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  const t = TEXT[lang];
  const [state, setState] = useState<State>("working");

  useEffect(() => {
    let cancelled = false;
    const token = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
    if (!token) {
      setState("error");
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/public/job-alerts/unsubscribe?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
          headers: { accept: "application/json" }
        });
        const payload = (await res.json().catch(() => ({}))) as { ok?: unknown };
        if (!cancelled) setState(res.ok && payload.ok === true ? "done" : "error");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section style={styles.card} aria-labelledby="unsub-title">
      <h1 id="unsub-title" style={styles.title}>{t.title}</h1>
      {state === "working" ? <p style={styles.text} role="status">{t.working}</p> : null}
      {state === "done" ? <p style={styles.done} role="status">{t.done}</p> : null}
      {state === "error" ? (
        <>
          <p style={styles.text} role="alert">{t.error}</p>
          <p style={styles.text}>
            <a href="/contact" style={styles.link}>{t.contact}</a>
          </p>
        </>
      ) : null}
      <p style={styles.text}>
        <a href="/" style={styles.link}>{t.back}</a>
      </p>
    </section>
  );
}

const styles = {
  card: { background: "#15110b", border: "1px solid #3a3020", borderRadius: 12, margin: "24px auto", maxWidth: 640, padding: 24 },
  title: { color: "#F8B808", fontSize: "clamp(22px,4vw,30px)", margin: "0 0 12px" },
  text: { color: "#cabfa8", fontSize: 16, lineHeight: 1.6, margin: "0 0 10px" },
  done: { color: "#fbf7ee", fontSize: 17, fontWeight: 700, lineHeight: 1.6, margin: "0 0 10px" },
  link: { color: "#F8B808", fontWeight: 700 }
} as const;
