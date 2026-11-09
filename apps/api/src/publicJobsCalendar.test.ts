import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PUBLIC_CALENDAR_JOB_FIELDS } from "@rwos/shared";
import { PUBLIC_CALENDAR_MAX_DAYS, publicCalendarJobView, publicCalendarRange, type PublicCalendarRow } from "./publicJobsCalendar";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const DAY = 86_400_000;

// A database row carrying everything a careless mapper could leak.
const row = {
  id: "job-internal-id",
  jobRequestNumber: "JR-2026-000123",
  title: "Cook needed",
  numberOfWorkers: 3,
  startAt: new Date("2026-11-20T13:00:00.000Z"),
  endAt: new Date("2026-11-20T21:00:00.000Z"),
  timezone: "America/Toronto",
  roleDefinition: { displayLabel: "Cook" },
  residence: { city: "Laval", province: "QC", addressLine1: "123 Secret Street", postalCode: "H7A 1A1", latitude: 45.6, longitude: -73.7, name: "AuditCare Residence" },
  pricingSnapshot: { workerHourlyRateMinor: 2500, employerHourlyRateMinor: 3600, platformHourlyMarginMinor: 1100, marginPpm: 200000 },
  organization: { legalName: "AuditCare Inc." },
  jobLength: "short_term",
  payOfferedMinMinor: null,
  payOfferedMaxMinor: null,
  payOfferedUnit: null
} as unknown as PublicCalendarRow;

describe("public jobs calendar: privacy", () => {
  it("sends only whitelisted fields: no address, employer, employer rate, margin or internal id", () => {
    const view = publicCalendarJobView(row, 2, "CAD", false);
    expect(view).toEqual({
      jobCode: "JR-2026-000123",
      role: "Cook",
      city: "Laval",
      province: "QC",
      areaLabel: "Laval, QC",
      startAt: "2026-11-20T13:00:00.000Z",
      endAt: "2026-11-20T21:00:00.000Z",
      timezone: "America/Toronto",
      placesLeft: 2,
      workerRateMinor: 2500,
      currency: "CAD"
    });
    for (const key of Object.keys(view)) expect(PUBLIC_CALENDAR_JOB_FIELDS).toContain(key);
    const body = JSON.stringify(view);
    for (const hidden of ["Secret Street", "H7A", "AuditCare", "3600", "1100", "200000", "employer", "margin", "latitude", "job-internal-id"]) {
      expect(body).not.toContain(hidden);
    }
  });

  it("a long-term listing shows the employer's pay offer, never a $0 rate", () => {
    const longTerm = { ...row, jobLength: "long_term", payOfferedMinMinor: 2200, payOfferedMaxMinor: 2500, payOfferedUnit: "hour", pricingSnapshot: { workerHourlyRateMinor: 0 } } as unknown as PublicCalendarRow;
    const view = publicCalendarJobView(longTerm, 1, "CAD", true);
    expect(view.workerRateMinor).toBeNull();
    expect(view.payOffered).toMatchObject({ minMinor: 2200, maxMinor: 2500, paidBy: "employer" });
  });
});

describe("public jobs calendar: request window", () => {
  it("never starts before now and never spans more than the cap", () => {
    expect(publicCalendarRange("2026-10-01T00:00:00.000Z", "2026-11-30T00:00:00.000Z", NOW)).toEqual({
      from: NOW,
      to: new Date("2026-11-30T00:00:00.000Z")
    });
    const far = publicCalendarRange(null, "2027-12-31T00:00:00.000Z", NOW);
    expect(far.to.getTime() - far.from.getTime()).toBe(PUBLIC_CALENDAR_MAX_DAYS * DAY);
    const garbage = publicCalendarRange("nope", "nope", NOW);
    expect(garbage.from).toEqual(NOW);
    const backwards = publicCalendarRange("2026-12-10T00:00:00.000Z", "2026-12-01T00:00:00.000Z", NOW);
    expect(backwards.to.getTime()).toBeGreaterThanOrEqual(backwards.from.getTime());
  });
});

describe("public jobs calendar route", () => {
  const app = readFileSync(fileURLToPath(new URL("./app.ts", import.meta.url)), "utf8");
  const start = app.indexOf('app.get("/public/jobs/calendar"');
  const body = app.slice(start, app.indexOf("\n  app.", start + 10));

  it("reads jobs through openJobWhere, drops full jobs and maps through the whitelist", () => {
    expect(start).toBeGreaterThan(-1);
    expect(body).toContain("openJobWhere(");
    expect(body).toContain("remainingOpenings(");
    expect(body).toContain("publicCalendarJobView(");
    expect(body).not.toMatch(/authService|readBearerToken/);
    expect(body).not.toMatch(/addressLine|latitude|employerHourly|organization/);
  });
});
