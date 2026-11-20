import { SHIFT_OVERLAP_ERROR_CODE } from "@rwos/shared";

// The API refuses any claim or offer acceptance that would give the worker two shifts at the same
// time (409 RWOS_SHIFT_OVERLAP). Its body carries the message in EN / FR / AR, naming the shift the
// worker already holds. Returns the message in the page's language, or null for any other answer.
export function shiftOverlapNotice(body: unknown, locale: string): string | null {
  if (!body || typeof body !== "object") return null;
  const value = body as { error?: unknown; message?: unknown; messages?: unknown };
  if (value.error !== SHIFT_OVERLAP_ERROR_CODE) return null;
  const lang = locale === "ar" ? "ar" : locale.startsWith("fr") ? "fr" : "en";
  const messages = value.messages && typeof value.messages === "object" ? (value.messages as Record<string, unknown>) : {};
  const localized = messages[lang];
  if (typeof localized === "string" && localized.length > 0) return localized;
  return typeof value.message === "string" ? value.message : null;
}
