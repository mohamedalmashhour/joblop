// Money and dates on staff screens, the same way for every staff member: CAD through the shared
// domain formatter in the admin's chosen language (Arabic uses en-CA, like the rest of the app), never
// the browser's locale (an en-US browser used to show "CA$16.60"). Dates are Québec time
// (America/Toronto) unless the record carries its own time zone.
import { formatRwosCurrency } from "@rwos/shared";
import { fmtLocale, type AdminLocale } from "./config";

export const ADMIN_TIME_ZONE = "America/Toronto";

export function adminMoney(minor: number, currency: string, locale: AdminLocale): string {
  return formatRwosCurrency(minor / 100, currency || "CAD", { locale: fmtLocale(locale) });
}

export function adminDateTime(
  iso: string | Date,
  locale: AdminLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(fmtLocale(locale), { timeZone: ADMIN_TIME_ZONE, ...options });
}
