import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const apiSource = readFileSync(new URL("./app.ts", import.meta.url), "utf8");

describe("API non-money authority boundary", () => {
  it("does not expose Payroll, Finance, Invoice, Payment, escrow, or money-engine routes", () => {
    for (const prohibitedRoute of [
      "/payroll",
      "/finance",
      "/invoices",
      "/payments",
      "/worker-payables",
      "/employer-payments",
      "/escrow",
      "/held-funds",
      "/money-engine"
    ]) {
      expect(apiSource).not.toContain(prohibitedRoute);
    }
  });

  it("keeps Timesheet as the final implemented workflow route family", () => {
    expect(apiSource).toContain("/platform/timesheets");
    expect(apiSource).toContain("/organizations/:organizationId/timesheets");
    expect(apiSource).toContain("/worker/timesheets/:timesheetId");
  });
});
