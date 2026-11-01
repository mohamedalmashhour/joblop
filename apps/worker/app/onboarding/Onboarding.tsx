"use client";

import { useLocale } from "../i18n/LocaleProvider";

// R2-3: dedicated worker-onboarding page. The "set up your worker profile" CTA on gated pages
// (verification, documents, schedule, saved jobs, offers, my interests, HR) points HERE instead of
// dumping the worker onto the pay page. From here they choose their work type and complete their details.
// Trilingual inline (en / fr-CA / ar).
export function Onboarding() {
  const locale = useLocale();
  const t = (ar: string, fr: string, en: string) => (locale === "ar" ? ar : locale.startsWith("fr") ? fr : en);

  const steps = [
    {
      n: 1,
      title: t("اختر نوع عملك", "Choisissez votre type de travail", "Choose your work type"),
      body: t(
        "موظف أم عامل مستقل — يحدّد ذلك كيفية احتساب أجرك والمستندات الضريبية.",
        "Employé ou travailleur autonome — cela détermine le calcul de votre paie et vos documents fiscaux.",
        "Employee or self-employed — this sets how your pay is calculated and your tax documents."
      ),
      href: "/pay",
      cta: t("اختر نوع العمل", "Choisir le type de travail", "Choose work type")
    },
    {
      n: 2,
      title: t("أكمل بياناتك", "Complétez vos informations", "Complete your details"),
      body: t(
        "الاسم، الهاتف، رخصة القيادة والمركبة، وشهاداتك — لتحسين مطابقتك مع العمل.",
        "Nom, téléphone, permis et véhicule, et vos certificats — pour mieux vous jumeler au travail.",
        "Name, phone, driving licence & vehicle, and your certificates — to match you to work better."
      ),
      href: "/hr",
      cta: t("أضف بياناتي", "Ajouter mes informations", "Add my details")
    }
  ];

  return (
    <>
      <section className="hero">
        <h1>{t("أكمل إعداد حساب العامل", "Configurez votre profil de travailleur", "Set up your worker profile")}</h1>
        <p>{t(
          "خطوتان سريعتان، ثم يمكنك تلقّي العروض والمطابقة مع المناوبات.",
          "Deux étapes rapides, puis vous pourrez recevoir des offres et être jumelé à des quarts.",
          "A couple of quick steps and you can receive offers and get matched to shifts."
        )}</p>
      </section>

      <div className="results" style={{ paddingBottom: 48 }}>
        {steps.map((s) => (
          <article key={s.n} className="card">
            <div className="role">{s.n}. {s.title}</div>
            <p className="when">{s.body}</p>
            <a className="btn" href={s.href} style={{ alignSelf: "flex-start" }}>{s.cta}</a>
          </article>
        ))}
      </div>
    </>
  );
}
