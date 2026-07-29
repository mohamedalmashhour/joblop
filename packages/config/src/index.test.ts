import { describe, expect, it } from "vitest";
import { getRuntimeConfig, validateRuntimeConfig } from "./index";

describe("production runtime configuration", () => {
  it.each([
    [
      {
        RWOS_ENV: "production",
        NODE_ENV: "test",
        DATABASE_URL: "postgres://db",
        INTERNAL_API_ORIGIN: "https://api.example.test"
      }
    ],
    [
      {
        RWOS_ENV: "production",
        NODE_ENV: "production",
        INTERNAL_API_ORIGIN: "https://api.example.test"
      }
    ],
    [
      {
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgres://db",
        INTERNAL_API_ORIGIN: "http://127.0.0.1:4100"
      }
    ]
  ])("fails closed for invalid production input", (env) => {
    expect(validateRuntimeConfig(env)).toMatchObject({ success: false });
    expect(() => getRuntimeConfig(env)).toThrow();
  });

  it("accepts explicit production configuration without requiring SESSION_SECRET", () => {
    const env = {
      RWOS_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db.example.test/rwos",
      INTERNAL_API_ORIGIN: "https://api.example.test",
      AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
      AUTH_RATE_LIMITER_TOKEN: "test-rate-limiter-token-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_SECRET: "test-key-secret-that-is-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_ID: "key-current",
      AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1"
    };
    expect(validateRuntimeConfig(env)).toMatchObject({ success: true });
    expect(getRuntimeConfig(env)).toMatchObject({
      rwosEnv: "production",
      nodeEnv: "production",
      hasDatabaseUrl: true,
      hasDistributedAuthRateLimiter: true,
      hasSessionSecret: false
    });
  });

  it("requires the production limiter credential and HMAC key to be distinct", () => {
    const shared = "same-rate-limiter-secret-at-least-32-characters";
    expect(
      validateRuntimeConfig({
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://db.example.test/rwos",
        INTERNAL_API_ORIGIN: "https://api.example.test",
        AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
        AUTH_RATE_LIMITER_TOKEN: shared,
        AUTH_RATE_LIMITER_KEY_SECRET: shared
      })
    ).toMatchObject({ success: false });
  });

  it("forbids enabling the Assignment handoff in production and defaults it off elsewhere", () => {
    const production = {
      RWOS_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db.example.test/rwos",
      INTERNAL_API_ORIGIN: "https://api.example.test",
      AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
      AUTH_RATE_LIMITER_TOKEN: "test-rate-limiter-token-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_SECRET: "test-key-secret-that-is-at-least-32-characters",
      AUTH_RATE_LIMITER_KEY_ID: "key-current",
      AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1",
      ASSIGNMENT_HANDOFF_ENABLED: "enabled"
    };
    expect(validateRuntimeConfig(production)).toMatchObject({ success: false });
    expect(getRuntimeConfig({ RWOS_ENV: "test" })).toMatchObject({
      assignmentHandoffEnabled: false
    });
    expect(
      getRuntimeConfig({ RWOS_ENV: "test", ASSIGNMENT_HANDOFF_ENABLED: "enabled" })
    ).toMatchObject({ assignmentHandoffEnabled: true });
  });

  it.each([
    {
      CANDIDATE_SOURCE_ORIGIN: "http://candidate.example.test",
      CANDIDATE_SOURCE_TOKEN: "x".repeat(32)
    },
    { CANDIDATE_SOURCE_ORIGIN: "https://candidate.example.test" },
    {
      OFFER_DELIVERY_ORIGIN: "http://delivery.example.test",
      OFFER_DELIVERY_TOKEN: "x".repeat(32)
    },
    { OFFER_DELIVERY_ORIGIN: "https://delivery.example.test" }
  ])("fails closed for a partial or insecure production integration", (integration) => {
    expect(
      validateRuntimeConfig({
        RWOS_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://db.example.test/rwos",
        INTERNAL_API_ORIGIN: "https://api.example.test",
        AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
        AUTH_RATE_LIMITER_TOKEN: "test-rate-limiter-token-at-least-32-characters",
        AUTH_RATE_LIMITER_KEY_SECRET: "test-key-secret-that-is-at-least-32-characters",
        AUTH_RATE_LIMITER_KEY_ID: "key-current",
        AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1",
        ...integration
      })
    ).toMatchObject({ success: false });
  });

  it("requires the limiter namespace to match the declared runtime environment", () => {
    expect(
      validateRuntimeConfig({
        RWOS_ENV: "test",
        AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1"
      })
    ).toMatchObject({ success: false });
    expect(
      validateRuntimeConfig({
        RWOS_ENV: "test",
        AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:test:v1"
      })
    ).toMatchObject({ success: true });
  });

  it.each([
    { CANDIDATE_SOURCE_ORIGIN: "https://candidate.example.test" },
    {
      CANDIDATE_SOURCE_ORIGIN: "http://candidate.example.test",
      CANDIDATE_SOURCE_TOKEN: "x".repeat(32)
    },
    { OFFER_DELIVERY_ORIGIN: "https://delivery.example.test" },
    {
      OFFER_DELIVERY_ORIGIN: "http://delivery.example.test",
      OFFER_DELIVERY_TOKEN: "x".repeat(32)
    }
  ])("fails closed for a partial or insecure staging integration", (integration) => {
    expect(validateRuntimeConfig({ RWOS_ENV: "staging", ...integration })).toMatchObject({
      success: false
    });
  });
});
