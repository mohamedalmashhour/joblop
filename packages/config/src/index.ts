import { z } from "zod";

const runtimeConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    RWOS_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
    API_PORT: z.coerce.number().int().positive().default(4100),
    INTERNAL_API_ORIGIN: z.string().url().default("http://127.0.0.1:4100"),
    DATABASE_URL: z.string().min(1).optional(),
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
  });

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = runtimeConfigSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    rwosEnv: parsed.RWOS_ENV,
    apiPort: parsed.API_PORT,
    internalApiOrigin: parsed.INTERNAL_API_ORIGIN,
    databaseUrl: parsed.DATABASE_URL,
    hasDatabaseUrl: Boolean(parsed.DATABASE_URL),
    hasSessionSecret: Boolean(parsed.SESSION_SECRET)
  } as const;
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  return runtimeConfigSchema.safeParse(env);
}
