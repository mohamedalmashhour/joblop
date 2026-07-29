import { describe, expect, it } from "vitest";
import {
  ControlledAtomicDualBucketStore,
  DistributedCandidateRateLimiter,
  DistributedRateLimitUnavailableError,
  HmacRateLimitKeyDeriver,
  RedisLuaAtomicDualBucketStore,
  type AtomicDualBucketInput,
  type AtomicDualBucketResult,
  type AtomicDualBucketStore
} from "./distributedRateLimit";

describe("distributed candidate-source limiter contract", () => {
  it("enforces shared counters while keeping tenant buckets isolated", async () => {
    const store = new ControlledAtomicDualBucketStore(() => 1_000);
    const deriver = keyDeriver();
    const first = new DistributedCandidateRateLimiter(store, 1, 3, deriver);
    const second = new DistributedCandidateRateLimiter(store, 1, 3, deriver);
    await expect(first.consume("tenant:a", "service")).resolves.toMatchObject({ allowed: true });
    await expect(second.consume("tenant:a", "service")).resolves.toMatchObject({ allowed: false });
    await expect(second.consume("tenant:b", "service")).resolves.toMatchObject({ allowed: true });
    await expect(first.consume("tenant:c", "service")).resolves.toMatchObject({ allowed: false });
  });

  it("fails closed for outage and unsafe TTL responses", async () => {
    const store = new ControlledAtomicDualBucketStore();
    const limiter = new DistributedCandidateRateLimiter(store, 30, 60, keyDeriver());
    store.setAvailable(false);
    await expect(limiter.consume("tenant:a", "service")).rejects.toBeInstanceOf(
      DistributedRateLimitUnavailableError
    );
    store.setAvailable(true);
    store.setUnsafeTtl(true);
    await expect(limiter.consume("tenant:a", "service")).rejects.toBeInstanceOf(
      DistributedRateLimitUnavailableError
    );
  });

  it("never exposes raw tenant or caller values to the atomic store", async () => {
    const observed: AtomicDualBucketInput[] = [];
    const store: AtomicDualBucketStore = {
      async ready() {
        return true;
      },
      async consume(input): Promise<AtomicDualBucketResult> {
        observed.push(input);
        return {
          tenantCount: 1,
          serviceCount: 1,
          tenantTtlSeconds: 60,
          serviceTtlSeconds: 60
        };
      }
    };
    const limiter = new DistributedCandidateRateLimiter(store, 30, 60, keyDeriver());
    await limiter.consume("tenant-sensitive", "caller-sensitive");
    expect(JSON.stringify(observed)).not.toContain("tenant-sensitive");
    expect(JSON.stringify(observed)).not.toContain("caller-sensitive");
  });

  it("fails closed on malformed Redis Lua response", async () => {
    const store = new RedisLuaAtomicDualBucketStore({
      async ready() {
        return false;
      },
      async eval() {
        return [1, 1, 0];
      }
    });
    await expect(store.ready()).resolves.toBe(false);
    await expect(
      store.consume({
        tenantKey: "derived-tenant",
        serviceKey: "derived-caller",
        tenantMaximum: 30,
        serviceMaximum: 60,
        windowSeconds: 60
      })
    ).rejects.toBeInstanceOf(DistributedRateLimitUnavailableError);
  });
});

function keyDeriver() {
  return new HmacRateLimitKeyDeriver(
    "rwos:adapterrl:test:v1",
    "test-only-hmac-secret-at-least-thirty-two-characters"
  );
}
