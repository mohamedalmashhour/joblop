import type { PrismaClient } from "@rwos/database";
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { publicEmployerPlanCatalog, registerEmployerPlanRoutes } from "./employerPlanRoutes";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import { createPaymentTestPrisma } from "./paymentTestPrisma";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ORDER = "33333333-3333-4333-8333-333333333333";

function build(options: { prisma?: PrismaClient; emailSender?: EmailSender; logs?: string[] } = {}) {
  const app = Fastify();
  const prisma = options.prisma ?? createPaymentTestPrisma().prisma;
  registerEmployerPlanRoutes(app, {
    prisma,
    ...(options.emailSender ? { emailSender: options.emailSender } : {}),
    log: (event) => options.logs?.push(event),
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
  { method: "GET", url: `/employer/receipts/${ORDER}/pdf?organizationId=${ORG}` },
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

describe("receipts by email and staff confirm (B6, S2, S9)", () => {
  afterEach(() => {
    delete process.env.EMPLOYER_PLANS_ENABLED;
  });

  function setup(send: EmailSender["send"]) {
    process.env.EMPLOYER_PLANS_ENABLED = "enabled";
    const env = createPaymentTestPrisma({
      organizations: [{ id: ORG, displayName: "Acme", legalName: "Acme Care Inc.", createdByUserId: "owner-1" }],
      users: [{ id: "owner-1", emailNormalized: "owner@acme.test", phone: null, primaryLanguage: "en" }]
    });
    const logs: string[] = [];
    const app = build({ prisma: env.prisma, emailSender: { configured: true, send }, logs });
    return { app, logs, ...env };
  }

  async function subscribe(app: ReturnType<typeof build>) {
    const res = await app.inject({ method: "POST", url: "/employer/plan/subscribe", headers: { authorization: "Bearer x" }, payload: { organizationId: ORG, plan: "shift_pro", method: "e_transfer" } });
    return res.json() as { order: { id: string; reference: string }; eTransfer: { amount: string; reference: string } };
  }

  it("staff confirm with the Interac reference: the receipt PDF is emailed to the company and can be downloaded", async () => {
    const sent: EmailMessage[] = [];
    const { app, tables, logs } = setup(async (message) => {
      sent.push(message);
      return { status: "sent", id: "m-1" };
    });
    const { order, eTransfer } = await subscribe(app);
    expect(eTransfer).toMatchObject({ amount: "$56.34", reference: order.reference });
    const confirm = await app.inject({
      method: "POST",
      url: `/platform/employer-plan-orders/${order.id}/confirm`,
      headers: { authorization: "Bearer staff" },
      payload: { interacReference: "CA9X7Y", amountReceived: "56.34" }
    });
    expect(confirm.statusCode).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "owner@acme.test", subject: "Joblop — receipt RCPT-2026-000001" });
    expect(sent[0]!.text).toContain("$56.34");
    expect(sent[0]!.attachments?.[0]?.name).toBe("RCPT-2026-000001.pdf");
    expect(tables.receipts[0]).toMatchObject({ emailStatus: "sent" });
    expect(logs).toContain("api.payment_receipt.email");

    const overview = await app.inject({ method: "GET", url: `/employer/plan?organizationId=${ORG}`, headers: { authorization: "Bearer x" } });
    const receiptId = (overview.json() as { receipts: { id: string }[] }).receipts[0]!.id;
    const pdf = await app.inject({ method: "GET", url: `/employer/receipts/${receiptId}/pdf?organizationId=${ORG}`, headers: { authorization: "Bearer x" } });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    const body = pdf.rawPayload.toString("latin1");
    expect(body.startsWith("%PDF-1.4")).toBe(true);
    for (const text of ["RCPT-2026-000001", "9375-7649 Qu", "762614485RT0001", "1225519125TQ0002", "Acme", "Shift Pro", "$49.00", "$2.45", "$4.89", "$56.34", "CA9X7Y"]) {
      expect(body, text).toContain(text);
    }
    // Another company cannot read it.
    const other = await app.inject({ method: "GET", url: `/employer/receipts/${receiptId}/pdf?organizationId=${OTHER}`, headers: { authorization: "Bearer x" } });
    expect(other.statusCode).toBe(404);
  });

  it("a failed email never undoes the payment; it is recorded and logged", async () => {
    const { app, tables, logs } = setup(async () => {
      throw new Error("mail down");
    });
    const { order } = await subscribe(app);
    const confirm = await app.inject({ method: "POST", url: `/platform/employer-plan-orders/${order.id}/confirm`, headers: { authorization: "Bearer staff" }, payload: {} });
    expect(confirm.statusCode).toBe(200);
    expect(tables.planOrders[0]).toMatchObject({ status: "paid" });
    expect(tables.plans[0]).toMatchObject({ status: "active" });
    expect(tables.receipts[0]).toMatchObject({ emailStatus: "error" });
    expect(logs).toContain("api.payment_receipt.email_failed");
  });

  it("an unreadable amount is refused; a canceled-by-employer order answers with a plain message", async () => {
    const { app } = setup(async () => ({ status: "sent", id: "m" }));
    await app.inject({ method: "POST", url: "/employer/plan/trial", headers: { authorization: "Bearer x" }, payload: { organizationId: ORG, plan: "shift_pro" } });
    const { order } = await subscribe(app);
    const bad = await app.inject({ method: "POST", url: `/platform/employer-plan-orders/${order.id}/confirm`, headers: { authorization: "Bearer staff" }, payload: { amountReceived: "fifty" } });
    expect(bad.statusCode).toBe(400);
    await app.inject({ method: "POST", url: `/employer/plan/orders/${order.id}/claim-etransfer`, headers: { authorization: "Bearer x" }, payload: { organizationId: ORG } });
    const cancel = await app.inject({ method: "POST", url: "/employer/plan/cancel", headers: { authorization: "Bearer x" }, payload: { organizationId: ORG, track: "short_term" } });
    expect(cancel.json()).toMatchObject({ withdrawn: { refundCheck: 1 } });
    const blocked = await app.inject({ method: "POST", url: `/platform/employer-plan-orders/${order.id}/confirm`, headers: { authorization: "Bearer staff" }, payload: {} });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toMatchObject({ error: "RWOS_ORDER_CANCELED_BY_EMPLOYER" });
    expect(blocked.json().message).toContain("Canceled by employer");
    const open = await app.inject({ method: "GET", url: "/platform/employer-plan-orders", headers: { authorization: "Bearer staff" } });
    expect(open.json().orders[0]).toMatchObject({ status: "refund_check" });
    const done = await app.inject({ method: "GET", url: "/platform/employer-plan-orders?view=done", headers: { authorization: "Bearer staff" } });
    expect(done.json().orders).toEqual([]);
  });
});
