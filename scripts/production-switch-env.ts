import {
  getRuntimeConfig,
  isCountryProfileActivatable,
  resolveCountryConfig,
  validateRuntimeConfig,
  type CountryProfile
} from "@rwos/config";
import { moneyEngineCurrencies } from "@rwos/shared";
import { apiAddressPortForCountry, apiCountryRegistry } from "../apps/api/src/countryRegistry";
import { isCountryTestModeEnabled, withTestModeCountry } from "../apps/api/src/countryRegistry.testMode";
import { createPostgresAuthenticationRateLimiter } from "../apps/api/src/postgresAuthRateLimiter";
import { resolveProductionFeatureFlags } from "../apps/api/src/productionRoutePolicy";

// Offline proof for the RWOS_ENV=production switch on the live API (docs/runbooks/production-switch.md).
// It runs the same checks the API runs at startup (config schema, country selection, currency gate,
// limiter construction, the public-ingress guard) plus the launch expectations (job flow and sign-up
// on), against an env map, without starting anything or touching a network or database.

/**
 * The planned production env for the API service, with PLACEHOLDER secrets. Real secret values come
 * from the owner or are generated at switch time; names and non-secret values here are exact.
 */
export const PLANNED_PRODUCTION_ENV: Readonly<Record<string, string>> = {
  RWOS_ENV: "production",
  NODE_ENV: "production",
  RWOS_COUNTRY: "canada-quebec",
  DATABASE_URL: "postgresql://db.placeholder.invalid:5432/joblop",
  INTERNAL_API_ORIGIN: "https://api.placeholder.invalid",
  AUTH_RATE_LIMITER_BACKEND: "postgres",
  AUTH_RATE_LIMITER_KEY_SECRET: "placeholder-key-secret-generate-48-random-chars",
  AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1"
};

/** Settings that must be absent (or `disabled`) once RWOS_ENV=production. */
export const MUST_BE_OFF_IN_PRODUCTION = [
  "STRIPE_TEST_MODE_ENABLED",
  "INVOICE_TEST_MODE_ENABLED",
  "PAYOUT_TEST_MODE_ENABLED",
  "LOCAL_PAYMENT_ENABLED",
  "DOCUMENT_LOCAL_UPLOAD_ENABLED",
  "ASSIGNMENT_HANDOFF_ENABLED",
  "PAYROLL_AI_EXTERNAL_ENABLED",
  "RWOS_PUBLIC_WORKER_INGRESS_ONLY"
] as const;

export type ProductionSwitchReport = Readonly<{
  ok: boolean;
  issues: readonly string[];
  summary: Readonly<Record<string, string>>;
}>;

export function checkProductionSwitchEnv(env: Readonly<Record<string, string | undefined>>): ProductionSwitchReport {
  const issues: string[] = [];
  const summary: Record<string, string> = {};

  if (env.RWOS_ENV !== "production") issues.push("RWOS_ENV must be production for the switch.");

  const parsed = validateRuntimeConfig({ ...env });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push(`config ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
  }
  for (const name of MUST_BE_OFF_IN_PRODUCTION) {
    const value = env[name];
    if (value !== undefined && value !== "disabled") issues.push(`${name} must be removed (or disabled) in production.`);
  }

  // Country selection exactly as apps/api/src/server.ts does it.
  let profile: CountryProfile | null = null;
  try {
    profile = resolveCountryConfig({
      rwosEnv: env.RWOS_ENV ?? "local",
      country: env.RWOS_COUNTRY,
      registry: withTestModeCountry(
        apiCountryRegistry,
        env.RWOS_ENV ?? "local",
        isCountryTestModeEnabled(env.RWOS_COUNTRY_TEST_MODE)
      )
    });
  } catch (error) {
    issues.push(
      `country: ${error instanceof Error ? error.message : "unknown"} (the API would serve only 503s; set RWOS_COUNTRY=canada-quebec).`
    );
  }
  if (profile) {
    summary.country = profile.country;
    summary.timezone = profile.timezone ?? "none";
    summary.currency = profile.currency ?? "none";
    if (!isCountryProfileActivatable(profile)) issues.push(`country ${profile.country} is not activatable.`);
    if (profile.currency !== null && !(moneyEngineCurrencies as readonly string[]).includes(profile.currency)) {
      issues.push(`country currency ${profile.currency} is not supported by the money engine.`);
    }
    if (!apiAddressPortForCountry(profile.country)) {
      issues.push(`country ${profile.country} has no address adapter (postal codes and search would fail).`);
    }
  }

  if (parsed.success) {
    const config = getRuntimeConfig({ ...env });
    const flags = resolveProductionFeatureFlags(
      { jobFlow: config.jobFlowFlag, publicSignup: config.publicSignupFlag },
      profile?.productionDefaults
    );
    summary.jobFlow = flags.jobFlowEnabled ? "on" : "off";
    summary.publicSignup = flags.publicSignupEnabled ? "on" : "off";
    if (!flags.jobFlowEnabled) issues.push("the job flow would be OFF (offer accept, check-in, timesheets, staff dispatch return 404).");
    if (!flags.publicSignupEnabled) issues.push("public sign-up would be OFF (/auth/register returns 404).");

    summary.authRateLimiter = config.authRateLimiterBackend ?? "remote";
    if (config.authRateLimiterBackend === "postgres") {
      try {
        createPostgresAuthenticationRateLimiter({
          db: { $queryRawUnsafe: async () => [] as never },
          keySecret: config.authRateLimiterKeySecret ?? "",
          namespace: config.authRateLimiterNamespace ?? `rwos:authrl:${config.rwosEnv}:v1`,
          ...(config.authRateLimiterKeyId ? { keyId: config.authRateLimiterKeyId } : {})
        });
      } catch {
        issues.push("the Postgres sign-in limiter settings are invalid (key secret 32+ chars, production namespace).");
      }
    } else {
      issues.push(
        "AUTH_RATE_LIMITER_BACKEND is not postgres: production would need a separate remote limiter service, which this repository cannot run in production."
      );
    }
  }

  return { ok: issues.length === 0, issues, summary };
}

/** Parses KEY=VALUE lines (blank lines and # comments ignored, optional surrounding quotes). */
export function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2]!;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]!] = value;
  }
  return env;
}
