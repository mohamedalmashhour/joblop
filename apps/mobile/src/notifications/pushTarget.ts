// Pure helpers for push notifications (no native imports, so they are unit-tested in Node).

export type PushScreen = "calendar" | "contact" | "pay";

export type PushTarget = Readonly<{
  screen: PushScreen;
  jobRequestId?: string;
  conversationId?: string;
}>;

const screens: readonly PushScreen[] = ["calendar", "contact", "pay"];

function safeId(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : undefined;
}

/** Reads the `data` the API puts on a notice: { screen, jobRequestId?, conversationId? }. */
export function readPushTarget(data: unknown): PushTarget | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const screen = record.screen;
  if (typeof screen !== "string" || !screens.includes(screen as PushScreen)) return null;
  const jobRequestId = safeId(record.jobRequestId);
  const conversationId = safeId(record.conversationId);
  return {
    screen: screen as PushScreen,
    ...(jobRequestId ? { jobRequestId } : {}),
    ...(conversationId ? { conversationId } : {})
  };
}

/** Push is only for the phone builds; the browser preview never registers. */
export function pushPlatformFor(os: string): "ios" | "android" | null {
  return os === "ios" || os === "android" ? os : null;
}

/** The EAS project id the owner adds to app.json (extra.eas.projectId). Missing → push stays off. */
export function readEasProjectId(constants: unknown): string | null {
  if (!constants || typeof constants !== "object") return null;
  const c = constants as {
    expoConfig?: { extra?: { eas?: { projectId?: unknown } } } | null;
    easConfig?: { projectId?: unknown } | null;
  };
  const projectId = c.expoConfig?.extra?.eas?.projectId ?? c.easConfig?.projectId;
  return typeof projectId === "string" && projectId.trim().length > 0 ? projectId.trim() : null;
}
