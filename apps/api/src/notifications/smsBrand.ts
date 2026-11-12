// The shape of every text message Joblop sends (toll-free SMS registration, 2026-11-11):
//   - every text starts with "Joblop:" (the brand, exactly so spelled);
//   - every NOTICE ends with the opt-out line in the person's language;
//   - sign-in / verification CODES carry the prefix but no opt-out line (kept short).
// Latin-script texts are kept in the GSM-7 alphabet where possible (straight quotes and hyphens, plain
// spaces), because one typographic character such as « or — turns the whole text into UCS-2, which
// halves the characters per SMS segment. Arabic texts are UCS-2 by nature and are left as written.

export type SmsLanguage = "en" | "fr" | "ar";

export const SMS_BRAND_PREFIX = "Joblop:";

/**
 * The language a TEXT MESSAGE is written in. Every SMS template passes the person's language through
 * here first, so this is the one place the rule lives.
 *
 * Owner decision 2026-11-12: Arabic SMS cost 2–3x (UCS-2); Arabic readers get the French SMS. Emails
 * stay in Arabic. The Arabic SMS strings are kept in each template (unused) so this is easy to
 * reverse: return `language` unchanged to send Arabic texts again.
 */
export function smsLanguage<T extends SmsLanguage>(language: T): T {
  return (language === "ar" ? "fr" : language) as T;
}

export const SMS_OPT_OUT: Readonly<Record<SmsLanguage, string>> = {
  en: "Reply STOP to opt out.",
  fr: "Répondez STOP pour vous désabonner.",
  ar: "أرسل STOP لإيقاف الرسائل."
};

function gsmFriendly(text: string): string {
  return text
    .replace(/[\u00A0\u2009\u202F]/g, " ")
    .replace(/«\s*/g, '"')
    .replace(/\s*»/g, '"')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/(\w)\.\.(\s|$)/g, "$1.$2") // "8:00 a.m.." → "8:00 a.m."
    .replace(/ {2,}/g, " ")
    .trim();
}

/** A notice (job, reminder, change, cancellation, check-in, hours, plan, staff alert): prefix + opt-out. */
export function noticeSms(language: SmsLanguage, body: string): string {
  const text = `${SMS_BRAND_PREFIX} ${body.trim()} ${SMS_OPT_OUT[language]}`;
  return language === "ar" ? text.replace(/ {2,}/g, " ") : gsmFriendly(text);
}

/** A one-time sign-in or verification code: prefix only, no opt-out line. */
export function codeSms(body: string): string {
  return gsmFriendly(`${SMS_BRAND_PREFIX} ${body.trim()}`);
}

// The code and password-reset texts, in the person's language (prefix only, no opt-out line).
export function signInCodeSms(personLanguage: SmsLanguage, code: string, staff = false): string {
  const language = smsLanguage(personLanguage);
  if (language === "fr") return codeSms(`votre code de connexion${staff ? " (personnel)" : ""} est ${code}. Il expire dans 10 minutes. Ne le partagez jamais.`);
  if (language === "ar") return codeSms(`رمز الدخول${staff ? " للفريق" : ""} هو ${code}. ينتهي خلال 10 دقائق. لا تشاركه أبدًا.`);
  return codeSms(`your ${staff ? "staff " : ""}sign-in code is ${code}. It expires in 10 minutes. Never share it.`);
}

export function verificationCodeSms(personLanguage: SmsLanguage, code: string, minutes: number): string {
  const language = smsLanguage(personLanguage);
  if (language === "fr") return codeSms(`votre code est ${code}. Il expire dans ${minutes} min. Ne le partagez jamais.`);
  if (language === "ar") return codeSms(`رمزك هو ${code}. ينتهي خلال ${minutes} دقيقة. لا تشاركه أبدًا.`);
  return codeSms(`your code is ${code}. Expires in ${minutes} min. Never share it.`);
}

export function passwordResetSms(personLanguage: SmsLanguage, resetUrl: string, minutes: number): string {
  const language = smsLanguage(personLanguage);
  if (language === "fr") return codeSms(`réinitialisation du mot de passe (valide ${minutes} min): ${resetUrl}`);
  if (language === "ar") return codeSms(`إعادة تعيين كلمة المرور (صالح ${minutes} دقيقة): ${resetUrl}`);
  return codeSms(`password reset (valid ${minutes} min): ${resetUrl}`);
}

// GSM 03.38 basic alphabet and its extension table (extension characters count twice).
const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENSION = "^{}\\[~]|€";

/** How many SMS segments a text costs (GSM-7: 160 / 153 per part; UCS-2: 70 / 67 per part). */
export function smsSegmentCount(text: string): number {
  const chars = [...text];
  const gsm = chars.every((c) => GSM_BASIC.includes(c) || GSM_EXTENSION.includes(c));
  if (gsm) {
    const units = chars.reduce((n, c) => n + (GSM_EXTENSION.includes(c) ? 2 : 1), 0);
    return units <= 160 ? 1 : Math.ceil(units / 153);
  }
  return chars.length <= 70 ? 1 : Math.ceil(chars.length / 67);
}
