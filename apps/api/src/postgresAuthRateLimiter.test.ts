import { describe, expect, it } from "vitest";
import {
  AUTH_RATE_LIMIT_TABLE,
  createPostgresAuthenticationRateLimiter,
  type RateLimitDatabase
} from "./postgresAuthRateLimiter";

const keySecret = "postgres-limiter-key-secret-at-least-32-chars";
const namespace = "rwos:authrl:production:v1";

// In-memory stand-in for the one upsert statement: same semantics (count per bucket, window reset by
// the database clock), so the decision logic can be tested without PostgreSQL. The real statement's
// atomicity under concurrency is proven by tests/integration/postgres-auth-rate-limiter.test.ts.
function fakeDatabase(clock: { now: number }) {
  const buckets = new Map<string, { hits: number; endsAt: number }>();
  const queries: string[] = [];
  const db: RateLimitDatabase = {
    async $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> {
      queries.push(query);
      if (query.startsWith("SELECT 1")) return [] as T;
      if (query.startsWith("DELETE")) return [] as T;
      const [accountKey, networkKey, windowSeconds] = values as [string, string, number];
      const rows = [accountKey, networkKey].map((bucketKey) => {
        const current = buckets.get(bucketKey);
        const next =
          current && current.endsAt > clock.now
            ? { hits: current.hits + 1, endsAt: current.endsAt }
            : { hits: 1, endsAt: clock.now + windowSeconds * 1000 };
        buckets.set(bucketKey, next);
        return { bucketKey, hits: next.hits, secondsLeft: (next.endsAt - clock.now) / 1000 };
      });
      return rows as T;
    }
  };
  return { db, buckets, queries };
}

describe("PostgreSQL sign-in rate limiter", () => {
  it("allows 5 attempts per account per 60 s, then refuses with a retry time", async () => {
    const clock = { now: 1_000_000 };
    const { db } = fakeDatabase(clock);
    const limiter = createPostgresAuthenticationRateLimiter({ db, keySecret, namespace, random: () => 1 });
    const attempt = () => limiter.consume({ action: "sign_in", ip: "203.0.113.7", email: "Person@Example.com" });
    for (let i = 0; i < 5; i += 1) expect((await attempt()).allowed).toBe(true);
    const refused = await attempt();
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBe(60);
    clock.now += 61_000;
    expect((await attempt()).allowed).toBe(true);
  });

  it("allows 30 attempts per network address across accounts, then refuses", async () => {
    const { db } = fakeDatabase({ now: 0 });
    const limiter = createPostgresAuthenticationRateLimiter({ db, keySecret, namespace, random: () => 1 });
    for (let i = 0; i < 30; i += 1) {
      expect((await limiter.consume({ action: "sign_in", ip: "198.51.100.1", email: `p${i}@example.com` })).allowed).toBe(true);
    }
    expect((await limiter.consume({ action: "sign_in", ip: "198.51.100.1", email: "new@example.com" })).allowed).toBe(false);
  });

  it("stores only HMAC digests under the configured namespace, never the raw email or IP", async () => {
    const { db, buckets } = fakeDatabase({ now: 0 });
    const limiter = createPostgresAuthenticationRateLimiter({ db, keySecret, namespace, random: () => 1 });
    await limiter.consume({ action: "register", ip: "203.0.113.9", email: "secret.person@example.com" });
    const keys = [...buckets.keys()];
    expect(keys).toHaveLength(2);
    for (const key of keys) {
      expect(key.startsWith(`${namespace}:pg1:register:`)).toBe(true);
      expect(key).not.toContain("secret.person");
      expect(key).not.toContain("203.0.113.9");
    }
  });

  it("fails closed: a database error throws (the API answers 503), it never allows unchecked", async () => {
    const db: RateLimitDatabase = {
      async $queryRawUnsafe() {
        throw new Error("connection refused");
      }
    };
    const limiter = createPostgresAuthenticationRateLimiter({ db, keySecret, namespace });
    await expect(limiter.consume({ action: "sign_in", ip: "1.1.1.1", email: "a@example.com" })).rejects.toThrow();
    expect(await limiter.check!()).toBe(false);
  });

  it("fails closed on a malformed database answer", async () => {
    const db: RateLimitDatabase = {
      async $queryRawUnsafe<T>() {
        return [{ bucketKey: "other", hits: 1, secondsLeft: 60 }] as T;
      }
    };
    const limiter = createPostgresAuthenticationRateLimiter({ db, keySecret, namespace });
    await expect(limiter.consume({ action: "sign_in", ip: "1.1.1.1", email: "a@example.com" })).rejects.toThrow(
      "RWOS_AUTH_RATE_LIMITER_INVALID_RESPONSE"
    );
  });

  it("reports ready when the table can be read", async () => {
    const { db, queries } = fakeDatabase({ now: 0 });
    const limiter = createPostgresAuthenticationRateLimiter({ db, keySecret, namespace });
    expect(await limiter.check!()).toBe(true);
    expect(queries[0]).toContain(AUTH_RATE_LIMIT_TABLE);
  });

  it("sweeps expired buckets occasionally without affecting the decision", async () => {
    const { db, queries } = fakeDatabase({ now: 0 });
    const limiter = createPostgresAuthenticationRateLimiter({ db, keySecret, namespace, random: () => 0 });
    expect((await limiter.consume({ action: "sign_in", ip: "1.1.1.1", email: "a@example.com" })).allowed).toBe(true);
    expect(queries.some((query) => query.startsWith("DELETE"))).toBe(true);
  });

  it("refuses an invalid configuration", () => {
    const { db } = fakeDatabase({ now: 0 });
    expect(() => createPostgresAuthenticationRateLimiter({ db, keySecret: "short", namespace })).toThrow(
      "RWOS_AUTH_RATE_LIMITER_CONFIGURATION_INVALID"
    );
    expect(() => createPostgresAuthenticationRateLimiter({ db, keySecret, namespace: "rwos:authrl:prod:v1" })).toThrow(
      "RWOS_AUTH_RATE_LIMITER_CONFIGURATION_INVALID"
    );
    expect(() => createPostgresAuthenticationRateLimiter({ db, keySecret, namespace, keyId: "Bad Id" })).toThrow(
      "RWOS_AUTH_RATE_LIMITER_CONFIGURATION_INVALID"
    );
  });
});
