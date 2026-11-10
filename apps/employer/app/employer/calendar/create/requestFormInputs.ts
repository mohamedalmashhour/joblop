// Pure helpers behind the Request workers form: the date + time pickers, dollar amounts and the
// price box. The form keeps start/end as local "YYYY-MM-DDTHH:MM" strings (the same shape the old
// datetime-local field produced), so recurring shifts and hour counts keep working unchanged.
import { quebecSalesTax, type QuebecSalesTax } from "@rwos/shared";

/** A single shift longer than this many hours is probably a wrong end time. */
export const LONG_SHIFT_WARNING_HOURS = 16;
/** Default length of a new shift (the 6-hour minimum). */
export const DEFAULT_SHIFT_HOURS = 6;

const pad = (value: number) => String(value).padStart(2, "0");

/** Every 15 minutes of the day, "00:00" … "23:45". */
export const TIME_OPTIONS: readonly string[] = Array.from({ length: 96 }, (_, index) =>
  `${pad(Math.floor(index / 4))}:${pad((index % 4) * 15)}`
);

/** "14:30" → "2:30 PM" (en) or "14 h 30" (fr / ar use the 24-hour clock). */
export function timeOptionLabel(value: string, locale: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  if (hours === undefined || minutes === undefined) return value;
  if (locale.startsWith("fr")) return `${hours} h ${pad(minutes)}`;
  if (locale.startsWith("en")) {
    const suffix = hours < 12 ? "AM" : "PM";
    const twelve = hours % 12 === 0 ? 12 : hours % 12;
    return `${twelve}:${pad(minutes)} ${suffix}`;
  }
  return value;
}

/** Joins a date ("2026-11-12") and a time ("08:00") into a local "2026-11-12T08:00", or "" if either is missing. */
export function combineDateTime(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return "";
  return `${date}T${time}`;
}

/** Splits a local "YYYY-MM-DDTHH:MM" into its date and time parts. */
export function splitDateTime(local: string): { date: string; time: string } {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(local);
  return match ? { date: match[1] ?? "", time: match[2] ?? "" } : { date: "", time: "" };
}

/** Formats a Date as a local "YYYY-MM-DDTHH:MM" string (browser time zone). */
export function toLocalDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local "YYYY-MM-DDTHH:MM" → ISO timestamp, or null when it is not a valid date. */
export function localDateTimeToIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Adds hours to a local "YYYY-MM-DDTHH:MM" string (crosses midnight as needed). "" when invalid. */
export function addHoursLocal(local: string, hours: number): string {
  const date = new Date(local);
  if (!local || Number.isNaN(date.getTime())) return "";
  return toLocalDateTime(new Date(date.getTime() + hours * 60 * 60 * 1000));
}

/** A round default start: tomorrow at 8:00 AM. */
export function defaultStart(now: Date = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0, 0);
  return toLocalDateTime(start);
}

/** Snaps a time to the 15-minute grid (rounding down), so a stored 10:11 still shows in the list. */
export function snapToQuarterHour(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return "";
  const minutes = Math.floor(Number(match[2]) / 15) * 15;
  return `${match[1]}:${pad(minutes)}`;
}

/**
 * Dollars as typed ("20", "20.5", "$20.00", "20,50") → minor units (cents). Empty → null.
 * Returns NaN for anything that is not a non-negative amount with at most two decimals.
 */
export function dollarsToMinor(value: string): number | null {
  const cleaned = value.trim().replace(/^\$\s*/, "").replace(/\s*\$$/, "").replace(",", ".");
  if (cleaned === "") return null;
  const match = /^(\d{1,7})(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return Number.NaN;
  const whole = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0") || "0");
  return whole * 100 + cents;
}

/** Minor units → "20.00" for the dollar input (empty when there is no amount). */
export function minorToDollars(minor: number | null | undefined): string {
  if (minor === null || minor === undefined || !Number.isInteger(minor) || minor < 0) return "";
  return `${Math.floor(minor / 100)}.${pad(minor % 100)}`;
}

/** True when a "Cash allowance" row has no valid amount typed. */
export function allowanceAmountMissing(provision: string, amount: string): boolean {
  if (provision !== "allowance") return false;
  const minor = dollarsToMinor(amount);
  return minor === null || Number.isNaN(minor);
}

/** GST 5% and QST 9.975% on the estimated subtotal (display only; same rounding as invoices). */
export function estimateTaxLines(subtotalMinor: number): QuebecSalesTax {
  return quebecSalesTax(subtotalMinor);
}

/** True when one shift is longer than 16 hours (likely the wrong end day or time). */
export function isLongShift(hours: number): boolean {
  return Number.isFinite(hours) && hours > LONG_SHIFT_WARNING_HOURS;
}
