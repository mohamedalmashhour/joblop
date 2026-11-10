import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listedCondition } from "./jobListingVisibility";
import { openJobWhere, payMeetsMinimumWageWhere } from "./openJobs";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const DAY = 86_400_000;

describe("openJobWhere: one rule for every worker job list", () => {
  it("approved, open on the calendar, priced at or above minimum wage, upcoming, active site", () => {
    expect(openJobWhere({ now: NOW }, false)).toEqual({
      status: "approved_for_dispatch",
      openClaim: true,
      pricingSnapshot: { is: payMeetsMinimumWageWhere(NOW) },
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

  it("hides short-term jobs paying below the Québec minimum wage (long-term listings and non-CAD exempt)", () => {
    // 2026-11-09: the 2026-05-01 row of the shared table is in force.
    expect(payMeetsMinimumWageWhere(NOW)).toEqual({
      OR: [
        { workerHourlyRateMinor: { gte: 1660 } },
        { employerPlanCode: "listing" },
        { currency: { not: "CAD" } }
      ]
    });
    // Before May 1, 2026 the 2025 rate applies.
    expect(payMeetsMinimumWageWhere(new Date("2026-02-01T12:00:00.000Z")).OR).toContainEqual({ workerHourlyRateMinor: { gte: 1610 } });
    // Extra filters cannot widen it back.
    const where = openJobWhere({ now: NOW, extra: { pricingSnapshot: { isNot: null } } as never }, false);
    expect(where.pricingSnapshot).toEqual({ is: payMeetsMinimumWageWhere(NOW) });
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
    'app.get("/public/jobs/calendar"',
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
