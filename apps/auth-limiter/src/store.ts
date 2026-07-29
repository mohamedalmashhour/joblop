export type ConsumeInput = Readonly<{
  accountKey: string;
  networkKey: string;
  accountMaximum: number;
  networkMaximum: number;
  windowSeconds: number;
}>;

export type ConsumeResult = Readonly<{
  allowed: boolean;
  retryAfterSeconds: number;
}>;

export interface LimiterStore {
  consume(input: ConsumeInput): Promise<ConsumeResult>;
  ready(): Promise<boolean>;
  resetNamespace(prefix: string): Promise<number>;
  close(): Promise<void>;
}

type Bucket = { count: number; expiresAt: number };

export class MemoryLimiterStore implements LimiterStore {
  readonly #buckets = new Map<string, Bucket>();
  readonly #now: () => number;
  #available = true;

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  setAvailable(available: boolean) {
    this.#available = available;
  }

  async consume(input: ConsumeInput): Promise<ConsumeResult> {
    if (!this.#available) throw new Error("RWOS_LIMITER_STORE_UNAVAILABLE");
    const now = this.#now();
    const account = this.#increment(
      input.accountKey,
      input.accountMaximum,
      input.windowSeconds,
      now
    );
    const network = this.#increment(
      input.networkKey,
      input.networkMaximum,
      input.windowSeconds,
      now
    );
    return {
      allowed: account.allowed && network.allowed,
      retryAfterSeconds: Math.max(account.retryAfterSeconds, network.retryAfterSeconds)
    };
  }

  async ready() {
    return this.#available;
  }

  async resetNamespace(prefix: string) {
    let removed = 0;
    for (const key of this.#buckets.keys()) {
      if (!key.startsWith(prefix)) continue;
      this.#buckets.delete(key);
      removed += 1;
    }
    return removed;
  }

  async close() {}

  #increment(key: string, maximum: number, windowSeconds: number, now: number) {
    const existing = this.#buckets.get(key);
    const bucket =
      existing && existing.expiresAt > now
        ? existing
        : { count: 0, expiresAt: now + windowSeconds * 1000 };
    bucket.count += 1;
    this.#buckets.set(key, bucket);
    return {
      allowed: bucket.count <= maximum,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000))
    };
  }
}
