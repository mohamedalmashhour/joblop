import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listedCondition } from "./jobListingVisibility";
import { openJobWhere } from "./openJobs";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const DAY = 86_400_000;

describe("openJobWhere: one rule for every worker job list", () => {
  it("approved, open on the calendar, priced, upcoming, active site", () => {
    expect(openJobWhere({ now: NOW }, false)).toEqual({
      status: "approved_for_dispatch",
      openClaim: true,
      pricingSnapshot: { isNot: null },
      startAt: { gte: NOW },
      residence: { status: "active" }
    });
  });

  it("never starts the window in the past, and keeps an end date", () => {
    const past = new Date(NOW.getTime() - DAY);
    const later = new Date(NOW.getTime() + 3 * DAY);
    expect(openJobWhere({ now: NOW, startFrom: past }, false).startAt).toEqual({ gte: NOW });
    expect(openJobWhere({ now: NOW, startFrom: later, startTo: new Date(NOW.getTime() + 9 * DAY) }, false).startAt).toEqual({
      gte: later,
      lte: new Date(NOW.getTime() + 9 * DAY)
    });
  });

  it("extra filters only narrow: they cannot reopen a hidden job or an inactive site", () => {
    const where = openJobWhere(
      {
        now: NOW,
        residence: { status: "closed", city: { in: ["Montréal"] } } as never,
        extra: { status: "submitted", openClaim: false, roleDefinitionId: { in: ["r1"] } } as never
      },
      false
    );
    expect(where.status).toBe("approved_for_dispatch");
    expect(where.openClaim).toBe(true);
    expect(where.residence).toEqual({ status: "active", city: { in: ["Montréal"] } });
    expect(where.roleDefinitionId).toEqual({ in: ["r1"] });
  });

  it("adds the long-term listing rule when employer plans are on", () => {
    expect(openJobWhere({ now: NOW }, true).AND).toEqual([listedCondition(NOW)]);
  });
});

// The jobs calendar, the calendar hub, the signed-in search, the public board, its count and job
// alerts must all read jobs through openJobWhere, so a worker never sees a job in one and not the other.
describe("every worker job list uses openJobWhere", () => {
  const read = (file: string) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
  const app = read("./app.ts");
  const handler = (route: string) => {
    const start = app.indexOf(route);
    expect(start).toBeGreaterThan(-1);
    const next = app.indexOf("\n  app.", start + route.length);
    return app.slice(start, next === -1 ? undefined : next);
  };

  it.each([
    'app.get("/marketplace/open-jobs"',
    'app.post("/marketplace/jobs/search"',
    'app.get("/public/jobs"',
    'app.get("/public/jobs/:jobCode"',
    'app.get("/marketplace/job-codes/:jobCode"',
    'app.get("/public/jobscanner/stats"'
  ])("%s", (route) => {
    const body = handler(route);
    expect(body).toContain("openJobWhere(");
    expect(body).not.toContain('"submitted"');
  });

  it("job alerts and the calendar hub", () => {
    const alerts = app.slice(app.indexOf("const loadAlertOpenJobs"), app.indexOf("const loadAlertOpenJobs") + 400);
    expect(alerts).toContain("openJobWhere(");
    expect(read("./calendarHubRoutes.ts")).toContain("openJobWhere(");
  });
});
