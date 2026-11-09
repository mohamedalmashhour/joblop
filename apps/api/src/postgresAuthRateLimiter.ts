import type { AuthenticationRateLimiter } from "./app";
import { deriveAuthenticationRateLimitKeys } from "./authRateLimitKeys";

// Sign-in rate limiter backed by the API's own PostgreSQL (AUTH_RATE_LIMITER_BACKEND=postgres).
//
// Why: production needs a limiter shared by every API instance that survives a restart. The API
// already has a database, so this needs no extra service, no Redis and no service token.
//
// Race safety: each request bumps both of its buckets (account + network) in ONE statement,
// INSERT ... ON CONFLICT DO UPDATE ... RETURNING. PostgreSQL takes the row lock for the conflicting
// key, so concurrent requests on any number of API instances serialize per bucket and each sees its
// own incremented count; no read-then-write gap exists. Windows use the database clock (now()), so
// instance clock skew cannot stretch or shrink a window. The two rows are always written in the same
// order (account, then network) and account and network keys never collide, so two requests cannot
// deadlock on each other.
//
// Privacy: bucket keys are HMAC-SHA256 digests (AUTH_RATE_LIMITER_KEY_SECRET) of the email/phone and
// the IP; the table never holds a raw identifier.
//
// Fail closed: any database error makes consume() throw; the API turns that into 503
// RWOS_AUTH_UNAVAILABLE (sign-in refused, never allowed unchecked). check() reports false when the
// table cannot be read (for example, the migration has not run), which makes /ready return 503.

/** The one query method the limiter needs; PrismaClient satisfies it. */
export interface RateLimitDatabase {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

export type PostgresAuthRateLimiterPolicy = Readonly<{
  accountMaxAttempts: number;
  networkMaxAttempts: number;
  windowSeconds: number;
}>;

/** Same policy as the memory and remote limiters: 5 per account and 30 per IP per 60 s. */
export const DEFAULT_AUTH_RATE_LIMIT_POLICY: PostgresAuthRateLimiterPolicy = {
  accountMaxAttempts: 5,
  networkMaxAttempts: 30,
  windowSeconds: 60
};

export const AUTH_RATE_LIMIT_TABLE = "auth_rate_limit_buckets";

const CONSUME_SQL = `INSERT INTO "auth_rate_limit_buckets" AS b ("bucket_key", "hits", "window_ends_at")
VALUES ($1, 1, now() + ($3::integer * interval '1 second')),
       ($2, 1, now() + ($3::integer * interval '1 second'))
ON CONFLICT ("bucket_key") DO UPDATE SET
  "hits" = CASE WHEN b."window_ends_at" <= now() THEN 1 ELSE b."hits" + 1 END,
  "window_ends_at" = CASE WHEN b."window_ends_at" <= now() THEN EXCLUDED."window_ends_at" ELSE b."window_ends_at" END
RETURNING b."bucket_key" AS "bucketKey", b."hits" AS "hits",
  EXTRACT(EPOCH FROM (b."window_ends_at" - now()))::float8 AS "secondsLeft"`;

const CHECK_SQL = `SELECT 1 AS "ok" FROM "auth_rate_limit_buckets" LIMIT 1`;

// Expired buckets are useless after their window; a bounded sweep keeps the table small.
const SWEEP_SQL = `DELETE FROM "auth_rate_limit_buckets"
WHERE "bucket_key" IN (
  SELECT "bucket_key" FROM "auth_rate_limit_buckets"
  WHERE "window_ends_at" < now() - interval '5 minutes'
  LIMIT 500
)`;

type BucketRow = { bucketKey: string; hits: number | bigint; secondsLeft: number | string };

export function createPostgresAuthenticationRateLimiter(options: {
  db: RateLimitDatabase;
  keySecret: string;
  namespace: string;
  keyId?: string;
  policy?: PostgresAuthRateLimiterPolicy;
  /** Chance (0..1) that a consume also sweeps expired buckets. Default 1%. */
  sweepProbability?: number;
  random?: () => number;
  close?: () => Promise<void>;
}): AuthenticationRateLimiter {
  if (
    options.keySecret.length < 32 ||
    !/^rwos:authrl:(?:local|test|staging|production):v1$/.test(options.namespace) ||
    (options.keyId !== undefined && !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(options.keyId))
  ) {
    throw new Error("RWOS_AUTH_RATE_LIMITER_CONFIGURATION_INVALID");
  }
  const policy = options.policy ?? DEFAULT_AUTH_RATE_LIMIT_POLICY;
  const keyId = options.keyId ?? "pg1";
  const sweepProbability = options.sweepProbability ?? 0.01;
  const random = options.random ?? Math.random;

  return {
    async consume(input) {
      const keys = deriveAuthenticationRateLimitKeys(input, options.keySecret, options.namespace, keyId);
      const rows = await options.db.$queryRawUnsafe<BucketRow[]>(
        CONSUME_SQL,
        keys.accountKey,
        keys.networkKey,
        policy.windowSeconds
      );
      if (!Array.isArray(rows)) throw new Error("RWOS_AUTH_RATE_LIMITER_INVALID_RESPONSE");
      const account = rows.find((row) => row.bucketKey === keys.accountKey);
      const network = rows.find((row) => row.bucketKey === keys.networkKey);
      if (!account || !network) throw new Error("RWOS_AUTH_RATE_LIMITER_INVALID_RESPONSE");
      const accountHits = Number(account.hits);
      const networkHits = Number(network.hits);
      if (!Number.isFinite(accountHits) || !Number.isFinite(networkHits)) {
        throw new Error("RWOS_AUTH_RATE_LIMITER_INVALID_RESPONSE");
      }
      if (random() < sweepProbability) {
        // Housekeeping only: never blocks or fails the sign-in decision.
        options.db.$queryRawUnsafe(SWEEP_SQL).catch(() => undefined);
      }
      return {
        allowed: accountHits <= policy.accountMaxAttempts && networkHits <= policy.networkMaxAttempts,
        retryAfterSeconds: clampRetryAfter(
          Math.max(secondsOf(account.secondsLeft), secondsOf(network.secondsLeft))
        )
      };
    },
    async check() {
      try {
        await options.db.$queryRawUnsafe(CHECK_SQL);
        return true;
      } catch {
        return false;
      }
    },
    ...(options.close ? { close: options.close } : {})
  };
}

function secondsOf(value: number | string) {
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds : 0;
}

function clampRetryAfter(value: number) {
  return Math.max(1, Math.min(3600, Math.ceil(value)));
}
