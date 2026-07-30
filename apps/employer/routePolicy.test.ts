import { describe, expect, it } from "vitest";
import { isProductionEmployerRouteAllowed } from "./routePolicy";

describe("employer production route policy", () => {
  it("allows public pages, persisted staffing pages, and infrastructure routes", () => {
    for (const path of [
      "/",
      "/about",
      "/contact",
      "/faq",
      "/how-it-works",
      "/pricing",
      "/health",
      "/ready",
      "/signin",
      "/signup/employer",
      "/employer/calendar",
      "/employer/calendar/create",
      "/employer/calendar/request",
      "/employer/calendar/request/edit",
      "/employer/calendar/assignment",
      "/api/session",
      "/_next/static/app.js"
    ]) {
      expect(isProductionEmployerRouteAllowed(path), path).toBe(true);
    }
  });

  it("fails closed for fixture and ambiguous operational paths", () => {
    for (const path of [
      "/employer/dashboard",
      "/employer/shifts/create",
      "/employer/applicants",
      "/employer/assignments/manual",
      "/employer/assignments/review",
      "/employer/assignments/confirmation",
      "/employer/assignments/worker-response",
      "/employer/assignments/detail",
      "/employer/invoices",
      "/employer/payments",
      "/employer/%2f../payments",
      "//employer/calendar"
    ]) {
      expect(isProductionEmployerRouteAllowed(path), path).toBe(false);
    }
  });
});
