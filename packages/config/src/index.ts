import { z } from "zod";

const runtimeConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    RWOS_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
    API_PORT: z.coerce.number().int().positive().default(4100),
    INTERNAL_API_ORIGIN: z.string().url().default("http://127.0.0.1:4100"),
    DATABASE_URL: z.string().min(1).optional(),
    AUTH_RATE_LIMITER_ORIGIN: z.string().url().optional(),
    AUTH_RATE_LIMITER_TOKEN: z.string().min(32).optional(),
    AUTH_RATE_LIMITER_KEY_SECRET: z.string().min(32).optional(),
    CANDIDATE_SOURCE_ORIGIN: z.string().url().optional(),
    CANDIDATE_SOURCE_TOKEN: z.string().min(32).optional(),
    OFFER_DELIVERY_ORIGIN: z.string().url().optional(),
    OFFER_DELIVERY_TOKEN: z.string().min(32).optional(),
    SESSION_SECRET: z.string().optional()
  })
  .superRefine((config, context) => {
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
    apiPort: parsed.API_PORT,
    internalApiOrigin: parsed.INTERNAL_API_ORIGIN,
    databaseUrl: parsed.DATABASE_URL,
    authRateLimiterOrigin: parsed.AUTH_RATE_LIMITER_ORIGIN,
    authRateLimiterToken: parsed.AUTH_RATE_LIMITER_TOKEN,
    authRateLimiterKeySecret: parsed.AUTH_RATE_LIMITER_KEY_SECRET,
    candidateSourceOrigin: parsed.CANDIDATE_SOURCE_ORIGIN,
    candidateSourceToken: parsed.CANDIDATE_SOURCE_TOKEN,
    offerDeliveryOrigin: parsed.OFFER_DELIVERY_ORIGIN,
    offerDeliveryToken: parsed.OFFER_DELIVERY_TOKEN,
    hasDistributedAuthRateLimiter: Boolean(
      parsed.AUTH_RATE_LIMITER_ORIGIN &&
      parsed.AUTH_RATE_LIMITER_TOKEN &&
      parsed.AUTH_RATE_LIMITER_KEY_SECRET
    ),
    hasCandidateSource: Boolean(parsed.CANDIDATE_SOURCE_ORIGIN && parsed.CANDIDATE_SOURCE_TOKEN),
    hasOfferDelivery: Boolean(parsed.OFFER_DELIVERY_ORIGIN && parsed.OFFER_DELIVERY_TOKEN),
    hasDatabaseUrl: Boolean(parsed.DATABASE_URL),
    hasSessionSecret: Boolean(parsed.SESSION_SECRET)
  } as const;
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  return runtimeConfigSchema.safeParse(env);
}
