import { describe, expect, it } from "vitest";
import { buildCalendarExport, buildCalendarTitle } from "./calendarExport";

const base = {
  title: "Nurse — Résidence Chomedey",
  startAt: "2026-11-04T13:00:00.000Z",
  endAt: "2026-11-04T19:00:00.000Z",
  jobCode: "JR-2026-000123",
  location: "805 boul. Chomedey, Laval, QC",
  uid: "assignment-abc",
  stampedAt: "2026-10-24T12:00:00.000Z"
} as const;

describe("buildCalendarExport", () => {
  it("puts the job code in the title", () => {
    expect(buildCalendarTitle(base)).toBe("Nurse — Résidence Chomedey (JR-2026-000123)");
    expect(buildCalendarTitle({ title: "X", jobCode: null })).toBe("X");
  });

  it("builds a no-OAuth Google Calendar template URL with UTC dates", () => {
    const { googleCalendarUrl } = buildCalendarExport(base);
    expect(googleCalendarUrl).toContain("calendar.google.com/calendar/render");
    expect(googleCalendarUrl).toContain("action=TEMPLATE");
    expect(googleCalendarUrl).toContain("dates=20261104T130000Z%2F20261104T190000Z");
    expect(googleCalendarUrl).toContain("JR-2026-000123");
    expect(googleCalendarUrl).toContain("location=805");
  });

  it("builds a valid .ics VEVENT importable by Google/Apple/Outlook", () => {
    const { ics, filename } = buildCalendarExport(base);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:assignment-abc@joblop");
    expect(ics).toContain("DTSTART:20261104T130000Z");
    expect(ics).toContain("DTEND:20261104T190000Z");
    expect(ics).toContain("DTSTAMP:20261024T120000Z");
    expect(ics).toContain("DESCRIPTION:Joblop job code: JR-2026-000123");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(filename).toBe("joblop-JR-2026-000123.ics");
  });

  it("escapes commas/semicolons in text fields", () => {
    const { ics } = buildCalendarExport({ ...base, location: "A, B; C" });
    expect(ics).toContain("LOCATION:A\\, B\\; C");
  });

  it("works without an optional job code or location", () => {
    const out = buildCalendarExport({
      title: "Shift",
      startAt: base.startAt,
      endAt: base.endAt,
      uid: "u1",
      stampedAt: base.stampedAt
    });
    expect(out.filename).toBe("joblop-shift.ics");
    expect(out.ics).not.toContain("LOCATION:");
  });

  it("rejects an invalid date", () => {
    expect(() => buildCalendarExport({ ...base, startAt: "not-a-date" })).toThrow(/invalid date/);
  });
});
