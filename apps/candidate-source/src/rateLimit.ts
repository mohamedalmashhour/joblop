export type RateLimitDecision = Readonly<{ allowed: boolean; retryAfterSeconds: number }>;

export class CandidateRateLimiter {
  readonly #tenant = new Map<string, Counter>();
  readonly #service = new Map<string, Counter>();

  constructor(
    private readonly tenantMaximum: number,
    private readonly serviceMaximum: number,
    private readonly now: () => number = Date.now
  ) {}

  async ready() {
    return true;
  }

  consume(tenantId: string, serviceId: string): RateLimitDecision {
    const now = this.now();
    const tenant = consumeCounter(this.#tenant, tenantId, this.tenantMaximum, now);
    const service = consumeCounter(this.#service, serviceId, this.serviceMaximum, now);
    return {
      allowed: tenant.allowed && service.allowed,
      retryAfterSeconds: Math.max(tenant.retryAfterSeconds, service.retryAfterSeconds)
    };
  }
}

type Counter = { count: number; expiresAt: number };

function consumeCounter(
  counters: Map<string, Counter>,
  key: string,
  maximum: number,
  now: number
): RateLimitDecision {
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
