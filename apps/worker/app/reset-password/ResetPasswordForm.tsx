"use client";

import { useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";

/** Worker "reset password": choose a new password using the emailed token. Bilingual (en/fr/ar).
 *  On success the backend invalidates existing sessions. */
export function ResetPasswordForm({ token }: { token: string }) {
  const locale = useLocale();
  const ar = locale === "ar";
  const fr = locale.startsWith("fr");
  const tr = (en: string, f: string, a: string) => (ar ? a : fr ? f : en);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setMessage(tr("Passwords do not match.", "Les mots de passe ne correspondent pas.", "كلمتا المرور غير متطابقتين."));
      return;
    }
    setSubmitting(true);
    const response = await fetch("/api/session/password-reset/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, newPassword: password })
    }).catch(() => null);
    setPassword("");
    setConfirm("");
    setSubmitting(false);
    if (!response?.ok) {
      setMessage(tr(
        "This reset link is invalid, expired, or already used. Request a new one.",
        "Ce lien est invalide, expiré ou déjà utilisé. Demandez-en un nouveau.",
        "هذا الرابط غير صالح أو منتهٍ أو مستخدم من قبل. اطلب رابطًا جديدًا."
      ));
      return;
    }
    setComplete(true);
    setMessage(tr("Password reset. You've been signed out everywhere.", "Mot de passe réinitialisé. Vous avez été déconnecté partout.", "تم إعادة تعيين كلمة المرور. تم تسجيل خروجك من كل الأجهزة."));
  };

  return (
    <div style={{ maxWidth: 440, margin: "32px auto" }} dir={ar ? "rtl" : "ltr"}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>
        {tr("Choose a new password", "Choisir un nouveau mot de passe", "اختر كلمة مرور جديدة")}
      </h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        {tr("Reset links expire after 30 minutes and can be used only once.", "Les liens expirent après 30 minutes et ne servent qu'une fois.", "تنتهي صلاحية الروابط بعد 30 دقيقة وتُستخدم مرة واحدة فقط.")}
      </p>
      {complete ? (
        <div aria-live="polite" role="status" style={{ padding: 16, borderRadius: 10, background: "rgba(201,162,75,0.12)", border: "1px solid rgba(201,162,75,0.4)" }}>
          {message}
          <div style={{ marginTop: 14 }}>
            <a href="/" style={{ color: "#c9a24b", fontWeight: 700 }}>{tr("Sign in", "Se connecter", "تسجيل الدخول")} →</a>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 700 }}>
            {tr("New password", "Nouveau mot de passe", "كلمة المرور الجديدة")}
            <input type="password" autoComplete="new-password" minLength={12} required value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 8, border: "1px solid #3a342a", background: "#17140f", color: "inherit" }} />
          </label>
          <label style={{ fontSize: 14, fontWeight: 700 }}>
            {tr("Confirm new password", "Confirmez le mot de passe", "تأكيد كلمة المرور")}
            <input type="password" autoComplete="new-password" minLength={12} required value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 8, border: "1px solid #3a342a", background: "#17140f", color: "inherit" }} />
          </label>
          {message ? <p aria-live="polite" role="status" className="muted">{message}</p> : null}
          <button type="submit" disabled={submitting || !token} className="btn" style={{ background: "#c9a24b", color: "#17140f", fontWeight: 800, padding: "12px", borderRadius: 8, border: "none", cursor: "pointer" }}>
            {submitting ? tr("Resetting…", "Réinitialisation…", "جارٍ إعادة التعيين…") : tr("Reset password", "Réinitialiser", "إعادة التعيين")}
          </button>
          <a href="/" className="muted" style={{ textAlign: "center", marginTop: 4 }}>{tr("Back to sign in", "Retour à la connexion", "العودة لتسجيل الدخول")}</a>
        </form>
      )}
    </div>
  );
}
