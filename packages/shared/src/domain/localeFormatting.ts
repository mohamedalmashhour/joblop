export const supportedRwosLocales = ["en-CA"] as const;
export type RwosLocale = (typeof supportedRwosLocales)[number];
export const defaultRwosLocale: RwosLocale = "en-CA";
export const invalidFormatFallback = "Unavailable";

export function resolveRwosLocale(value?: string | null): RwosLocale {
  return supportedRwosLocales.includes(value as RwosLocale)
    ? (value as RwosLocale)
    : defaultRwosLocale;
}

export function formatRwosDateTime(
  value: string | number | Date,
  options: Readonly<{
    timeZone: string;
    locale?: string | null;
    dateStyle?: "full" | "long" | "medium" | "short";
    timeStyle?: "full" | "long" | "medium" | "short";
    timeZoneName?: "long" | "short" | "shortOffset" | "longOffset";
    weekday?: "long" | "short" | "narrow";
    year?: "numeric" | "2-digit";
    month?: "long" | "short" | "narrow" | "numeric" | "2-digit";
    day?: "numeric" | "2-digit";
    hour?: "numeric" | "2-digit";
    minute?: "numeric" | "2-digit";
    fallback?: string;
  }>
) {
  const fallback = options.fallback ?? invalidFormatFallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return fallback;
  try {
    return new Intl.DateTimeFormat(resolveRwosLocale(options.locale), {
      ...(options.dateStyle ? { dateStyle: options.dateStyle } : {}),
      ...(options.timeStyle ? { timeStyle: options.timeStyle } : {}),
      ...(options.timeZoneName ? { timeZoneName: options.timeZoneName } : {}),
      ...(options.weekday ? { weekday: options.weekday } : {}),
      ...(options.year ? { year: options.year } : {}),
      ...(options.month ? { month: options.month } : {}),
      ...(options.day ? { day: options.day } : {}),
      ...(options.hour ? { hour: options.hour } : {}),
      ...(options.minute ? { minute: options.minute } : {}),
      timeZone: options.timeZone
    }).format(date);
  } catch {
    return fallback;
  }
}

export function formatRwosDateTimeRange(
  start: string | number | Date,
  end: string | number | Date,
  options: Readonly<{
    timeZone: string;
    locale?: string | null;
    dateStyle?: "full" | "long" | "medium" | "short";
    timeStyle?: "full" | "long" | "medium" | "short";
    separator?: string;
    fallback?: string;
  }>
) {
  const fallback = options.fallback ?? invalidFormatFallback;
  const startValue = formatRwosDateTime(start, { ...options, fallback });
  const endValue = formatRwosDateTime(end, { ...options, fallback });
  if (startValue === fallback || endValue === fallback) return fallback;
  return `${startValue}${options.separator ?? "–"}${endValue}`;
}

export function formatRwosNumber(
  value: number,
  options: Readonly<{
    locale?: string | null;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    fallback?: string;
  }> = {}
) {
  const fallback = options.fallback ?? invalidFormatFallback;
  if (!Number.isFinite(value)) return fallback;
  try {
    return new Intl.NumberFormat(resolveRwosLocale(options.locale), {
      ...(options.minimumFractionDigits === undefined
        ? {}
        : { minimumFractionDigits: options.minimumFractionDigits }),
      ...(options.maximumFractionDigits === undefined
        ? {}
        : { maximumFractionDigits: options.maximumFractionDigits })
    }).format(value);
  } catch {
    return fallback;
  }
}

export function formatRwosCurrency(
  value: number,
  currency: string,
  options: Readonly<{ locale?: string | null; fallback?: string }> = {}
) {
  const fallback = options.fallback ?? invalidFormatFallback;
  if (!Number.isFinite(value) || !/^[A-Z]{3}$/.test(currency)) return fallback;
  try {
    return new Intl.NumberFormat(resolveRwosLocale(options.locale), {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return fallback;
  }
}
