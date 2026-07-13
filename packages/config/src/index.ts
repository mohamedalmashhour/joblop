import { z } from "zod";

const runtimeConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RWOS_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
  API_PORT: z.coerce.number().int().positive().default(4100),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().optional()
});

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = runtimeConfigSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    rwosEnv: parsed.RWOS_ENV,
    apiPort: parsed.API_PORT,
    hasDatabaseUrl: Boolean(parsed.DATABASE_URL),
    hasSessionSecret: Boolean(parsed.SESSION_SECRET)
  } as const;
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  return runtimeConfigSchema.safeParse(env);
}
