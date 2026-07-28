import { describe, expect, it } from "vitest";
import { isProductionAdminRouteAllowed } from "./routePolicy";

describe("admin production route policy", () => {
  it("allows only persisted operational pages and infrastructure routes", () => {
    for (const path of [
      "/calendar",
      "/calendar/",
      "/calendar/request",
      "/dispatches",
      "/dispatches/11111111-1111-4111-8111-111111111111",
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
      "/payroll",
      "/reports",
      "/ai-control-center",
      "/calendar/assignment",
      "/dispatches/not-a-uuid",
      "/calendar/%2f../finance",
      "//calendar"
    ]) {
      expect(isProductionAdminRouteAllowed(path), path).toBe(false);
    }
  });
});
