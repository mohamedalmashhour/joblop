import { z } from "zod";

const runtimeConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    RWOS_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
    PORT: z.coerce.number().int().positive().optional(),
    API_PORT: z.coerce.number().int().positive().default(4100),
    INTERNAL_API_ORIGIN: z.string().url().default("http://127.0.0.1:4100"),
    DATABASE_URL: z.string().min(1).optional(),
    AUTH_RATE_LIMITER_ORIGIN: z.string().url().optional(),
    AUTH_RATE_LIMITER_TOKEN: z.string().min(32).optional(),
    AUTH_RATE_LIMITER_KEY_SECRET: z.string().min(32).optional(),
    AUTH_RATE_LIMITER_KEY_ID: z
      .string()
      .regex(/^[a-z0-9][a-z0-9_-]{0,31}$/)
      .optional(),
    AUTH_RATE_LIMITER_NAMESPACE: z
      .string()
      .regex(/^rwos:authrl:(?:local|test|staging|production):v1$/)
      .optional(),
    CANDIDATE_SOURCE_ORIGIN: z.string().url().optional(),
    CANDIDATE_SOURCE_TOKEN: z.string().min(32).optional(),
    OFFER_DELIVERY_ORIGIN: z.string().url().optional(),
    OFFER_DELIVERY_TOKEN: z.string().min(32).optional(),
    ASSIGNMENT_HANDOFF_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    SESSION_SECRET: z.string().optional(),
    // Transactional email (Resend) for email-verification / resend-code. Optional and inert until
    // both are set: without them the mailer is a no-op (dev surfaces the code locally instead of
    // sending). Mirrors the STR gating model — the feature ships dark until the owner provisions keys.
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
    STRIPE_TEST_MODE_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    STRIPE_TEST_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_TEST_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_TEST_ACCOUNT_REFERENCE: z.string().min(1).optional(),
    STRIPE_ACSS_DEBIT_ENABLED: z.enum(["disabled", "enabled"]).default("disabled")
  })
  .superRefine((config, context) => {
    if (config.STRIPE_TEST_MODE_ENABLED === "enabled") {
      if (config.RWOS_ENV !== "test" && config.RWOS_ENV !== "staging") {
        context.addIssue({
          code: "custom",
          path: ["STRIPE_TEST_MODE_ENABLED"],
          message: "Stripe test mode is allowed only in test or staging."
        });
      }
      if (!config.STRIPE_TEST_SECRET_KEY?.startsWith("sk_test_")) {
        context.addIssue({
          code: "custom",
          path: ["STRIPE_TEST_SECRET_KEY"],
          message: "Stripe test mode requires a test secret reference."
        });
      }
      if (!config.STRIPE_TEST_WEBHOOK_SECRET?.startsWith("whsec_")) {
        context.addIssue({
          code: "custom",
          path: ["STRIPE_TEST_WEBHOOK_SECRET"],
          message: "Stripe test mode requires a webhook secret reference."
        });
      }
      if (!config.STRIPE_TEST_ACCOUNT_REFERENCE) {
        context.addIssue({
          code: "custom",
          path: ["STRIPE_TEST_ACCOUNT_REFERENCE"],
          message: "Stripe test mode requires an approved account reference."
        });
      }
    }
    if (
      config.AUTH_RATE_LIMITER_NAMESPACE &&
      config.AUTH_RATE_LIMITER_NAMESPACE !== `rwos:authrl:${config.RWOS_ENV}:v1`
    ) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_RATE_LIMITER_NAMESPACE"],
        message: "AUTH_RATE_LIMITER_NAMESPACE must match RWOS_ENV."
      });
    }
    if (config.RWOS_ENV === "staging" || config.RWOS_ENV === "production") {
      requirePairedHttpsIntegration(
        config.CANDIDATE_SOURCE_ORIGIN,
        config.CANDIDATE_SOURCE_TOKEN,
        "CANDIDATE_SOURCE",
        context
      );
      requirePairedHttpsIntegration(
        config.OFFER_DELIVERY_ORIGIN,
        config.OFFER_DELIVERY_TOKEN,
        "OFFER_DELIVERY",
        context
      );
    }
    if (config.RWOS_ENV !== "production") return;
    if (config.NODE_ENV !== "production") {
      context.addIssue({
        code: "custom",
        path: ["NODE_ENV"],
        message: "NODE_ENV must be production when RWOS_ENV is production."
      });
    }
    if (!config.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when RWOS_ENV is production."
      });
    }
    if (!config.INTERNAL_API_ORIGIN.startsWith("https://")) {
      context.addIssue({
        code: "custom",
        path: ["INTERNAL_API_ORIGIN"],
        message: "INTERNAL_API_ORIGIN must use HTTPS when RWOS_ENV is production."
      });
    }
    if (!config.AUTH_RATE_LIMITER_ORIGIN?.startsWith("https://")) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_RATE_LIMITER_ORIGIN"],
        message: "AUTH_RATE_LIMITER_ORIGIN must use HTTPS when RWOS_ENV is production."
      });
    }
    if (!config.AUTH_RATE_LIMITER_TOKEN) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_RATE_LIMITER_TOKEN"],
        message: "AUTH_RATE_LIMITER_TOKEN is required when RWOS_ENV is production."
      });
    }
    if (!config.AUTH_RATE_LIMITER_KEY_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_RATE_LIMITER_KEY_SECRET"],
        message: "AUTH_RATE_LIMITER_KEY_SECRET is required when RWOS_ENV is production."
      });
    }
    if (!config.AUTH_RATE_LIMITER_KEY_ID) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_RATE_LIMITER_KEY_ID"],
        message: "AUTH_RATE_LIMITER_KEY_ID is required when RWOS_ENV is production."
      });
    }
    if (!config.AUTH_RATE_LIMITER_NAMESPACE) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_RATE_LIMITER_NAMESPACE"],
        message: "AUTH_RATE_LIMITER_NAMESPACE is required when RWOS_ENV is production."
      });
    }
    if (config.ASSIGNMENT_HANDOFF_ENABLED === "enabled") {
      context.addIssue({
        code: "custom",
        path: ["ASSIGNMENT_HANDOFF_ENABLED"],
        message: "ASSIGNMENT_HANDOFF_ENABLED cannot be enabled in production."
      });
    }
    if (
      config.AUTH_RATE_LIMITER_TOKEN &&
      config.AUTH_RATE_LIMITER_KEY_SECRET &&
      config.AUTH_RATE_LIMITER_TOKEN === config.AUTH_RATE_LIMITER_KEY_SECRET
    ) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_RATE_LIMITER_KEY_SECRET"],
        message: "AUTH_RATE_LIMITER_KEY_SECRET must be distinct from AUTH_RATE_LIMITER_TOKEN."
      });
    }
  });

function requirePairedHttpsIntegration(
  origin: string | undefined,
  token: string | undefined,
  key: "CANDIDATE_SOURCE" | "OFFER_DELIVERY",
  context: z.RefinementCtx
) {
  if (!origin && !token) return;
  if (!origin?.startsWith("https://")) {
    context.addIssue({
      code: "custom",
      path: [`${key}_ORIGIN`],
      message: `${key}_ORIGIN must use HTTPS when configured.`
    });
  }
  if (!token) {
    context.addIssue({
      code: "custom",
      path: [`${key}_TOKEN`],
      message: `${key}_TOKEN is required when ${key}_ORIGIN is configured.`
    });
  }
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = runtimeConfigSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    rwosEnv: parsed.RWOS_ENV,
    apiPort: parsed.PORT ?? parsed.API_PORT,
    internalApiOrigin: parsed.INTERNAL_API_ORIGIN,
    databaseUrl: parsed.DATABASE_URL,
    authRateLimiterOrigin: parsed.AUTH_RATE_LIMITER_ORIGIN,
    authRateLimiterToken: parsed.AUTH_RATE_LIMITER_TOKEN,
    authRateLimiterKeySecret: parsed.AUTH_RATE_LIMITER_KEY_SECRET,
    authRateLimiterKeyId: parsed.AUTH_RATE_LIMITER_KEY_ID,
    authRateLimiterNamespace: parsed.AUTH_RATE_LIMITER_NAMESPACE,
    candidateSourceOrigin: parsed.CANDIDATE_SOURCE_ORIGIN,
    candidateSourceToken: parsed.CANDIDATE_SOURCE_TOKEN,
    offerDeliveryOrigin: parsed.OFFER_DELIVERY_ORIGIN,
    offerDeliveryToken: parsed.OFFER_DELIVERY_TOKEN,
    assignmentHandoffEnabled:
      parsed.RWOS_ENV !== "production" && parsed.ASSIGNMENT_HANDOFF_ENABLED === "enabled",
    hasDistributedAuthRateLimiter: Boolean(
      parsed.AUTH_RATE_LIMITER_ORIGIN &&
      parsed.AUTH_RATE_LIMITER_TOKEN &&
      parsed.AUTH_RATE_LIMITER_KEY_SECRET &&
      parsed.AUTH_RATE_LIMITER_KEY_ID &&
      parsed.AUTH_RATE_LIMITER_NAMESPACE
    ),
    hasCandidateSource: Boolean(parsed.CANDIDATE_SOURCE_ORIGIN && parsed.CANDIDATE_SOURCE_TOKEN),
    hasOfferDelivery: Boolean(parsed.OFFER_DELIVERY_ORIGIN && parsed.OFFER_DELIVERY_TOKEN),
    hasDatabaseUrl: Boolean(parsed.DATABASE_URL),
    hasSessionSecret: Boolean(parsed.SESSION_SECRET),
    resendApiKey: parsed.RESEND_API_KEY,
    emailFrom: parsed.EMAIL_FROM,
    // True only when both are present — the mailer sends real email; otherwise it stays a no-op.
    hasEmailDelivery: Boolean(parsed.RESEND_API_KEY && parsed.EMAIL_FROM),
    stripeTestModeEnabled: parsed.STRIPE_TEST_MODE_ENABLED === "enabled",
    stripeTestSecretKey: parsed.STRIPE_TEST_SECRET_KEY,
    stripeTestWebhookSecret: parsed.STRIPE_TEST_WEBHOOK_SECRET,
    stripeTestAccountReference: parsed.STRIPE_TEST_ACCOUNT_REFERENCE,
    stripeAcssDebitEnabled: parsed.STRIPE_ACSS_DEBIT_ENABLED === "enabled"
  } as const;
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  return runtimeConfigSchema.safeParse(env);
}
