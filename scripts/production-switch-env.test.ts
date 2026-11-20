import { describe, expect, it } from "vitest";
import { getRuntimeConfig, validateRuntimeConfig } from "@rwos/config";
import { classifyEnvironmentName } from "./environment-classification";
import {
  MUST_BE_OFF_IN_PRODUCTION,
  PLANNED_PRODUCTION_ENV,
  checkProductionSwitchEnv,
  parseEnvFile
} from "./production-switch-env";

// A plausible copy of today's live API env (RWOS_ENV=test soft launch), with placeholder values.
const LIVE_TEST_ENV: Readonly<Record<string, string>> = {
  RWOS_ENV: "test",
  NODE_ENV: "production",
  RENDER: "true",
  RWOS_COUNTRY: "canada-test",
  RWOS_COUNTRY_TEST_MODE: "1",
  DATABASE_URL: "postgresql://db.placeholder.invalid:5432/joblop",
  BREVO_API_KEY: "placeholder-brevo-key",
  EMAIL_FROM: "Joblop <hello@placeholder.invalid>"
};

// The runbook's change set applied to the live env.
function switched(base: Readonly<Record<string, string>>) {
  const env: Record<string, string> = { ...base };
  delete env.RWOS_COUNTRY_TEST_MODE;
  for (const name of MUST_BE_OFF_IN_PRODUCTION) delete env[name];
  return {
    ...env,
    RWOS_ENV: "production",
    RWOS_COUNTRY: "canada-quebec",
    INTERNAL_API_ORIGIN: "https://api.placeholder.invalid",
    AUTH_RATE_LIMITER_BACKEND: "postgres",
    AUTH_RATE_LIMITER_KEY_SECRET: "placeholder-key-secret-generate-48-random-chars",
    AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1"
  };
}

describe("production switch env (offline proof)", () => {
  it("the planned production env passes validateRuntimeConfig and every startup check", () => {
    expect(validateRuntimeConfig({ ...PLANNED_PRODUCTION_ENV })).toMatchObject({ success: true });
    const report = checkProductionSwitchEnv(PLANNED_PRODUCTION_ENV);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.summary).toEqual({
      country: "canada-quebec",
      timezone: "America/Toronto",
      currency: "CAD",
      jobFlow: "on",
      publicSignup: "on",
      authRateLimiter: "postgres"
    });
  });

  it("the live test env with the runbook's changes applied passes", () => {
    expect(checkProductionSwitchEnv(switched(LIVE_TEST_ENV))).toMatchObject({ ok: true, issues: [] });
  });

  it("the live test env itself stays valid and unchanged by the new settings", () => {
    expect(validateRuntimeConfig({ ...LIVE_TEST_ENV })).toMatchObject({ success: true });
    expect(getRuntimeConfig({ ...LIVE_TEST_ENV })).toMatchObject({
      rwosEnv: "test",
      authRateLimiterBackend: null,
      jobFlowFlag: null,
      publicSignupFlag: null
    });
  });

  it.each<[string, Record<string, string | undefined>, RegExp]>([
    ["only flipping RWOS_ENV", { ...LIVE_TEST_ENV, RWOS_ENV: "production" }, /country|INTERNAL_API_ORIGIN/],
    ["keeping canada-test", { ...PLANNED_PRODUCTION_ENV, RWOS_COUNTRY: "canada-test", RWOS_COUNTRY_TEST_MODE: "1" }, /RWOS_COUNTRY_UNSUPPORTED/],
    ["selecting the closed Syria profile", { ...PLANNED_PRODUCTION_ENV, RWOS_COUNTRY: "syria" }, /RWOS_COUNTRY_PROFILE_INCOMPLETE/],
    ["no country", { ...PLANNED_PRODUCTION_ENV, RWOS_COUNTRY: undefined }, /RWOS_COUNTRY_REQUIRED/],
    ["an http internal origin", { ...PLANNED_PRODUCTION_ENV, INTERNAL_API_ORIGIN: "http://127.0.0.1:4100" }, /INTERNAL_API_ORIGIN/],
    ["the test limiter namespace", { ...PLANNED_PRODUCTION_ENV, AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:test:v1" }, /AUTH_RATE_LIMITER_NAMESPACE/],
    ["no limiter key secret", { ...PLANNED_PRODUCTION_ENV, AUTH_RATE_LIMITER_KEY_SECRET: undefined }, /AUTH_RATE_LIMITER_KEY_SECRET/],
    ["the remote limiter without a service", { ...PLANNED_PRODUCTION_ENV, AUTH_RATE_LIMITER_BACKEND: undefined }, /AUTH_RATE_LIMITER_ORIGIN/],
    ["Stripe test mode left on", { ...PLANNED_PRODUCTION_ENV, STRIPE_TEST_MODE_ENABLED: "enabled" }, /STRIPE_TEST_MODE_ENABLED/],
    ["the public worker ingress left on", { ...PLANNED_PRODUCTION_ENV, RWOS_PUBLIC_WORKER_INGRESS_ONLY: "enabled" }, /RWOS_PUBLIC_WORKER_INGRESS_ONLY/],
    ["the job flow switched off", { ...PLANNED_PRODUCTION_ENV, RWOS_JOB_FLOW_ENABLED: "disabled" }, /job flow would be OFF/],
    ["sign-up switched off", { ...PLANNED_PRODUCTION_ENV, RWOS_PUBLIC_SIGNUP_ENABLED: "disabled" }, /sign-up would be OFF/],
    ["NODE_ENV not production", { ...PLANNED_PRODUCTION_ENV, NODE_ENV: "development" }, /NODE_ENV/]
  ])("fails before the switch for %s", (_label, env, expected) => {
    const report = checkProductionSwitchEnv(env);
    expect(report.ok).toBe(false);
    expect(report.issues.join("\n")).toMatch(expected);
  });

  it("never echoes a secret value in its report", () => {
    const report = checkProductionSwitchEnv({ ...PLANNED_PRODUCTION_ENV, AUTH_RATE_LIMITER_KEY_SECRET: "short-secret-value" });
    expect(JSON.stringify(report)).not.toContain("short-secret-value");
  });

  it("parses an env file copy", () => {
    expect(parseEnvFile('# comment\nRWOS_ENV=production\nexport RWOS_COUNTRY="canada-quebec"\n\nBAD LINE\n')).toEqual({
      RWOS_ENV: "production",
      RWOS_COUNTRY: "canada-quebec"
    });
  });

  it("classifies every new setting as server-only", () => {
    for (const name of ["RWOS_JOB_FLOW_ENABLED", "RWOS_PUBLIC_SIGNUP_ENABLED", "AUTH_RATE_LIMITER_BACKEND", "RWOS_COUNTRY"]) {
      expect(classifyEnvironmentName(name), name).toBe("server-only-non-secret");
    }
    expect(classifyEnvironmentName("AUTH_RATE_LIMITER_KEY_SECRET")).toBe("prohibited-from-bundles-and-logs");
  });
});
