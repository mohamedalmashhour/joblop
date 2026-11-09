import { describe, expect, it } from "vitest";
import {
  PUBLIC_LANDING_COPY,
  SIGNED_OUT_SECTIONS,
  calendarDayKey,
  countPublicJobsByDay,
  currentCalendarMonth,
  groupPublicJobsByDay,
  publicCalendarJobTime,
  publicCalendarWeeks,
  publicCalendarWindow,
  publicCountLabel,
  publicLandingLang,
  type PublicCalendarJob
} from "./publicJobsCalendar";

const job = (over: Partial<PublicCalendarJob>): PublicCalendarJob => ({
  jobCode: "JR-2026-000001",
  role: "Cook",
  city: "Laval",
  province: "QC",
  areaLabel: "Laval, QC",
  startAt: "2026-11-20T13:00:00.000Z",
  endAt: "2026-11-20T21:00:00.000Z",
  timezone: "America/Toronto",
  placesLeft: 2,
  workerRateMinor: 2500,
  currency: "CAD",
  ...over
});

describe("public jobs calendar: grouping by day", () => {
  it("counts each day's open jobs and sorts a day by start time", () => {
    const jobs = [
      job({ jobCode: "JR-2026-000003", startAt: "2026-11-20T20:00:00.000Z", endAt: "2026-11-21T02:00:00.000Z" }),
      job({ jobCode: "JR-2026-000001" }),
      job({ jobCode: "JR-2026-000002", startAt: "2026-11-22T12:00:00.000Z", endAt: "2026-11-22T20:00:00.000Z" })
    ];
    const byDay = groupPublicJobsByDay(jobs);
    expect([...byDay.keys()].sort()).toEqual(["2026-11-20", "2026-11-22"]);
    expect(byDay.get("2026-11-20")!.map((j) => j.jobCode)).toEqual(["JR-2026-000001", "JR-2026-000003"]);
    expect(countPublicJobsByDay(jobs).get("2026-11-20")).toBe(2);
  });

  it("uses the worksite day (Québec time), not UTC: a 9 p.m. shift stays on its evening", () => {
    // 2026-11-21 02:00 UTC is 2026-11-20 21:00 in Montréal.
    expect(calendarDayKey("2026-11-21T02:00:00.000Z", "America/Toronto")).toBe("2026-11-20");
    expect(groupPublicJobsByDay([job({ startAt: "2026-11-21T02:00:00.000Z", endAt: "2026-11-21T08:00:00.000Z" })]).has("2026-11-20")).toBe(true);
  });

  it("drops full jobs and unreadable dates", () => {
    const byDay = groupPublicJobsByDay([job({ placesLeft: 0 }), job({ startAt: "not a date" })]);
    expect(byDay.size).toBe(0);
  });
});

describe("public jobs calendar: month grid and window", () => {
  it("six Sunday-started weeks, the 1st in its weekday column", () => {
    const weeks = publicCalendarWeeks(2026, 10); // November 2026 starts on a Sunday
    expect(weeks).toHaveLength(6);
    expect(weeks[0]![0]).toEqual({ key: "2026-11-01", day: 1, inMonth: true });
    const december = publicCalendarWeeks(2026, 11); // December 1, 2026 is a Tuesday
    expect(december[0]![2]).toEqual({ key: "2026-12-01", day: 1, inMonth: true });
    expect(december[0]![0]!.inMonth).toBe(false);
  });

  it("asks the API for the whole month with a day of slack", () => {
    expect(publicCalendarWindow(2026, 10)).toEqual({ from: "2026-10-31T00:00:00.000Z", to: "2026-12-02T00:00:00.000Z" });
    expect(currentCalendarMonth(new Date("2026-12-01T03:00:00.000Z"))).toEqual({ year: 2026, month: 10 });
  });

  it("shows the worksite time of a job", () => {
    expect(publicCalendarJobTime(job({}), "en")).toMatch(/8:00.*4:00/);
  });
});

describe("signed-out front door: one order and one set of words for web and app", () => {
  it("logo and hero, then How Joblop works, then the calendar, then JobScanner, then sign-up", () => {
    expect(SIGNED_OUT_SECTIONS).toEqual(["landing", "howitworks", "calendar", "jobscanner", "signup"]);
  });

  it("EN / FR / AR carry the same keys and the owner's empty-calendar line", () => {
    const keys = Object.keys(PUBLIC_LANDING_COPY.en).sort();
    expect(Object.keys(PUBLIC_LANDING_COPY.fr).sort()).toEqual(keys);
    expect(Object.keys(PUBLIC_LANDING_COPY.ar).sort()).toEqual(keys);
    expect(PUBLIC_LANDING_COPY.en.empty).toBe("New jobs are added every day. Create a free account to get alerts.");
    expect(PUBLIC_LANDING_COPY.en.payPending).toBe("Hourly pay: confirmed before you're offered the shift");
    expect(publicLandingLang("fr-CA")).toBe("fr");
    expect(publicLandingLang("ar")).toBe("ar");
    expect(publicLandingLang(undefined)).toBe("en");
    expect(publicCountLabel(3, PUBLIC_LANDING_COPY.en.placesOne, PUBLIC_LANDING_COPY.en.placesMany)).toBe("3 places left");
  });
});
