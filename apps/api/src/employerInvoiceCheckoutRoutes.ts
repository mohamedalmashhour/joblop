import type { FastifyInstance, FastifyRequest } from "fastify";
import type { PrismaClient } from "@rwos/database";
import type { InvoiceActorRole } from "@rwos/shared";
import type { InvoiceRepository } from "./invoiceRepository";
import {
  startInvoiceCheckout,
  completeInvoiceCheckout,
  isInvoiceCollectionEnabled
} from "./employerInvoiceCollection";

// Money-flow Phase 1 — the two employer/finance-scoped HTTP endpoints for the Stripe TEST invoice
// collection. Kept in a dedicated, conditionally-mounted module (like invoiceRoutes/paymentRoutes) so
// app.ts itself carries no money-execution route literals. Inert unless INVOICE_TEST_MODE_ENABLED + the
// Stripe TEST keys are present (the collection module fail-closes). FINANCE_LIVE is never consulted.

export type InvoiceCheckoutAuthorization = Readonly<{ actorId: string; role: InvoiceActorRole }>;

export function registerEmployerInvoiceCheckoutRoutes(
  app: FastifyInstance,
  options: {
    prisma: PrismaClient;
    repository: InvoiceRepository;
    fallbackOrigin: string;
    authorize(request: FastifyRequest, organizationId: string): Promise<InvoiceCheckoutAuthorization | null>;
  }
) {
  const resolveOrigin = (request: FastifyRequest, bodyOrigin: string | null): string => {
    if (bodyOrigin && /^https?:\/\//u.test(bodyOrigin)) return bodyOrigin;
    const header = request.headers.origin;
    if (typeof header === "string" && /^https?:\/\//u.test(header)) return header;
    return options.fallbackOrigin;
  };

  app.post("/organizations/:organizationId/invoices/:invoiceId/checkout", async (request, reply) => {
    const { organizationId, invoiceId } = params(request);
    const auth = await options.authorize(request, organizationId);
    if (!auth) return unavailable(reply);
    if (!isInvoiceCollectionEnabled()) return gated(reply);
    const body = record(request.body);
    const origin = resolveOrigin(request, text(body.origin));
    const result = await startInvoiceCheckout(options.prisma, options.repository, { organizationId, invoiceId, origin });
    if (!result.ok) {
      const code = result.reason === "stripe_unconfigured" || result.reason === "collection_disabled" ? 423 : 409;
      return reply.code(code).send({ error: "RWOS_INVOICE_CHECKOUT_UNAVAILABLE", reason: result.reason });
    }
    return reply.code(200).send({ checkout: result.checkout, checkoutUrl: result.checkoutUrl });
  });

  app.post("/organizations/:organizationId/invoices/:invoiceId/checkout/complete", async (request, reply) => {
    const { organizationId, invoiceId } = params(request);
    const auth = await options.authorize(request, organizationId);
    if (!auth) return unavailable(reply);
    if (!isInvoiceCollectionEnabled()) return gated(reply);
    const result = await completeInvoiceCheckout(options.prisma, options.repository, {
      organizationId,
      invoiceId,
      actorReference: auth.actorId,
      actorRole: auth.role
    });
    if (!result.ok) {
      const code =
        result.reason === "stripe_unconfigured" || result.reason === "collection_disabled"
          ? 423
          : result.reason === "payment_incomplete"
            ? 409
            : 404;
      return reply.code(code).send({ error: "RWOS_INVOICE_CHECKOUT_INCOMPLETE", reason: result.reason });
    }
    return reply.code(200).send({ invoice: result.invoice, checkout: result.checkout });
  });
}

function params(request: FastifyRequest): { organizationId: string; invoiceId: string } {
  const p = record(request.params);
  return { organizationId: text(p.organizationId) ?? "", invoiceId: text(p.invoiceId) ?? "" };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unavailable(reply: { code(status: number): { send(value: unknown): unknown } }) {
  return reply.code(404).send({ error: "RWOS_RESOURCE_UNAVAILABLE", message: "Resource unavailable." });
}

function gated(reply: { code(status: number): { send(value: unknown): unknown } }) {
  return reply.code(423).send({
    error: "RWOS_INVOICE_COLLECTION_GATED",
    message: "Employer invoice collection is off (INVOICE_TEST_MODE gated)."
  });
}
