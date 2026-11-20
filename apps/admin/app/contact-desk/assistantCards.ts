// Action cards from the Joblop assistant inside Contact Joblop (Brain phase 2). The API stores a card
// as a message with authorKind "assistant_action" and the outcome as "assistant_result", both with a
// JSON body. These pure helpers read them and decide what the card shows. The token is only ever sent
// back on Confirm or Cancel; it is never shown.

export type AssistantCard = Readonly<{
  subject: string;
  startAt?: string | null;
  endAt?: string | null;
  timezone?: string | null;
  place?: string | null;
  details?: readonly string[];
  warning?: "late_cancel" | null;
}>;

export type AssistantAction = Readonly<{ proposalId: string; token: string; tool: string; card: AssistantCard; expiresAt: string }>;
export type AssistantResult = Readonly<{ proposalId: string | null; status: string; text: string }>;
export type CardState = "pending" | "done" | "failed" | "cancelled" | "expired";

type Msg = Readonly<{ authorKind: string; body: string }>;

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export function parseAssistantAction(body: string): AssistantAction | null {
  try {
    const raw = record(JSON.parse(body));
    const card = record(raw?.card);
    if (!raw || !card || typeof raw.proposalId !== "string" || typeof raw.token !== "string" || typeof raw.tool !== "string") return null;
    const details = Array.isArray(card.details) ? card.details.filter((d): d is string => typeof d === "string") : [];
    return {
      proposalId: raw.proposalId,
      token: raw.token,
      tool: raw.tool,
      expiresAt: typeof raw.expiresAt === "string" ? raw.expiresAt : "",
      card: {
        subject: typeof card.subject === "string" ? card.subject : "",
        startAt: typeof card.startAt === "string" ? card.startAt : null,
        endAt: typeof card.endAt === "string" ? card.endAt : null,
        timezone: typeof card.timezone === "string" ? card.timezone : null,
        place: typeof card.place === "string" ? card.place : null,
        details,
        warning: card.warning === "late_cancel" ? "late_cancel" : null
      }
    };
  } catch {
    return null;
  }
}

export function parseAssistantResult(body: string): AssistantResult | null {
  try {
    const raw = record(JSON.parse(body));
    if (!raw || typeof raw.status !== "string") return null;
    return { proposalId: typeof raw.proposalId === "string" ? raw.proposalId : null, status: raw.status, text: typeof raw.text === "string" ? raw.text : "" };
  } catch {
    return null;
  }
}

/** The result written for this card, if any. */
export function resultFor(proposalId: string, messages: readonly Msg[]): AssistantResult | null {
  for (const m of messages) {
    if (m.authorKind !== "assistant_result") continue;
    const result = parseAssistantResult(m.body);
    if (result?.proposalId === proposalId) return result;
  }
  return null;
}

/** pending (show Confirm / Cancel), done, failed, cancelled, or expired. */
export function cardState(action: AssistantAction, messages: readonly Msg[], now: Date = new Date()): CardState {
  const result = resultFor(action.proposalId, messages);
  if (result) return result.status === "done" ? "done" : result.status === "cancelled" ? "cancelled" : "failed";
  const expires = Date.parse(action.expiresAt);
  return Number.isNaN(expires) || expires <= now.getTime() ? "expired" : "pending";
}

/** "Thu, Nov 12, 8:00 a.m. – 2:00 p.m." in the page language and the card's time zone. */
export function cardWhen(card: AssistantCard, locale: string): string | null {
  if (!card.startAt) return null;
  const start = new Date(card.startAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = card.endAt ? new Date(card.endAt) : null;
  const zone = card.timezone ?? undefined;
  const format = (options: Intl.DateTimeFormatOptions, at: Date) => {
    try {
      return new Intl.DateTimeFormat(locale, { ...options, ...(zone ? { timeZone: zone } : {}) }).format(at);
    } catch {
      return new Intl.DateTimeFormat(locale, options).format(at);
    }
  };
  const day: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const time: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const first = `${format(day, start)}, ${format(time, start)}`;
  if (!end || Number.isNaN(end.getTime())) return first;
  const sameDay = format(day, start) === format(day, end);
  return `${first} – ${sameDay ? format(time, end) : `${format(day, end)}, ${format(time, end)}`}`;
}

/** A detail item: "workers:3" / "minutes:240" / "action:key", or a plain label. */
export function cardDetail(detail: string): Readonly<{ kind: "workers" | "minutes" | "action" | "text"; value: string }> {
  const match = /^(workers|minutes|action):(.*)$/.exec(detail);
  if (match) return { kind: match[1] as "workers" | "minutes" | "action", value: match[2] ?? "" };
  return { kind: "text", value: detail };
}
