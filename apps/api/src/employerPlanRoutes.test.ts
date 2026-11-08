import type { PrismaClient } from "@rwos/database";
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { publicEmployerPlanCatalog, registerEmployerPlanRoutes } from "./employerPlanRoutes";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ORDER = "33333333-3333-4333-8333-333333333333";

function build() {
  const app = Fastify();
  const prisma = {
    employerPlan: { async findUnique() { return null; } },
    employerPlanOrder: { async findMany() { return []; } }
  } as unknown as PrismaClient;
  registerEmployerPlanRoutes(app, {
    prisma,
    fallbackOrigin: "http://localhost",
    requireStaff: async (request, reply) => {
      if (request.headers.authorization !== "Bearer staff") {
        reply.code(403).send({ error: "denied" });
        return null;
      }
      return "staff-1";
    },
    requireUser: async (request, reply) => {
      if (!request.headers.authorization) {
        reply.code(401).send({ error: "denied" });
        return null;
      }
      return "user-1";
    },
    isOrganizationManager: async (_userId, organizationId) => organizationId === ORG
  });
  return app;
}

const routes: Array<{ method: "GET" | "POST"; url: string; payload?: Record<string, unknown> }> = [
  { method: "GET", url: `/employer/plan?organizationId=${ORG}` },
  { method: "POST", url: "/employer/plan/trial", payload: { organizationId: ORG, plan: "shift_pro" } },
  { method: "POST", url: "/employer/plan/subscribe", payload: { organizationId: ORG, plan: "shift_pro", method: "e_transfer" } },
  { method: "POST", url: `/employer/plan/orders/${ORDER}/claim-etransfer`, payload: { organizationId: ORG } },
  { method: "POST", url: `/employer/plan/orders/${ORDER}/complete`, payload: { organizationId: ORG } },
  { method: "POST", url: "/employer/plan/cancel", payload: { organizationId: ORG, track: "short_term" } },
  { method: "GET", url: "/platform/employer-plan-orders" },
  { method: "POST", url: `/platform/employer-plan-orders/${ORDER}/confirm`, payload: {} },
  { method: "POST", url: `/platform/employer-plan-orders/${ORDER}/reject`, payload: {} }
];

describe("employer plan routes", () => {
  afterEach(() => {
    delete process.env.EMPLOYER_PLANS_ENABLED;
  });

  it("flag off: every plan-changing or plan-reading route is 404, even for staff", async () => {
    const app = build();
    for (const route of routes) {
      const res = await app.inject({
        method: route.method,
        url: route.url,
        headers: { authorization: "Bearer staff" },
        ...(route.payload ? { payload: route.payload } : {})
      });
      expect(res.statusCode, route.url).toBe(404);
    }
  });

  it("flag off: the public endpoint only says plans are off", async () => {
    const res = await build().inject({ method: "GET", url: "/public/employer-plans" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ enabled: false });
  });

  it("flag on: public catalog has the short-term plans + listing price and never mentions the platform share", async () => {
    process.env.EMPLOYER_PLANS_ENABLED = "enabled";
    const res = await build().inject({ method: "GET", url: "/public/employer-plans" });
    const body = res.json() as { enabled: boolean; catalog: unknown };
    expect(body.enabled).toBe(true);
    expect(body.catalog).toEqual(publicEmployerPlanCatalog());
    expect(publicEmployerPlanCatalog().map((t) => t.track)).toEqual(["short_term"]);
    expect(publicEmployerPlanCatalog()[0]?.plans.find((p) => p.code === "shift_pro")).toMatchObject({ monthlyPriceMinor: 4_900, gstMinor: 245, qstMinor: 489, totalMinor: 5_634 });
    expect((body as unknown as { listing: unknown }).listing).toMatchObject({ trialDays: 14, fullMonth: { totalMinor: 11_383 }, firstMonth: { subtotalMinor: 4_950, totalMinor: 5_692 } });
    expect(JSON.stringify(body)).not.toMatch(/margin|share|ppm/i);
  });

  it("flag on: employer routes need a signed-in manager of that organization", async () => {
    process.env.EMPLOYER_PLANS_ENABLED = "enabled";
    const app = build();
    expect((await app.inject({ method: "GET", url: `/employer/plan?organizationId=${ORG}` })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: `/employer/plan?organizationId=${OTHER}`, headers: { authorization: "Bearer x" } })).statusCode).toBe(404);
    const ok = await app.inject({ method: "GET", url: `/employer/plan?organizationId=${ORG}`, headers: { authorization: "Bearer x" } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ enabled: true, trialDays: 14, tracks: [{ track: "short_term", plan: "pay_per_shift" }] });
  });

  it("flag on: staff routes need staff authority; free plans cannot be bought", async () => {
    process.env.EMPLOYER_PLANS_ENABLED = "enabled";
    const app = build();
    expect((await app.inject({ method: "GET", url: "/platform/employer-plan-orders", headers: { authorization: "Bearer x" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/platform/employer-plan-orders", headers: { authorization: "Bearer staff" } })).statusCode).toBe(200);
    const res = await app.inject({
      method: "POST",
      url: "/employer/plan/subscribe",
      headers: { authorization: "Bearer x" },
      payload: { organizationId: ORG, plan: "pay_per_shift", method: "e_transfer" }
    });
    expect(res.statusCode).toBe(400);
  });
});
