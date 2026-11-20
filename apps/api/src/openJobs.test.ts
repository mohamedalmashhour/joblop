import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listedCondition } from "./jobListingVisibility";
import { claimBlockReason, openJobWhere, payMeetsMinimumWageOnJobDateWhere, payMeetsMinimumWageWhere } from "./openJobs";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const DAY = 86_400_000;

describe("openJobWhere: one rule for every worker job list", () => {
  it("approved, open on the calendar, priced at or above minimum wage on its date, upcoming, active site", () => {
    expect(openJobWhere({ now: NOW }, false)).toEqual({
      status: "approved_for_dispatch",
      openClaim: true,
      pricingSnapshot: { isNot: null },
      startAt: { gte: NOW },
      residence: { status: "active" },
      AND: [payMeetsMinimumWageOnJobDateWhere(NOW)]
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
    // Extra filters cannot widen it back: the wage rule is always ANDed in.
    const where = openJobWhere({ now: NOW, extra: { pricingSnapshot: { isNot: null } } as never }, false);
    expect(where.AND).toContainEqual(payMeetsMinimumWageOnJobDateWhere(NOW));
  });

  it("holds each job to the minimum wage in force ON ITS DATE (round 7)", () => {
    // Searched in February 2026: a job before May 1 needs $16.10, a job after needs $16.60.
    const feb = new Date("2026-02-01T12:00:00.000Z");
    const branches = payMeetsMinimumWageOnJobDateWhere(feb).OR as Array<{ startAt: { gte?: Date; lt?: Date }; pricingSnapshot: { is: { OR: unknown[] } } }>;
    expect(branches).toHaveLength(2);
    expect(branches[0]!.startAt).toEqual({ lt: new Date("2026-05-01T04:00:00.000Z") }); // Québec midnight, summer time
    expect(branches[0]!.pricingSnapshot.is.OR).toContainEqual({ workerHourlyRateMinor: { gte: 1610 } });
    expect(branches[1]!.startAt).toEqual({ gte: new Date("2026-05-01T04:00:00.000Z") });
    expect(branches[1]!.pricingSnapshot.is.OR).toContainEqual({ workerHourlyRateMinor: { gte: 1660 } });
    // Searched in November 2026: the 2025 period is over and is left out.
    expect((payMeetsMinimumWageOnJobDateWhere(NOW).OR as unknown[]).length).toBe(1);
  });

  it("adds the long-term listing rule when employer plans are on", () => {
    expect(openJobWhere({ now: NOW }, true).AND).toEqual([payMeetsMinimumWageOnJobDateWhere(NOW), listedCondition(NOW)]);
  });
});

describe("claimBlockReason: the claim and the job page agree (round 7)", () => {
  const job = (startAt: string, rate: number, extra: Record<string, unknown> = {}) => ({
    startAt: new Date(startAt),
    jobLength: null,
    pricingSnapshot: { workerHourlyRateMinor: rate, currency: "CAD", employerPlanCode: null },
    ...extra
  });

  it.each([
    ["started an hour ago", job("2026-11-09T11:00:00.000Z", 2000), "job_started"],
    ["starting right now", job("2026-11-09T12:00:00.000Z", 2000), "job_started"],
    ["tomorrow at the minimum", job("2026-11-10T13:00:00.000Z", 1660), null],
    ["tomorrow below the minimum", job("2026-11-10T13:00:00.000Z", 1659), "below_minimum_wage"],
    ["long-term listing with no hourly pay", job("2026-11-10T13:00:00.000Z", 0, { jobLength: "long_term" }), null],
    ["paid in USD", job("2026-11-10T13:00:00.000Z", 1000, { pricingSnapshot: { workerHourlyRateMinor: 1000, currency: "USD" } }), null]
  ])("%s", (_name, input, expected) => {
    expect(claimBlockReason(input as never, NOW)).toBe(expected);
  });

  it("uses the rate in force on the job's date, not today's", () => {
    // In April 2026 the rate is $16.10, but a June job must pay the May 1 rate of $16.60.
    const april = new Date("2026-04-15T12:00:00.000Z");
    expect(claimBlockReason(job("2026-06-01T13:00:00.000Z", 1620), april)).toBe("below_minimum_wage");
    expect(claimBlockReason(job("2026-04-20T13:00:00.000Z", 1620), april)).toBeNull();
  });

  it("is used by the claim and by the job page's claimable flag", () => {
    const read = (file: string) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
    expect(read("./openClaim.ts")).toContain("const blocked = claimBlockReason(job, at);");
    const app = read("./app.ts");
    expect(app).toContain("const claimBlockedReason = claimBlockReason(row, new Date());");
    expect(app).toContain("claimBlockedReason === null;");
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
