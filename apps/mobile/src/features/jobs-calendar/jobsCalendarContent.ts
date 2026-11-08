// Pure helpers for the worker's "My calendar" hub (open jobs, own shifts, cancelled shifts and
// pay days by day). UI-free and unit-tested.
import type { CalendarHubItem, ClaimOpenJobResult, OpenJob, OpenJobBonus } from "../../auth/secureSession";
import { buildMonthWeeks, isoDay } from "../calendar-month/monthGrid";

/** The request window covering every cell of the visible month grid (local midnight to midnight). */
export function gridWindow(year: number, month: number): { from: string; to: string } {
  const weeks = buildMonthWeeks(year, month);
  const first = weeks[0]![0]!.date;
  const lastWeek = weeks[weeks.length - 1]!;
  const last = lastWeek[lastWeek.length - 1]!.date;
  const from = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const to = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Bucket jobs by the local day they start on, each day sorted by start time. */
export function groupJobsByDay(jobs: readonly OpenJob[]): Map<string, OpenJob[]> {
  const byDay = new Map<string, OpenJob[]>();
  for (const job of jobs) {
    const key = isoDay(new Date(job.startAt));
    const list = byDay.get(key) ?? [];
    list.push(job);
    byDay.set(key, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  return byDay;
}

/** Local start–end time, e.g. "9:00 a.m. – 5:00 p.m." in the worker's language. */
export function formatJobTime(startAt: string, endAt: string, locale: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  try {
    const fmt = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  } catch {
    const hm = (d: Date) => `${d.getHours()}:${`${d.getMinutes()}`.padStart(2, "0")}`;
    return `${hm(start)} – ${hm(end)}`;
  }
}

/** Hourly pay from cents/hour, or null when the rate is not shared. */
export function formatHourlyRate(workerRateMinor: number | null, locale: string, perHour: string): string | null {
  if (workerRateMinor === null) return null;
  const amount = workerRateMinor / 100;
  try {
    return `${new Intl.NumberFormat(locale, { style: "currency", currency: "CAD", currencyDisplay: "narrowSymbol" }).format(amount)}${perHour}`;
  } catch {
    return `$${amount.toFixed(2)}${perHour}`;
  }
}

/** True when Joblop added a bonus to this job. */
export function hasBonus(job: OpenJob): boolean {
  return job.bonus !== undefined && job.bonus.amountMinor > 0;
}

/** The gold bonus badge text, e.g. "+ $2.50/h bonus". Templates use {amount}. */
export function bonusLabel(
  job: OpenJob,
  locale: string,
  templates: Readonly<{ hourly: string; transport: string; oneTime: string }>
): string | null {
  if (!hasBonus(job) || !job.bonus) return null;
  return formatBonus(job.bonus, locale, templates);
}

/** Bonus text for any bonus (null when there is none). Templates use {amount}. */
export function formatBonus(
  bonus: OpenJobBonus | null | undefined,
  locale: string,
  templates: Readonly<{ hourly: string; transport: string; oneTime: string }>
): string | null {
  if (!bonus || !(bonus.amountMinor > 0)) return null;
  const amount = formatMoney(bonus.amountMinor, locale);
  const template = bonus.kind === "hourly" ? templates.hourly : bonus.kind === "transport" ? templates.transport : templates.oneTime;
  return template.replace("{amount}", amount);
}

/** Cents → "$24.00" in the worker's language. */
export function formatMoney(amountMinor: number, locale: string): string {
  const value = amountMinor / 100;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "CAD", currencyDisplay: "narrowSymbol" }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

// The API sends "normal", "urgent" or "immediate"; only the last two are urgent.
export function isUrgent(job: OpenJob): boolean {
  return job.urgency === "urgent" || job.urgency === "immediate";
}

/** "N places left" with a singular form. Templates use {n}. */
export function placesLeftLabel(count: number, one: string, many: string): string {
  return count === 1 ? one : many.replace("{n}", String(count));
}

export type ClaimMessage = Readonly<{ tone: "success" | "warning" | "danger"; key: string; reasons: readonly string[] }>;

/** The message (translation key) shown after an Accept attempt. */
export function claimMessage(result: ClaimOpenJobResult): ClaimMessage {
  switch (result.status) {
    case "assigned":
      return { tone: "success", key: "jobs.msg.assigned", reasons: [] };
    case "full":
      return { tone: "warning", key: "jobs.msg.full", reasons: [] };
    case "not_open":
      return { tone: "warning", key: "jobs.msg.notOpen", reasons: [] };
    case "ineligible":
      return { tone: "warning", key: "jobs.msg.ineligible", reasons: result.reasons.map(humanizeReason) };
    case "denied":
      return { tone: "danger", key: "jobs.msg.denied", reasons: [] };
    case "offline":
      return { tone: "danger", key: "jobs.msg.offline", reasons: [] };
    default:
      return { tone: "danger", key: "jobs.msg.error", reasons: [] };
  }
}

/** "pay_channel_election_required" → "Pay channel election required". */
export function humanizeReason(reason: string): string {
  const text = reason.replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : reason;
}

// ---- Calendar hub ----------------------------------------------------------------------------

export type HubLayer = "available" | "shift" | "pay" | "cancelled";
export const HUB_LAYERS: readonly HubLayer[] = ["available", "shift", "pay", "cancelled"];

/** Which filter chip an item belongs to; null for item types this screen does not show. */
export function hubLayer(type: string): HubLayer | null {
  if (type === "available_job") return "available";
  if (type === "my_shift") return "shift";
  if (type === "pay_day") return "pay";
  if (type === "cancelled_shift") return "cancelled";
  return null;
}

/**
 * Bucket hub items by local start day, keeping only shown layers. Open jobs with no place left
 * are dropped (they can't be accepted). Each day is sorted by start time.
 */
export function groupHubByDay(
  items: readonly CalendarHubItem[],
  shown: Readonly<Record<HubLayer, boolean>>
): Map<string, CalendarHubItem[]> {
  const byDay = new Map<string, CalendarHubItem[]>();
  for (const item of items) {
    const layer = hubLayer(item.type);
    if (!layer || !shown[layer]) continue;
    if (layer === "available" && !((item.placesLeft ?? 0) > 0)) continue;
    const key = isoDay(new Date(item.startAt));
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  return byDay;
}

export type HubDaySummary = Readonly<{ available: number; bonus: boolean; shift: boolean; pay: boolean; cancelled: boolean }>;

/** What a day cell shows: gold count of open jobs, ★, green shift dot, "$" pay chip, red cancelled dot. */
export function summarizeHubDay(items: readonly CalendarHubItem[]): HubDaySummary {
  let available = 0;
  let bonus = false;
  let shift = false;
  let pay = false;
  let cancelled = false;
  for (const item of items) {
    const layer = hubLayer(item.type);
    if (layer === "available") {
      available += 1;
      if (item.bonus && item.bonus.amountMinor > 0) bonus = true;
    } else if (layer === "shift") shift = true;
    else if (layer === "pay") pay = true;
    else if (layer === "cancelled") cancelled = true;
  }
  return { available, bonus, shift, pay, cancelled };
}

/** Start–end time, or just the start time when the item has no end (e.g. a pay day). */
export function formatHubTime(startAt: string, endAt: string | null, locale: string): string {
  if (endAt) return formatJobTime(startAt, endAt, locale);
  const start = new Date(startAt);
  try {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(start);
  } catch {
    return `${start.getHours()}:${`${start.getMinutes()}`.padStart(2, "0")}`;
  }
}

/** Translation key for a status chip, falling back to the "other" key for unknown codes. */
export function hubStatusKey(layer: "shift" | "pay", status: string | null, known: readonly string[]): string {
  return status && known.includes(status) ? `hub.${layer}.${status}` : `hub.${layer}.other`;
}

export const SHIFT_STATUSES = ["pending_start", "checked_in", "checked_out", "completed", "missed", "exception"] as const;
export const PAY_STATUSES = ["scheduled", "sent", "paid", "held"] as const;
