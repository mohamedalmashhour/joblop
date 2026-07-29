export type AtomicDualBucketInput = Readonly<{
  tenantKey: string;
  serviceKey: string;
  tenantMaximum: number;
  serviceMaximum: number;
  windowSeconds: number;
}>;

export type AtomicDualBucketResult = Readonly<{
  tenantCount: number;
  serviceCount: number;
  tenantTtlSeconds: number;
  serviceTtlSeconds: number;
}>;

/** Redis implementations must evaluate both increments and TTL checks atomically. */
export interface AtomicDualBucketStore {
  ready(): Promise<boolean>;
  consume(input: AtomicDualBucketInput): Promise<AtomicDualBucketResult>;
}

export interface RedisEvalPort {
  ready(): Promise<boolean>;
  eval(script: string, keys: readonly string[], args: readonly string[]): Promise<unknown>;
}

export const atomicDualBucketLua = `
local tenant = redis.call('INCR', KEYS[1])
if tenant == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
local service = redis.call('INCR', KEYS[2])
if service == 1 then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
local tenant_ttl = redis.call('TTL', KEYS[1])
local service_ttl = redis.call('TTL', KEYS[2])
if tenant_ttl < 1 or service_ttl < 1 then return redis.error_reply('unsafe ttl') end
return {tenant, service, tenant_ttl, service_ttl}
`.trim();

export class RedisLuaAtomicDualBucketStore implements AtomicDualBucketStore {
  constructor(private readonly port: RedisEvalPort) {}
  ready() {
    return this.port.ready();
  }
  async consume(input: AtomicDualBucketInput): Promise<AtomicDualBucketResult> {
    const value = await this.port.eval(
      atomicDualBucketLua,
      [input.tenantKey, input.serviceKey],
      [
        String(input.tenantMaximum),
        String(input.serviceMaximum),
        String(input.windowSeconds)
      ]
    );
    if (
      !Array.isArray(value) ||
      value.length !== 4 ||
      !value.every((item) => Number.isInteger(item) && item >= 1)
    ) {
      throw new DistributedRateLimitUnavailableError();
    }
    const [tenantCount, serviceCount, tenantTtlSeconds, serviceTtlSeconds] = value as number[];
    return {
      tenantCount: tenantCount!,
      serviceCount: serviceCount!,
      tenantTtlSeconds: tenantTtlSeconds!,
      serviceTtlSeconds: serviceTtlSeconds!
    };
  }
}

export interface RateLimitKeyDeriver {
  derive(scope: "tenant" | "caller", value: string): string;
}

export class HmacRateLimitKeyDeriver implements RateLimitKeyDeriver {
  constructor(
    private readonly namespace: string,
    private readonly secret: string
  ) {
    if (!/^rwos:adapterrl:(?:test|staging):v1$/.test(namespace) || secret.length < 32) {
      throw new Error("RWOS_ADAPTER_RATE_LIMIT_KEY_CONFIG_INVALID");
    }
  }

  derive(scope: "tenant" | "caller", value: string) {
    if (!value || value.length > 200) throw new Error("RWOS_ADAPTER_RATE_LIMIT_KEY_INVALID");
    const component = createHmac("sha256", this.secret).update(`${scope}:${value}`).digest("hex");
    return `${this.namespace}:${scope}:${component}`;
  }
}

export class DistributedRateLimitUnavailableError extends Error {
  constructor() {
    super("RWOS_DISTRIBUTED_RATE_LIMIT_UNAVAILABLE");
  }
}

export class DistributedDeliveryRateLimiter {
  constructor(
    private readonly store: AtomicDualBucketStore,
    private readonly tenantMaximum: number,
    private readonly serviceMaximum: number,
    private readonly keyDeriver: RateLimitKeyDeriver,
    private readonly windowSeconds = 60
  ) {}

  ready() {
    return this.store.ready();
  }

  async consume(tenantKey: string, serviceKey: string) {
    try {
      const result = await this.store.consume({
        tenantKey: this.keyDeriver.derive("tenant", tenantKey),
        serviceKey: this.keyDeriver.derive("caller", serviceKey),
        tenantMaximum: this.tenantMaximum,
        serviceMaximum: this.serviceMaximum,
        windowSeconds: this.windowSeconds
      });
      if (
        !Number.isInteger(result.tenantCount) ||
        !Number.isInteger(result.serviceCount) ||
        result.tenantCount < 1 ||
        result.serviceCount < 1 ||
        !Number.isInteger(result.tenantTtlSeconds) ||
        !Number.isInteger(result.serviceTtlSeconds) ||
        result.tenantTtlSeconds < 1 ||
        result.serviceTtlSeconds < 1 ||
        result.tenantTtlSeconds > this.windowSeconds ||
        result.serviceTtlSeconds > this.windowSeconds
      ) {
        throw new Error("unsafe limiter result");
      }
      return {
        allowed:
          result.tenantCount <= this.tenantMaximum &&
          result.serviceCount <= this.serviceMaximum,
        retryAfterSeconds: Math.max(result.tenantTtlSeconds, result.serviceTtlSeconds)
      };
    } catch {
      throw new DistributedRateLimitUnavailableError();
    }
  }
}

/** Controlled atomic fake. Sharing one instance simulates multiple replicas. */
export class ControlledAtomicDualBucketStore implements AtomicDualBucketStore {
  readonly #counters = new Map<string, { count: number; expiresAt: number }>();
  #available = true;
  #unsafeTtl = false;

  constructor(private readonly now: () => number = Date.now) {}

  setAvailable(available: boolean) {
    this.#available = available;
  }

  setUnsafeTtl(unsafe: boolean) {
    this.#unsafeTtl = unsafe;
  }

  async consume(input: AtomicDualBucketInput): Promise<AtomicDualBucketResult> {
    if (!this.#available) throw new Error("unavailable");
    const now = this.now();
    const tenant = increment(this.#counters, input.tenantKey, input.windowSeconds, now);
    const service = increment(this.#counters, input.serviceKey, input.windowSeconds, now);
    return {
      tenantCount: tenant.count,
      serviceCount: service.count,
      tenantTtlSeconds: this.#unsafeTtl ? 0 : tenant.ttl,
      serviceTtlSeconds: service.ttl
    };
  }

  async ready() {
    return this.#available && !this.#unsafeTtl;
  }
}

function increment(
  counters: Map<string, { count: number; expiresAt: number }>,
  key: string,
  windowSeconds: number,
  now: number
) {
  let counter = counters.get(key);
  if (!counter || counter.expiresAt <= now) {
    counter = { count: 0, expiresAt: now + windowSeconds * 1000 };
    counters.set(key, counter);
  }
  counter.count += 1;
  return { count: counter.count, ttl: Math.max(1, Math.ceil((counter.expiresAt - now) / 1000)) };
}
import { createHmac } from "node:crypto";
