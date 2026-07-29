import { describe, expect, it } from "vitest";
import {
  ControlledAtomicDualBucketStore,
  DistributedDeliveryRateLimiter,
  DistributedRateLimitUnavailableError,
  HmacRateLimitKeyDeriver,
  RedisLuaAtomicDualBucketStore,
  atomicDualBucketLua,
  type AtomicDualBucketInput,
  type AtomicDualBucketResult,
  type AtomicDualBucketStore
} from "./distributedRateLimit";

describe("distributed offer-delivery limiter contract", () => {
  it("shares atomic tenant and service counts across replicas", async () => {
    const store = new ControlledAtomicDualBucketStore(() => 1_000);
    const deriver = keyDeriver();
    const first = new DistributedDeliveryRateLimiter(store, 1, 2, deriver);
    const second = new DistributedDeliveryRateLimiter(store, 1, 2, deriver);
    await expect(first.consume("tenant:a", "service")).resolves.toMatchObject({ allowed: true });
    await expect(second.consume("tenant:a", "service")).resolves.toMatchObject({ allowed: false });
    await expect(second.consume("tenant:b", "service")).resolves.toMatchObject({ allowed: false });
  });

  it("fails closed when Redis is unavailable or returns unsafe TTL state", async () => {
    const store = new ControlledAtomicDualBucketStore();
    const limiter = new DistributedDeliveryRateLimiter(store, 30, 60, keyDeriver());
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

  it("sends only versioned HMAC bucket keys to the atomic store", async () => {
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
    const limiter = new DistributedDeliveryRateLimiter(store, 30, 60, keyDeriver());
    await limiter.consume("tenant-sensitive", "caller-sensitive");
    expect(JSON.stringify(observed)).not.toContain("tenant-sensitive");
    expect(JSON.stringify(observed)).not.toContain("caller-sensitive");
    expect(observed[0]?.tenantKey).toMatch(/^rwos:adapterrl:test:v1:tenant:[a-f0-9]{64}$/);
    expect(observed[0]?.serviceKey).toMatch(/^rwos:adapterrl:test:v1:caller:[a-f0-9]{64}$/);
  });

  it("executes both buckets in one fixed Redis Lua evaluation", async () => {
    const calls: unknown[][] = [];
    const store = new RedisLuaAtomicDualBucketStore({
      async ready() {
        return true;
      },
      async eval(script, keys, args) {
        calls.push([script, keys, args]);
        return [1, 1, 60, 60];
      }
    });
    await expect(store.ready()).resolves.toBe(true);
    await expect(
      store.consume({
        tenantKey: "derived-tenant",
        serviceKey: "derived-caller",
        tenantMaximum: 30,
        serviceMaximum: 60,
        windowSeconds: 60
      })
    ).resolves.toMatchObject({ tenantCount: 1, serviceCount: 1 });
    expect(calls).toHaveLength(1);
    expect(atomicDualBucketLua.match(/INCR/g)).toHaveLength(2);
    expect(atomicDualBucketLua.match(/EXPIRE/g)).toHaveLength(2);
    expect(atomicDualBucketLua.match(/TTL/g)).toHaveLength(2);
  });
});

function keyDeriver() {
  return new HmacRateLimitKeyDeriver(
    "rwos:adapterrl:test:v1",
    "test-only-hmac-secret-at-least-thirty-two-characters"
  );
}
