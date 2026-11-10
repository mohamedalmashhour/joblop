// Bounded retry for PostgreSQL transactions that lose a serialization check.
//
// A SERIALIZABLE transaction can be cancelled by PostgreSQL even when no row it touched was
// changed by anyone else ("could not serialize access due to read/write dependencies among
// transactions", SQLSTATE 40001), and any transaction can be picked as a deadlock victim
// (SQLSTATE 40P01). Both mean "nothing was committed, run the whole transaction again". Prisma
// reports 40001 as P2034. PostgreSQL's own guidance is to retry these, so callers that expect
// concurrent writers wrap the whole transaction in `withTransientConflictRetry`.
//
// Only retry a function that is a complete transaction: the failed attempt rolled back, so a
// retry starts from a clean state and re-reads everything. Never retry a function that has
// side effects outside the transaction (e-mail, payments, HTTP calls).

const TRANSIENT_CODES = new Set(["P2034", "40001", "40P01"]);
const TRANSIENT_MESSAGE = /could not serialize access|deadlock detected|write conflict or a deadlock/i;

/** True for a serialization failure or deadlock: the transaction rolled back and may be retried. */
export function isTransientTransactionConflict(error: unknown): boolean {
  return hasTransientMarker(error, 0);
}

function hasTransientMarker(value: unknown, depth: number): boolean {
  if (depth > 4 || !value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  for (const key of ["code", "originalCode"]) {
    const code = record[key];
    if (typeof code === "string" && TRANSIENT_CODES.has(code)) return true;
  }
  if (record.kind === "TransactionWriteConflict") return true;
  if (typeof record.message === "string" && TRANSIENT_MESSAGE.test(record.message)) return true;
  // Prisma and the pg driver adapter nest the database error under `cause` or `meta`.
  const meta = record.meta;
  if (meta && typeof meta === "object") {
    const metaRecord = meta as Record<string, unknown>;
    if (hasTransientMarker(metaRecord, depth + 1)) return true;
    if (hasTransientMarker(metaRecord.driverAdapterError, depth + 1)) return true;
  }
  return hasTransientMarker(record.cause, depth + 1);
}

export type TransientRetryOptions = Readonly<{
  /** Total attempts including the first. Default 5. */
  maxAttempts?: number;
  /** Backoff ceiling for the first retry, doubled on each later retry. Default 10 ms. */
  baseDelayMs?: number;
  /** Upper bound for any single wait. Default 250 ms. */
  maxDelayMs?: number;
  /** Which errors to retry. Default: `isTransientTransactionConflict`. */
  isRetryable?: (error: unknown) => boolean;
  /** Injected for tests. */
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
}>;

/**
 * "Full jitter" exponential backoff: a random wait between 0 and min(max, base * 2^retry).
 * The randomness matters: two transactions that collided once and wait the same fixed time
 * collide again, which is how a fixed or linear backoff exhausts its retries.
 */
export function fullJitterBackoffMs(retry: number, baseDelayMs: number, maxDelayMs: number, random: () => number = Math.random): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, retry));
  return Math.floor(random() * ceiling);
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs `operation` and runs it again, after a jittered wait, while it fails with a transient
 * transaction conflict. Gives up after `maxAttempts` and rethrows the last error, so a caller
 * still sees a persistent conflict. Any other error is rethrown at once.
 */
export async function withTransientConflictRetry<T>(operation: (attempt: number) => Promise<T>, options: TransientRetryOptions = {}): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 5);
  const baseDelayMs = options.baseDelayMs ?? 10;
  const maxDelayMs = options.maxDelayMs ?? 250;
  const isRetryable = options.isRetryable ?? isTransientTransactionConflict;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? defaultSleep;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryable(error)) throw error;
      await sleep(fullJitterBackoffMs(attempt - 1, baseDelayMs, maxDelayMs, random));
    }
  }
}
