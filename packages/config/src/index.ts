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
    // HR-6.1 Chunk 3: capability gate for a FUTURE external AI review provider. Default disabled;
    // never permitted in production. Even when enabled it does nothing unless a provider is injected.
    PAYROLL_AI_EXTERNAL_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    // Money-flow Phase 1: employer invoice → Stripe TEST collection. Independent of FINANCE_LIVE_ENABLED
    // (which stays OFF) — this gate turns on the TEST-mode employer-invoice card collection only, and
    // only alongside the Stripe TEST keys. Default disabled; refused in production (like
    // ASSIGNMENT_HANDOFF_ENABLED). No live key, no real money: createStripeTestClient rejects any
    // non-sk_test_ secret. See docs/finance/EMPLOYER_INVOICE_STRIPE_TEST_COLLECTION.md.
    INVOICE_TEST_MODE_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    // Money-flow Phase 2: worker payout → Stripe TEST execution. Independent of FINANCE_LIVE_ENABLED
    // (which stays OFF) — this gate turns on the TEST-mode worker-payout EXECUTION (released → paid)
    // only, and only alongside the Stripe TEST keys. Default disabled; refused in production. No live
    // key, no real money: createStripeTestClient rejects any non-sk_test_ secret; without a configured
    // test connected account the "paid" is a recorded SYNTHETIC reference, never a real send. See
    // docs/finance/WORKER_PAYOUT_TEST_EXECUTION.md.
    PAYOUT_TEST_MODE_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    // Optional Stripe TEST connected account (acct_...) the test payout transfers to when present.
    // When absent, the test execution records a synthetic reference instead of attempting a transfer.
    STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT: z.string().min(1).optional(),
    SESSION_SECRET: z.string().optional(),
    // Transactional email (Resend) for email-verification / resend-code. Optional and inert until
    // both are set: without them the mailer is a no-op (dev surfaces the code locally instead of
    // sending). Mirrors the STR gating model — the feature ships dark until the owner provisions keys.
    RESEND_API_KEY: z.string().min(1).optional(),
    // Brevo (formerly Sendinblue) is the owner's chosen provider. Set BREVO_API_KEY (api-key header)
    // and EMAIL_FROM; EMAIL_PROVIDER selects which HTTP API the mailer talks to (default brevo).
    BREVO_API_KEY: z.string().min(1).optional(),
    EMAIL_PROVIDER: z.enum(["brevo", "resend"]).default("brevo"),
    // Accept either a bare address (user@domain) or an RFC-5322 display-name form
    // ("Joblop <user@domain>"), which mail "From" headers use and Resend expects for branding.
    EMAIL_FROM: z
      .string()
      .refine(
        (value) => {
          const v = value.trim();
          const bare = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const named = /^.+<\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*>$/;
          return bare.test(v) || named.test(v);
        },
        { message: 'EMAIL_FROM must be an email address or "Name <email@domain>".' }
      )
      .optional(),
    PASSWORD_RESET_PUBLIC_ORIGIN: z.string().url().optional(),
    STRIPE_TEST_MODE_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    STRIPE_TEST_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_TEST_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_TEST_ACCOUNT_REFERENCE: z.string().min(1).optional(),
    STRIPE_ACSS_DEBIT_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    LOCAL_PAYMENT_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    LOCAL_PAYMENT_WEBHOOK_SECRET: z.string().min(32).optional(),
    DOCUMENT_LOCAL_UPLOAD_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    DOCUMENT_LOCAL_STORAGE_ROOT: z.string().min(1).optional(),
    DOCUMENT_REFERENCE_SECRET: z.string().min(32).optional(),
    // HMAC secret verifying provider verification callbacks. Inert until set: without it the
    // callback endpoint rejects every request (no unsigned/unverifiable callback is trusted).
    VERIFICATION_CALLBACK_SECRET: z.string().min(32).optional(),
    // Two-channel pay go-live gate. OFF by default and everywhere: with it disabled the finance
    // engine computes and accounts for everything (deductions, remittances, slips, double-entry) but
    // executes no real money and files nothing. Turning it on is deliberate and requires a recorded
    // CPA sign-off and a non-local environment (enforced below). See
    // docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
    FINANCE_LIVE_ENABLED: z.enum(["disabled", "enabled"]).default("disabled"),
    FINANCE_LIVE_CPA_SIGNOFF: z.string().min(8).optional()
  })
  .superRefine((config, context) => {
    if (config.FINANCE_LIVE_ENABLED === "enabled") {
      if (!config.FINANCE_LIVE_CPA_SIGNOFF) {
        context.addIssue({
          code: "custom",
          path: ["FINANCE_LIVE_ENABLED"],
          message: "Live finance requires FINANCE_LIVE_CPA_SIGNOFF (a recorded CPA sign-off reference)."
        });
      }
      if (config.RWOS_ENV !== "staging" && config.RWOS_ENV !== "production") {
        context.addIssue({
          code: "custom",
          path: ["FINANCE_LIVE_ENABLED"],
          message: "Live finance is allowed only in staging or production."
        });
      }
    }
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
    if (config.INVOICE_TEST_MODE_ENABLED === "enabled") {
      if (config.RWOS_ENV !== "test" && config.RWOS_ENV !== "staging") {
        context.addIssue({
          code: "custom",
          path: ["INVOICE_TEST_MODE_ENABLED"],
          message: "Employer invoice test-mode collection is allowed only in test or staging."
        });
      }
      if (config.STRIPE_TEST_MODE_ENABLED !== "enabled") {
        context.addIssue({
          code: "custom",
          path: ["INVOICE_TEST_MODE_ENABLED"],
          message: "Employer invoice test-mode collection requires STRIPE_TEST_MODE_ENABLED=enabled."
        });
      }
      if (config.FINANCE_LIVE_ENABLED === "enabled") {
        context.addIssue({
          code: "custom",
          path: ["INVOICE_TEST_MODE_ENABLED"],
          message: "Employer invoice test-mode collection is a TEST path and cannot run with live finance on."
        });
      }
    }
    if (config.PAYOUT_TEST_MODE_ENABLED === "enabled") {
      if (config.RWOS_ENV !== "test" && config.RWOS_ENV !== "staging") {
        context.addIssue({
          code: "custom",
          path: ["PAYOUT_TEST_MODE_ENABLED"],
          message: "Worker payout test-mode execution is allowed only in test or staging."
        });
      }
      if (config.STRIPE_TEST_MODE_ENABLED !== "enabled") {
        context.addIssue({
          code: "custom",
          path: ["PAYOUT_TEST_MODE_ENABLED"],
          message: "Worker payout test-mode execution requires STRIPE_TEST_MODE_ENABLED=enabled."
        });
      }
      if (config.FINANCE_LIVE_ENABLED === "enabled") {
        context.addIssue({
          code: "custom",
          path: ["PAYOUT_TEST_MODE_ENABLED"],
          message: "Worker payout test-mode execution is a TEST path and cannot run with live finance on."
        });
      }
    }
    if (
      config.STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT &&
      !config.STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT.startsWith("acct_")
    ) {
      context.addIssue({
        code: "custom",
        path: ["STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT"],
        message: "A Stripe test payout connected account must be a Stripe account reference (acct_...)."
      });
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
    if (config.DOCUMENT_LOCAL_UPLOAD_ENABLED === "enabled") {
      if (config.RWOS_ENV !== "local" && config.RWOS_ENV !== "test") {
        context.addIssue({
          code: "custom",
          path: ["DOCUMENT_LOCAL_UPLOAD_ENABLED"],
          message: "Local document upload is allowed only in local or test environments."
        });
      }
      if (!config.DATABASE_URL) {
        context.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message: "Local document upload requires durable PostgreSQL metadata."
        });
      }
      if (!config.DOCUMENT_LOCAL_STORAGE_ROOT) {
        context.addIssue({
          code: "custom",
          path: ["DOCUMENT_LOCAL_STORAGE_ROOT"],
          message: "Local document upload requires a private storage root."
        });
      }
      if (!config.DOCUMENT_REFERENCE_SECRET) {
        context.addIssue({
          code: "custom",
          path: ["DOCUMENT_REFERENCE_SECRET"],
          message: "Local document upload requires a reference-signing secret."
        });
      }
    }
    if (config.LOCAL_PAYMENT_ENABLED === "enabled") {
      if (config.RWOS_ENV !== "local" && config.RWOS_ENV !== "test") {
        context.addIssue({
          code: "custom",
          path: ["LOCAL_PAYMENT_ENABLED"],
          message: "Local payment orchestration is allowed only in local or test environments."
        });
      }
      if (!config.DATABASE_URL) {
        context.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message: "Local payment orchestration requires durable PostgreSQL."
        });
      }
      if (!config.LOCAL_PAYMENT_WEBHOOK_SECRET) {
        context.addIssue({
          code: "custom",
          path: ["LOCAL_PAYMENT_WEBHOOK_SECRET"],
          message: "Local payment orchestration requires a webhook signing secret."
        });
      }
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
    if (
      config.PASSWORD_RESET_PUBLIC_ORIGIN &&
      !config.PASSWORD_RESET_PUBLIC_ORIGIN.startsWith("https://")
    ) {
      context.addIssue({
        code: "custom",
        path: ["PASSWORD_RESET_PUBLIC_ORIGIN"],
        message: "PASSWORD_RESET_PUBLIC_ORIGIN must use HTTPS when RWOS_ENV is production."
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
    if (config.PAYROLL_AI_EXTERNAL_ENABLED === "enabled") {
      context.addIssue({
        code: "custom",
        path: ["PAYROLL_AI_EXTERNAL_ENABLED"],
        message: "PAYROLL_AI_EXTERNAL_ENABLED cannot be enabled in production."
      });
    }
    if (config.INVOICE_TEST_MODE_ENABLED === "enabled") {
      context.addIssue({
        code: "custom",
        path: ["INVOICE_TEST_MODE_ENABLED"],
        message: "INVOICE_TEST_MODE_ENABLED cannot be enabled in production."
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
    verificationCallbackSecret: parsed.VERIFICATION_CALLBACK_SECRET,
    authRateLimiterOrigin: parsed.AUTH_RATE_LIMITER_ORIGIN,
    authRateLimiterToken: parsed.AUTH_RATE_LIMITER_TOKEN,
    authRateLimiterKeySecret: parsed.AUTH_RATE_LIMITER_KEY_SECRET,
    authRateLimiterKeyId: parsed.AUTH_RATE_LIMITER_KEY_ID,
    authRateLimiterNamespace: parsed.AUTH_RATE_LIMITER_NAMESPACE,
    candidateSourceOrigin: parsed.CANDIDATE_SOURCE_ORIGIN,
    candidateSourceToken: parsed.CANDIDATE_SOURCE_TOKEN,
    offerDeliveryOrigin: parsed.OFFER_DELIVERY_ORIGIN,
    offerDeliveryToken: parsed.OFFER_DELIVERY_TOKEN,
    // Assignment handoff (create a governed assignment from an accepted offer). Forbidden in
    // production (see the refine above) and off unless ASSIGNMENT_HANDOFF_ENABLED=enabled;
    // boot-local-stack.sh sets it so the full post→offer→accept→assignment lifecycle runs locally.
    assignmentHandoffEnabled:
      parsed.RWOS_ENV !== "production" && parsed.ASSIGNMENT_HANDOFF_ENABLED === "enabled",
    // Capability gate for a future external AI review provider. Non-production only, default off.
    payrollAiExternalEnabled:
      parsed.RWOS_ENV !== "production" && parsed.PAYROLL_AI_EXTERNAL_ENABLED === "enabled",
    // Money-flow Phase 1: employer invoice → Stripe TEST collection. Enabled only in test/staging with
    // Stripe test mode also on; never in production. FINANCE_LIVE_ENABLED is untouched and stays off.
    invoiceTestModeEnabled:
      parsed.RWOS_ENV !== "production" &&
      parsed.INVOICE_TEST_MODE_ENABLED === "enabled" &&
      parsed.STRIPE_TEST_MODE_ENABLED === "enabled",
    // Money-flow Phase 2: worker payout → Stripe TEST execution. Enabled only in test/staging with
    // Stripe test mode also on; never in production. FINANCE_LIVE_ENABLED is untouched and stays off.
    payoutTestModeEnabled:
      parsed.RWOS_ENV !== "production" &&
      parsed.PAYOUT_TEST_MODE_ENABLED === "enabled" &&
      parsed.STRIPE_TEST_MODE_ENABLED === "enabled",
    // The Stripe TEST connected account a worker payout transfers to, when configured. Absent → the
    // test execution records a synthetic reference instead of attempting a real (test) transfer.
    stripeTestPayoutConnectedAccount: parsed.STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT,
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
    emailProvider: parsed.EMAIL_PROVIDER,
    // The API key for the selected provider — Brevo by default, Resend when EMAIL_PROVIDER=resend.
    emailApiKey: parsed.EMAIL_PROVIDER === "resend" ? parsed.RESEND_API_KEY : parsed.BREVO_API_KEY,
    emailFrom: parsed.EMAIL_FROM,
    passwordResetPublicOrigin: parsed.PASSWORD_RESET_PUBLIC_ORIGIN,
    // True only when the selected provider's key + from-address are present; otherwise a no-op.
    hasEmailDelivery: Boolean(
      (parsed.EMAIL_PROVIDER === "resend" ? parsed.RESEND_API_KEY : parsed.BREVO_API_KEY) &&
        parsed.EMAIL_FROM
    ),
    stripeTestModeEnabled: parsed.STRIPE_TEST_MODE_ENABLED === "enabled",
    stripeTestSecretKey: parsed.STRIPE_TEST_SECRET_KEY,
    stripeTestWebhookSecret: parsed.STRIPE_TEST_WEBHOOK_SECRET,
    stripeTestAccountReference: parsed.STRIPE_TEST_ACCOUNT_REFERENCE,
    stripeAcssDebitEnabled: parsed.STRIPE_ACSS_DEBIT_ENABLED === "enabled",
    localPaymentEnabled: parsed.LOCAL_PAYMENT_ENABLED === "enabled",
    localPaymentWebhookSecret: parsed.LOCAL_PAYMENT_WEBHOOK_SECRET,
    documentLocalUploadEnabled: parsed.DOCUMENT_LOCAL_UPLOAD_ENABLED === "enabled",
    documentLocalStorageRoot: parsed.DOCUMENT_LOCAL_STORAGE_ROOT,
    documentReferenceSecret: parsed.DOCUMENT_REFERENCE_SECRET
  } as const;
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  return runtimeConfigSchema.safeParse(env);
}

// Country-neutral country selection (see country.ts). Country profiles themselves live in isolated
// countries/<country>/ implementations, never in this master package.
export * from "./country";
