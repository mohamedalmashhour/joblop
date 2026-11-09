// Pure, UI-free helpers + copy for the open-shift marketplace screens. Kept side-effect free so the
// formatting and disclosure rules are unit-tested without React Native.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "Mon, Jun 1 · 08:00–16:00" from two ISO instants. Falls back gracefully on unparseable input. */
export function formatShiftWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Scheduled time to be confirmed";
  const day = `${DAYS[start.getUTCDay()]}, ${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const from = `${pad(start.getUTCHours())}:${pad(start.getUTCMinutes())}`;
  const to = `${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`;
  return `${day} · ${from}–${to}`;
}

// When a short-term job's hourly pay is not set yet: a clear line (same words as the website), never
// blank and never $0.
const PAY_PENDING: Record<Locale, string> = {
  en: "Hourly pay: confirmed before you're offered the shift",
  fr: "Salaire horaire : confirmé avant qu'on vous offre le quart",
  ar: "الأجر بالساعة: يُؤكَّد قبل أن تُعرض عليك المناوبة"
};

/** The worker's own hourly pay, or a clear line when it is not set yet. */
export function formatWorkerRate(workerRateMinor: number | null, currency: string, locale: Locale = "en"): string {
  if (workerRateMinor === null || !Number.isFinite(workerRateMinor) || workerRateMinor <= 0) return PAY_PENDING[locale] ?? PAY_PENDING.en;
  return `${(workerRateMinor / 100).toFixed(2)} ${currency}/h`;
}

// Long-term listing (employer plans flag): no Joblop rate — the pay the employer offers and pays
// directly. `undefined` = not a long-term job; null = long-term without a stated amount.
const PAID_BY_EMPLOYER: Record<Locale, Readonly<{ paid: string; noAmount: string }>> = {
  en: { paid: "paid directly by the employer", noAmount: "Pay set and paid directly by the employer" },
  fr: { paid: "payé directement par l'employeur", noAmount: "Salaire fixé et payé directement par l'employeur" },
  ar: { paid: "يدفعه صاحب العمل مباشرة", noAmount: "يحدد صاحب العمل الأجر ويدفعه مباشرة" }
};

export function payOfferedText(payOffered: PayOfferedView | null | undefined, locale: Locale): string | null {
  if (payOffered === undefined) return null;
  const copy = PAID_BY_EMPLOYER[locale] ?? PAID_BY_EMPLOYER.en;
  return payOffered ? `${formatPayOffered(payOffered, locale === "fr" ? "fr-CA" : "en-CA")} · ${copy.paid}` : copy.noAmount;
}

/** The pay line of a marketplace job: the employer's pay offer for a long-term job, else the rate. */
export function formatJobPay(
  job: Readonly<{ workerRateMinor: number | null; currency: string; payOffered?: PayOfferedView | null }>,
  locale: Locale
): string {
  return payOfferedText(job.payOffered, locale) ?? formatWorkerRate(job.workerRateMinor, job.currency, locale);
}

export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null) return "";
  return distanceKm < 1 ? "Less than 1 km away" : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`;
}

export function formatOpenings(openings: number): string {
  return openings === 1 ? "1 opening" : `${openings} openings`;
}

import type { Locale } from "../../i18n/strings";
import { formatPayOffered, type PayOfferedView } from "@rwos/shared";

export type MarketplaceCopy = Readonly<{
  title: string;
  intro: string;
  postalLabel: string;
  postalPlaceholder: string;
  searchCta: string;
  verifiedOn: string;
  verifiedOff: string;
  signInRequired: string;
  invalidLocation: string;
  unavailable: string;
  loadError: string;
  emptyResults: string;
  applyCta: string;
  applied: string;
  alreadyApplied: string;
  applyIneligible: string;
  applyError: string;
  notFound: string;
}>;

const en: MarketplaceCopy = {
  title: "Open shifts",
  intro: "Browse open postings from JobLop employers near you. Applying registers your interest — it does not guarantee an assignment.",
  postalLabel: "Your postal code",
  postalPlaceholder: "e.g. H2X 1Y4",
  searchCta: "Search nearby shifts",
  verifiedOn: "Verified employers only: On",
  verifiedOff: "Verified employers only: Off",
  signInRequired: "Sign in to browse and apply to open shifts.",
  invalidLocation: "That location could not be resolved. Check the postal code and try again.",
  unavailable: "The marketplace is not available right now.",
  loadError: "Open shifts could not be loaded right now.",
  emptyResults: "No open shifts match your search right now.",
  applyCta: "Express interest",
  applied: "Interest submitted — the employer's team will review it.",
  alreadyApplied: "You've already expressed interest in this shift.",
  applyIneligible: "You can't express interest in this shift right now.",
  applyError: "Your interest could not be submitted right now.",
  notFound: "This shift is no longer available."
};

const fr: MarketplaceCopy = {
  title: "Quarts ouverts",
  intro: "Parcourez les offres ouvertes d'employeurs JobLop près de chez vous. Postuler enregistre votre intérêt — cela ne garantit pas une affectation.",
  postalLabel: "Votre code postal",
  postalPlaceholder: "ex. H2X 1Y4",
  searchCta: "Chercher des quarts à proximité",
  verifiedOn: "Employeurs vérifiés seulement : activé",
  verifiedOff: "Employeurs vérifiés seulement : désactivé",
  signInRequired: "Connectez-vous pour parcourir et postuler aux quarts ouverts.",
  invalidLocation: "Ce lieu n'a pas pu être localisé. Vérifiez le code postal et réessayez.",
  unavailable: "La place de marché n'est pas disponible pour le moment.",
  loadError: "Les quarts ouverts n'ont pas pu être chargés.",
  emptyResults: "Aucun quart ouvert ne correspond à votre recherche.",
  applyCta: "Manifester mon intérêt",
  applied: "Intérêt envoyé — l'équipe de l'employeur l'examinera.",
  alreadyApplied: "Vous avez déjà manifesté votre intérêt pour ce quart.",
  applyIneligible: "Vous ne pouvez pas manifester d'intérêt pour ce quart actuellement.",
  applyError: "Votre intérêt n'a pas pu être envoyé.",
  notFound: "Ce quart n'est plus disponible."
};

const ar: MarketplaceCopy = {
  title: "فرص العمل المتاحة",
  intro: "تصفّح فرص العمل المتاحة من أصحاب العمل في JobLop القريبين منك. التقديم يسجّل اهتمامك — ولا يضمن التعيين.",
  postalLabel: "رمزك البريدي",
  postalPlaceholder: "مثال: H2X 1Y4",
  searchCta: "ابحث عن فرص عمل قريبة",
  verifiedOn: "أصحاب العمل المُوثّقون فقط: مُفعّل",
  verifiedOff: "أصحاب العمل المُوثّقون فقط: مُعطّل",
  signInRequired: "سجّل الدخول لتصفّح فرص العمل والتقديم عليها.",
  invalidLocation: "تعذّر تحديد هذا الموقع. تحقّق من الرمز البريدي وحاول مجددًا.",
  unavailable: "السوق غير متاح حاليًا.",
  loadError: "تعذّر تحميل فرص العمل الآن.",
  emptyResults: "لا توجد فرص عمل تطابق بحثك حاليًا.",
  applyCta: "إبداء الاهتمام",
  applied: "تم إرسال اهتمامك — سيراجعه فريق صاحب العمل.",
  alreadyApplied: "لقد أبديت اهتمامك بهذه الفرصة مسبقًا.",
  applyIneligible: "لا يمكنك إبداء الاهتمام بهذه الفرصة حاليًا.",
  applyError: "تعذّر إرسال اهتمامك الآن.",
  notFound: "لم تعد هذه الفرصة متاحة."
};

const BY_LOCALE: Record<Locale, MarketplaceCopy> = { en, fr, ar };

/** Marketplace copy for a locale (falls back to English). */
export function marketplaceCopyFor(locale: Locale): MarketplaceCopy {
  return BY_LOCALE[locale] ?? en;
}

/** English copy, kept for any non-localized caller / tests. */
export const marketplaceCopy = en;
