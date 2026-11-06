"use client";

import { useEffect, useState } from "react";
import { useLocale } from "../i18n/LocaleProvider";

// One-shot worker setup: choose work type (SIGNED election: employee -> T4 / self-employed -> T4A),
// accept the matching agreement, and fill the profile details — all in a single form. On submit it
// records the signed election (which also creates the worker identity), then saves the HR details, then
// lands the worker on their HR Profile. Trilingual inline (en / fr-CA / ar).
export function Onboarding() {
  const locale = useLocale();
  const ar = locale === "ar";
  const fr = locale.startsWith("fr");
  const tr = (a: string, f: string, en: string) => (ar ? a : fr ? f : en);

  const [agreementVersions, setAgreementVersions] = useState<{ employee?: string; contractor?: string }>({});
  const [classification, setClassification] = useState<"employee" | "contractor">("employee");
  const [agree, setAgree] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [hasLicence, setHasLicence] = useState(false);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [consent, setConsent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profile/classification-election", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { election?: { classification?: string } | null; agreementVersions?: { employee?: string; contractor?: string } } | null) => {
        if (!active || !d) return;
        if (d.agreementVersions) setAgreementVersions(d.agreementVersions);
        if (d.election?.classification === "contractor" || d.election?.classification === "employee") setClassification(d.election.classification);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agree) { setError(tr("يجب قبول الاتفاقية للمتابعة.", "Vous devez accepter l'entente pour continuer.", "You must accept the agreement to continue.")); return; }
    if (!consent) { setError(tr("يجب الموافقة على حفظ بياناتك.", "Vous devez consentir à l'enregistrement de vos informations.", "You must consent to storing your details.")); return; }
    const version = agreementVersions[classification];
    if (!version) { setError(tr("تعذّر تحميل نسخة الاتفاقية. أعد تحميل الصفحة.", "Impossible de charger la version de l'entente. Rechargez la page.", "Couldn't load the agreement version. Please reload.")); return; }
    setBusy(true);
    try {
      // 1) Signed election — also creates the worker identity.
      const elect = await fetch("/api/profile/classification-election", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classification, agreementVersion: version, agreementAccepted: true })
      });
      if (!elect.ok) { setError(tr("تعذّر تسجيل اختيار نوع العمل. حاول مجددًا.", "Impossible d'enregistrer votre type de travail. Réessayez.", "Couldn't record your work type. Please try again.")); setBusy(false); return; }
      // 2) Save the HR details — the worker now exists. Surface a failure instead of silently
      // dropping the details and redirecting as if setup succeeded.
      const saved = await fetch("/api/hr", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          legalFirstName: firstName, legalLastName: lastName, phone, addressLine, city, province, postalCode,
          hasDrivingLicence: hasLicence, licenceClass: null, licenceExpiry: null,
          hasVehicle, vehicleType: null, canTravelKm: null, transportNotes: null
        })
      }).catch(() => null);
      if (!saved || !saved.ok) {
        // Work type is recorded; only the details didn't save. Send them to their HR Profile to retry
        // the details there rather than losing what they typed silently.
        setError(tr(
          "تم حفظ نوع العمل، لكن تعذّر حفظ بياناتك. افتح ملف الموارد البشرية وأعد المحاولة.",
          "Votre type de travail est enregistré, mais vos informations n'ont pas pu être sauvegardées. Ouvrez votre Profil RH pour réessayer.",
          "Your work type is saved, but your details couldn't be saved. Open your HR Profile to try again."
        ));
        setBusy(false);
        return;
      }
      window.location.assign(new URLSearchParams(window.location.search).get("next") === "offers" ? "/offers" : "/hr");
    } catch {
      setError(tr("حدث خطأ. حاول مجددًا.", "Une erreur est survenue. Réessayez.", "Something went wrong. Please try again."));
      setBusy(false);
    }
  };

  const slip = classification === "contractor" ? "T4A" : "T4";
  const input: React.CSSProperties = { width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 8, border: "1px solid #3a342a", background: "#17140f", color: "inherit" };

  return (
    <>
      <section className="hero">
        <h1>{tr("أكمل إعداد حساب العامل", "Configurez votre profil de travailleur", "Set up your worker profile")}</h1>
        <p>{tr("كل شيء في خطوة واحدة — اختر نوع عملك ووقّع الاتفاقية وأكمل بياناتك.", "Tout en une étape — choisissez votre type de travail, signez l'entente et complétez vos informations.", "Everything in one step — choose your work type, sign the agreement, and complete your details.")}</p>
      </section>

      <form className="card" style={{ maxWidth: 560, margin: "0 auto 48px", display: "flex", flexDirection: "column", gap: 12 }} onSubmit={submit} dir={ar ? "rtl" : "ltr"}>
        {/* 1. Work type (signed election) */}
        <div className="role">{tr("١. نوع العمل", "1. Type de travail", "1. Work type")}</div>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input type="radio" name="cls" checked={classification === "employee"} onChange={() => setClassification("employee")} />
          <span><strong>{tr("موظف", "Employé", "Employee")}</strong> — {tr("رواتب مع استقطاعات، نموذج T4.", "paie avec retenues, relevé T4.", "payroll with deductions, T4 slip.")}</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input type="radio" name="cls" checked={classification === "contractor"} onChange={() => setClassification("contractor")} />
          <span><strong>{tr("عامل مستقل", "Travailleur autonome", "Self-employed")}</strong> — {tr("يُدفع بالكامل دون استقطاعات، نموذج T4A.", "payé brut sans retenues, relevé T4A.", "paid gross, no deductions, T4A slip.")}</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 4 }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>{tr(`أوافق على اتفاقية ${slip} وأوقّعها (النسخة ${agreementVersions[classification] ?? "…"}).`, `J'accepte et je signe l'entente ${slip} (version ${agreementVersions[classification] ?? "…"}).`, `I accept and sign the ${slip} agreement (version ${agreementVersions[classification] ?? "…"}).`)}</span>
        </label>

        {/* 2. Details */}
        <div className="role" style={{ marginTop: 10 }}>{tr("٢. بياناتك", "2. Vos informations", "2. Your details")}</div>
        <label>{tr("الاسم الأول القانوني", "Prénom légal", "Legal first name")}<input style={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
        <label>{tr("اسم العائلة القانوني", "Nom légal", "Legal last name")}<input style={input} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
        <label>{tr("رقم الهاتف", "Téléphone", "Mobile number")}<input style={input} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label>{tr("العنوان", "Adresse", "Address")}<input style={input} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} /></label>
        <label>{tr("المدينة", "Ville", "City")}<input style={input} value={city} onChange={(e) => setCity(e.target.value)} /></label>
        <label>{tr("المقاطعة", "Province", "Province")}<input style={input} value={province} onChange={(e) => setProvince(e.target.value)} /></label>
        <label>{tr("الرمز البريدي", "Code postal", "Postal code")}<input style={input} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={hasLicence} onChange={(e) => setHasLicence(e.target.checked)} />{tr("لديّ رخصة قيادة", "J'ai un permis de conduire", "I have a driving licence")}</label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={hasVehicle} onChange={(e) => setHasVehicle(e.target.checked)} />{tr("لديّ مركبة", "J'ai un véhicule", "I have a vehicle")}</label>

        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 4 }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{tr("أوافق على حفظ جوب‑لوب لهذه البيانات لمطابقتي مع العمل.", "Je consens à ce que Joblop conserve ces informations pour me jumeler au travail.", "I consent to Joblop storing these details to match me with work.")}</label>

        {error ? <p className="notice" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}
        <button className="btn" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>{busy ? tr("جارٍ الحفظ…", "Enregistrement…", "Setting up…") : tr("أكمل الإعداد", "Terminer la configuration", "Finish setup")}</button>
        <p className="when">{tr("يمكنك تحديث بياناتك ومستنداتك لاحقًا من ملف الموارد البشرية.", "Vous pourrez mettre à jour vos informations et documents plus tard dans votre Profil RH.", "You can update your details and documents later in your HR Profile.")}</p>
      </form>
    </>
  );
}
