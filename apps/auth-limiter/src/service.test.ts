import { describe, expect, it } from "vitest";
import type { LimiterConfig } from "./config";
import { createLimiterService, fixedPolicy } from "./service";
import { MemoryLimiterStore } from "./store";

const config: LimiterConfig = {
  port: 8080,
  environment: "test",
  redisUrl: "redis://127.0.0.1:6379",
  serviceToken: "service-token-at-least-thirty-two-characters",
  releaseSha: "a31fa96f52247bb684032c6a8d3d379c098c2603",
  namespace: "rwos:authrl:test:v1",
  currentKeyId: "current",
  previousKeyId: null,
  previousKeyAcceptUntil: null,
  resetEnabled: false,
  resetToken: null,
  projectId: null,
  clusterId: null
};

describe("distributed limiter service policy", () => {
  it("enforces five account attempts and consumes the network bucket atomically", async () => {
    let now = 1_000_000;
    const store = new MemoryLimiterStore(() => now);
    const service = createLimiterService(config, store);
    const request = consumeRequest("account-a", "network-a");

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await expect(service.consume(request)).resolves.toEqual({
        allowed: true,
        retryAfterSeconds: 60
      });
    }
    await expect(service.consume(request)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60
    });
    now += 60_000;
    await expect(service.consume(request)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 60
    });
  });

  it("enforces thirty network attempts across two simulated replicas", async () => {
    const store = new MemoryLimiterStore(() => 1_000_000);
    const replicas = [createLimiterService(config, store), createLimiterService(config, store)];
    const decisions = await Promise.all(
      Array.from({ length: 31 }, (_, index) =>
        replicas[index % 2]!.consume(consumeRequest(`account-${index}`, "shared-network"))
      )
    );
    expect(decisions.filter(({ allowed }) => allowed)).toHaveLength(30);
    expect(decisions.at(-1)?.allowed).toBe(false);
  });

  it("rejects unknown key identifiers and caller-controlled policy", async () => {
    const service = createLimiterService(config, new MemoryLimiterStore());
    await expect(
      service.consume({ ...consumeRequest("a", "n"), keyId: "unknown" })
    ).rejects.toThrow("Limiter request invalid.");
    await expect(
      service.consume({
        ...consumeRequest("a", "n"),
        policy: { ...fixedPolicy, accountMaxAttempts: 6 }
      })
    ).rejects.toThrow("Limiter request invalid.");
  });

  it("rejects reset prefixes outside the exact configured namespace", async () => {
    const store = new MemoryLimiterStore();
    const service = createLimiterService(config, store);
    await expect(service.reset(`${config.namespace}:`)).resolves.toBe(0);
    expect(() => service.reset("rwos:authrl:")).toThrow("Limiter request invalid.");
    expect(() => service.reset("")).toThrow("Limiter request invalid.");
  });
});

function consumeRequest(account: string, network: string) {
  return {
    action: "sign_in" as const,
    keyId: config.currentKeyId,
    accountKey: key("account", account),
    networkKey: key("network", network),
    policy: fixedPolicy
  };
}

function key(kind: "account" | "network", seed: string) {
  const digest = Buffer.from(seed).toString("hex").padEnd(64, "0").slice(0, 64);
  return `${config.namespace}:${config.currentKeyId}:sign_in:${kind}:${digest}`;
}
