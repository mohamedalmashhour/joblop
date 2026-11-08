// Calendar hub (employer): pure helpers shared by the "My calendar" page and its tests.
// Shape follows the shared calendar-hub contract (GET /employer/calendar-hub).
import type { MessageKey } from "../../i18n/messages";

export type HubBonus = Readonly<{ kind: "hourly" | "transport" | "one_time"; amountMinor: number }>;

export type HubItem = Readonly<{
  id: string;
  type: string;
  startAt: string;
  endAt: string | null;
  title: string;
  subtitle: string | null;
  status: string | null;
  amountMinor: number | null;
  bonus: HubBonus | null;
  placesLeft: number | null;
  placesAsked: number | null;
  placesTaken: number | null;
  jobRequestId: string | null;
  refId: string | null;
}>;

export type HubSeverity = "info" | "attention" | "urgent";

export type HubTodayItem = Readonly<{
  type: string;
  title: string;
  detail: string | null;
  severity: HubSeverity;
  startAt: string | null;
  jobRequestId: string | null;
  refId: string | null;
}>;

export type HubPayload = Readonly<{ items: readonly HubItem[]; today: readonly HubTodayItem[] }>;

export type HubLayer = "jobs" | "bonus" | "invoices" | "cancelled";
export const hubLayers: readonly HubLayer[] = ["jobs", "bonus", "invoices", "cancelled"];

// Shared brand colours (no blue or teal anywhere).
export const hubColors = {
  gold: "#f8b808",
  green: "#3ddc84",
  red: "#e4756b",
  cream: "#f4efe4",
  grey: "#8f8574"
} as const;

export type HubTone = "review" | "open" | "partly" | "full" | "cancelled" | "bonus" | "invoice";

export const toneColor: Readonly<Record<HubTone, string>> = {
  review: hubColors.grey,
  open: hubColors.red,
  partly: hubColors.gold,
  full: hubColors.green,
  cancelled: hubColors.red,
  bonus: hubColors.gold,
  invoice: hubColors.cream
};

export const toneLabelKey: Readonly<Record<HubTone, MessageKey>> = {
  review: "hub.legend.review",
  open: "hub.legend.open",
  partly: "hub.legend.partly",
  full: "hub.legend.full",
  cancelled: "hub.legend.cancelled",
  bonus: "hub.legend.bonus",
  invoice: "hub.legend.invoice"
};

const reviewStatuses = new Set(["draft", "submitted", "under_review", "information_required", "pending_review"]);
const fullStatuses = new Set(["full", "assigned", "in_progress", "completed", "filled", "confirmed"]);
const cancelledStatuses = new Set(["cancelled", "canceled", "withdrawn", "rejected"]);

export function isCancelled(item: HubItem): boolean {
  return item.type === "cancelled_job" || cancelledStatuses.has(item.status ?? "");
}

export function layerOf(item: HubItem): HubLayer {
  if (item.type === "bonus_offer") return "bonus";
  if (item.type === "invoice_due") return "invoices";
  if (isCancelled(item)) return "cancelled";
  return "jobs";
}

export function toneOf(item: HubItem): HubTone {
  if (item.type === "bonus_offer") return "bonus";
  if (item.type === "invoice_due") return "invoice";
  if (isCancelled(item)) return "cancelled";
  const status = item.status ?? "";
  if (reviewStatuses.has(status)) return "review";
  if (status === "partly_filled") return "partly";
  if (fullStatuses.has(status)) return "full";
  if (status === "open" || status === "published") {
    // Coverage from the places counts wins when the server sends them.
    if (item.placesAsked && item.placesTaken && item.placesTaken >= item.placesAsked) return "full";
    if (item.placesTaken && item.placesTaken > 0) return "partly";
    return "open";
  }
  return "review";
}

export const requestHref = (jobRequestId: string) =>
  `/employer/calendar/request?request=${encodeURIComponent(jobRequestId)}`;
export const invoiceHref = (invoiceId: string) =>
  `/employer/invoices/detail?invoice=${encodeURIComponent(invoiceId)}`;

/** Where a card (or a Today line) takes the employer. */
export function hrefFor(entry: Readonly<{ type: string; jobRequestId: string | null; refId: string | null }>): string | null {
  if (entry.type === "invoice_due" || entry.type === "invoice") return entry.refId ? invoiceHref(entry.refId) : null;
  return entry.jobRequestId ? requestHref(entry.jobRequestId) : null;
}

export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Monday-first 6-row-or-less grid covering the month. */
export function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const tail = 6 - ((last.getDay() + 6) % 7);
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + tail);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(d);
  }
  return days;
}

/** The from/to window to ask the server for (the whole visible grid, end exclusive). */
export function gridRange(month: Date): { from: string; to: string } {
  const days = monthGrid(month);
  const first = days[0] ?? month;
  const last = days[days.length - 1] ?? month;
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  return { from: first.toISOString(), to: end.toISOString() };
}

export function groupByDay(items: readonly HubItem[]): Map<string, HubItem[]> {
  const map = new Map<string, HubItem[]>();
  for (const item of items) {
    const at = new Date(item.startAt);
    if (Number.isNaN(at.getTime())) continue;
    const key = dayKey(at);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return map;
}

const str = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);
const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

function parseBonus(value: unknown): HubBonus | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const kind = record.kind;
  const amountMinor = num(record.amountMinor);
  if ((kind === "hourly" || kind === "transport" || kind === "one_time") && amountMinor !== null) {
    return { kind, amountMinor };
  }
  return null;
}

function parseItem(value: unknown): HubItem | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  const id = str(r.id);
  const type = str(r.type);
  const startAt = str(r.startAt);
  if (!id || !type || !startAt || Number.isNaN(new Date(startAt).getTime())) return null;
  return {
    id,
    type,
    startAt,
    endAt: str(r.endAt),
    title: str(r.title) ?? "",
    subtitle: str(r.subtitle),
    status: str(r.status),
    amountMinor: num(r.amountMinor),
    bonus: parseBonus(r.bonus),
    placesLeft: num(r.placesLeft),
    placesAsked: num(r.placesAsked),
    placesTaken: num(r.placesTaken),
    jobRequestId: str(r.jobRequestId),
    refId: str(r.refId)
  };
}

function parseToday(value: unknown): HubTodayItem | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  const title = str(r.title);
  if (!title) return null;
  const severity: HubSeverity = r.severity === "urgent" || r.severity === "attention" ? r.severity : "info";
  return {
    type: str(r.type) ?? "",
    title,
    detail: str(r.detail),
    severity,
    startAt: str(r.startAt),
    jobRequestId: str(r.jobRequestId),
    refId: str(r.refId)
  };
}

export function parseHubPayload(input: unknown): HubPayload | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  if (!Array.isArray(record.items)) return null;
  const items = record.items.map(parseItem).filter((item): item is HubItem => item !== null);
  const today = Array.isArray(record.today)
    ? record.today.map(parseToday).filter((item): item is HubTodayItem => item !== null)
    : [];
  return { items, today };
}
