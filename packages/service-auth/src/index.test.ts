import { describe, expect, it, vi } from "vitest";
import {
  authorizeTrustedCall,
  authorizeTrustedServiceRequest,
  createCachingIdentityTokenProvider,
  createTrustedAudienceRegistry,
  readTrustedCallEnvelope,
  requiredAudience
} from "./index";
import { createFakeIdentityTokenVerifier, fakeIdentity } from "./testing";

const releaseSha = "a31fa96f52247bb684032c6a8d3d379c098c2603";
const apiAudience = "https://rwos-api-opaquehash-nn.a.run.app";
const limiterAudience = "https://rwos-limiter-opaquehash-nn.a.run.app";

describe("trusted service identity contracts", () => {
  it("enforces receiver identity, application credential, caller, operation, tenant and release", async () => {
    const now = new Date();
    const token = "synthetic-verified-google-token";
    const identity = {
      ...fakeIdentity({ service: "api", audience: limiterAudience, now }),
      serviceAccountEmail: "rwos-api@staging.invalid"
    };
    const verifier = createFakeIdentityTokenVerifier({ identities: { [token]: identity } });
    const authorization = {
      mode: "dual-required" as const,
      audience: limiterAudience,
      callerServiceAccount: "rwos-api@staging.invalid",
      applicationCredential: "application-credential-at-least-thirty-two-characters",
      environment: "staging" as const,
      releaseSha
    };
    const headers = {
      authorization: `Bearer ${token}`,
      "x-rwos-app-authorization": "Bearer application-credential-at-least-thirty-two-characters",
      "x-rwos-service-id": "api",
      "x-rwos-operation": "candidates:search",
      "x-rwos-tenant-id": "tenant-a",
      "x-rwos-environment": "staging",
      "x-rwos-release-sha": releaseSha
    };
    const authorize = (
      overrides: Record<string, string | undefined> = {},
      authorizationOverride = authorization
    ) =>
      authorizeTrustedServiceRequest({
        headers: { ...headers, ...overrides },
        verifier,
        authorization: authorizationOverride,
        operation: "candidates:search",
        tenantId: "tenant-a",
        allowedTenants: ["tenant-a"]
      });

    await expect(authorize()).resolves.toMatchObject({
      caller: "api",
      operation: "candidates:search",
      tenantId: "tenant-a"
    });
    for (const overrides of [
      { authorization: undefined },
      { authorization: "Bearer unknown-token" },
      { "x-rwos-app-authorization": undefined },
      { "x-rwos-app-authorization": "Bearer invalid-application-credential" },
      { "x-rwos-service-id": "employer-web" },
      { "x-rwos-service-id": "admin-web" },
      { "x-rwos-service-id": "worker-web" },
      { "x-rwos-operation": "worker-offers:deliver" },
      { "x-rwos-tenant-id": "tenant-b" },
      { "x-rwos-environment": "production" },
      { "x-rwos-release-sha": "b".repeat(40) },
      { authorization: `Bearer ${token}, Bearer ${token}` }
    ]) {
      await expect(authorize(overrides)).rejects.toThrow("RWOS_TRUSTED_CALL_DENIED");
    }
    await expect(
      authorize(
        {},
        {
          ...authorization,
          callerServiceAccount: "other-service@staging.invalid"
        }
      )
    ).rejects.toThrow("RWOS_TRUSTED_CALL_DENIED");
  });

  it("never falls back from dual mode and permits legacy only in local test compatibility", async () => {
    const base = {
      applicationCredential: "application-credential-at-least-thirty-two-characters",
      releaseSha
    };
    await expect(
      authorizeTrustedServiceRequest({
        headers: {
          authorization: `Bearer ${base.applicationCredential}`,
          "x-rwos-service-id": "rwos-api",
          "x-rwos-operation": "auth-rate-limit:consume"
        },
        authorization: {
          mode: "legacy-app-only",
          audience: null,
          callerServiceAccount: null,
          environment: "test",
          ...base
        },
        operation: "auth-rate-limit:consume"
      })
    ).resolves.toMatchObject({ caller: "api" });

    await expect(
      authorizeTrustedServiceRequest({
        headers: {
          authorization: `Bearer ${base.applicationCredential}`,
          "x-rwos-service-id": "api",
          "x-rwos-operation": "auth-rate-limit:consume",
          "x-rwos-environment": "staging",
          "x-rwos-release-sha": releaseSha
        },
        authorization: {
          mode: "iam-application",
          audience: limiterAudience,
          callerServiceAccount: "rwos-api@staging.invalid",
          environment: "staging",
          ...base
        },
        operation: "auth-rate-limit:consume"
      })
    ).rejects.toThrow("RWOS_TRUSTED_CALL_DENIED");
  });

  it("rejects a verifier result whose audience differs from the configured receiver", async () => {
    const token = "synthetic-verified-google-token";
    const now = new Date();
    await expect(
      authorizeTrustedServiceRequest({
        headers: {
          authorization: `Bearer ${token}`,
          "x-rwos-app-authorization":
            "Bearer application-credential-at-least-thirty-two-characters",
          "x-rwos-service-id": "api",
          "x-rwos-operation": "auth-rate-limit:consume",
          "x-rwos-environment": "staging",
          "x-rwos-release-sha": releaseSha
        },
        verifier: {
          verify: async () => ({
            ...fakeIdentity({ service: "api", audience: apiAudience, now }),
            serviceAccountEmail: "rwos-api@staging.invalid"
          })
        },
        authorization: {
          mode: "dual-required",
          audience: limiterAudience,
          callerServiceAccount: "rwos-api@staging.invalid",
          applicationCredential: "application-credential-at-least-thirty-two-characters",
          environment: "staging",
          releaseSha
        },
        operation: "auth-rate-limit:consume"
      })
    ).rejects.toThrow("RWOS_TRUSTED_CALL_DENIED");
  });

  it("requires distinct canonical Cloud Run audiences", () => {
    const registry = createTrustedAudienceRegistry({
      api: apiAudience,
      "auth-limiter": limiterAudience
    });
    expect(requiredAudience(registry, "api")).toBe(apiAudience);
    expect(() =>
      createTrustedAudienceRegistry({ api: "https://example.com", "auth-limiter": limiterAudience })
    ).toThrow("RWOS_TRUSTED_AUDIENCE_INVALID");
    expect(() =>
      createTrustedAudienceRegistry({ api: apiAudience, "auth-limiter": apiAudience })
    ).toThrow("RWOS_TRUSTED_AUDIENCE_DUPLICATE");
  });

  it("caches by exact audience, coalesces acquisition and refreshes near expiry", async () => {
    let now = new Date("2026-07-28T00:00:00.000Z");
    const acquire = vi.fn(async ({ audience }: { audience: string }) => ({
      value: `synthetic-token-${audience}-${acquire.mock.calls.length}`.padEnd(80, "x"),
      expiresAt: new Date(now.getTime() + 60 * 60_000)
    }));
    const provider = createCachingIdentityTokenProvider({
      acquire,
      registry: createTrustedAudienceRegistry({
        api: apiAudience,
        "auth-limiter": limiterAudience
      }),
      now: () => now
    });
    const [first, same] = await Promise.all([
      provider.getToken({ audience: apiAudience, receiver: "api" }),
      provider.getToken({ audience: apiAudience, receiver: "api" })
    ]);
    expect(first).toEqual(same);
    expect(acquire).toHaveBeenCalledTimes(1);
    await provider.getToken({ audience: limiterAudience, receiver: "auth-limiter" });
    expect(acquire).toHaveBeenCalledTimes(2);
    now = new Date("2026-07-28T00:56:00.000Z");
    await provider.getToken({ audience: apiAudience, receiver: "api" });
    expect(acquire).toHaveBeenCalledTimes(3);
  });

  it("fails closed on wrong audience, failed acquisition and unsafe token lifetime", async () => {
    const now = new Date("2026-07-28T00:00:00.000Z");
    const registry = createTrustedAudienceRegistry({ api: apiAudience });
    const failed = createCachingIdentityTokenProvider({
      registry,
      now: () => now,
      acquire: async () => {
        throw new Error("SYNTHETIC_FAILURE");
      }
    });
    await expect(failed.getToken({ audience: apiAudience, receiver: "api" })).rejects.toThrow(
      "RWOS_IDENTITY_TOKEN_UNAVAILABLE"
    );
    await expect(failed.getToken({ audience: limiterAudience, receiver: "api" })).rejects.toThrow(
      "RWOS_TRUSTED_AUDIENCE_MISMATCH"
    );

    const expired = createCachingIdentityTokenProvider({
      registry,
      now: () => now,
      acquire: async () => ({
        value: "synthetic-token-value-at-least-twenty-characters",
        expiresAt: new Date(now.getTime() + 60_000)
      })
    });
    await expect(expired.getToken({ audience: apiAudience, receiver: "api" })).rejects.toThrow(
      "RWOS_IDENTITY_TOKEN_UNAVAILABLE"
    );
  });

  it("authorizes exact caller, operation, tenant, environment, release, manifest and idempotency", () => {
    const now = new Date("2026-07-28T00:00:00.000Z");
    const identity = fakeIdentity({ service: "api", audience: limiterAudience, now });
    const envelope = readTrustedCallEnvelope({
      "x-rwos-service-id": "api",
      "x-rwos-operation": "auth-rate-limit:consume",
      "x-rwos-tenant-id": "tenant-a",
      "x-rwos-environment": "staging",
      "x-rwos-release-sha": releaseSha,
      "x-rwos-manifest-id": "manifest-v1",
      "x-rwos-manifest-checksum": "a".repeat(64),
      "idempotency-key": "request:0001"
    });
    const policy = {
      caller: "api" as const,
      serviceAccountEmail: "api@staging.invalid",
      operations: ["auth-rate-limit:consume"],
      tenants: ["tenant-a"],
      environment: "staging" as const,
      releaseSha,
      manifest: { id: "manifest-v1", checksum: "a".repeat(64) },
      requireIdempotencyKey: true
    };
    expect(authorizeTrustedCall(identity, envelope, policy, now)).toMatchObject({
      caller: "api",
      operation: "auth-rate-limit:consume",
      tenantId: "tenant-a"
    });
    expect(() =>
      authorizeTrustedCall(identity, { ...envelope, tenantId: "tenant-b" }, policy, now)
    ).toThrow("RWOS_TRUSTED_CALL_DENIED");
    expect(() =>
      authorizeTrustedCall(
        { ...identity, serviceAccountEmail: "other@staging.invalid" },
        envelope,
        policy,
        now
      )
    ).toThrow("RWOS_TRUSTED_CALL_DENIED");
  });
});
