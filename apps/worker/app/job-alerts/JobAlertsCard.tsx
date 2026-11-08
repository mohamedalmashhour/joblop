"use client";

import { useEffect, useId, useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import { JOB_ALERT_PROVINCES } from "./provinces";

// "Email me new jobs" box for signed-in workers (My calendar + JobScanner). The API owns the alert
// (/worker/job-alerts via the /api/job-alerts BFF); this box only shows it and asks to change it.
// Signed-out visitors see nothing here.

type Subscription = Readonly<{ roleKeywords: string | null; province: string | null; active: boolean }>;
type Lang = "en" | "fr" | "ar";

const TEXT = {
  en: {
    title: "Email me new jobs",
    plain: "We email you once a day at most when new matching jobs appear. You can stop anytime.",
    keywords: "Job or skill (optional)",
    keywordsPh: "e.g. cook, PSW, forklift",
    province: "Province",
    save: "Save",
    update: "Update",
    stop: "Stop alerts",
    saving: "Saving…",
    on: (what: string, province: string) => `Alerts are on: ${what} in ${province}.`,
    anyJob: "any job",
    off: "Alerts are off.",
    saved: "Saved. We will email you when new jobs match.",
    stopped: "Stopped. You will not get job alert emails.",
    error: "That did not work. Please try again."
  },
  fr: {
    title: "M’envoyer les nouveaux emplois par courriel",
    plain: "Nous vous écrivons au plus une fois par jour quand de nouveaux emplois correspondent. Vous pouvez arrêter en tout temps.",
    keywords: "Emploi ou compétence (facultatif)",
    keywordsPh: "ex. cuisinier, PAB, cariste",
    province: "Province",
    save: "Enregistrer",
    update: "Mettre à jour",
    stop: "Arrêter les alertes",
    saving: "Enregistrement…",
    on: (what: string, province: string) => `Alertes activées : ${what} au ${province}.`,
    anyJob: "tout emploi",
    off: "Les alertes sont désactivées.",
    saved: "Enregistré. Nous vous écrirons quand de nouveaux emplois correspondent.",
    stopped: "Arrêté. Vous ne recevrez plus de courriels d’alerte.",
    error: "Cela n’a pas fonctionné. Veuillez réessayer."
  },
  ar: {
    title: "أرسلوا لي الوظائف الجديدة بالبريد",
    plain: "نراسلك مرة واحدة في اليوم على الأكثر عند ظهور وظائف جديدة مطابقة. يمكنك الإيقاف في أي وقت.",
    keywords: "الوظيفة أو المهارة (اختياري)",
    keywordsPh: "مثلاً: طباخ، مساعد رعاية، سائق رافعة",
    province: "المقاطعة",
    save: "حفظ",
    update: "تحديث",
    stop: "إيقاف التنبيهات",
    saving: "جارٍ الحفظ…",
    on: (what: string, province: string) => `التنبيهات مفعّلة: ${what} في ${province}.`,
    anyJob: "أي وظيفة",
    off: "التنبيهات متوقفة.",
    saved: "تم الحفظ. سنراسلك عند ظهور وظائف مطابقة.",
    stopped: "تم الإيقاف. لن تصلك رسائل تنبيه الوظائف.",
    error: "لم ينجح ذلك. حاول مرة أخرى."
  }
} as const;

function readSubscription(payload: unknown): Subscription | null {
  const sub = (payload as { subscription?: unknown } | null)?.subscription;
  if (!sub || typeof sub !== "object") return null;
  const s = sub as Record<string, unknown>;
  return {
    roleKeywords: typeof s.roleKeywords === "string" ? s.roleKeywords : null,
    province: typeof s.province === "string" ? s.province : null,
    active: s.active !== false
  };
}

export function JobAlertsCard() {
  const locale = useLocale();
  const lang: Lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  const t = TEXT[lang];
  const ids = useId();
  const [visible, setVisible] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [keywords, setKeywords] = useState("");
  const [province, setProvince] = useState<string>("QC");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/job-alerts", { cache: "no-store" });
        // Signed out (401/403) or alerts not available yet (404): show nothing.
        if (!res.ok || cancelled) return;
        const sub = readSubscription(await res.json().catch(() => null));
        if (cancelled) return;
        setSubscription(sub);
        if (sub?.roleKeywords) setKeywords(sub.roleKeywords);
        if (sub?.province && (JOB_ALERT_PROVINCES as readonly string[]).includes(sub.province)) setProvince(sub.province);
        setVisible(true);
      } catch {
        // Network trouble: keep the box hidden rather than show a broken form.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/job-alerts", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ roleKeywords: keywords.trim(), province })
      });
      if (!res.ok) {
        setMessage(t.error);
        return;
      }
      const sub = readSubscription(await res.json().catch(() => null));
      setSubscription(sub ?? { roleKeywords: keywords.trim() || null, province, active: true });
      setMessage(t.saved);
    } catch {
      setMessage(t.error);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/job-alerts", { method: "DELETE", headers: { accept: "application/json" } });
      if (!res.ok) {
        setMessage(t.error);
        return;
      }
      setSubscription(null);
      setMessage(t.stopped);
    } catch {
      setMessage(t.error);
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;
  const active = Boolean(subscription?.active);

  return (
    <section style={styles.card} aria-labelledby={`${ids}-title`}>
      <h2 id={`${ids}-title`} style={styles.title}>{t.title}</h2>
      <p style={styles.plain}>{t.plain}</p>
      <p style={active ? styles.statusOn : styles.statusOff} role="status">
        {active
          ? t.on(subscription?.roleKeywords?.trim() || t.anyJob, subscription?.province ?? province)
          : t.off}
      </p>
      <div style={styles.row}>
        <label style={styles.field} htmlFor={`${ids}-keywords`}>
          <span style={styles.label}>{t.keywords}</span>
          <input
            id={`${ids}-keywords`}
            style={styles.input}
            value={keywords}
            maxLength={120}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder={t.keywordsPh}
          />
        </label>
        <label style={styles.fieldSmall} htmlFor={`${ids}-province`}>
          <span style={styles.label}>{t.province}</span>
          <select id={`${ids}-province`} style={styles.input} value={province} onChange={(e) => setProvince(e.target.value)}>
            {JOB_ALERT_PROVINCES.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={styles.actions}>
        <button type="button" style={styles.cta} disabled={busy} onClick={() => void save()}>
          {busy ? t.saving : active ? t.update : t.save}
        </button>
        {active ? (
          <button type="button" style={styles.ghost} disabled={busy} onClick={() => void stop()}>
            {t.stop}
          </button>
        ) : null}
      </div>
      {message ? <p style={styles.message} aria-live="polite">{message}</p> : null}
    </section>
  );
}

const styles = {
  card: { background: "#15110b", border: "1px solid #3a3020", borderRadius: 12, margin: "16px 0", padding: 16 },
  title: { color: "#F8B808", fontSize: 18, margin: "0 0 6px" },
  plain: { color: "#cabfa8", fontSize: 14, lineHeight: 1.5, margin: "0 0 8px" },
  statusOn: { color: "#9be29b", fontSize: 14, fontWeight: 700, margin: "0 0 10px" },
  statusOff: { color: "#b3a894", fontSize: 14, fontWeight: 700, margin: "0 0 10px" },
  row: { display: "flex", flexWrap: "wrap" as const, gap: 10 },
  field: { display: "flex", flexDirection: "column" as const, flex: "1 1 220px", gap: 4, minWidth: 0 },
  fieldSmall: { display: "flex", flexDirection: "column" as const, flex: "0 1 120px", gap: 4 },
  label: { color: "#fbf7ee", fontSize: 13, fontWeight: 700 },
  input: { border: "1px solid #e3d7c0", borderRadius: 8, minHeight: 42, padding: "0 12px" },
  actions: { alignItems: "center", display: "flex", flexWrap: "wrap" as const, gap: 12, marginTop: 12 },
  cta: { background: "#F8B808", border: "none", borderRadius: 8, color: "#15110b", cursor: "pointer", fontWeight: 800, minHeight: 44, padding: "0 18px" },
  ghost: { background: "transparent", border: "1px solid #F8B808", borderRadius: 8, color: "#F8B808", cursor: "pointer", fontWeight: 700, minHeight: 44, padding: "0 16px" },
  message: { color: "#F8B808", fontSize: 14, fontWeight: 700, margin: "10px 0 0" }
} as const;
