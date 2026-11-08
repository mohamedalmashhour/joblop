import type { PrismaClient } from "@rwos/database";
import { resolveLanguage, type NotificationLanguage } from "./clientNotifications";
import { sendsPush } from "./noticeChannels";

// Push notifications to the Joblop phone app through Expo's push service. A worker's devices register
// their Expo push token (POST /worker/push-tokens); a notice is sent to every live token of the user.
// Best-effort like every other notice: it never throws into the caller, and a device that Expo says
// is no longer registered has its token revoked so it is not tried again.

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo accepts at most 100 messages per request.
export const EXPO_PUSH_BATCH = 100;

export type PushScreen = "calendar" | "contact" | "pay";
export type PushData = Readonly<{ screen: PushScreen; jobRequestId?: string; conversationId?: string }>;
export type PushMessage = Readonly<{ title: string; body: string; data: PushData }>;
// A message, or one built in each recipient's language (French by default, like the other worker notices).
export type PushContent = PushMessage | ((language: NotificationLanguage) => PushMessage);

export type PushSendResult = Readonly<{ sent: number; failed: number; revoked: number }>;

export interface PushSender {
  send(userIds: readonly string[], content: PushContent): Promise<PushSendResult>;
}

export type PushFetch = (
  input: string,
  init: Readonly<{ method: string; headers: Readonly<Record<string, string>>; body: string }>
) => Promise<Readonly<{ ok: boolean; status: number; json(): Promise<unknown> }>>;

const EXPO_TOKEN_PATTERN = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/;

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === "string" && value.length <= 256 && EXPO_TOKEN_PATTERN.test(value);
}

export const PUSH_PLATFORMS = ["ios", "android", "web"] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export function isPushPlatform(value: unknown): value is PushPlatform {
  return typeof value === "string" && (PUSH_PLATFORMS as readonly string[]).includes(value);
}

export const NO_PUSH: PushSendResult = { sent: 0, failed: 0, revoked: 0 };

export const noopPushSender: PushSender = {
  async send() {
    return NO_PUSH;
  }
};

export type ExpoPushMessage = Readonly<{
  to: string;
  title: string;
  body: string;
  data: PushData;
  sound: "default";
  priority: "high";
}>;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Expo returns one ticket per message, in order. Returns the tokens Expo says are gone for good.
export function deviceNotRegisteredTokens(batch: readonly ExpoPushMessage[], response: unknown): { ok: number; failed: number; gone: string[] } {
  const data = response && typeof response === "object" ? (response as { data?: unknown }).data : undefined;
  if (!Array.isArray(data)) return { ok: 0, failed: batch.length, gone: [] };
  let ok = 0;
  let failed = 0;
  const gone: string[] = [];
  batch.forEach((message, index) => {
    const ticket = data[index] as { status?: unknown; details?: { error?: unknown } } | undefined;
    if (ticket?.status === "ok") {
      ok += 1;
      return;
    }
    failed += 1;
    if (ticket?.details?.error === "DeviceNotRegistered") gone.push(message.to);
  });
  return { ok, failed, gone };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("RWOS_PUSH_TIMEOUT")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function createPushSender(deps: {
  prisma: PrismaClient;
  accessToken?: string | undefined;
  fetch?: PushFetch;
  now?: () => Date;
  timeoutMs?: number;
}): PushSender {
  const doFetch: PushFetch = deps.fetch ?? (fetch as unknown as PushFetch);
  const now = deps.now ?? (() => new Date());
  // A slow push service must never hold up the request that triggered the notice.
  const timeoutMs = deps.timeoutMs ?? 5_000;
  const headers: Record<string, string> = {
    accept: "application/json",
    "accept-encoding": "gzip, deflate",
    "content-type": "application/json",
    ...(deps.accessToken ? { authorization: `Bearer ${deps.accessToken}` } : {})
  };

  return {
    async send(userIds, content) {
      try {
        const ids = [...new Set(userIds.filter((id) => typeof id === "string" && id.length > 0))];
        if (ids.length === 0) return NO_PUSH;
        const tokens = await deps.prisma.pushToken.findMany({
          where: { userId: { in: ids }, revokedAt: null },
          select: { token: true, user: { select: { primaryLanguage: true } } }
        });
        if (tokens.length === 0) return NO_PUSH;
        const messages: ExpoPushMessage[] = tokens.map((row) => {
          const message = typeof content === "function" ? content(resolveLanguage(row.user.primaryLanguage)) : content;
          return { to: row.token, title: message.title, body: message.body, data: message.data, sound: "default", priority: "high" };
        });
        let sent = 0;
        let failed = 0;
        let revoked = 0;
        for (const batch of chunk(messages, EXPO_PUSH_BATCH)) {
          try {
            const response = await withTimeout(doFetch(EXPO_PUSH_URL, { method: "POST", headers, body: JSON.stringify(batch) }), timeoutMs);
            if (!response.ok) {
              failed += batch.length;
              continue;
            }
            const result = deviceNotRegisteredTokens(batch, await response.json().catch(() => null));
            sent += result.ok;
            failed += result.failed;
            if (result.gone.length > 0) {
              const update = await deps.prisma.pushToken
                .updateMany({ where: { token: { in: result.gone }, revokedAt: null }, data: { revokedAt: now() } })
                .catch(() => ({ count: 0 }));
              revoked += update.count;
            }
          } catch {
            failed += batch.length;
          }
        }
        return { sent, failed, revoked };
      } catch {
        return NO_PUSH;
      }
    }
  };
}

// ── Worker push copy ────────────────────────────────────────────────────────────────────────────
// Short on purpose: a lock-screen line. Names the role at most, never the address or pay.

export type WorkerPushKind = "shift_confirmed" | "shift_reminder" | "shift_cancelled" | "shift_changed" | "staff_replied" | "payout_paid";

export function workerPushMessage(
  kind: WorkerPushKind,
  language: NotificationLanguage,
  params: Readonly<{ role?: string | null; jobRequestId?: string | null; conversationId?: string | null }> = {}
): PushMessage {
  const en = language === "en";
  const role = params.role?.trim().slice(0, 60) || null;
  const job = params.jobRequestId ? { jobRequestId: params.jobRequestId } : {};
  switch (kind) {
    case "shift_confirmed":
      return {
        title: en ? "You got the job" : "Vous avez obtenu le travail",
        body: role ? (en ? `${role} — see it in your calendar.` : `${role} — voyez-le dans votre calendrier.`) : en ? "See it in your calendar." : "Voyez-le dans votre calendrier.",
        data: { screen: "calendar", ...job }
      };
    case "shift_reminder":
      return {
        title: en ? "Shift tomorrow" : "Quart demain",
        body: role ? (en ? `Reminder: ${role}. Details in your calendar.` : `Rappel : ${role}. Détails dans votre calendrier.`) : en ? "Reminder: you work soon. Details in your calendar." : "Rappel : vous travaillez bientôt. Détails dans votre calendrier.",
        data: { screen: "calendar", ...job }
      };
    case "shift_cancelled":
      return {
        title: en ? "Shift cancelled" : "Quart annulé",
        body: role ? (en ? `${role} was cancelled. You do not need to go.` : `${role} a été annulé. Vous n'avez pas à vous présenter.`) : en ? "A shift was cancelled. Check your calendar." : "Un quart a été annulé. Consultez votre calendrier.",
        data: { screen: "calendar", ...job }
      };
    case "shift_changed":
      return {
        title: en ? "Shift changed" : "Quart modifié",
        body: role ? (en ? `${role} has changed. See the new details.` : `${role} a changé. Voyez les nouveaux détails.`) : en ? "A shift has changed. See the new details." : "Un quart a changé. Voyez les nouveaux détails.",
        data: { screen: "calendar", ...job }
      };
    case "staff_replied":
      return {
        title: en ? "Joblop replied" : "Joblop a répondu",
        body: en ? "The Joblop team replied to your message." : "L'équipe Joblop a répondu à votre message.",
        data: { screen: "contact", ...(params.conversationId ? { conversationId: params.conversationId } : {}) }
      };
    case "payout_paid":
      return {
        title: en ? "You've been paid" : "Vous avez été payé",
        body: en ? "Your pay was sent. See your earnings." : "Votre paie a été envoyée. Voyez vos gains.",
        data: { screen: "pay" }
      };
  }
}

// Fire-and-forget helper for the notice paths: never throws, never awaits longer than the push call.
export async function pushToWorkers(
  pushSender: PushSender | undefined,
  userIds: readonly string[],
  kind: WorkerPushKind,
  params: Parameters<typeof workerPushMessage>[2] = {}
): Promise<PushSendResult> {
  if (!pushSender || userIds.length === 0 || !sendsPush(kind)) return NO_PUSH;
  return pushSender.send(userIds, (language) => workerPushMessage(kind, language, params)).catch(() => NO_PUSH);
}
