import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isProductionAdminRouteAllowed } from "./routePolicy";

describe("admin production route policy", () => {
  it("allows only persisted operational pages and infrastructure routes", () => {
    for (const path of [
      "/calendar",
      "/calendar/",
      "/calendar/request",
      "/health",
      "/ready",
      "/signin",
      "/signup",
      "/dispatches",
      "/dispatches/11111111-1111-4111-8111-111111111111",
      "/disputes",
      "/contracts",
      "/payouts",
      "/invoices",
      "/payroll",
      "/hr",
      "/employer-plan-orders",
      "/orders",
      "/orders/11111111-1111-4111-8111-111111111111",
      "/timesheets",
      "/market-wages",
      "/escalations",
      "/greetings",
      "/api/session",
      "/_next/static/app.js"
    ]) {
      expect(isProductionAdminRouteAllowed(path), path).toBe(true);
    }
  });

  it("fails closed for fixture, malformed, and ambiguous paths", () => {
    for (const path of [
      "/",
      "/finance",
      "/forgot-password",
      "/reset-password",
      "/reports",
      "/ai-control-center",
      "/calendar/assignment",
      "/dispatches/not-a-uuid",
      "/orders/a/b",
      "/calendar/%2f../finance",
      "//calendar"
    ]) {
      expect(isProductionAdminRouteAllowed(path), path).toBe(false);
    }
  });

  it("allows every link in the production admin navigation (no nav link may 404)", () => {
    const shell = readFileSync(new URL("./app/AdminShell.tsx", import.meta.url), "utf8");
    const block = shell.slice(shell.indexOf("const connectedNavigation"), shell.indexOf("] as const", shell.indexOf("const connectedNavigation")));
    const hrefs = [...block.matchAll(/href: "([^"]+)"/g)].map((m) => m[1] ?? "");
    expect(hrefs).toContain("/employer-plan-orders");
    for (const href of hrefs) expect(isProductionAdminRouteAllowed(href), href).toBe(true);
  });
});
