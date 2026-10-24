// Calendar export capsule — turn a confirmed shift (a CalendarWindow + job code + details) into
// something a worker or client can drop into THEIR OWN calendar with no account linking:
//   1. a Google Calendar "render" template URL ("open in Google") — opens a pre-filled event the
//      person saves themselves; no OAuth, no stored credentials, nothing on our side.
//   2. an RFC-5545 .ics VEVENT the person imports into Google / Apple / Outlook alike.
// Pure and deterministic (UID/DTSTAMP are inputs), so it is fully testable and never touches money,
// the DB, or a third-party API. Two-way Google sync (OAuth) is a separate, bigger piece.

export type CalendarExportInput = Readonly<{
  title: string;
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  jobCode?: string | null; // e.g. JR-2026-000123 — surfaced in the title + description
  location?: string | null;
  description?: string | null;
  uid: string; // stable per shift (e.g. assignment id) so re-import updates, not duplicates
  stampedAt: string; // ISO 8601 — DTSTAMP; pass a fixed clock for determinism
}>;

export type CalendarExport = Readonly<{
  googleCalendarUrl: string;
  ics: string;
  filename: string;
}>;

// UTC basic format required by both Google's `dates=` param and iCalendar: YYYYMMDDTHHMMSSZ.
function toUtcBasic(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`invalid date: ${iso}`);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// iCalendar TEXT escaping (RFC 5545 §3.3.11): backslash, comma, semicolon, and newlines.
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// Fold long content lines to <=75 octets (RFC 5545 §3.1); continuations begin with one space.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length > 0) chunks.push(" " + rest);
  return chunks.join("\r\n");
}

export function buildCalendarTitle(input: Pick<CalendarExportInput, "title" | "jobCode">): string {
  return input.jobCode ? `${input.title} (${input.jobCode})` : input.title;
}

function buildDescription(input: CalendarExportInput): string {
  const parts: string[] = [];
  if (input.jobCode) parts.push(`JobLop job code: ${input.jobCode}`);
  if (input.description) parts.push(input.description);
  return parts.join("\n");
}

export function buildCalendarExport(input: CalendarExportInput): CalendarExport {
  const title = buildCalendarTitle(input);
  const description = buildDescription(input);
  const startUtc = toUtcBasic(input.startAt);
  const endUtc = toUtcBasic(input.endAt);

  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${startUtc}/${endUtc}` });
  if (description) params.set("details", description);
  if (input.location) params.set("location", input.location);
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobLop//Shift//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(input.uid)}@joblop`,
    `DTSTAMP:${toUtcBasic(input.stampedAt)}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${escapeIcsText(title)}`,
    ...(input.location ? [`LOCATION:${escapeIcsText(input.location)}`] : []),
    ...(description ? [`DESCRIPTION:${escapeIcsText(description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  const ics = lines.map(foldLine).join("\r\n") + "\r\n";

  const safeCode = (input.jobCode ?? "shift").replace(/[^A-Za-z0-9_-]/g, "");
  return { googleCalendarUrl, ics, filename: `joblop-${safeCode}.ics` };
}
