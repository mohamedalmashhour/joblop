// One rule for "a worker can never hold two shifts at the same time" (owner decision).
//
// Two shifts overlap when their scheduled time ranges intersect. Ranges are half-open: a shift that
// ends at 17:00 and one that starts at 17:00 only touch, so both are allowed. Only active
// assignments count (cancelled, declined or completed ones do not), and long-term listings never
// count: they have no shifts, the employer hires directly.
//
// The server enforces it on every path that gives a worker a shift (open claim, offers, staff
// assignment). This module holds the pure parts the server and the apps share: the overlap test,
// the error code, and the EN / FR / AR message naming the shift the worker already holds.

export const SHIFT_OVERLAP_ERROR_CODE = "RWOS_SHIFT_OVERLAP" as const;

export type ShiftOverlapLanguage = "en" | "fr" | "ar";

export type ShiftWindow = Readonly<{ startAt: Date; endAt: Date }>;

/** A shift the worker already holds, as shown in the message. */
export type HeldShift = Readonly<{ startAt: Date; endAt: Date; timezone: string }>;

/** True when the two ranges intersect. Touching end-to-start (9–17 and 17–21) is not an overlap. */
export function shiftsOverlap(a: ShiftWindow, b: ShiftWindow): boolean {
  return a.startAt.getTime() < b.endAt.getTime() && b.startAt.getTime() < a.endAt.getTime();
}

const LOCALES: Record<ShiftOverlapLanguage, string> = {
  en: "en-CA",
  fr: "fr-CA",
  ar: "ar-u-nu-latn"
};

function safeTimeZone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
    return timezone;
  } catch {
    return "America/Toronto";
  }
}

// "9:00" style 24-hour clock in the shift's own time zone, the same in every language.
function clock(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** "Tue, Nov 10, 9:00–17:00" in the shift's own time zone and the reader's language. */
export function formatHeldShift(shift: HeldShift, language: ShiftOverlapLanguage): string {
  const timeZone = safeTimeZone(shift.timezone);
  const day = new Intl.DateTimeFormat(LOCALES[language], {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(shift.startAt);
  return `${day}, ${clock(shift.startAt, timeZone)}–${clock(shift.endAt, timeZone)}`;
}

export function shiftOverlapMessage(shift: HeldShift, language: ShiftOverlapLanguage): string {
  const when = formatHeldShift(shift, language);
  if (language === "fr") return `Vous avez déjà un quart de travail à cette heure-là (${when}).`;
  if (language === "ar") return `لديك بالفعل نوبة عمل في هذا الوقت (${when}).`;
  return `You already have a shift at that time (${when}).`;
}

export function shiftOverlapMessages(shift: HeldShift): Record<ShiftOverlapLanguage, string> {
  return {
    en: shiftOverlapMessage(shift, "en"),
    fr: shiftOverlapMessage(shift, "fr"),
    ar: shiftOverlapMessage(shift, "ar")
  };
}

/** The first supported language in an Accept-Language header (English when none matches). */
export function shiftOverlapLanguageFromHeader(header: string | null | undefined): ShiftOverlapLanguage {
  const tags = String(header ?? "")
    .toLowerCase()
    .split(",")
    .map((part) => part.split(";")[0]!.trim().slice(0, 2));
  for (const tag of tags) {
    if (tag === "en" || tag === "fr" || tag === "ar") return tag;
  }
  return "en";
}

/** The JSON body every refused path sends (HTTP 409). Times are ISO strings; no pay or rates. */
export function shiftOverlapResponseBody(shift: HeldShift, language: ShiftOverlapLanguage) {
  return {
    error: SHIFT_OVERLAP_ERROR_CODE,
    status: "shift_overlap" as const,
    message: shiftOverlapMessage(shift, language),
    messages: shiftOverlapMessages(shift),
    heldShift: {
      startAt: shift.startAt.toISOString(),
      endAt: shift.endAt.toISOString(),
      timezone: shift.timezone
    }
  };
}
