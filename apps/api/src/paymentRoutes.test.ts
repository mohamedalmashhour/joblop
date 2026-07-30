import { createHmac } from "node:crypto";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { PaymentRecord } from "@rwos/shared";
import type { PaymentRepository } from "./paymentRepository";
import { registerPaymentRoutes } from "./paymentRoutes";

const organizationId = "00000000-0000-4000-8000-00000000000a";
const payment: PaymentRecord = {
  id: "00000000-0000-4000-8000-000000000040",
  organizationId,
  assignmentId: "00000000-0000-4000-8000-000000000011",
  timesheetId: "00000000-0000-4000-8000-000000000010",
  invoiceId: "00000000-0000-4000-8000-000000000020",
  policyVersion: "synthetic-v1",
  policyMode: "manual_collection",
  methodReferenceId: null,
  state: "processing",
  amountMinor: 10_500,
  allocatedMinor: 0,
  refundedMinor: 0,
  currency: "CAD",
  authorizationReference: null,
  version: 2
};

function repository(): PaymentRepository {
  return {
    registerMethod: vi.fn(),
    listMethods: vi.fn().mockResolvedValue([]),
    listAttempts: vi.fn().mockResolvedValue([payment]),
    createAttempt: vi.fn().mockResolvedValue(payment),
    get: vi.fn().mockResolvedValue(payment),
    listEvents: vi.fn().mockResolvedValue([]),
    processProviderEvent: vi.fn().mockResolvedValue({
      ...payment,
      state: "succeeded",
      allocatedMinor: payment.amountMinor,
      version: 3
    }),
    execute: vi.fn().mockResolvedValue(payment)
  };
}

describe("authenticated payment routes", () => {
  it("returns indistinguishable not-found for a denied organization", async () => {
    const app = Fastify();
    registerPaymentRoutes(app, {
      repository: repository(),
      localWebhookSecret: "s".repeat(32),
      authorize: async () => null
    });
    const response = await app.inject({
      method: "GET",
      url: `/organizations/${organizationId}/payments/${payment.id}`
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "RWOS_RESOURCE_UNAVAILABLE" });
  });

  it("passes the exact authorized organization into durable attempt creation", async () => {
    const app = Fastify();
    const target = repository();
    registerPaymentRoutes(app, {
      repository: target,
      localWebhookSecret: "s".repeat(32),
      authorize: async () => ({ actorId: "synthetic-admin", role: "admin" })
    });
    const response = await app.inject({
      method: "POST",
      url: `/organizations/${organizationId}/payments`,
      payload: {
        assignmentId: payment.assignmentId,
        timesheetId: payment.timesheetId,
        invoiceId: payment.invoiceId,
        paymentMethodId: null,
        policyVersion: payment.policyVersion,
        policyMode: payment.policyMode,
        amountMinor: payment.amountMinor,
        idempotencyKey: "synthetic-payment-create"
      }
    });
    expect(response.statusCode).toBe(201);
    expect(target.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId, invoiceId: payment.invoiceId })
    );
  });

  it("verifies local webhook signatures and forwards a replay-safe digest", async () => {
    const app = Fastify();
    const target = repository();
    const secret = "local-synthetic-webhook-secret-123";
    const epoch = 1_785_436_800;
    registerPaymentRoutes(app, {
      repository: target,
      localWebhookSecret: secret,
      now: () => new Date(epoch * 1000),
      authorize: async () => null
    });
    const event = {
      eventId: "evt_synthetic",
      organizationId,
      paymentId: payment.id,
      expectedVersion: 2,
      amountMinor: 10_500,
      newState: "succeeded",
      occurredAtEpochSeconds: epoch
    };
    const canonical = [
      event.eventId,
      event.organizationId,
      event.paymentId,
      String(event.expectedVersion),
      String(event.amountMinor),
      event.newState,
      String(event.occurredAtEpochSeconds)
    ].join(":");
    const signature = createHmac("sha256", secret).update(canonical).digest("hex");
    const response = await app.inject({
      method: "POST",
      url: "/payments/webhooks/local-fake",
      headers: { "x-rwos-payment-signature": signature },
      payload: event
    });
    expect(response.statusCode).toBe(200);
    expect(target.processProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: event.eventId,
        organizationId,
        payloadDigest: expect.stringMatching(/^[a-f0-9]{64}$/u)
      })
    );
  });
});
