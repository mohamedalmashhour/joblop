import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@rwos/database";
import type { SweepRunLock } from "./paymentSweepRunner";

// Stage 2b.4-C3-F4 (G-a): durable, cross-instance safety controls for the aged-processing sweeper.
//
// DEFENSE-IN-DEPTH ONLY. The lease reduces contention and gives operators a visible, reclaimable lock;
// it NEVER moves money and NEVER replaces the existing optimistic payment version/state guard inside
// reconcile(), which stays the primary correctness mechanism. The kill switch is fail-closed: default
// OFF, a missing row is OFF, and any read failure is OFF.

const DEFAULT_LOCK_NAME = "aged_processing_sweep";

export type SweepLeaseHandle = Readonly<{ owner: string; fencingToken: bigint }>;

export type SweepLeaseState = Readonly<{ owner: string | null; fencingToken: bigint; expiresAt: Date | null }>;

export interface SweepLeaseStore {
  // Atomically claims the lease iff it is unheld or its lease has expired. Returns a handle (owner +
  // fencing token) on success, or null if a live lease is held by someone else. One indivisible SQL
  // statement — two instances can never both succeed against the same valid lease.
  tryAcquire(input: { owner: string; ttlMs: number; now?: Date }): Promise<SweepLeaseHandle | null>;
  // Releases the lease ONLY if the caller still owns it at the same fencing token. Returns false if
  // ownership changed (a stalled previous owner cannot release after takeover).
  release(handle: SweepLeaseHandle, now?: Date): Promise<boolean>;
  // Read-only current state (for operators/metrics). Never mutates.
  current(): Promise<SweepLeaseState | null>;
}

export interface SweepKillSwitch {
  // True ONLY when a control row exists AND enabled = true. Missing row / read error → false (OFF).
  isEnabled(): Promise<boolean>;
}

type RawClient = Pick<PrismaClient, "$queryRawUnsafe">;

export function createPostgresSweepLease(prisma: RawClient, options?: { name?: string }): SweepLeaseStore {
  const name = options?.name ?? DEFAULT_LOCK_NAME;
  return {
    async tryAcquire({ owner, ttlMs, now }) {
      if (!owner) throw new Error("Lease owner is required.");
      if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error("Lease ttlMs must be a positive finite number.");
      const acquiredAt = now ?? new Date();
      const expiresAt = new Date(acquiredAt.getTime() + ttlMs);
      // Single atomic statement: self-creating INSERT; on conflict, take over ONLY when the existing
      // lease is unheld or expired. The fencing token strictly increments on every acquisition.
      const rows = await prisma.$queryRawUnsafe<Array<{ owner: string; fencingToken: bigint }>>(
        `INSERT INTO payment_sweep_lease (name, owner, fencing_token, acquired_at, expires_at, updated_at)
         VALUES ($1, $2, 1, $3, $4, $3)
         ON CONFLICT (name) DO UPDATE
           SET owner = EXCLUDED.owner,
               fencing_token = payment_sweep_lease.fencing_token + 1,
               acquired_at = EXCLUDED.acquired_at,
               expires_at = EXCLUDED.expires_at,
               updated_at = EXCLUDED.updated_at
           WHERE payment_sweep_lease.owner IS NULL
              OR payment_sweep_lease.expires_at IS NULL
              OR payment_sweep_lease.expires_at < $3
         RETURNING owner, fencing_token AS "fencingToken"`,
        name, owner, acquiredAt, expiresAt
      );
      const row = rows[0];
      return row ? { owner: row.owner, fencingToken: BigInt(row.fencingToken) } : null;
    },

    async release(handle, now) {
      const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        `UPDATE payment_sweep_lease
           SET owner = NULL, acquired_at = NULL, expires_at = NULL, updated_at = $3
         WHERE name = $1 AND owner = $2 AND fencing_token = $4
         RETURNING name`,
        name, handle.owner, now ?? new Date(), handle.fencingToken
      );
      return rows.length === 1;
    },

    async current() {
      const rows = await prisma.$queryRawUnsafe<Array<{ owner: string | null; fencingToken: bigint; expiresAt: Date | null }>>(
        `SELECT owner, fencing_token AS "fencingToken", expires_at AS "expiresAt"
           FROM payment_sweep_lease WHERE name = $1`,
        name
      );
      const row = rows[0];
      return row ? { owner: row.owner, fencingToken: BigInt(row.fencingToken), expiresAt: row.expiresAt } : null;
    }
  };
}

export function createPostgresSweepKillSwitch(prisma: RawClient, options?: { name?: string }): SweepKillSwitch {
  const name = options?.name ?? DEFAULT_LOCK_NAME;
  return {
    async isEnabled() {
      try {
        const rows = await prisma.$queryRawUnsafe<Array<{ enabled: boolean }>>(
          `SELECT enabled FROM payment_sweep_control WHERE name = $1`,
          name
        );
        return rows[0]?.enabled === true; // missing row → false (fail closed)
      } catch {
        return false; // any read failure → OFF, never assume enabled
      }
    }
  };
}

// Adapts a durable lease store into the runner's SweepRunLock seam. One adapter per runner instance;
// it remembers the handle from tryAcquire so release targets the exact owner+fencing token it holds.
export function createLeaseBackedLock(
  store: SweepLeaseStore,
  options: { ttlMs: number; owner?: string; now?: () => Date }
): SweepRunLock {
  const owner = options.owner ?? randomUUID(); // globally-unique per instance
  const clock = () => options.now?.(); // undefined when no clock injected (adapters use wall time)
  let held: SweepLeaseHandle | null = null;
  return {
    async tryAcquire() {
      const now = clock();
      const handle = await store.tryAcquire(now ? { owner, ttlMs: options.ttlMs, now } : { owner, ttlMs: options.ttlMs });
      // Only record a SUCCESSFUL acquisition — a failed attempt must never clobber a handle this
      // adapter is still holding (that would turn the holder's release into a silent no-op).
      if (handle) held = handle;
      return handle !== null;
    },
    async release() {
      if (!held) return;
      const handle = held;
      held = null;
      const now = clock();
      await (now ? store.release(handle, now) : store.release(handle));
    }
  };
}
