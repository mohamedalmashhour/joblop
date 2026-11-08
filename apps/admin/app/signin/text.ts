import type { PageText } from "../i18n/pageTextCore";

// Staff sign-in page copy (English, Québec French, Arabic).
type SignInText = {
  eyebrow: string;
  title: string;
  copy: string;
  intro: string;
  numberRejected: string;
  codeSent: string;
  unavailable: string;
  codeRejected: string;
  mobileNumber: string;
  phonePlaceholder: string;
  sending: string;
  textMeACode: string;
  codeLabel: string;
  checking: string;
  signIn: string;
  sendNewCode: string;
  changeNumber: string;
};

export const signInText = {
  en: {
    eyebrow: "Administration access",
    title: "Sign in to the administration workspace.",
    copy: "Staff sign in with their mobile number and a texted code.",
    intro: "Enter your staff mobile number. We will text you a code.",
    numberRejected: "That number could not be used. Check it and try again.",
    codeSent: "If this is a staff number, a 6-digit code is on its way. It expires in 10 minutes.",
    unavailable: "Sign-in is unavailable. Try again.",
    codeRejected: "That code did not work. Check it, or ask for a new one.",
    mobileNumber: "Mobile number",
    phonePlaceholder: "514 555 0100",
    sending: "Sending…",
    textMeACode: "Text me a code",
    codeLabel: "6-digit code",
    checking: "Checking…",
    signIn: "Sign in",
    sendNewCode: "Send a new code",
    changeNumber: "Change number"
  },
  fr: {
    eyebrow: "Accès à l’administration",
    title: "Connectez-vous à l’espace d’administration.",
    copy: "Le personnel se connecte avec son numéro de cellulaire et un code reçu par texto.",
    intro: "Entrez votre numéro de cellulaire du personnel. Nous vous enverrons un code par texto.",
    numberRejected: "Ce numéro ne peut pas être utilisé. Vérifiez-le et réessayez.",
    codeSent:
      "S’il s’agit d’un numéro du personnel, un code à 6 chiffres est en route. Il expire dans 10 minutes.",
    unavailable: "La connexion n’est pas disponible. Réessayez.",
    codeRejected: "Ce code n’a pas fonctionné. Vérifiez-le ou demandez-en un nouveau.",
    mobileNumber: "Numéro de cellulaire",
    phonePlaceholder: "514 555 0100",
    sending: "Envoi…",
    textMeACode: "M’envoyer un code par texto",
    codeLabel: "Code à 6 chiffres",
    checking: "Vérification…",
    signIn: "Se connecter",
    sendNewCode: "Envoyer un nouveau code",
    changeNumber: "Changer de numéro"
  },
  ar: {
    eyebrow: "الدخول إلى الإدارة",
    title: "سجّل الدخول إلى مساحة عمل الإدارة.",
    copy: "يسجّل الموظفون الدخول برقم هاتفهم المحمول ورمز يصلهم برسالة نصية.",
    intro: "أدخل رقم هاتفك المحمول المسجّل لدى الموظفين. سنرسل إليك رمزًا برسالة نصية.",
    numberRejected: "تعذّر استخدام هذا الرقم. تحقّق منه وحاول مرة أخرى.",
    codeSent: "إذا كان هذا رقمًا لأحد الموظفين، فإن رمزًا من 6 أرقام في طريقه إليك. تنتهي صلاحيته خلال 10 دقائق.",
    unavailable: "تسجيل الدخول غير متاح حاليًا. حاول مرة أخرى.",
    codeRejected: "لم ينجح هذا الرمز. تحقّق منه أو اطلب رمزًا جديدًا.",
    mobileNumber: "رقم الهاتف المحمول",
    phonePlaceholder: "514 555 0100",
    sending: "جارٍ الإرسال…",
    textMeACode: "أرسل لي رمزًا",
    codeLabel: "رمز من 6 أرقام",
    checking: "جارٍ التحقق…",
    signIn: "تسجيل الدخول",
    sendNewCode: "إرسال رمز جديد",
    changeNumber: "تغيير الرقم"
  }
} satisfies PageText<SignInText>;
