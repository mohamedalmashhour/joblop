import type { PrismaClient } from "@rwos/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isStripeTestConfigured } from "./cvProStripeCheckout";
import { isEmployerPlanMethod, isEmployerPlansEnabled } from "./employerPlanRepository";
import { orderActionError, readStaffConfirmBody } from "./paymentOrderHttp";
import {
  adminConfirmJobListingOrder,
  adminRejectJobListingOrder,
  claimJobListingETransfer,
  completeJobListingStripeOrder,
  createPendingJobListingOrder,
  getJobListingOverview,
  jobListingETransferInstructions,
  listJobListingOrdersForReview,
  startJobListingStripeCheckout,
  startJobListingTrial
} from "./jobListingRepository";

// LONG-TERM JOB LISTING routes (paid in advance). Registered by registerEmployerPlanRoutes and gated by
// the same EMPLOYER_PLANS_ENABLED flag: every route answers 404 while it is off. Employer routes take
// the organization from the query (GET) or body (POST) and need an active owner/administrator of it;
// staff routes need HR/platform administrator authority. Card payment is Stripe TEST mode only.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type JobListingRouteDeps = Readonly<{
  prisma: PrismaClient;
  requireStaff(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  /** Flag check + caller manages the organization; sends the 404/401 itself and returns null. */
  employerOrganization(request: FastifyRequest, reply: FastifyReply, source: "query" | "body"): Promise<string | null>;
  fallbackOrigin: string;
  now: () => Date;
  /** Email the receipt of a just-paid order (best effort, never throws). */
  emailReceipt?: (receiptId: string | null) => Promise<void>;
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

function param(request: FastifyRequest, name: string): string | null {
  const id = text(record(request.params)[name]);
  return id && UUID.test(id) ? id : null;
}

export function registerJobListingRoutes(app: FastifyInstance, deps: JobListingRouteDeps) {
  const { prisma, now } = deps;

  app.get("/employer/job-listings", async (request, reply) => {
    const organizationId = await deps.employerOrganization(request, reply, "query");
    if (!organizationId) return;
    const overview = await getJobListingOverview(prisma, organizationId, now());
    return reply
      .code(200)
      .header("cache-control", "no-store")
      .send({ enabled: true, cardEnabled: isStripeTestConfigured(), ...overview });
  });

  app.post("/employer/job-listings/:jobRequestId/trial", async (request, reply) => {
    const organizationId = await deps.employerOrganization(request, reply, "body");
    if (!organizationId) return;
    const jobRequestId = param(request, "jobRequestId");
    if (!jobRequestId) return notFound(reply);
    const result = await startJobListingTrial(prisma, organizationId, jobRequestId, now());
    if (!result.ok) {
      if (result.reason === "job_not_found") return notFound(reply);
      return reply
        .code(result.reason === "not_long_term" ? 400 : 409)
        .send({ error: "RWOS_JOB_LISTING_" + result.reason.toUpperCase() });
    }
    return reply.code(200).send({ listing: result.listing });
  });

  app.post("/employer/job-listings/:jobRequestId/pay", async (request, reply) => {
    const organizationId = await deps.employerOrganization(request, reply, "body");
    if (!organizationId) return;
    const jobRequestId = param(request, "jobRequestId");
    if (!jobRequestId) return notFound(reply);
    const body = record(request.body);
    const method = isEmployerPlanMethod(body.method) ? body.method : "e_transfer";
    if (method === "stripe") {
      const bodyOrigin = text(body.origin);
      const origin = bodyOrigin && /^https?:\/\//u.test(bodyOrigin) ? bodyOrigin : deps.fallbackOrigin;
      const checkout = await startJobListingStripeCheckout(prisma, organizationId, jobRequestId, origin);
      if (!checkout.ok) {
        if (checkout.reason === "job_not_found") return notFound(reply);
        if (checkout.reason === "not_long_term") return reply.code(400).send({ error: "RWOS_JOB_LISTING_NOT_LONG_TERM" });
        return reply.code(423).send({ error: "RWOS_PAYMENTS_FROZEN", message: "Card payments are not enabled yet — use Interac e-transfer." });
      }
      return reply.code(201).send({ order: checkout.order, checkoutUrl: checkout.checkoutUrl });
    }
    const created = await createPendingJobListingOrder(prisma, organizationId, jobRequestId, method);
    if (!created.ok) {
      if (created.reason === "job_not_found") return notFound(reply);
      return reply.code(400).send({ error: "RWOS_JOB_LISTING_NOT_LONG_TERM" });
    }
    return reply.code(201).send({ order: created.order, eTransfer: jobListingETransferInstructions(created.order) });
  });

  app.post("/employer/job-listings/orders/:id/claim-etransfer", async (request, reply) => {
    const organizationId = await deps.employerOrganization(request, reply, "body");
    if (!organizationId) return;
    const id = param(request, "id");
    if (!id) return notFound(reply);
    const result = await claimJobListingETransfer(prisma, organizationId, id, now());
    if (!result.ok) {
      return reply.code(result.reason === "order_not_found" ? 404 : 409).send({ error: "RWOS_ORDER_" + result.reason.toUpperCase() });
    }
    return reply.code(200).send({ order: result.order });
  });

  app.post("/employer/job-listings/orders/:id/complete", async (request, reply) => {
    const organizationId = await deps.employerOrganization(request, reply, "body");
    if (!organizationId) return;
    const id = param(request, "id");
    if (!id) return notFound(reply);
    const result = await completeJobListingStripeOrder(prisma, organizationId, id, now());
    if (!result.ok) {
      if (result.reason === "stripe_unconfigured") return reply.code(423).send({ error: "RWOS_PAYMENTS_FROZEN" });
      if (result.reason === "payment_incomplete") return reply.code(402).send({ error: "RWOS_PAYMENT_INCOMPLETE" });
      return reply.code(result.reason === "order_not_found" ? 404 : 409).send({ error: "RWOS_ORDER_" + result.reason.toUpperCase() });
    }
    await deps.emailReceipt?.(result.receiptId);
    return reply.code(200).send({ order: result.order });
  });

  // ── staff review queue ──

  app.get("/platform/job-listing-orders", async (request, reply) => {
    if (!isEmployerPlansEnabled()) return notFound(reply);
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const view = record(request.query).view === "done" ? "done" : "open";
    return reply.code(200).header("cache-control", "no-store").send({ orders: await listJobListingOrdersForReview(prisma, view) });
  });

  app.post("/platform/job-listing-orders/:id/confirm", async (request, reply) => {
    if (!isEmployerPlansEnabled()) return notFound(reply);
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const id = param(request, "id");
    if (!id) return notFound(reply);
    const input = readStaffConfirmBody(request.body);
    if (input === "invalid") return reply.code(400).send({ error: "RWOS_ORDER_AMOUNT_INVALID", message: "Type the amount received like 56.92." });
    const result = await adminConfirmJobListingOrder(prisma, id, now(), input);
    if (!result.ok) {
      const error = orderActionError(result.reason);
      return reply.code(error.code).send(error.body);
    }
    await deps.emailReceipt?.(result.receiptId);
    return reply.code(200).send({ order: result.order });
  });

  app.post("/platform/job-listing-orders/:id/reject", async (request, reply) => {
    if (!isEmployerPlansEnabled()) return notFound(reply);
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    const id = param(request, "id");
    if (!id) return notFound(reply);
    if (!(await adminRejectJobListingOrder(prisma, id, now()))) return notFound(reply);
    return reply.code(200).send({ canceled: true });
  });
}
