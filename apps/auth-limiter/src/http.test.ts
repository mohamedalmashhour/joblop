import { describe, expect, it } from "vitest";
import type { LimiterConfig } from "./config";
import { buildLimiterHttpServer } from "./http";
import { createLimiterLogger } from "./logger";
import { fixedPolicy } from "./service";
import { MemoryLimiterStore } from "./store";

const serviceToken = "service-token-at-least-thirty-two-characters";
const resetToken = "reset-token-that-is-distinct-and-long-enough";
const config: LimiterConfig = {
  port: 8080,
  environment: "staging",
  redisUrl: "redis://127.0.0.1:6379",
  serviceToken,
  releaseSha: "a31fa96f52247bb684032c6a8d3d379c098c2603",
  namespace: "rwos:authrl:staging:v1",
  currentKeyId: "current",
  previousKeyId: null,
  previousKeyAcceptUntil: null,
  resetEnabled: true,
  resetToken,
  projectId: "provider/project/rwos-staging",
  clusterId: "provider/redis/rwos-staging"
};

describe("auth limiter HTTP contract", () => {
  it("separates liveness from dependency readiness", async () => {
    const store = new MemoryLimiterStore();
    store.setAvailable(false);
    await withServer(store, async (origin) => {
      expect((await fetch(`${origin}/health`)).status).toBe(200);
      expect((await fetch(`${origin}/ready`)).status).toBe(503);
    });
  });

  it("returns unique opaque request IDs and conservative security headers", async () => {
    const store = new MemoryLimiterStore();
    await withServer(store, async (origin) => {
      const first = await fetch(`${origin}/health`);
      const second = await fetch(`${origin}/health`);
      const firstId = first.headers.get("x-request-id");
      const secondId = second.headers.get("x-request-id");
      expect(firstId).toMatch(/^rwos-[0-9a-f-]{36}$/);
      expect(secondId).toMatch(/^rwos-[0-9a-f-]{36}$/);
      expect(secondId).not.toBe(firstId);
      expect(first.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      expect(first.headers.get("permissions-policy")).toBe(
        "camera=(), geolocation=(), microphone=(), payment=()"
      );

      const supplied = await fetch(`${origin}/health`, {
        headers: { "x-request-id": "safe-correlation-01" }
      });
      expect(supplied.headers.get("x-request-id")).toBe("safe-correlation-01");
    });
  });

  it("requires service authentication and emits no key or token in logs", async () => {
    const records: string[] = [];
    const store = new MemoryLimiterStore();
    await withServer(
      store,
      async (origin) => {
        expect(
          (
            await fetch(`${origin}/v1/auth-rate-limit/consume`, {
              method: "POST",
              body: JSON.stringify(request()),
              headers: { "content-type": "application/json" }
            })
          ).status
        ).toBe(401);
        const response = await fetch(`${origin}/v1/auth-rate-limit/consume`, {
          method: "POST",
          body: JSON.stringify(request()),
          headers: {
            authorization: `Bearer ${serviceToken}`,
            "content-type": "application/json",
            "x-rwos-service-id": "rwos-api",
            "x-rwos-operation": "auth-rate-limit:consume"
          }
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ allowed: true, retryAfterSeconds: 60 });
      },
      records
    );
    expect(records.join("\n")).not.toContain(serviceToken);
    expect(records.join("\n")).not.toContain(request().accountKey);
  });

  it("resets only the exact staging namespace", async () => {
    const store = new MemoryLimiterStore();
    await store.consume({
      accountKey: request().accountKey,
      networkKey: request().networkKey,
      accountMaximum: 5,
      networkMaximum: 30,
      windowSeconds: 60
    });
    await withServer(store, async (origin) => {
      const denied = await fetch(`${origin}/v1/staging/reset`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${resetToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          confirmation: "authorized-staging-limiter-reset",
          projectId: config.projectId,
          clusterId: config.clusterId,
          namespace: "*"
        })
      });
      expect(denied.status).toBe(404);
      const allowed = await fetch(`${origin}/v1/staging/reset`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${resetToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          confirmation: "authorized-staging-limiter-reset",
          projectId: config.projectId,
          clusterId: config.clusterId,
          namespace: config.namespace
        })
      });
      expect(allowed.status).toBe(200);
      expect(await allowed.json()).toEqual({ reset: true, removed: 2 });
    });
  });
});

function request() {
  return {
    action: "sign_in",
    keyId: "current",
    accountKey: `${config.namespace}:current:sign_in:account:${"a".repeat(64)}`,
    networkKey: `${config.namespace}:current:sign_in:network:${"b".repeat(64)}`,
    policy: fixedPolicy
  };
}

async function withServer(
  store: MemoryLimiterStore,
  run: (origin: string) => Promise<void>,
  records: string[] = []
) {
  const server = buildLimiterHttpServer({
    config,
    store,
    logger: createLimiterLogger({ write: (record) => records.push(record) })
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TEST_SERVER_ADDRESS_UNAVAILABLE");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}
