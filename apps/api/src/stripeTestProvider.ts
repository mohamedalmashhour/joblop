import { createHash } from "node:crypto";
import Stripe from "stripe";
import type {
  PaymentProviderPort,
  ProviderPaymentRequest,
  ProviderPaymentResult
} from "@rwos/shared";

export type StripeTestEnvironment = Readonly<{
  enabled: boolean;
  secretKey: string | undefined;
  webhookSecret: string | undefined;
  accountReference: string | undefined;
}>;

export interface StripeWebhookReplayStore {
  recordOnce(
    input: Readonly<{ eventId: string; digest: string; createdAt: Date }>
  ): Promise<boolean>;
}

type StripeClient = Pick<
  Stripe,
  "customers" | "setupIntents" | "paymentIntents" | "refunds" | "webhooks"
>;

export function validateStripeTestEnvironment(env: StripeTestEnvironment) {
  if (!env.enabled) return { enabled: false as const };
  if (!env.secretKey?.startsWith("sk_test_") || env.secretKey.startsWith("sk_live_")) {
    throw new Error("Stripe test provider requires a test-mode secret reference.");
  }
  if (!env.webhookSecret?.startsWith("whsec_")) {
    throw new Error("Stripe test provider requires a webhook signing secret reference.");
  }
  if (!env.accountReference) {
    throw new Error("Stripe test provider requires an approved account reference.");
  }
  return { enabled: true as const };
}

export function createStripeTestClient(env: StripeTestEnvironment) {
  const validated = validateStripeTestEnvironment(env);
  if (!validated.enabled) throw new Error("Stripe test provider is disabled.");
  return new Stripe(env.secretKey!, {
    apiVersion: "2026-07-29.dahlia",
    appInfo: { name: "Resident Workforce OS", version: "test-foundation" },
    maxNetworkRetries: 2,
    telemetry: false
  });
}

export function createStripeTestPaymentProvider(
  options: Readonly<{
    client: StripeClient;
    webhookSecret: string;
    replayStore: StripeWebhookReplayStore;
    now?: () => Date;
  }>
): PaymentProviderPort & {
  createCustomer(
    input: Readonly<{ organizationId: string; email: string; idempotencyKey: string }>
  ): Promise<string>;
  createSetupIntent(
    input: Readonly<{
      organizationId: string;
      customerReference: string;
      method: "card" | "acss_debit";
      idempotencyKey: string;
    }>
  ): Promise<Readonly<{ id: string; clientSecret: string | null }>>;
  verifyWebhook(rawBody: Buffer, signature: string): Promise<Stripe.Event>;
  reconcile(paymentIntentId: string): Promise<ProviderPaymentResult>;
} {
  if (!options.webhookSecret) throw new Error("Stripe webhook secret is required.");
  const now = options.now ?? (() => new Date());

  return {
    id: "stripe_test" as const,
    async createCustomer(input) {
      const customer = await options.client.customers.create(
        {
          email: input.email,
          metadata: { organization_reference: opaque(input.organizationId) }
        },
        { idempotencyKey: stableKey("customer", input.organizationId, input.idempotencyKey) }
      );
      assertTestObject(customer);
      return customer.id;
    },
    async createSetupIntent(input) {
      const setupIntent = await options.client.setupIntents.create(
        {
          customer: opaque(input.customerReference),
          usage: "off_session",
          payment_method_types: [input.method],
          metadata: { organization_reference: opaque(input.organizationId) }
        },
        { idempotencyKey: stableKey("setup", input.organizationId, input.idempotencyKey) }
      );
      assertTestObject(setupIntent);
      return { id: setupIntent.id, clientSecret: setupIntent.client_secret };
    },
    async execute(request) {
      validateRequest(request);
      try {
        if (request.operation === "authorize") {
          const intent = await options.client.paymentIntents.create(
            {
              amount: request.amountMinor,
              currency: "cad",
              capture_method: "manual",
              confirm: true,
              payment_method: opaqueRequired(request.methodReference),
              metadata: {
                organization_reference: opaque(request.organizationId),
                payment_reference: opaque(request.paymentId)
              }
            },
            { idempotencyKey: stableOperationKey(request) }
          );
          return paymentIntentResult(intent, true);
        }
        if (request.operation === "capture") {
          const intent = await options.client.paymentIntents.capture(
            opaqueRequired(request.authorizationReference),
            { amount_to_capture: request.amountMinor },
            { idempotencyKey: stableOperationKey(request) }
          );
          return paymentIntentResult(intent, true);
        }
        if (request.operation === "void") {
          const intent = await options.client.paymentIntents.cancel(
            opaqueRequired(request.authorizationReference),
            {},
            { idempotencyKey: stableOperationKey(request) }
          );
          return paymentIntentResult(intent, false);
        }
        if (request.operation === "refund") {
          const refund = await options.client.refunds.create(
            {
              payment_intent: opaqueRequired(request.authorizationReference),
              amount: request.amountMinor,
              metadata: {
                organization_reference: opaque(request.organizationId),
                payment_reference: opaque(request.paymentId)
              }
            },
            { idempotencyKey: stableOperationKey(request) }
          );
          return accepted(refund.id, false);
        }
        throw new Error("Stripe setup uses createSetupIntent.");
      } catch (error) {
        if (error instanceof LiveModeStripeObjectError) throw error;
        if (isDeterministicStripeDecline(error)) {
          return {
            provider: "stripe_test",
            providerOperationReference: "stripe:declined",
            outcome: "declined",
            reason: "decline",
            webhookExpected: false
          };
        }
        return {
          provider: "stripe_test",
          providerOperationReference: "stripe:unknown",
          outcome: "unknown",
          reason: "unknown_outcome",
          webhookExpected: true
        };
      }
    },
    async verifyWebhook(rawBody, signature) {
      if (!Buffer.isBuffer(rawBody))
        throw new Error("Stripe webhook requires the raw request body.");
      const event = options.client.webhooks.constructEvent(
        rawBody,
        signature,
        options.webhookSecret
      );
      assertTestObject(event);
      const digest = createHash("sha256").update(rawBody).digest("hex");
      if (
        !(await options.replayStore.recordOnce({ eventId: event.id, digest, createdAt: now() }))
      ) {
        throw new Error("Stripe webhook replay rejected.");
      }
      return event;
    },
    async reconcile(paymentIntentId) {
      const intent = await options.client.paymentIntents.retrieve(opaqueRequired(paymentIntentId));
      return paymentIntentResult(intent, true);
    }
  };
}

function paymentIntentResult(
  intent: Stripe.PaymentIntent,
  webhookExpected: boolean
): ProviderPaymentResult {
  assertTestObject(intent);
  if (intent.status === "requires_action") {
    return {
      provider: "stripe_test",
      providerOperationReference: intent.id,
      outcome: "authentication_required",
      reason: "authentication_required",
      webhookExpected: true
    };
  }
  if (["requires_payment_method", "canceled"].includes(intent.status)) {
    return {
      provider: "stripe_test",
      providerOperationReference: intent.id,
      outcome: "declined",
      reason: "decline",
      webhookExpected
    };
  }
  return accepted(intent.id, webhookExpected);
}

function accepted(reference: string, webhookExpected: boolean): ProviderPaymentResult {
  return {
    provider: "stripe_test",
    providerOperationReference: reference,
    outcome: "accepted",
    reason: "none",
    webhookExpected
  };
}

function stableOperationKey(request: ProviderPaymentRequest) {
  return stableKey(
    request.operation,
    request.organizationId,
    `${request.paymentId}:${request.idempotencyKey}`
  );
}

function stableKey(operation: string, scope: string, key: string) {
  const digest = createHash("sha256").update(`${operation}:${scope}:${key}`).digest("hex");
  return `rwos_${operation}_${digest}`;
}

function assertTestObject(object: { livemode: boolean }) {
  if (object.livemode) throw new LiveModeStripeObjectError();
}

class LiveModeStripeObjectError extends Error {
  constructor() {
    super("Live-mode Stripe object rejected.");
  }
}

function validateRequest(request: ProviderPaymentRequest) {
  if (
    request.currency !== "CAD" ||
    !Number.isSafeInteger(request.amountMinor) ||
    request.amountMinor <= 0
  ) {
    throw new Error("Stripe request requires positive CAD minor units.");
  }
  opaque(request.organizationId);
  opaque(request.paymentId);
  opaque(request.idempotencyKey);
}

function opaqueRequired(value: string | null) {
  if (!value) throw new Error("Stripe provider reference is required.");
  return opaque(value);
}

function opaque(value: string) {
  if (!value || /\b(?:\d[ -]*?){13,19}\b/u.test(value)) {
    throw new Error("Stripe references must be opaque and contain no raw payment data.");
  }
  return value;
}

function isDeterministicStripeDecline(error: unknown) {
  return error instanceof Stripe.errors.StripeCardError;
}
