// Shift conditions an employer can state on a request: unpaid break, dress code, equipment to bring,
// arrival instructions and notes for workers. Shared so the API, the employer form, the worker shift
// page and the phone app use the same limits and the same words (EN / FR / AR).

export const SHIFT_CONDITION_LIMITS = {
  breakMinutesMax: 240,
  dressCode: 120,
  equipmentToBring: 300,
  arrivalInstructions: 500,
  workerNotes: 500
} as const;

/** Dress-code choices the employer form offers; any other value is the employer's own short text. */
export const DRESS_CODE_PRESETS = ["casual", "closed_shoes", "uniform_provided", "safety_boots", "business_casual"] as const;
export type DressCodePreset = (typeof DRESS_CODE_PRESETS)[number];

export type ShiftConditionsLanguage = "en" | "fr" | "ar";

export type ShiftConditionsView = Readonly<{
  /** null = not stated; 0 = no break; otherwise the unpaid break in minutes. */
  breakMinutes: number | null;
  dressCode: string | null;
  equipmentToBring: string | null;
  arrivalInstructions: string | null;
  workerNotes: string | null;
}>;

const DRESS_LABELS: Record<DressCodePreset, Record<ShiftConditionsLanguage, string>> = {
  casual: { en: "Casual clothes", fr: "Tenue décontractée", ar: "ملابس عادية" },
  closed_shoes: { en: "Closed shoes", fr: "Chaussures fermées", ar: "حذاء مغلق" },
  uniform_provided: { en: "Uniform provided", fr: "Uniforme fourni", ar: "الزي الموحّد مُقدَّم" },
  safety_boots: { en: "Safety boots", fr: "Bottes de sécurité", ar: "حذاء أمان" },
  business_casual: { en: "Business casual", fr: "Tenue de ville", ar: "لباس عملي أنيق" }
};

export function isDressCodePreset(value: string): value is DressCodePreset {
  return (DRESS_CODE_PRESETS as readonly string[]).includes(value);
}

/** A dress-code value in words: a preset in the reader's language, otherwise the employer's own text. */
export function dressCodeLabel(value: string, language: ShiftConditionsLanguage): string {
  return isDressCodePreset(value) ? DRESS_LABELS[value][language] : value;
}

/** The break in words ("30 min unpaid" / "No break"); null when not stated. */
export function breakRuleLabel(breakMinutes: number | null, language: ShiftConditionsLanguage): string | null {
  if (breakMinutes === null) return null;
  if (breakMinutes === 0) return { en: "No break", fr: "Pas de pause", ar: "لا توجد استراحة" }[language];
  return { en: `${breakMinutes} min unpaid break`, fr: `Pause non payée de ${breakMinutes} min`, ar: `استراحة غير مدفوعة ${breakMinutes} دقيقة` }[language];
}

/** The labels of the "Before you go" lines (worker page, phone app, email). */
export const BEFORE_YOU_GO_LABELS: Record<
  ShiftConditionsLanguage,
  Readonly<{ title: string; breakRule: string; dressCode: string; equipment: string; arrival: string; notes: string; breakInfo: string }>
> = {
  en: { title: "Before you go", breakRule: "Break", dressCode: "Dress code", equipment: "Bring", arrival: "When you arrive", notes: "Notes from the employer", breakInfo: "Your hours are counted from check-in to check-out." },
  fr: { title: "Avant de partir", breakRule: "Pause", dressCode: "Tenue", equipment: "À apporter", arrival: "À votre arrivée", notes: "Notes de l'employeur", breakInfo: "Vos heures sont comptées de l'arrivée au départ." },
  ar: { title: "قبل أن تذهب", breakRule: "الاستراحة", dressCode: "اللباس", equipment: "أحضر معك", arrival: "عند وصولك", notes: "ملاحظات صاحب العمل", breakInfo: "تُحسب ساعاتك من تسجيل الوصول إلى تسجيل المغادرة." }
};

/** True when at least one condition is stated. */
export function hasShiftConditions(c: ShiftConditionsView | null | undefined): c is ShiftConditionsView {
  return !!c && Object.values(c).some((value) => value !== null && value !== undefined);
}
