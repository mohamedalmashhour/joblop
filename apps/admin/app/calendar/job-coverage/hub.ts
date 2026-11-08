// Staff calendar hub: the shape of GET /api/calendar-hub (forwarded to /platform/calendar-hub)
// plus the shared colours, symbols and detail links. Jobs come from the coverage feed (it carries
// the bonus record and suggestion the bonus actions need); the hub adds the other item types and
// the "Today" list.

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

export type Severity = "info" | "attention" | "urgent";

export type TodayItem = Readonly<{
  type: string;
  title: string;
  detail: string | null;
  severity: Severity;
  startAt: string | null;
  jobRequestId: string | null;
  refId: string | null;
}>;

export type HubPayload = Readonly<{ items: readonly HubItem[]; today: readonly TodayItem[] }>;

// Item types the hub adds on top of the coverage jobs.
export type ExtraType = "cancellation" | "dispute" | "payout" | "pay_run";
export const EXTRA_TYPES: readonly ExtraType[] = ["cancellation", "dispute", "payout", "pay_run"];

export function isExtraType(type: string): type is ExtraType {
  return (EXTRA_TYPES as readonly string[]).includes(type);
}

// Filter chips (layers). Jobs are shown when any job layer that matches them is on.
export type Layer = "jobs" | "needsWorkers" | "bonuses" | "cancellations" | "disputes" | "pay";
export const LAYERS: readonly Layer[] = ["jobs", "needsWorkers", "bonuses", "cancellations", "disputes", "pay"];

export function layerForType(type: ExtraType): Layer {
  if (type === "cancellation") return "cancellations";
  if (type === "dispute") return "disputes";
  return "pay";
}

// Shared brand colours (no blue or teal anywhere).
export const GOLD = "#f8b808";
export const GREEN = "#3ddc84";
export const RED = "#e4756b";
export const CREAM = "#f4efe4";
export const GREY = "#8f8574";

export const EXTRA_STYLE: Readonly<Record<ExtraType, { bg: string; fg: string; border: string; symbol: string; strike: boolean }>> = {
  cancellation: { bg: RED, fg: "#000000", border: RED, symbol: "✕", strike: true },
  dispute: { bg: "#000000", fg: RED, border: RED, symbol: "!", strike: false },
  payout: { bg: CREAM, fg: "#000000", border: CREAM, symbol: "$", strike: false },
  pay_run: { bg: CREAM, fg: "#000000", border: CREAM, symbol: "$", strike: false }
};

export const SEVERITY_STYLE: Readonly<Record<Severity, { bg: string; fg: string }>> = {
  urgent: { bg: RED, fg: "#000000" },
  attention: { bg: GOLD, fg: "#000000" },
  info: { bg: CREAM, fg: "#000000" }
};

export const SEVERITY_ORDER: Readonly<Record<Severity, number>> = { urgent: 0, attention: 1, info: 2 };

export function jobHref(jobRequestId: string): string {
  return `/calendar/request?request=${encodeURIComponent(jobRequestId)}`;
}

// Where a card or Today item leads. Disputes, payouts and pay runs open their staff lists;
// anything tied to a job (cancellations, needs-workers, bonus offers) opens the job.
export function detailHref(type: string, jobRequestId: string | null): string | null {
  const kind = type.toLowerCase();
  if (kind.includes("dispute")) return "/disputes";
  if (kind.includes("pay_run") || kind.includes("payroll")) return "/payroll";
  if (kind.includes("payout")) return "/payouts";
  if (jobRequestId) return jobHref(jobRequestId);
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asSeverity(value: unknown): Severity {
  return value === "urgent" || value === "attention" ? value : "info";
}

// Defensive parse: the feed is new, so drop anything malformed instead of breaking the page.
export function parseHubPayload(payload: unknown): HubPayload {
  const body = (payload ?? {}) as { items?: unknown; today?: unknown };
  const items: HubItem[] = [];
  for (const raw of Array.isArray(body.items) ? body.items : []) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const id = asString(item.id);
    const type = asString(item.type);
    const startAt = asString(item.startAt);
    if (!id || !type || !startAt || Number.isNaN(Date.parse(startAt))) continue;
    const bonus = (item.bonus ?? null) as { kind?: unknown; amountMinor?: unknown } | null;
    items.push({
      id,
      type,
      startAt,
      endAt: asString(item.endAt),
      title: asString(item.title) ?? "",
      subtitle: asString(item.subtitle),
      status: asString(item.status),
      amountMinor: asNumber(item.amountMinor),
      bonus:
        bonus && (bonus.kind === "hourly" || bonus.kind === "transport" || bonus.kind === "one_time") && asNumber(bonus.amountMinor) !== null
          ? { kind: bonus.kind, amountMinor: bonus.amountMinor as number }
          : null,
      placesLeft: asNumber(item.placesLeft),
      placesAsked: asNumber(item.placesAsked),
      placesTaken: asNumber(item.placesTaken),
      jobRequestId: asString(item.jobRequestId),
      refId: asString(item.refId)
    });
  }
  const today: TodayItem[] = [];
  for (const raw of Array.isArray(body.today) ? body.today : []) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const title = asString(item.title);
    if (!title) continue;
    today.push({
      type: asString(item.type) ?? "",
      title,
      detail: asString(item.detail),
      severity: asSeverity(item.severity),
      startAt: asString(item.startAt),
      jobRequestId: asString(item.jobRequestId),
      refId: asString(item.refId)
    });
  }
  today.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { items, today };
}
