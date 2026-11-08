import type { PrismaClient } from "@rwos/database";
import {
  EMPLOYER_PLAN_TRIAL_DAYS,
  JOB_LISTING_TRIAL_DAYS,
  isPaidEmployerPlanCode,
  jobListingMonthPrice,
  plansForTrack,
  quebecSalesTax
} from "@rwos/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  adminConfirmEmployerPlanOrder,
  adminRejectEmployerPlanOrder,
  cancelEmployerPlan,
  claimEmployerPlanETransfer,
  completeEmployerPlanStripeOrder,
  createPendingEmployerPlanOrder,
  employerPlanETransferInstructions,
  getEmployerPlanOverview,
  isEmployerPlanMethod,
  isEmployerPlansEnabled,
  listEmployerPlanOrdersForReview,
  startEmployerPlanStripeCheckout,
  startEmployerPlanTrial
} from "./employerPlanRepository";
import { isStripeTestConfigured } from "./cvProStripeCheckout";
import { registerJobListingRoutes } from "./jobListingRoutes";

// EMPLOYER FIXED PLANS routes. Every route answers 404 unless EMPLOYER_PLANS_ENABLED === "enabled",
// except GET /public/employer-plans, which only reports whether plans are on (so the public /plans
// page can show "coming soon"). Employer routes take the organization from the query (GET) or body
// (POST); the caller must be an active owner/administrator of that organization — the same rule the
// other employer routes use. Staff routes need HR/platform administrator authority. Card payment is
// Stripe TEST mode only.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EmployerPlanRouteDeps = Readonly<{
  prisma: PrismaClient;
  /** Staff (HR_ADMINISTRATOR or PLATFORM_ADMINISTRATOR). Sends the 401/403 itself and returns null. */
  requireStaff(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  /** Any signed-in user. Sends the 401 itself and returns null. */
  requireUser(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  /** True when the user is an active owner/administrator member of the organization. */
  isOrganizationManager(userId: string, organizationId: string): Promise<boolean>;
  fallbackOrigin: string;
  now?: () => Date;
}>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function notFound(reply: FastifyReply) {
  return reply.code(404).send({ error: "RWOS_RESOURCE_UNAVAILABLE", message: "Resource unavailable." });
}

/**
 * Public, non-personal description of the plans (no platform share is ever included). Plans exist for
 * short-term jobs only; prices carry GST + QST. Long-term jobs are a paid listing (see listingPricing).
 */
export function publicEmployerPlanCatalog() {
  return [
    {
      track: "short_term" as const,
      plans: plansForTrack("short_term").map((plan) => {
        const taxes = quebecSalesTax(plan.monthlyPriceMinor);
        return {
          code: plan.code,
          monthlyPriceMinor: plan.monthlyPriceMinor,
          gstMinor: taxes.gstMinor,
          qstMinor: taxes.qstMinor,
          totalMinor: taxes.totalMinor,
          currency: plan.currency,
          discountPercent: plan.employerDiscountPpm / 10_000,
          urgentFeeHalf: plan.urgentSurchargeFactorPpm < 1_000_000
        };
      })
    }
  ];
}

/** Public long-term listing price: C$99/month in advance (+ taxes), 2-week trial, 50% off month one. */
export function publicListingPricing() {
  return { trialDays: JOB_LISTING_TRIAL_DAYS, fullMonth: jobListingMonthPrice(false), firstMonth: jobListingMonthPrice(true) };
}

export function registerEmployerPlanRoutes(app: FastifyInstance, deps: EmployerPlanRouteDeps) {
  const { prisma } = deps;
  const now = deps.now ?? (() => new Date());

  // Resolve + authorize the organization for an employer call. Same 404 for "not yours" and "flag
  // off" so nothing leaks. Shared with the long-term job listing routes.
  async function employerOrganization(
    request: FastifyRequest,
    reply: FastifyReply,
    source: "query" | "body"
  ): Promise<string | null> {
    if (!isEmployerPlansEnabled()) {
      notFound(reply);
      return null;
    }
    const userId = await deps.requireUser(request, reply);
    if (!userId) return null;
    const organizationId = text(record(source === "query" ? request.query : request.body).organizationId);
    if (!organizationId || !UUID.test(organizationId) || !(await deps.isOrganizationManager(userId, organizationId))) {
      notFound(reply);
      return null;
    }
    return organizationId;
  }

  function orderId(request: FastifyRequest): string | null {
    const id = text(record(request.params).id);
    return id && UUID.test(id) ? id : null;
  }

  app.get("/public/employer-plans", async (_request, reply) => {
    const enabled = isEmployerPlansEnabled();
    return reply
      .code(200)
      .header("cache-control", "no-store")
      .send(
        enabled
          ? { enabled, trialDays: EMPLOYER_PLAN_TRIAL_DAYS, catalog: publicEmployerPlanCatalog(), listing: publicListingPricing() }
          : { enabled }
      );
  });

  app.get("/employer/plan", async (request, reply) => {
    const organizationId = await employerOrganization(request, reply, "query");
    if (!organizationId) return;
    const overview = await getEmployerPlanOverview(prisma, organizationId, now());
    return reply
      .code(200)
      .header("cache-control", "no-store")
      .send({
        enabled: true,
        trialDays: EMPLOYER_PLAN_TRIAL_DAYS,
        catalog: publicEmployerPlanCatalog(),
        listing: publicListingPricing(),
        cardEnabled: isStripeTestConfigured(),
        ...overview
      });
  });

  app.post("/employer/plan/trial", async (request, reply) => {
    const organizationId = await employerOrganization(request, reply, "body");
    if (!organizationId) return;
    const result = await startEmployerPlanTrial(prisma, organizationId, record(request.body).plan, now());
    if (!result.ok) {
      return reply
        .code(result.reason === "invalid_plan" ? 400 : 409)
        .send({ error: "RWOS_EMPLOYER_PLAN_TRIAL_" + result.reason.toUpperCase() });
    }
    return reply.code(200).send({ plan: result.plan, trialDays: EMPLOYER_PLAN_TRIAL_DAYS });
  });

  app.post("/employer/plan/subscribe", async (request, reply) => {
    const organizationId = await employerOrganization(request, reply, "body");
    if (!organizationId) return;
    const body = record(request.body);
    const plan = body.plan;
    if (!isPaidEmployerPlanCode(plan)) return reply.code(400).send({ error: "RWOS_EMPLOYER_PLAN_INVALID" });
    const method = isEmployerPlanMethod(body.method) ? body.method : "e_transfer";
    if (method === "stripe") {
      const bodyOrigin = text(body.origin);
      const origin = bodyOrigin && /^https?:\/\//u.test(bodyOrigin) ? bodyOrigin : deps.fallbackOrigin;
      const checkout = await startEmployerPlanStripeCheckout(prisma, organizationId, plan, origin);
      if (!checkout.ok) {
        return reply.code(423).send({ error: "RWOS_PAYMENTS_FROZEN", message: "Card payments are not enabled yet — use Interac e-transfer." });
      }
      return reply.code(201).send({ order: checkout.order, checkoutUrl: checkout.checkoutUrl });
    }
    const order = await createPendingEmployerPlanOrder(prisma, organizationId, plan, method);
    return reply.code(201).send({ order, eTransfer: employerPlanETransferInstructions(order) });
  });

  app.post("/employer/plan/orders/:id/claim-etransfer", async (request, reply) => {
    const organizationId = await employerOrganization(request, reply, "body");
    if (!organizationId) return;
    const id = orderId(request);
    if (!id) return notFound(reply);
    const result = await claimEmployerPlanETransfer(prisma, organizationId, id);
    if (!result.ok) {
      return reply.code(result.reason === "order_not_found" ? 404 : 409).send({ error: "RWOS_ORDER_" + result.reason.toUpperCase() });
    }
    return reply.code(200).send({ order: result.order });
  });

  app.post("/employer/plan/orders/:id/complete", async (request, reply) => {
    const organizationId = await employerOrganization(request, reply, "body");
    if (!organizationId) return;
    const id = orderId(request);
    if (!id) return notFound(reply);
    const result = await completeEmployerPlanStripeOrder(prisma, organizationId, id, now());
    if (!result.ok) {
      if (result.reason === "stripe_unconfigured") return reply.code(423).send({ error: "RWOS_PAYMENTS_FROZEN" });
      if (result.reason === "payment_incomplete") return reply.code(402).send({ error: "RWOS_PAYMENT_INCOMPLETE" });
      return reply.code(result.reason === "order_not_found" ? 404 : 409).send({ error: "RWOS_ORDER_" + result.reason.toUpperCase() });
    }
    return reply.code(200).send({ order: result.order });
  });

  app.post("/employer/plan/cancel", async (request, reply) => {
    const organizationId = await employerOrganization(request, reply, "body");
    if (!organizationId) return;
    const result = await cancelEmployerPlan(prisma, organizationId, record(request.body).track, now());
    if (!result.ok) {
      return reply.code(result.reason === "invalid_track" ? 400 : 409).send({ error: "RWOS_EMPLOYER_PLAN_" + result.reason.toUpperCase() });
    }
    return reply.code(200).send({ plan: result.plan });
  });

  // ── staff review queue ──

  app.get("/platform/employer-plan-orders", async (request, reply) => {
    if (!isEmployerPlansEnabled()) return notFound(reply);
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    return reply.code(200).header("cache-control", "no-store").send({ orders: await listEmployerPlanOrdersForReview(prisma) });
  });

  app.post("/platform/employer-plan-orders/:id/confirm", async (request, reply) => {
    if (!isEmployerPlansEnabled()) return notFound(reply);
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const id = orderId(request);
    if (!id) return notFound(reply);
    const result = await adminConfirmEmployerPlanOrder(prisma, id, now());
    if (!result.ok) {
      return reply.code(result.reason === "order_not_found" ? 404 : 409).send({ error: "RWOS_ORDER_" + result.reason.toUpperCase() });
    }
    return reply.code(200).send({ order: result.order });
  });

  app.post("/platform/employer-plan-orders/:id/reject", async (request, reply) => {
    if (!isEmployerPlansEnabled()) return notFound(reply);
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const id = orderId(request);
    if (!id) return notFound(reply);
    if (!(await adminRejectEmployerPlanOrder(prisma, id))) return notFound(reply);
    return reply.code(200).send({ canceled: true });
  });

  // ── long-term job listings (paid in advance; same flag, same employer/staff rules) ──
  registerJobListingRoutes(app, { prisma, requireStaff: deps.requireStaff, employerOrganization, fallbackOrigin: deps.fallbackOrigin, now });
}
