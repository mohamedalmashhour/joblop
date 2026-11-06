import { createHash } from "node:crypto";
import Stripe from "stripe";
import type {
  PaymentProviderPort,
  ProviderPaymentRequest,
  ProviderPaymentResult
} from "@rwos/shared";

export type StripeMode = "test" | "live";

export type StripeTestEnvironment = Readonly<{
  enabled: boolean;
  /** Defaults to "test". "live" accepts only live-prefixed secrets and is never the default. */
  mode?: StripeMode;
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
  const mode = env.mode ?? "test";
  const secret = env.secretKey ?? "";
  const isTestSecret = secret.startsWith("sk_test_") || secret.startsWith("rk_test_");
  const isLiveSecret = secret.startsWith("sk_live_") || secret.startsWith("rk_live_");
  if (mode === "test" && (!secret.startsWith("sk_test_") || isLiveSecret)) {
    throw new Error("Stripe test provider requires a test-mode secret reference.");
  }
  if (mode === "live" && (!isLiveSecret || isTestSecret)) {
    throw new Error("Stripe live provider requires a live-mode secret reference.");
  }
  if (!env.webhookSecret?.startsWith("whsec_")) {
    throw new Error("Stripe test provider requires a webhook signing secret reference.");
  }
  if (!env.accountReference) {
    throw new Error("Stripe test provider requires an approved account reference.");
  }
  return { enabled: true as const, mode };
}

/** Build a Stripe client for the requested mode. The key prefix must match the mode exactly. */
export function createStripeClient(env: StripeTestEnvironment) {
  const validated = validateStripeTestEnvironment(env);
  if (!validated.enabled) throw new Error("Stripe provider is disabled.");
  return new Stripe(env.secretKey!, {
    apiVersion: "2026-07-29.dahlia",
    appInfo: {
      name: "Resident Workforce OS",
      version: validated.mode === "live" ? "live" : "test-foundation"
    },
    maxNetworkRetries: 2,
    telemetry: false
  });
}

/** Test-only client: forces test mode regardless of the env's mode field. */
export function createStripeTestClient(env: StripeTestEnvironment) {
  return createStripeClient({ ...env, mode: "test" });
}

export function createStripeTestPaymentProvider(
  options: Readonly<{
    client: StripeClient;
    webhookSecret: string;
    replayStore: StripeWebhookReplayStore;
    now?: () => Date;
    /** Defaults to "test": objects must have livemode=false. "live" requires livemode=true. */
    mode?: StripeMode;
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
} {
  if (!options.webhookSecret) throw new Error("Stripe webhook secret is required.");
  const now = options.now ?? (() => new Date());
  const expectLive = (options.mode ?? "test") === "live";
  const assertTestObject = (object: { livemode: boolean }) => assertMode(object, expectLive);
  const paymentIntentResult = (intent: Stripe.PaymentIntent, webhookExpected: boolean) =>
    intentResult(intent, webhookExpected, expectLive);

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
              payment_method_types: ["card"],
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
    // Stage 2b.4-C3-D: query-only reconcile. Stripe can retrieve a PaymentIntent ONLY by its id. For an
    // indeterminate operation that returned NO PaymentIntent id, there is no read-only lookup — reported
    // as a provider-specific limitation (C3-C): we return "not_found" rather than re-POSTing a charge.
    // This is unmounted at runtime; it exists to conform to the port and preserve the query-only invariant.
    async reconcile(query) {
      if (!query.providerOperationReference) {
        return { provider: "stripe_test", outcome: "not_found", providerOperationReference: null, reason: "none" };
      }
      const intent = await options.client.paymentIntents.retrieve(opaqueRequired(query.providerOperationReference));
      const result = paymentIntentResult(intent, true);
      return { provider: "stripe_test", outcome: result.outcome, providerOperationReference: result.providerOperationReference, reason: result.reason };
    }
  };
}

function intentResult(
  intent: Stripe.PaymentIntent,
  webhookExpected: boolean,
  expectLive: boolean
): ProviderPaymentResult {
  assertMode(intent, expectLive);
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

// Rejects any object whose livemode does not match the configured mode, in either direction.
function assertMode(object: { livemode: boolean }, expectLive: boolean) {
  if (object.livemode !== expectLive) throw new LiveModeStripeObjectError(object.livemode);
}

class LiveModeStripeObjectError extends Error {
  constructor(livemode: boolean) {
    super(livemode ? "Live-mode Stripe object rejected." : "Test-mode Stripe object rejected.");
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
