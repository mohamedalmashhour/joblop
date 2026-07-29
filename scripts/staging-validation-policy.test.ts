import { describe, expect, it } from "vitest";

import {
  isMigrationStateComplete,
  stagingConfirmation,
  validateStagingEnvironment
} from "./staging-validation-policy";

const validEnvironment = {
  RWOS_ENV: "production",
  NODE_ENV: "production",
  RWOS_STAGING_VALIDATION_CONFIRMATION: stagingConfirmation,
  RWOS_RELEASE_SHA: "0123456789abcdef0123456789abcdef01234567",
  RWOS_STAGING_DATABASE_CLUSTER_ID: "provider/staging/cluster-01",
  RWOS_PRODUCTION_DATABASE_CLUSTER_ID: "provider/production/cluster-01",
  DATABASE_URL: "postgresql://rwos@db.example.test/rwos_staging?sslmode=verify-full",
  INTERNAL_API_ORIGIN: "https://api.staging.example.test",
  AUTH_RATE_LIMITER_ORIGIN: "https://limiter.staging.example.test",
  AUTH_RATE_LIMITER_TOKEN: "limiter-token-that-is-longer-than-thirty-two-characters",
  AUTH_RATE_LIMITER_KEY_SECRET: "distinct-hmac-secret-longer-than-thirty-two-characters",
  AUTH_RATE_LIMITER_KEY_ID: "key-2026-07",
  AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:staging:v1",
  AUTH_LIMITER_AUTH_MODE: "dual-required",
  AUTH_LIMITER_AUDIENCE: "https://rwos-limiter-opaque-nn.a.run.app",
  AUTH_LIMITER_API_SERVICE_ACCOUNT: "rwos-api@staging.invalid",
  CANDIDATE_SOURCE_ORIGIN: "https://candidate.staging.example.test",
  CANDIDATE_SOURCE_TOKEN: "candidate-token-that-is-longer-than-thirty-two-characters",
  CANDIDATE_ADAPTER_AUTH_MODE: "dual-required",
  CANDIDATE_ADAPTER_AUDIENCE: "https://rwos-candidate-opaque-nn.a.run.app",
  CANDIDATE_ADAPTER_API_SERVICE_ACCOUNT: "rwos-api@staging.invalid",
  OFFER_DELIVERY_ORIGIN: "https://delivery.staging.example.test",
  OFFER_DELIVERY_TOKEN: "delivery-token-that-is-longer-than-thirty-two-characters",
  OFFER_DELIVERY_ADAPTER_AUTH_MODE: "iam-application",
  OFFER_DELIVERY_ADAPTER_AUDIENCE: "https://rwos-delivery-opaque-nn.a.run.app",
  OFFER_DELIVERY_ADAPTER_API_SERVICE_ACCOUNT: "rwos-api@staging.invalid",
  SECRET_MANAGER_PROVIDER: "approved-provider/reference-only",
  MONITORING_HEALTHCHECK_URL: "https://monitoring.staging.example.test/health",
  PAGING_HEALTHCHECK_URL: "https://paging.staging.example.test/health"
} as const;

describe("staging validation policy", () => {
  it("accepts an explicit production-boundary staging configuration", () => {
    expect(validateStagingEnvironment(validEnvironment)).toEqual([]);
  });

  it("fails closed for absent staging authority and dependencies", () => {
    expect(validateStagingEnvironment({})).toEqual(
      expect.arrayContaining([
        "RWOS_ENV must be production.",
        "NODE_ENV must be production.",
        "RWOS_RELEASE_SHA is required.",
        "RWOS_STAGING_DATABASE_CLUSTER_ID is required.",
        "DATABASE_URL is required.",
        "CANDIDATE_SOURCE_ORIGIN is required.",
        "MONITORING_HEALTHCHECK_URL is required."
      ])
    );
  });

  it.each([
    ["localhost database", { DATABASE_URL: "postgresql://rwos@127.0.0.1/rwos_staging" }],
    [
      "unlabelled database",
      { DATABASE_URL: "postgresql://rwos@db.example.test/resident_workforce" }
    ],
    ["non-PostgreSQL database", { DATABASE_URL: "https://db.example.test/rwos_staging" }],
    [
      "missing database TLS mode",
      { DATABASE_URL: "postgresql://rwos@db.example.test/rwos_staging" }
    ],
    [
      "disabled database TLS",
      { DATABASE_URL: "postgresql://rwos@db.example.test/rwos_staging?sslmode=disable" }
    ],
    ["abbreviated release SHA", { RWOS_RELEASE_SHA: "6727705" }],
    ["ambiguous cluster identity", { RWOS_STAGING_DATABASE_CLUSTER_ID: "staging" }],
    [
      "colliding cluster identities",
      {
        RWOS_STAGING_DATABASE_CLUSTER_ID: "provider/production/cluster-01",
        RWOS_PRODUCTION_DATABASE_CLUSTER_ID: "provider/production/cluster-01"
      }
    ],
    ["insecure provider", { OFFER_DELIVERY_ORIGIN: "http://delivery.example.test" }],
    ["legacy receiver mode", { AUTH_LIMITER_AUTH_MODE: "legacy-app-only" }],
    [
      "shared limiter secrets",
      {
        AUTH_RATE_LIMITER_TOKEN: "shared-secret-that-is-longer-than-thirty-two-characters",
        AUTH_RATE_LIMITER_KEY_SECRET: "shared-secret-that-is-longer-than-thirty-two-characters"
      }
    ]
  ])("rejects %s", (_label, override) => {
    expect(validateStagingEnvironment({ ...validEnvironment, ...override })).not.toEqual([]);
  });
});

describe("staging migration state", () => {
  const completed = (migration_name: string) => ({
    migration_name,
    finished_at: new Date("2026-01-01T00:00:00Z"),
    rolled_back_at: null
  });

  it("accepts exact completed migration equality", () => {
    expect(
      isMigrationStateComplete(
        ["001_init", "002_next"],
        [completed("001_init"), completed("002_next")]
      )
    ).toBe(true);
  });

  it("rejects a missing local migration", () => {
    expect(isMigrationStateComplete(["001_init", "002_next"], [completed("001_init")])).toBe(false);
  });

  it("rejects an unknown applied migration", () => {
    expect(
      isMigrationStateComplete(["001_init"], [completed("001_init"), completed("999_unknown")])
    ).toBe(false);
  });

  it("rejects an unfinished migration row", () => {
    expect(
      isMigrationStateComplete(
        ["001_init"],
        [
          completed("001_init"),
          { migration_name: "002_failed", finished_at: null, rolled_back_at: null }
        ]
      )
    ).toBe(false);
  });
});
