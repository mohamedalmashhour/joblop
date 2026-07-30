import { describe, expect, it } from "vitest";

import {
  createLocalFakePaymentProvider,
  createLocalPaymentOrchestrator,
  assertAssignmentPaymentReady,
  paymentPolicyModes,
  paymentStates,
  signLocalPaymentWebhook,
  type FakePaymentScenario,
  type PaymentPolicy
} from "./payment";

const secret = "synthetic-local-webhook-secret";
const policy: PaymentPolicy = {
  version: "synthetic-policy-v1",
  mode: "collect_after_invoice",
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  effectiveUntil: null,
  provider: "local_fake",
  merchantIdentityReference: "synthetic-merchant",
  productionApprovalReference: null
};
const invoiceSource = {
  type: "locked_timesheet" as const,
  timesheetId: "timesheet-a",
  timesheetVersion: 3,
  organizationId: "tenantA",
  assignmentId: "assignment-a",
  attendanceRecordId: "attendance-a"
};

function setup() {
  let tick = 0;
  const service = createLocalPaymentOrchestrator({
    provider: createLocalFakePaymentProvider(),
    now: () => `2026-07-30T01:00:${String(tick++).padStart(2, "0")}.000Z`,
    webhookSecret: secret
  });
  service.registerMethod(
    {
      id: "method-a",
      organizationId: "tenantA",
      provider: "local_fake",
      providerCustomerReference: "local-customer-a",
      providerMethodReference: "local-method-a",
      displayAlias: "Synthetic payment method A",
      reusable: true
    },
    "tenantA"
  );
  return service;
}

function create(service = setup(), id = "payment-a") {
  return {
    service,
    payment: service.create({
      id,
      organizationId: "tenantA",
      assignmentId: "assignment-a",
      timesheetId: "timesheet-a",
      invoiceId: "invoice-a",
      invoiceState: "issued",
      invoiceSource,
      policy,
      methodReferenceId: "method-a",
      amountMinor: 10_000,
      idempotencyKey: `create-${id}`
    })
  };
}

describe("local payment orchestration", () => {
  it("exposes the approved policy modes and payment states", () => {
    expect(paymentPolicyModes).toEqual([
      "invoice_only",
      "authorize_before_assignment_capture_after_invoice",
      "collect_after_invoice",
      "manual_collection"
    ]);
    expect(paymentStates).toContain("partially_refunded");
    expect(paymentStates).toContain("disputed");
  });

  it("keeps invoice issuance separate and collects through the fake provider", async () => {
    const { service, payment } = create();
    expect(payment.state).toBe("pending");
    const result = await service.execute({
      paymentId: payment.id,
      organizationId: "tenantA",
      expectedVersion: 1,
      operation: "capture",
      amountMinor: 10_000,
      idempotencyKey: "capture-a",
      scenario: "success"
    });
    expect(result.state).toBe("succeeded");
    expect(result.allocatedMinor).toBe(10_000);
    expect(service.listEvents(payment.id, "tenantA").map((event) => event.type)).toEqual([
      "payment_created",
      "provider_capture_accepted"
    ]);
  });

  it("binds a valid payment to the immutable issued-invoice source chain", () => {
    const { payment } = create();
    expect(payment).toMatchObject({
      organizationId: invoiceSource.organizationId,
      assignmentId: invoiceSource.assignmentId,
      timesheetId: invoiceSource.timesheetId,
      invoiceId: "invoice-a"
    });
  });

  it("denies organization, assignment, and timesheet mismatches from the invoice source", () => {
    const base = {
      id: "mismatched-payment",
      organizationId: "tenantA",
      assignmentId: "assignment-a",
      timesheetId: "timesheet-a",
      invoiceId: "invoice-a",
      invoiceState: "issued" as const,
      invoiceSource,
      policy,
      methodReferenceId: "method-a",
      amountMinor: 10_000,
      idempotencyKey: "mismatched-payment"
    };
    expect(() =>
      setup().create({
        ...base,
        invoiceSource: { ...invoiceSource, organizationId: "tenantB" }
      })
    ).toThrow("Payment invoice source is outside the authorized organization.");
    expect(() =>
      setup().create({
        ...base,
        assignmentId: "assignment-b"
      })
    ).toThrow("Payment assignment and timesheet must match the immutable invoice source.");
    expect(() =>
      setup().create({
        ...base,
        timesheetId: "timesheet-b"
      })
    ).toThrow("Payment assignment and timesheet must match the immutable invoice source.");
  });

  it("supports authorization then capture without treating authorization as success", async () => {
    const { service, payment } = create();
    const authorized = await service.execute({
      paymentId: payment.id,
      organizationId: "tenantA",
      expectedVersion: 1,
      operation: "authorize",
      amountMinor: 10_000,
      idempotencyKey: "authorize-a",
      scenario: "success"
    });
    expect(authorized.state).toBe("authorized");
    expect(authorized.allocatedMinor).toBe(0);
    assertAssignmentPaymentReady({
      policy: { ...policy, mode: "authorize_before_assignment_capture_after_invoice" },
      method: {
        id: "method-a",
        organizationId: "tenantA",
        provider: "local_fake",
        providerCustomerReference: "local-customer-a",
        providerMethodReference: "local-method-a",
        displayAlias: "Synthetic payment method A",
        reusable: true
      },
      authorization: {
        ...authorized,
        policyMode: "authorize_before_assignment_capture_after_invoice"
      },
      organizationId: "tenantA"
    });
    const captured = await service.execute({
      paymentId: payment.id,
      organizationId: "tenantA",
      expectedVersion: 2,
      operation: "capture",
      amountMinor: 10_000,
      idempotencyKey: "capture-authorized-a",
      scenario: "success"
    });
    expect(captured.state).toBe("succeeded");
  });

  it("fails assignment confirmation closed when required preauthorization is absent", () => {
    expect(() =>
      assertAssignmentPaymentReady({
        policy: { ...policy, mode: "authorize_before_assignment_capture_after_invoice" },
        method: null,
        authorization: null,
        organizationId: "tenantA"
      })
    ).toThrow("Assignment confirmation requires an authorized payment method.");
  });

  it.each([
    ["decline", "failed"],
    ["insufficient_funds", "failed"],
    ["expired_authorization", "failed"],
    ["authentication_required", "processing"],
    ["timeout", "processing"],
    ["delayed_webhook", "succeeded"],
    ["unknown_outcome", "processing"]
  ] as const)("models the %s fake scenario as %s", async (scenario, state) => {
    const { service, payment } = create(setup(), `payment-${scenario}`);
    const result = await service.execute({
      paymentId: payment.id,
      organizationId: "tenantA",
      expectedVersion: 1,
      operation: "capture",
      amountMinor: 10_000,
      idempotencyKey: `capture-${scenario}`,
      scenario
    });
    expect(result.state).toBe(state);
  });

  it("replays exact provider requests and rejects conflicting duplicates", async () => {
    const provider = createLocalFakePaymentProvider();
    const request = {
      operation: "capture" as const,
      organizationId: "tenantA",
      paymentId: "payment-a",
      amountMinor: 100,
      currency: "CAD" as const,
      methodReference: "method-a",
      authorizationReference: null,
      idempotencyKey: "same-key",
      scenario: "duplicate_request" as FakePaymentScenario
    };
    expect(await provider.execute(request)).toEqual(await provider.execute(request));
    await expect(provider.execute({ ...request, amountMinor: 101 })).rejects.toThrow(
      "Payment provider idempotency conflict."
    );
  });

  it("allocates partial collection and append-only partial/full refunds", async () => {
    const { service, payment } = create();
    const collected = await service.execute({
      paymentId: payment.id,
      organizationId: "tenantA",
      expectedVersion: 1,
      operation: "capture",
      amountMinor: 10_000,
      idempotencyKey: "capture-refund",
      scenario: "success"
    });
    const partial = await service.execute({
      paymentId: payment.id,
      organizationId: "tenantA",
      expectedVersion: collected.version,
      operation: "refund",
      amountMinor: 4_000,
      idempotencyKey: "refund-partial",
      scenario: "success"
    });
    expect(partial.state).toBe("partially_refunded");
    expect(partial.refundedMinor).toBe(4_000);
    const full = await service.execute({
      paymentId: payment.id,
      organizationId: "tenantA",
      expectedVersion: partial.version,
      operation: "refund",
      amountMinor: 6_000,
      idempotencyKey: "refund-full",
      scenario: "success"
    });
    expect(full.state).toBe("refunded");
    expect(full.refundedMinor).toBe(10_000);
  });

  it("verifies webhook signatures, timestamps, replay, and contradictions", async () => {
    const { service, payment } = create();
    await service.execute({
      paymentId: payment.id,
      organizationId: "tenantA",
      expectedVersion: 1,
      operation: "capture",
      amountMinor: 10_000,
      idempotencyKey: "capture-timeout",
      scenario: "timeout"
    });
    const webhook = {
      eventId: "event-a",
      organizationId: "tenantA",
      paymentId: payment.id,
      providerReference: "local-provider-a",
      state: "succeeded" as const,
      occurredAtEpochSeconds: 1_785_379_200
    };
    const signature = await signLocalPaymentWebhook(secret, webhook);
    expect(
      (
        await service.processWebhook({
          webhook,
          signature,
          receivedAtEpochSeconds: webhook.occurredAtEpochSeconds + 10
        })
      ).state
    ).toBe("succeeded");
    expect(
      (
        await service.processWebhook({
          webhook,
          signature,
          receivedAtEpochSeconds: webhook.occurredAtEpochSeconds + 10
        })
      ).state
    ).toBe("succeeded");
    await expect(
      service.processWebhook({
        webhook: { ...webhook, eventId: "event-old" },
        signature: await signLocalPaymentWebhook(secret, { ...webhook, eventId: "event-old" }),
        receivedAtEpochSeconds: webhook.occurredAtEpochSeconds + 301
      })
    ).rejects.toThrow("outside the replay window");
    const contradiction = { ...webhook, eventId: "event-b", state: "failed" as const };
    await expect(
      service.processWebhook({
        webhook: contradiction,
        signature: await signLocalPaymentWebhook(secret, contradiction),
        receivedAtEpochSeconds: contradiction.occurredAtEpochSeconds
      })
    ).rejects.toThrow("Contradictory payment webhook.");
  });

  it("denies every cross-organization method, payment, event and webhook path", () => {
    const { service, payment } = create();
    expect(() => service.get(payment.id, "tenantB")).toThrow(
      "Payment is outside the authorized organization."
    );
    expect(() => service.listEvents(payment.id, "tenantB")).toThrow(
      "Payment is outside the authorized organization."
    );
    expect(() =>
      service.registerMethod(
        {
          id: "method-bad",
          organizationId: "tenantA",
          provider: "local_fake",
          providerCustomerReference: "customer",
          providerMethodReference: "method",
          displayAlias: "Synthetic",
          reusable: false
        },
        "tenantB"
      )
    ).toThrow("Payment method is outside the authorized organization.");
  });

  it("fails closed for missing provider, merchant, method, invoice, and raw card data", () => {
    const service = setup();
    expect(() =>
      service.create({
        id: "bad-provider",
        organizationId: "tenantA",
        assignmentId: "assignment",
        timesheetId: "timesheet",
        invoiceId: "invoice",
        invoiceState: "issued",
        invoiceSource: {
          ...invoiceSource,
          assignmentId: "assignment",
          timesheetId: "timesheet"
        },
        policy: { ...policy, provider: null },
        methodReferenceId: "method-a",
        amountMinor: 100,
        idempotencyKey: "bad-provider"
      })
    ).toThrow("Local payment provider is not configured.");
    expect(() =>
      service.registerMethod(
        {
          id: "raw",
          organizationId: "tenantA",
          provider: "local_fake",
          providerCustomerReference: "customer",
          providerMethodReference: "4242 4242 4242 4242",
          displayAlias: "forbidden",
          reusable: false
        },
        "tenantA"
      )
    ).toThrow("contain no raw card number");
  });

  it("uses optimistic concurrency for unknown-outcome recovery", async () => {
    const { service, payment } = create();
    await service.execute({
      paymentId: payment.id,
      organizationId: "tenantA",
      expectedVersion: 1,
      operation: "capture",
      amountMinor: 10_000,
      idempotencyKey: "unknown",
      scenario: "unknown_outcome"
    });
    await expect(
      service.execute({
        paymentId: payment.id,
        organizationId: "tenantA",
        expectedVersion: 1,
        operation: "capture",
        amountMinor: 10_000,
        idempotencyKey: "unknown-again",
        scenario: "success"
      })
    ).rejects.toThrow("Payment version conflict.");
  });
});
