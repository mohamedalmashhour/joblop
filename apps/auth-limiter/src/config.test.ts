import { describe, expect, it } from "vitest";
import { isAcceptedKeyId, previousKeyMaximumOverlapSeconds, readLimiterConfig } from "./config";

const now = new Date("2026-07-28T20:00:00.000Z");
const base = {
  PORT: "8080",
  RWOS_ENV: "staging",
  AUTH_LIMITER_REDIS_URL: "redis://127.0.0.1:6379",
  AUTH_LIMITER_SERVICE_TOKEN: "service-token-at-least-thirty-two-characters",
  AUTH_LIMITER_RELEASE_SHA: "a31fa96f52247bb684032c6a8d3d379c098c2603",
  AUTH_LIMITER_AUTH_MODE: "dual-required",
  AUTH_LIMITER_AUDIENCE: "https://rwos-auth-limiter-opaque-nn.a.run.app",
  AUTH_LIMITER_API_SERVICE_ACCOUNT: "rwos-api@staging.invalid",
  AUTH_LIMITER_NAMESPACE: "rwos:authrl:staging:v1",
  AUTH_LIMITER_CURRENT_KEY_ID: "key-2026-07"
};

describe("limiter configuration", () => {
  it("requires an explicit release binding and returns it unchanged", () => {
    expect(readLimiterConfig(base).releaseSha).toBe(base.AUTH_LIMITER_RELEASE_SHA);
    expect(() => readLimiterConfig({ ...base, AUTH_LIMITER_RELEASE_SHA: undefined })).toThrow(
      "AUTH_LIMITER_RELEASE_SHA_REQUIRED"
    );
    expect(() => readLimiterConfig({ ...base, AUTH_LIMITER_RELEASE_SHA: "f".repeat(40) })).toThrow(
      "AUTH_LIMITER_RELEASE_MISMATCH"
    );
  });

  it("accepts a previous key for one window plus maximum client timeout", () => {
    const config = readLimiterConfig(
      {
        ...base,
        AUTH_LIMITER_PREVIOUS_KEY_ID: "key-2026-06",
        AUTH_LIMITER_PREVIOUS_KEY_ACCEPT_UNTIL: new Date(
          now.getTime() + previousKeyMaximumOverlapSeconds * 1000
        ).toISOString()
      },
      now
    );
    expect(isAcceptedKeyId(config, "key-2026-06", now)).toBe(true);
    expect(
      isAcceptedKeyId(
        config,
        "key-2026-06",
        new Date(now.getTime() + previousKeyMaximumOverlapSeconds * 1000 + 1)
      )
    ).toBe(false);
    expect(isAcceptedKeyId(config, "unknown", now)).toBe(false);
  });

  it("rejects an overlong previous-key overlap", () => {
    expect(() =>
      readLimiterConfig(
        {
          ...base,
          AUTH_LIMITER_PREVIOUS_KEY_ID: "key-2026-06",
          AUTH_LIMITER_PREVIOUS_KEY_ACCEPT_UNTIL: new Date(
            now.getTime() + (previousKeyMaximumOverlapSeconds + 1) * 1000
          ).toISOString()
        },
        now
      )
    ).toThrow("AUTH_LIMITER_PREVIOUS_KEY_OVERLAP_TOO_LONG");
  });

  it("enables reset only for an exact staging namespace with distinct credentials", () => {
    const config = readLimiterConfig({
      ...base,
      AUTH_LIMITER_RESET_ENABLED: "true",
      AUTH_LIMITER_RESET_TOKEN: "reset-token-that-is-distinct-and-long-enough",
      AUTH_LIMITER_PROJECT_ID: "provider/project/rwos-staging",
      AUTH_LIMITER_CLUSTER_ID: "provider/redis/rwos-staging"
    });
    expect(config.resetEnabled).toBe(true);
    expect(() =>
      readLimiterConfig({
        ...base,
        RWOS_ENV: "production",
        AUTH_LIMITER_NAMESPACE: "rwos:authrl:production:v1",
        AUTH_LIMITER_RESET_ENABLED: "true",
        AUTH_LIMITER_RESET_TOKEN: "reset-token-that-is-distinct-and-long-enough",
        AUTH_LIMITER_PROJECT_ID: "provider/project/rwos-staging",
        AUTH_LIMITER_CLUSTER_ID: "provider/redis/rwos-staging"
      })
    ).toThrow("RWOS_TRUSTED_AUTH_PRODUCTION_UNAPPROVED");
  });
});
