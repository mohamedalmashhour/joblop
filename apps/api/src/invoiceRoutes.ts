import { createHash, randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { InvoiceActorRole, InvoiceStatus } from "@rwos/shared";
import {
  renderBilingualSyntheticCreditNotePdf,
  renderBilingualSyntheticInvoicePdf
} from "./invoicePdf";
import type { InvoiceRepository } from "./invoiceRepository";

export type InvoiceRouteAuthorization = Readonly<{
  actorId: string;
  role: InvoiceActorRole;
}>;

export function registerInvoiceRoutes(
  app: FastifyInstance,
  options: {
    repository: InvoiceRepository;
    authorize(
      request: FastifyRequest,
      organizationId: string
    ): Promise<InvoiceRouteAuthorization | null>;
  }
) {
  app.get("/organizations/:organizationId/invoices", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    if (!(await options.authorize(request, organizationId))) return unavailable(reply);
    const statuses = statusList(record(request.query).status);
    if (statuses === null) return invalid(reply);
    return reply.send({ invoices: await options.repository.list(organizationId, statuses) });
  });

  app.get("/organizations/:organizationId/invoices/:invoiceId", async (request, reply) => {
    const scope = await authorizedInvoice(request, options);
    if (!scope) return unavailable(reply);
    return reply.send({ invoice: scope.invoice });
  });

  app.get("/organizations/:organizationId/invoices/:invoiceId/pdf", async (request, reply) => {
    const scope = await authorizedInvoice(request, options);
    if (!scope) return unavailable(reply);
    try {
      const rendered = renderBilingualSyntheticInvoicePdf(scope.invoice);
      return reply
        .type("application/pdf")
        .header("content-disposition", `attachment; filename="${rendered.filename}"`)
        .send(rendered.bytes);
    } catch {
      return conflict(reply, "Invoice PDF is unavailable until the invoice is issued.");
    }
  });

  app.get("/organizations/:organizationId/invoices/:invoiceId/audit", async (request, reply) => {
    const scope = await authorizedInvoice(request, options);
    if (!scope) return unavailable(reply);
    return reply.send({
      audit: await options.repository.listAudit(scope.invoice.id, scope.invoice.organizationId)
    });
  });

  app.get("/organizations/:organizationId/invoices/:invoiceId/deliveries", async (request, reply) => {
    const scope = await authorizedInvoice(request, options);
    if (!scope) return unavailable(reply);
    return reply.send({
      deliveries: await options.repository.listDeliveries(
        scope.invoice.id,
        scope.invoice.organizationId
      )
    });
  });

  app.post("/organizations/:organizationId/invoices/:invoiceId/deliveries", async (request, reply) => {
    const scope = await authorizedInvoice(request, options);
    if (!scope) return unavailable(reply);
    const body = record(request.body);
    const recipientAlias = text(body.recipientAlias);
    const idempotencyKey = text(body.idempotencyKey);
    const expectedVersion = positiveInteger(body.expectedVersion);
    if (!recipientAlias || !idempotencyKey || expectedVersion === null) return invalid(reply);
    try {
      const rendered = renderBilingualSyntheticInvoicePdf(scope.invoice);
      const result = await options.repository.recordFakeDelivery({
        id: randomUUID(),
        invoiceId: scope.invoice.id,
        organizationId: scope.invoice.organizationId,
        expectedVersion,
        recipientAlias,
        documentDigest: createHash("sha256").update(rendered.bytes).digest("hex"),
        idempotencyKey,
        actorReference: scope.authorization.actorId,
        actorRole: scope.authorization.role
      });
      return reply.code(201).send(result);
    } catch (error) {
      return invoiceFailure(reply, error);
    }
  });

  app.get("/organizations/:organizationId/invoices/:invoiceId/credit-notes", async (request, reply) => {
    const scope = await authorizedInvoice(request, options);
    if (!scope) return unavailable(reply);
    return reply.send({
      creditNotes: await options.repository.listCreditNotes(
        scope.invoice.id,
        scope.invoice.organizationId
      )
    });
  });

  app.post("/organizations/:organizationId/invoices/:invoiceId/credit-notes", async (request, reply) => {
    const scope = await authorizedInvoice(request, options);
    if (!scope) return unavailable(reply);
    const body = record(request.body);
    const amountMinor = positiveInteger(body.amountMinor);
    const reason = text(body.reason);
    const idempotencyKey = text(body.idempotencyKey);
    if (amountMinor === null || !reason || !idempotencyKey) return invalid(reply);
    try {
      const creditNote = await options.repository.createCreditNote({
        id: randomUUID(),
        invoiceId: scope.invoice.id,
        organizationId: scope.invoice.organizationId,
        amountMinor,
        reason,
        idempotencyKey,
        actorReference: scope.authorization.actorId,
        actorRole: scope.authorization.role
      });
      return reply.code(201).send({ creditNote });
    } catch (error) {
      return invoiceFailure(reply, error);
    }
  });

  app.get(
    "/organizations/:organizationId/invoices/:invoiceId/credit-notes/:creditNoteId/pdf",
    async (request, reply) => {
      const scope = await authorizedInvoice(request, options);
      if (!scope) return unavailable(reply);
      const notes = await options.repository.listCreditNotes(
        scope.invoice.id,
        scope.invoice.organizationId
      );
      const creditNote = notes.find(
        (note) => note.id === routeParam(request.params, "creditNoteId")
      );
      if (!creditNote) return unavailable(reply);
      try {
        const rendered = renderBilingualSyntheticCreditNotePdf(scope.invoice, creditNote);
        return reply
          .type("application/pdf")
          .header("content-disposition", `attachment; filename="${rendered.filename}"`)
          .send(rendered.bytes);
      } catch {
        return conflict(reply, "Credit-note PDF is unavailable until issuance.");
      }
    }
  );

  for (const action of ["approve", "reject", "issue"] as const) {
    app.post(
      `/organizations/:organizationId/invoices/:invoiceId/credit-notes/:creditNoteId/${action}`,
      async (request, reply) => {
        const scope = await authorizedInvoice(request, options);
        if (!scope) return unavailable(reply);
        const body = record(request.body);
        const expectedVersion = positiveInteger(body.expectedVersion);
        const reason = text(body.reason) ?? undefined;
        if (expectedVersion === null || (action === "reject" && !reason)) return invalid(reply);
        try {
          const creditNote = await options.repository.transitionCreditNote({
            creditNoteId: routeParam(request.params, "creditNoteId"),
            invoiceId: scope.invoice.id,
            organizationId: scope.invoice.organizationId,
            expectedVersion,
            action,
            ...(reason ? { reason } : {}),
            actorReference: scope.authorization.actorId,
            actorRole: scope.authorization.role
          });
          return reply.send({ creditNote });
        } catch (error) {
          return invoiceFailure(reply, error);
        }
      }
    );
  }
}

async function authorizedInvoice(
  request: FastifyRequest,
  options: Parameters<typeof registerInvoiceRoutes>[1]
) {
  const organizationId = routeParam(request.params, "organizationId");
  const authorization = await options.authorize(request, organizationId);
  if (!authorization) return null;
  const invoice = await options.repository.get(
    routeParam(request.params, "invoiceId"),
    organizationId
  );
  return invoice ? { authorization, invoice } : null;
}

function statusList(value: unknown): readonly InvoiceStatus[] | undefined | null {
  if (value === undefined) return undefined;
  const values = (Array.isArray(value) ? value : [value]).filter(
    (item): item is InvoiceStatus =>
      typeof item === "string" &&
      [
        "draft", "approved", "issued", "sent", "viewed", "partially_paid", "paid",
        "overdue", "disputed", "voided", "refunded"
      ].includes(item)
  );
  return values.length === (Array.isArray(value) ? value.length : 1) ? values : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function routeParam(value: unknown, key: string) {
  return text(record(value)[key]) ?? "";
}

function unavailable(reply: { code(status: number): { send(value: unknown): unknown } }) {
  return reply.code(404).send({
    error: "RWOS_RESOURCE_UNAVAILABLE",
    message: "Resource unavailable."
  });
}

function invalid(reply: { code(status: number): { send(value: unknown): unknown } }) {
  return reply.code(400).send({
    error: "RWOS_INVALID_INVOICE_REQUEST",
    message: "Invalid invoice request."
  });
}

function conflict(
  reply: { code(status: number): { send(value: unknown): unknown } },
  message: string
) {
  return reply.code(409).send({ error: "RWOS_INVOICE_CONFLICT", message });
}

function invoiceFailure(
  reply: { code(status: number): { send(value: unknown): unknown } },
  error: unknown
) {
  const message = error instanceof Error ? error.message : "";
  const isConflict = /conflict|requires|exceeds|idempotency/u.test(message);
  return isConflict
    ? conflict(reply, "Invoice state conflict.")
    : invalid(reply);
}
