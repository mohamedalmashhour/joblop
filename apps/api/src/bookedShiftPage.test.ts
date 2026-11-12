import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The job page is the booked worker's shift page (calendars open it). A worker who holds the shift
// can open it even once it is full, started or no longer listed; everyone else sees only listed jobs.
// It still never carries the employer rate or Joblop's share.

const app = readFileSync(new URL("./app.ts", import.meta.url), "utf8");
const route = app.slice(app.indexOf('  app.get("/marketplace/jobs/:jobRequestId", async'), app.indexOf('  app.get("/marketplace/employers/:organizationId", async'));

describe("job page for the worker who holds the shift", () => {
  it("lets the booked worker open it outside the job-board listing rules", () => {
    expect(route).toContain('status: { notIn: ["worker_withdrawn", "employer_cancelled", "platform_cancelled"] }');
    expect(route).toContain('? { id: jobRequestId, status: { notIn: ["draft", "cancelled"] } }');
    expect(route).toContain(": listedJobWhere({");
    expect(route).toContain("        booked,\n");
  });

  it("never selects or sends the employer rate or Joblop's share", () => {
    expect(route).not.toMatch(/employerHourlyRateMinor|platformHourlyMarginMinor|marginPpm/);
  });
});
