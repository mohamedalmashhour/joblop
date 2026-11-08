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
      "/privacy",
      "/health",
      "/ready",
      "/signin",
      "/signup/employer",
      "/terms",
      "/employer/dashboard",
      "/employer/company",
      "/employer/onboarding/company",
      "/employer/onboarding/residences",
      "/employer/onboarding/departments",
      "/employer/assignments",
      "/employer/attendance",
      "/employer/timesheets",
      "/employer/payments",
      "/employer/contract",
      "/employer/verification",
      "/employer/contact-joblop",
      "/employer/inbox",
      "/employer/calendar",
      "/employer/calendar/create",
      "/employer/calendar/request",
      "/employer/calendar/request/edit",
      "/employer/calendar/assignment",
      "/employer/orders",
      "/employer/my-calendar",
      "/employer/orders/create",
      "/employer/orders/2f0d7c5e-3b1a-4a1e-9c7d-6a1f2b3c4d5e",
      "/employer/money",
      "/employer/invoices",
      "/employer/invoices/detail",
      "/employer/invoices/breakdown",
      "/api/session",
      "/_next/static/app.js"
    ]) {
      expect(isProductionEmployerRouteAllowed(path), path).toBe(true);
    }
  });

  it("fails closed for fixture and ambiguous operational paths", () => {
    for (const path of [
      "/employer/shifts/create",
      "/employer/applicants",
      "/employer/assignments/manual",
      "/employer/assignments/review",
      "/employer/assignments/confirmation",
      "/employer/assignments/worker-response",
      "/employer/assignments/detail",
      "/employer/orders/not-a-uuid",
      "/employer/%2f../payments",
      "//employer/calendar"
    ]) {
      expect(isProductionEmployerRouteAllowed(path), path).toBe(false);
    }
  });
});
