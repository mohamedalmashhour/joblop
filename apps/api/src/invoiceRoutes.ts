import { createHash, randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  PLATFORM_INVOICE_ISSUER,
  PLATFORM_INVOICE_TAX,
  calculateInvoiceSnapshot,
  employerTransferSurchargeMinor,
  type InvoiceActorRole,
  type InvoiceCalculationInput,
  type InvoiceNumberingConfiguration,
  type InvoiceStatus
} from "@rwos/shared";
import {
  renderBilingualSyntheticCreditNotePdf,
  renderBilingualSyntheticInvoicePdf,
  type InvoicePdfDetails
} from "./invoicePdf";
import type { DurableInvoice, InvoiceRepository } from "./invoiceRepository";

export type InvoiceRouteAuthorization = Readonly<{
  actorId: string;
  role: InvoiceActorRole;
}>;

// An employer sees an invoice only once staff have sent it. Drafts and issued-but-unsent invoices are
// still Joblop's own working papers.
const EMPLOYER_VISIBLE_INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "sent",
  "viewed",
  "partially_paid",
  "paid",
  "overdue",
  "disputed",
  "voided",
  "refunded"
];

function canSeeInvoice(role: InvoiceActorRole, status: InvoiceStatus): boolean {
  return role === "platform_admin" || EMPLOYER_VISIBLE_INVOICE_STATUSES.includes(status);
}

export function registerInvoiceRoutes(
  app: FastifyInstance,
  options: {
    repository: InvoiceRepository;
    authorize(
      request: FastifyRequest,
      organizationId: string
    ): Promise<InvoiceRouteAuthorization | null>;
    // Tells the employer an invoice has been sent. Best-effort: it reports what happened and never
    // undoes the send.
    notifyInvoiceSent?(invoice: DurableInvoice): Promise<string>;
    // Bill-to and job facts for the PDF. Without it the PDF still renders, with less detail.
    describeInvoice?(invoice: DurableInvoice): Promise<InvoicePdfDetails>;
  }
) {
  app.post("/organizations/:organizationId/invoices", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    const authorization = await options.authorize(request, organizationId);
    if (!authorization) return unavailable(reply);
    const body = record(request.body);
    const idempotencyKey = text(body.idempotencyKey);
    const calculationInput = invoiceCalculationInput(body.calculation, organizationId);
    if (!idempotencyKey || !calculationInput) return invalid(reply);
    try {
      const invoice = await options.repository.createFromLockedTimesheet({
        id: randomUUID(),
        organizationId,
        calculation: calculateInvoiceSnapshot(calculationInput),
        actorReference: authorization.actorId,
        actorRole: authorization.role,
        idempotencyKey
      });
      return reply.code(201).send({ invoice });
    } catch (error) {
      return invoiceFailure(reply, error);
    }
  });

  app.get("/organizations/:organizationId/invoices", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    const authorization = await options.authorize(request, organizationId);
    if (!authorization) return unavailable(reply);
    const statuses = statusList(record(request.query).status);
    if (statuses === null) return invalid(reply);
    const invoices = await options.repository.list(organizationId, statuses);
    return reply.send({
      invoices: invoices.filter((invoice) => canSeeInvoice(authorization.role, invoice.status))
    });
  });

  app.get("/organizations/:organizationId/invoices/:invoiceId", async (request, reply) => {
    const scope = await authorizedInvoice(request, options);
    if (!scope || !canSeeInvoice(scope.authorization.role, scope.invoice.status)) {
      return unavailable(reply);
    }
    return reply.send({ invoice: scope.invoice });
  });

  app.get("/organizations/:organizationId/invoices/:invoiceId/pdf", async (request, reply) => {
    const scope = await authorizedInvoice(request, options);
    if (!scope || !canSeeInvoice(scope.authorization.role, scope.invoice.status)) {
      return unavailable(reply);
    }
    try {
      const details = (await options.describeInvoice?.(scope.invoice).catch(() => ({}))) ?? {};
      const rendered = renderBilingualSyntheticInvoicePdf(scope.invoice, details);
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

  for (const action of ["approve", "issue", "view", "overdue", "dispute", "void"] as const) {
    app.post(
      `/organizations/:organizationId/invoices/:invoiceId/${action}`,
      async (request, reply) => {
        const scope = await authorizedInvoice(request, options);
        if (!scope) return unavailable(reply);
        const body = record(request.body);
        const expectedVersion = positiveInteger(body.expectedVersion);
        const reason = text(body.reason) ?? undefined;
        const numbering =
          action === "issue"
            ? invoiceNumberingConfiguration(body.numbering, scope.invoice.organizationId)
            : undefined;
        if (
          expectedVersion === null ||
          (action === "issue" && !numbering) ||
          (["dispute", "void"].includes(action) && !reason)
        ) {
          return invalid(reply);
        }
        try {
          const invoice = await options.repository.transition({
            invoiceId: scope.invoice.id,
            organizationId: scope.invoice.organizationId,
            expectedVersion,
            toStatus: invoiceActionStatus(action),
            actorReference: scope.authorization.actorId,
            actorRole: scope.authorization.role,
            ...(reason ? { reason } : {}),
            ...(numbering ? { numbering } : {})
          });
          return reply.send({ invoice });
        } catch (error) {
          return invoiceFailure(reply, error);
        }
      }
    );
  }

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
      const deliveryId = randomUUID();
      const result = await options.repository.recordFakeDelivery({
        id: deliveryId,
        invoiceId: scope.invoice.id,
        organizationId: scope.invoice.organizationId,
        expectedVersion,
        recipientAlias,
        documentDigest: createHash("sha256").update(rendered.bytes).digest("hex"),
        idempotencyKey,
        actorReference: scope.authorization.actorId,
        actorRole: scope.authorization.role
      });
      // A repeated request returns the first receipt, and must not email the employer again.
      const firstSend = result.receipt.id === deliveryId;
      const employerNotice = firstSend ? await options.notifyInvoiceSent?.(result.invoice).catch(() => "error") : undefined;
      return reply.code(201).send({ ...result, ...(employerNotice ? { employerNotice } : {}) });
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

function invoiceActionStatus(
  action: "approve" | "issue" | "view" | "overdue" | "dispute" | "void"
): InvoiceStatus {
  return action === "approve"
    ? "approved"
    : action === "issue"
      ? "issued"
      : action === "view"
        ? "viewed"
        : action === "overdue"
          ? "overdue"
          : action === "dispute"
            ? "disputed"
            : "voided";
}

function invoiceCalculationInput(
  value: unknown,
  organizationId: string
): InvoiceCalculationInput | null {
  const input = record(value);
  const source = record(input.source);
  if (
    source.type !== "locked_timesheet" ||
    text(source.organizationId) !== organizationId ||
    !text(source.timesheetId) ||
    positiveInteger(source.timesheetVersion) === null ||
    !text(source.assignmentId) ||
    !text(source.attendanceRecordId)
  ) {
    return null;
  }
  // The shared calculation engine is the authoritative validator for all
  // effective-dated configuration, money, tax, and rounding fields.
  //
  // Platform-agency model: Joblop invoices every client under the single platform issuer
  // (9375-7649 Québec Inc. + Québec GST/QST). The issuer and tax configuration are supplied
  // server-side from @rwos/shared when the caller omits them, so a client can never spoof the
  // issuer identity on a tax invoice. A caller MAY still supply them (tests, self-billing).
  const withPlatformDefaults = {
    ...input,
    issuer: input.issuer ?? PLATFORM_INVOICE_ISSUER,
    tax: input.tax ?? PLATFORM_INVOICE_TAX
  };

  // Server-authoritative payment transfer-fee surcharge. The employer picks the payment method when
  // the invoice is generated (calculation.paymentMethodKind); the surcharge is derived HERE from the
  // validated base total so a client can never set it directly or dodge it. Any client-supplied
  // transferFee is discarded. Card => employer's 50% share added as a line; Interac/bank-debit and
  // "method not chosen" => no surcharge line (the platform absorbs the Interac fee).
  const method = surchargeMethod(input.paymentMethodKind);
  if (method === "invalid") return null;
  const base: Record<string, unknown> = { ...withPlatformDefaults };
  delete base.transferFee;
  delete base.paymentMethodKind;
  const baseInput = base as unknown as InvoiceCalculationInput;
  if (method !== "card") return baseInput;
  try {
    const baseTotalMinor = calculateInvoiceSnapshot(baseInput).total.amountMinor;
    const surchargeMinor = employerTransferSurchargeMinor({ amountMinor: baseTotalMinor, method });
    if (surchargeMinor > 0) {
      return {
        ...baseInput,
        transferFee: { amountMinor: surchargeMinor, currency: "CAD" }
      } as InvoiceCalculationInput;
    }
    return baseInput;
  } catch {
    // Base configuration is invalid; let the route's calculateInvoiceSnapshot surface the real error.
    return baseInput;
  }
}

function surchargeMethod(value: unknown): "card" | "interac" | null | "invalid" {
  if (value === undefined || value === null) return null;
  const kind = text(value);
  if (kind === "mastercard" || kind === "card") return "card";
  if (kind === "acss_debit" || kind === "interac") return "interac";
  return "invalid";
}

function invoiceNumberingConfiguration(
  value: unknown,
  organizationId: string
): InvoiceNumberingConfiguration | null {
  const input = record(value);
  const scopeYear = positiveInteger(input.scopeYear);
  const prefix = text(input.prefix);
  const version = text(input.version);
  const effectiveFrom = text(input.effectiveFrom);
  const effectiveUntil =
    input.effectiveUntil === null ? null : text(input.effectiveUntil);
  if (
    text(input.organizationId) !== organizationId ||
    scopeYear === null ||
    !prefix ||
    prefix.length > 24 ||
    !/^[A-Z0-9-]+$/u.test(prefix) ||
    !version ||
    !effectiveFrom ||
    (input.effectiveUntil !== null && !effectiveUntil)
  ) {
    return null;
  }
  return {
    version,
    organizationId,
    prefix,
    scopeYear,
    effectiveFrom,
    effectiveUntil
  };
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
