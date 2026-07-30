import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  FakePaymentScenario,
  PaymentOperation,
  PaymentPolicyMode,
  PaymentState
} from "@rwos/shared";
import type { PaymentRepository } from "./paymentRepository";

export function registerPaymentRoutes(
  app: FastifyInstance,
  options: {
    repository: PaymentRepository;
    localWebhookSecret: string;
    now?: () => Date;
    authorize(
      request: FastifyRequest,
      organizationId: string
    ): Promise<{ actorId: string; role: "employer" | "admin" } | null>;
  }
) {
  const now = options.now ?? (() => new Date());

  app.get("/organizations/:organizationId/payment-methods", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    if (!(await options.authorize(request, organizationId))) return unavailable(reply);
    return reply.send({ paymentMethods: await options.repository.listMethods(organizationId) });
  });

  app.post("/organizations/:organizationId/payment-methods/local-fake", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    if (!(await options.authorize(request, organizationId))) return unavailable(reply);
    const body = record(request.body);
    const methodKind = text(body.methodKind);
    const providerCustomerReference = text(body.providerCustomerReference);
    const providerMethodReference = text(body.providerMethodReference);
    const displayAlias = text(body.displayAlias);
    if (
      !["mastercard", "acss_debit"].includes(methodKind ?? "") ||
      !providerCustomerReference ||
      !providerMethodReference ||
      !displayAlias
    ) return invalid(reply);
    try {
      const paymentMethod = await options.repository.registerMethod({
        id: randomUUID(),
        organizationId,
        provider: "local_fake",
        methodKind: methodKind as "mastercard" | "acss_debit",
        providerCustomerReference,
        providerMethodReference,
        displayAlias,
        reusable: body.reusable === true
      });
      return reply.code(201).send({
        paymentMethod,
        methodKind,
        providerBoundary: "local_fake",
        productionReady: false
      });
    } catch (error) {
      return paymentFailure(reply, error);
    }
  });

  app.get("/organizations/:organizationId/payments", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    if (!(await options.authorize(request, organizationId))) return unavailable(reply);
    return reply.send({ payments: await options.repository.listAttempts(organizationId) });
  });

  app.post("/organizations/:organizationId/payments", async (request, reply) => {
    const organizationId = routeParam(request.params, "organizationId");
    if (!(await options.authorize(request, organizationId))) return unavailable(reply);
    const body = record(request.body);
    const assignmentId = text(body.assignmentId);
    const timesheetId = text(body.timesheetId);
    const invoiceId = text(body.invoiceId);
    const paymentMethodId = nullableText(body.paymentMethodId);
    const policyVersion = text(body.policyVersion);
    const policyMode = paymentPolicyMode(body.policyMode);
    const amountMinor = positiveInteger(body.amountMinor);
    const idempotencyKey = text(body.idempotencyKey);
    if (
      !assignmentId || !timesheetId || !invoiceId || !policyVersion || !policyMode ||
      amountMinor === null || !idempotencyKey
    ) return invalid(reply);
    try {
      const payment = await options.repository.createAttempt({
        id: randomUUID(),
        organizationId,
        assignmentId,
        timesheetId,
        invoiceId,
        paymentMethodId,
        policyVersion,
        policyMode,
        amountMinor,
        idempotencyKey
      });
      return reply.code(201).send({ payment });
    } catch (error) {
      return paymentFailure(reply, error);
    }
  });

  app.get("/organizations/:organizationId/payments/:paymentId", async (request, reply) => {
    const scope = await authorizedPayment(request, options);
    if (!scope) return unavailable(reply);
    return reply.send({ payment: scope.payment });
  });

  app.get("/organizations/:organizationId/payments/:paymentId/audit", async (request, reply) => {
    const scope = await authorizedPayment(request, options);
    if (!scope) return unavailable(reply);
    return reply.send({
      events: await options.repository.listEvents(scope.payment.id, scope.payment.organizationId)
    });
  });

  app.get("/organizations/:organizationId/payments/:paymentId/reconciliation", async (request, reply) => {
    const scope = await authorizedPayment(request, options);
    if (!scope) return unavailable(reply);
    const events = await options.repository.listEvents(
      scope.payment.id,
      scope.payment.organizationId
    );
    return reply.send({
      payment: scope.payment,
      events,
      reconciliation: {
        complete: !["processing", "pending"].includes(scope.payment.state),
        requiresProviderEvidence: scope.payment.state === "processing",
        providerBoundary: "local_fake"
      }
    });
  });

  for (const operation of ["authorize", "capture", "void", "refund"] as const) {
    app.post(
      `/organizations/:organizationId/payments/:paymentId/${operation}`,
      async (request, reply) => {
        const scope = await authorizedPayment(request, options);
        if (!scope) return unavailable(reply);
        const body = record(request.body);
        const expectedVersion = positiveInteger(body.expectedVersion);
        const amountMinor = positiveInteger(body.amountMinor);
        const idempotencyKey = text(body.idempotencyKey);
        const scenario = fakeScenario(body.scenario);
        if (
          expectedVersion === null || amountMinor === null || !idempotencyKey || !scenario
        ) return invalid(reply);
        try {
          const payment = await options.repository.execute({
            paymentId: scope.payment.id,
            organizationId: scope.payment.organizationId,
            expectedVersion,
            operation: operation satisfies Exclude<PaymentOperation, "setup">,
            amountMinor,
            idempotencyKey,
            scenario
          });
          return reply.send({ payment, providerBoundary: "local_fake" });
        } catch (error) {
          return paymentFailure(reply, error);
        }
      }
    );
  }

  app.post("/payments/webhooks/local-fake", async (request, reply) => {
    const body = record(request.body);
    const eventId = text(body.eventId);
    const paymentId = text(body.paymentId);
    const organizationId = text(body.organizationId);
    const expectedVersion = positiveInteger(body.expectedVersion);
    const amountMinor = positiveInteger(body.amountMinor);
    const newState = providerState(body.newState);
    const occurredAtEpochSeconds = positiveInteger(body.occurredAtEpochSeconds);
    const signature = text(request.headers["x-rwos-payment-signature"]);
    if (
      !eventId || !paymentId || !organizationId || expectedVersion === null ||
      amountMinor === null || !newState || occurredAtEpochSeconds === null || !signature
    ) return invalid(reply);
    const received = Math.floor(now().valueOf() / 1000);
    if (Math.abs(received - occurredAtEpochSeconds) > 300) {
      return reply.code(401).send({ error: "RWOS_INVALID_PAYMENT_SIGNATURE" });
    }
    const canonical = [
      eventId, organizationId, paymentId, String(expectedVersion), String(amountMinor),
      newState, String(occurredAtEpochSeconds)
    ].join(":");
    if (!validSignature(options.localWebhookSecret, canonical, signature)) {
      return reply.code(401).send({ error: "RWOS_INVALID_PAYMENT_SIGNATURE" });
    }
    try {
      const payment = await options.repository.processProviderEvent({
        eventId,
        paymentId,
        organizationId,
        expectedVersion,
        amountMinor,
        newState,
        payloadDigest: createHash("sha256").update(canonical).digest("hex"),
        occurredAt: new Date(occurredAtEpochSeconds * 1000)
      });
      return reply.send({ payment });
    } catch (error) {
      return paymentFailure(reply, error);
    }
  });
}

async function authorizedPayment(
  request: FastifyRequest,
  options: Parameters<typeof registerPaymentRoutes>[1]
) {
  const organizationId = routeParam(request.params, "organizationId");
  const authorization = await options.authorize(request, organizationId);
  if (!authorization) return null;
  const payment = await options.repository.get(
    routeParam(request.params, "paymentId"),
    organizationId
  );
  return payment ? { authorization, payment } : null;
}

function validSignature(secret: string, value: string, signature: string) {
  if (!secret) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(value).digest("hex"));
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function nullableText(value: unknown) {
  return value === null || value === undefined ? null : text(value);
}
function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}
function routeParam(value: unknown, key: string) {
  return text(record(value)[key]) ?? "";
}
function paymentPolicyMode(value: unknown): PaymentPolicyMode | null {
  return [
    "invoice_only", "authorize_before_assignment_capture_after_invoice",
    "collect_after_invoice", "manual_collection"
  ].includes(value as string) ? (value as PaymentPolicyMode) : null;
}
function fakeScenario(value: unknown): FakePaymentScenario | null {
  return [
    "success", "decline", "insufficient_funds", "expired_authorization",
    "authentication_required", "timeout", "duplicate_request", "delayed_webhook",
    "contradictory_webhook", "unknown_outcome"
  ].includes(value as string) ? (value as FakePaymentScenario) : null;
}
function providerState(value: unknown): Extract<PaymentState, "succeeded" | "failed" | "disputed"> | null {
  return ["succeeded", "failed", "disputed"].includes(value as string)
    ? (value as Extract<PaymentState, "succeeded" | "failed" | "disputed">)
    : null;
}
function unavailable(reply: { code(status: number): { send(value: unknown): unknown } }) {
  return reply.code(404).send({ error: "RWOS_RESOURCE_UNAVAILABLE", message: "Resource unavailable." });
}
function invalid(reply: { code(status: number): { send(value: unknown): unknown } }) {
  return reply.code(400).send({ error: "RWOS_INVALID_PAYMENT_REQUEST", message: "Invalid payment request." });
}
function paymentFailure(
  reply: { code(status: number): { send(value: unknown): unknown } },
  error: unknown
) {
  const message = error instanceof Error ? error.message : "";
  const conflict = /conflict|current state|version|idempotency|replay|exceeds/u.test(message);
  return reply.code(conflict ? 409 : 400).send({
    error: conflict ? "RWOS_PAYMENT_CONFLICT" : "RWOS_INVALID_PAYMENT_REQUEST",
    message: conflict ? "Payment state conflict." : "Invalid payment request."
  });
}
