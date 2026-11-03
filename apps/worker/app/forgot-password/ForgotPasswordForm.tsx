"use client";

import { useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";

/** Worker "forgot password": enter email -> request a reset link. Privacy-preserving: the response
 *  is the same whether or not an account exists. Bilingual (en/fr/ar). */
export function ForgotPasswordForm() {
  const locale = useLocale();
  const ar = locale === "ar";
  const fr = locale.startsWith("fr");
  const tr = (en: string, f: string, a: string) => (ar ? a : fr ? f : en);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    await fetch("/api/session/password-reset/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    }).catch(() => undefined);
    setSubmitting(false);
    setSent(true);
  };

  return (
    <div style={{ maxWidth: 440, margin: "32px auto" }} dir={ar ? "rtl" : "ltr"}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>
        {tr("Reset your password", "Réinitialiser votre mot de passe", "إعادة تعيين كلمة المرور")}
      </h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        {tr(
          "Enter your account email and we'll send a reset link. For your privacy, the response is the same whether or not an account exists.",
          "Entrez le courriel de votre compte et nous vous enverrons un lien de réinitialisation. Pour votre confidentialité, la réponse est la même, qu'un compte existe ou non.",
          "أدخل البريد الإلكتروني لحسابك وسنرسل رابط إعادة التعيين. حفاظًا على خصوصيتك، تكون الاستجابة واحدة سواء كان هناك حساب أم لا."
        )}
      </p>
      {sent ? (
        <div aria-live="polite" role="status" style={{ padding: 16, borderRadius: 10, background: "rgba(201,162,75,0.12)", border: "1px solid rgba(201,162,75,0.4)" }}>
          {tr(
            "If an account matches that email, a reset link is on its way. Check your inbox.",
            "Si un compte correspond à ce courriel, un lien de réinitialisation est en route. Vérifiez votre boîte de réception.",
            "إذا كان هناك حساب مطابق لهذا البريد، فإن رابط إعادة التعيين في طريقه إليك. تحقّق من بريدك."
          )}
          <div style={{ marginTop: 14 }}>
            <a href="/" style={{ color: "#c9a24b", fontWeight: 700 }}>
              {tr("Back to sign in", "Retour à la connexion", "العودة لتسجيل الدخول")} →
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 700 }}>
            {tr("Email", "Courriel", "البريد الإلكتروني")}
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 8, border: "1px solid #3a342a", background: "#17140f", color: "inherit" }}
            />
          </label>
          <button type="submit" disabled={submitting} className="btn" style={{ background: "#c9a24b", color: "#17140f", fontWeight: 800, padding: "12px", borderRadius: 8, border: "none", cursor: "pointer" }}>
            {submitting ? tr("Sending…", "Envoi…", "جارٍ الإرسال…") : tr("Send reset link", "Envoyer le lien", "إرسال رابط إعادة التعيين")}
          </button>
          <a href="/" className="muted" style={{ textAlign: "center", marginTop: 4 }}>
            {tr("Back to sign in", "Retour à la connexion", "العودة لتسجيل الدخول")}
          </a>
        </form>
      )}
    </div>
  );
}
