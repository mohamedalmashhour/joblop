import type { InvoiceSourceSnapshot } from "./invoice";
import type { EmployerPaymentMethodKind } from "./paymentPricing";

export const paymentStates = [
  "pending",
  "authorized",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "partially_refunded",
  "refunded",
  "disputed"
] as const;
export type PaymentState = (typeof paymentStates)[number];

export const paymentPolicyModes = [
  "invoice_only",
  "authorize_before_assignment_capture_after_invoice",
  "collect_after_invoice",
  "manual_collection"
] as const;
export type PaymentPolicyMode = (typeof paymentPolicyModes)[number];

export type PaymentPolicy = Readonly<{
  version: string;
  mode: PaymentPolicyMode;
  effectiveFrom: string;
  effectiveUntil: string | null;
  provider: "local_fake" | "stripe_test" | null;
  merchantIdentityReference: string | null;
  productionApprovalReference: string | null;
}>;

export type PaymentMethodReference = Readonly<{
  id: string;
  organizationId: string;
  provider: "local_fake" | "stripe_test";
  methodKind: EmployerPaymentMethodKind;
  providerCustomerReference: string;
  providerMethodReference: string;
  displayAlias: string;
  reusable: boolean;
}>;

export type PaymentOperation = "setup" | "authorize" | "capture" | "void" | "refund";

export type FakePaymentScenario =
  | "success"
  | "decline"
  | "insufficient_funds"
  | "expired_authorization"
  | "authentication_required"
  | "timeout"
  | "duplicate_request"
  | "delayed_webhook"
  | "contradictory_webhook"
  | "unknown_outcome";

export type ProviderPaymentRequest = Readonly<{
  operation: PaymentOperation;
  organizationId: string;
  paymentId: string;
  amountMinor: number;
  currency: "CAD";
  methodReference: string | null;
  authorizationReference: string | null;
  idempotencyKey: string;
  scenario: FakePaymentScenario;
}>;

export type ProviderPaymentResult = Readonly<{
  provider: "local_fake" | "stripe_test";
  providerOperationReference: string;
  outcome: "accepted" | "declined" | "authentication_required" | "unknown";
  reason:
    | "none"
    | "decline"
    | "insufficient_funds"
    | "expired_authorization"
    | "authentication_required"
    | "timeout"
    | "unknown_outcome";
  webhookExpected: boolean;
}>;

export interface PaymentProviderPort {
  // Stable identity of the bound provider (audit only — recorded on the provider_call_started event).
  readonly id: "local_fake" | "stripe_test";
  execute(request: ProviderPaymentRequest): Promise<ProviderPaymentResult>;
}

export function createLocalFakePaymentProvider(): PaymentProviderPort {
  const results = new Map<string, { digest: string; result: ProviderPaymentResult }>();
  return {
    id: "local_fake",
    async execute(request) {
      assertProviderRequest(request);
      const scope = `${request.organizationId}:${request.idempotencyKey}`;
      const digest = JSON.stringify(request);
      const existing = results.get(scope);
      if (existing) {
        if (existing.digest !== digest) throw new Error("Payment provider idempotency conflict.");
        return existing.result;
      }
      const result = fakeResult(request);
      results.set(scope, { digest, result });
      return result;
    }
  };
}

export type PaymentRecord = Readonly<{
  id: string;
  organizationId: string;
  assignmentId: string;
  timesheetId: string;
  invoiceId: string;
  policyVersion: string;
  policyMode: PaymentPolicyMode;
  methodReferenceId: string | null;
  state: PaymentState;
  amountMinor: number;
  allocatedMinor: number;
  refundedMinor: number;
  currency: "CAD";
  authorizationReference: string | null;
  version: number;
}>;

export type PaymentEvent = Readonly<{
  sequence: number;
  organizationId: string;
  paymentId: string;
  type: string;
  actor: "employer" | "admin" | "system" | "provider";
  fromState: PaymentState | null;
  toState: PaymentState;
  amountMinor: number;
  providerReference: string | null;
  occurredAt: string;
}>;

export type PaymentWebhook = Readonly<{
  eventId: string;
  organizationId: string;
  paymentId: string;
  providerReference: string;
  state: Extract<PaymentState, "succeeded" | "failed" | "disputed">;
  occurredAtEpochSeconds: number;
}>;

export type LocalPaymentOrchestrator = Readonly<{
  registerMethod(
    method: PaymentMethodReference,
    authorizedOrganizationId: string
  ): PaymentMethodReference;
  create(input: {
    id: string;
    organizationId: string;
    assignmentId: string;
    timesheetId: string;
    invoiceId: string;
    invoiceState: "issued" | "sent" | "viewed" | "overdue";
    invoiceSource: InvoiceSourceSnapshot;
    policy: PaymentPolicy;
    methodReferenceId: string | null;
    amountMinor: number;
    idempotencyKey: string;
  }): PaymentRecord;
  get(paymentId: string, authorizedOrganizationId: string): PaymentRecord;
  execute(input: {
    paymentId: string;
    organizationId: string;
    expectedVersion: number;
    operation: Extract<PaymentOperation, "authorize" | "capture" | "void" | "refund">;
    amountMinor: number;
    idempotencyKey: string;
    scenario: FakePaymentScenario;
  }): Promise<PaymentRecord>;
  processWebhook(input: {
    webhook: PaymentWebhook;
    signature: string;
    receivedAtEpochSeconds: number;
  }): Promise<PaymentRecord>;
  listEvents(paymentId: string, authorizedOrganizationId: string): readonly PaymentEvent[];
}>;

export function createLocalPaymentOrchestrator(options: {
  provider: PaymentProviderPort;
  now: () => string;
  webhookSecret: string;
}): LocalPaymentOrchestrator {
  if (!options.webhookSecret) throw new Error("Local webhook secret is required.");
  const methods = new Map<string, PaymentMethodReference>();
  const payments = new Map<string, PaymentRecord>();
  const creations = new Map<string, string>();
  const events: PaymentEvent[] = [];
  const webhookEvents = new Map<string, string>();

  function requirePayment(id: string, organizationId: string) {
    const payment = payments.get(id);
    if (!payment || payment.organizationId !== organizationId) {
      throw new Error("Payment is outside the authorized organization.");
    }
    return payment;
  }
  function record(
    payment: PaymentRecord,
    type: string,
    actor: PaymentEvent["actor"],
    fromState: PaymentState | null,
    amountMinor: number,
    providerReference: string | null
  ) {
    events.push({
      sequence: events.length + 1,
      organizationId: payment.organizationId,
      paymentId: payment.id,
      type,
      actor,
      fromState,
      toState: payment.state,
      amountMinor,
      providerReference,
      occurredAt: options.now()
    });
  }

  return {
    registerMethod(method, authorizedOrganizationId) {
      if (method.organizationId !== authorizedOrganizationId) {
        throw new Error("Payment method is outside the authorized organization.");
      }
      assertOpaqueReference(method.providerCustomerReference);
      assertOpaqueReference(method.providerMethodReference);
      if (!["mastercard", "acss_debit"].includes(method.methodKind)) {
        throw new Error("Payment method kind is not supported.");
      }
      const existing = methods.get(method.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(method)) {
        throw new Error("Payment method reference conflict.");
      }
      methods.set(method.id, structuredClone(method));
      return structuredClone(method);
    },
    create(input) {
      assertEffectivePolicy(input.policy, options.now());
      assertInvoiceSource(input);
      if (input.policy.mode === "invoice_only") {
        throw new Error("Invoice-only policy does not permit collection.");
      }
      if (
        input.invoiceState !== "issued" &&
        input.invoiceState !== "sent" &&
        input.invoiceState !== "viewed" &&
        input.invoiceState !== "overdue"
      ) {
        throw new Error("Payment requires an issued invoice.");
      }
      assertMoney(input.amountMinor);
      if (input.policy.mode !== "manual_collection" && !input.methodReferenceId) {
        throw new Error("Payment method authorization is required.");
      }
      if (input.methodReferenceId) {
        const method = methods.get(input.methodReferenceId);
        if (!method || method.organizationId !== input.organizationId) {
          throw new Error("Payment method is outside the authorized organization.");
        }
      }
      const scope = `${input.organizationId}:${input.idempotencyKey}`;
      const prior = creations.get(scope);
      if (prior) {
        if (prior !== input.id) throw new Error("Payment creation idempotency conflict.");
        return structuredClone(requirePayment(prior, input.organizationId));
      }
      const payment: PaymentRecord = {
        id: input.id,
        organizationId: input.organizationId,
        assignmentId: input.assignmentId,
        timesheetId: input.timesheetId,
        invoiceId: input.invoiceId,
        policyVersion: input.policy.version,
        policyMode: input.policy.mode,
        methodReferenceId: input.methodReferenceId,
        state: "pending",
        amountMinor: input.amountMinor,
        allocatedMinor: 0,
        refundedMinor: 0,
        currency: "CAD",
        authorizationReference: null,
        version: 1
      };
      payments.set(payment.id, payment);
      creations.set(scope, payment.id);
      record(payment, "payment_created", "system", null, input.amountMinor, null);
      return structuredClone(payment);
    },
    get(paymentId, authorizedOrganizationId) {
      return structuredClone(requirePayment(paymentId, authorizedOrganizationId));
    },
    async execute(input) {
      const current = requirePayment(input.paymentId, input.organizationId);
      if (current.version !== input.expectedVersion) throw new Error("Payment version conflict.");
      assertMoney(input.amountMinor);
      assertOperation(current, input.operation, input.amountMinor);
      const result = await options.provider.execute({
        operation: input.operation,
        organizationId: input.organizationId,
        paymentId: input.paymentId,
        amountMinor: input.amountMinor,
        currency: "CAD",
        methodReference: current.methodReferenceId,
        authorizationReference: current.authorizationReference,
        idempotencyKey: input.idempotencyKey,
        scenario: input.scenario
      });
      let nextState = stateFor(input.operation, result);
      if (
        input.operation === "refund" &&
        result.outcome === "accepted" &&
        current.refundedMinor + input.amountMinor < current.allocatedMinor
      ) {
        nextState = "partially_refunded";
      }
      const updated: PaymentRecord = {
        ...current,
        state: nextState,
        allocatedMinor:
          input.operation === "capture" && result.outcome === "accepted"
            ? current.allocatedMinor + input.amountMinor
            : current.allocatedMinor,
        refundedMinor:
          input.operation === "refund" && result.outcome === "accepted"
            ? current.refundedMinor + input.amountMinor
            : current.refundedMinor,
        authorizationReference:
          input.operation === "authorize" && result.outcome === "accepted"
            ? result.providerOperationReference
            : current.authorizationReference,
        version: current.version + 1
      };
      payments.set(updated.id, updated);
      record(
        updated,
        `provider_${input.operation}_${result.outcome}`,
        "system",
        current.state,
        input.amountMinor,
        result.providerOperationReference
      );
      return structuredClone(updated);
    },
    async processWebhook({ webhook, signature, receivedAtEpochSeconds }) {
      await verifyLocalWebhook(options.webhookSecret, webhook, signature, receivedAtEpochSeconds);
      const digest = JSON.stringify(webhook);
      const existing = webhookEvents.get(webhook.eventId);
      if (existing) {
        if (existing !== digest) throw new Error("Contradictory payment webhook.");
        return structuredClone(requirePayment(webhook.paymentId, webhook.organizationId));
      }
      const current = requirePayment(webhook.paymentId, webhook.organizationId);
      if (
        (current.state === "succeeded" && webhook.state === "failed") ||
        (current.state === "failed" && webhook.state === "succeeded")
      ) {
        throw new Error("Contradictory payment webhook.");
      }
      const updated = { ...current, state: webhook.state, version: current.version + 1 };
      payments.set(updated.id, updated);
      webhookEvents.set(webhook.eventId, digest);
      record(updated, "provider_webhook", "provider", current.state, 0, webhook.providerReference);
      return structuredClone(updated);
    },
    listEvents(paymentId, authorizedOrganizationId) {
      requirePayment(paymentId, authorizedOrganizationId);
      return events
        .filter(
          (event) =>
            event.paymentId === paymentId && event.organizationId === authorizedOrganizationId
        )
        .map((event) => structuredClone(event));
    }
  };
}

function assertInvoiceSource(input: {
  organizationId: string;
  assignmentId: string;
  timesheetId: string;
  invoiceSource: InvoiceSourceSnapshot;
}) {
  if (input.invoiceSource.organizationId !== input.organizationId) {
    throw new Error("Payment invoice source is outside the authorized organization.");
  }
  if (
    input.invoiceSource.assignmentId !== input.assignmentId ||
    input.invoiceSource.timesheetId !== input.timesheetId
  ) {
    throw new Error("Payment assignment and timesheet must match the immutable invoice source.");
  }
  for (const reference of [
    input.invoiceSource.assignmentId,
    input.invoiceSource.timesheetId,
    input.invoiceSource.attendanceRecordId
  ]) {
    assertOpaqueReference(reference);
  }
  if (
    !Number.isInteger(input.invoiceSource.timesheetVersion) ||
    input.invoiceSource.timesheetVersion < 1
  ) {
    throw new Error("Payment invoice source requires a valid timesheet version.");
  }
}

export async function signLocalPaymentWebhook(secret: string, webhook: PaymentWebhook) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(JSON.stringify(webhook))
  );
  return [...new Uint8Array(signature)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyLocalWebhook(
  secret: string,
  webhook: PaymentWebhook,
  signature: string,
  receivedAtEpochSeconds: number
) {
  if (Math.abs(receivedAtEpochSeconds - webhook.occurredAtEpochSeconds) > 300) {
    throw new Error("Payment webhook timestamp is outside the replay window.");
  }
  const expected = await signLocalPaymentWebhook(secret, webhook);
  if (!constantPathHexEqual(signature, expected)) {
    throw new Error("Payment webhook signature is invalid.");
  }
}

function constantPathHexEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < right.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function fakeResult(request: ProviderPaymentRequest): ProviderPaymentResult {
  let outcome: ProviderPaymentResult["outcome"] = "accepted";
  let reason: ProviderPaymentResult["reason"] = "none";
  if (["decline", "insufficient_funds", "expired_authorization"].includes(request.scenario)) {
    outcome = "declined";
    reason = request.scenario as ProviderPaymentResult["reason"];
  } else if (request.scenario === "authentication_required") {
    outcome = "authentication_required";
    reason = "authentication_required";
  } else if (request.scenario === "timeout" || request.scenario === "unknown_outcome") {
    outcome = "unknown";
    reason = request.scenario;
  }
  return {
    provider: "local_fake",
    providerOperationReference: `local:${request.organizationId}:${request.idempotencyKey}`,
    outcome,
    reason,
    webhookExpected: ["delayed_webhook", "timeout", "unknown_outcome"].includes(request.scenario)
  };
}

function stateFor(
  operation: ProviderPaymentRequest["operation"],
  result: ProviderPaymentResult
): PaymentState {
  if (result.outcome === "unknown" || result.outcome === "authentication_required") {
    return "processing";
  }
  if (result.outcome === "declined") return "failed";
  if (operation === "authorize") return "authorized";
  if (operation === "void") return "cancelled";
  if (operation === "refund") return "refunded";
  return "succeeded";
}

function assertOperation(payment: PaymentRecord, operation: PaymentOperation, amountMinor: number) {
  if (operation === "authorize" && payment.state !== "pending") {
    throw new Error("Payment authorization requires pending state.");
  }
  if (operation === "capture" && !["pending", "authorized", "failed"].includes(payment.state)) {
    throw new Error("Payment capture is not permitted from this state.");
  }
  if (
    operation === "capture" &&
    payment.policyMode === "authorize_before_assignment_capture_after_invoice" &&
    (payment.state !== "authorized" || amountMinor !== payment.amountMinor)
  ) {
    throw new Error("Preauthorization policy captures only the final issued invoice amount.");
  }
  if (operation === "void" && payment.state !== "authorized") {
    throw new Error("Payment void requires authorization.");
  }
  if (operation === "refund") {
    if (!["succeeded", "partially_refunded"].includes(payment.state)) {
      throw new Error("Payment refund requires successful collection.");
    }
    if (payment.refundedMinor + amountMinor > payment.allocatedMinor) {
      throw new Error("Payment refund exceeds collected allocation.");
    }
  }
}

export function assertAssignmentPaymentReady(input: {
  policy: PaymentPolicy;
  method: PaymentMethodReference | null;
  authorization: PaymentRecord | null;
  organizationId: string;
}) {
  if (input.policy.mode !== "authorize_before_assignment_capture_after_invoice") return;
  if (!input.method || input.method.organizationId !== input.organizationId) {
    throw new Error("Assignment confirmation requires an authorized payment method.");
  }
  if (
    !input.authorization ||
    input.authorization.organizationId !== input.organizationId ||
    input.authorization.methodReferenceId !== input.method.id ||
    input.authorization.state !== "authorized"
  ) {
    throw new Error("Assignment confirmation requires valid payment authorization.");
  }
}

function assertEffectivePolicy(policy: PaymentPolicy, occurredAt: string) {
  const instant = Date.parse(occurredAt);
  const start = Date.parse(policy.effectiveFrom);
  const end = policy.effectiveUntil === null ? null : Date.parse(policy.effectiveUntil);
  if (
    !policy.version ||
    !Number.isFinite(start) ||
    instant < start ||
    (end !== null && instant >= end)
  ) {
    throw new Error("Payment policy is not effective.");
  }
  if (policy.provider !== "local_fake")
    throw new Error("Local payment provider is not configured.");
  if (!policy.merchantIdentityReference) throw new Error("Payment merchant identity is missing.");
  if (policy.productionApprovalReference !== null) {
    throw new Error("Local payment policy cannot use production approval.");
  }
}

function assertProviderRequest(request: ProviderPaymentRequest) {
  assertMoney(request.amountMinor);
  if (request.currency !== "CAD") throw new Error("Local payment provider supports CAD only.");
  for (const value of [request.organizationId, request.paymentId, request.idempotencyKey]) {
    assertOpaqueReference(value);
  }
}

function assertOpaqueReference(value: string) {
  if (!value || /\b(?:\d[ -]*?){13,19}\b/u.test(value)) {
    throw new Error("Payment references must be opaque and contain no raw card number.");
  }
}

function assertMoney(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Payment amount must be positive integer minor units.");
  }
}
