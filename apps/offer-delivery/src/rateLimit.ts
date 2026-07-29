export class DeliveryRateLimiter {
  readonly #tenantCounters = new Map<string, Counter>();
  readonly #serviceCounters = new Map<string, Counter>();

  constructor(
    private readonly tenantMaximum: number,
    private readonly serviceMaximum: number,
    private readonly now: () => number = Date.now
  ) {}

  async ready() {
    return true;
  }

  consume(tenantId: string, serviceId: string) {
    const now = this.now();
    const tenant = consume(this.#tenantCounters, tenantId, this.tenantMaximum, now);
    const service = consume(this.#serviceCounters, serviceId, this.serviceMaximum, now);
    return {
      allowed: tenant.allowed && service.allowed,
      retryAfterSeconds: Math.max(tenant.retryAfterSeconds, service.retryAfterSeconds)
    };
  }
}

type Counter = { count: number; expiresAt: number };

function consume(counters: Map<string, Counter>, key: string, maximum: number, now: number) {
  let counter = counters.get(key);
  if (!counter || counter.expiresAt <= now) {
    counter = { count: 0, expiresAt: now + 60_000 };
    counters.set(key, counter);
  }
  counter.count += 1;
  return {
    allowed: counter.count <= maximum,
    retryAfterSeconds: Math.max(1, Math.ceil((counter.expiresAt - now) / 1000))
  };
}
