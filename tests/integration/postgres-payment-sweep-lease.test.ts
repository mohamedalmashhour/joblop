import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@rwos/database";
import {
  createPostgresSweepKillSwitch,
  createPostgresSweepLease
} from "../../apps/api/src/paymentSweepLease";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

// Proves the durable cross-instance lease + kill switch (Stage 2b.4-C3-F4 / G-a) against REAL Postgres,
// where atomicity of the acquire/reclaim statements actually matters. No scheduler, no provider, no
// money movement is exercised — only the safety infrastructure.
suite("PostgreSQL payment-sweep durable lease + kill switch", () => {
  const prisma = createPrismaClient(databaseUrl!);
  const t0 = new Date("2026-08-15T00:00:00.000Z");
  const at = (ms: number) => new Date(t0.getTime() + ms);

  // Each test uses a fresh, uniquely-named lock so runs never collide.
  let name!: string;
  beforeEach(() => { name = `sweep-test-${randomUUID().slice(0, 12)}`; });
  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM payment_sweep_lease WHERE name LIKE 'sweep-test-%'`);
    await prisma.$executeRawUnsafe(`DELETE FROM payment_sweep_control WHERE name LIKE 'sweep-test-%'`);
    await prisma.$disconnect();
  });

  it("[1] two instances cannot simultaneously acquire the same valid lease", async () => {
    const a = createPostgresSweepLease(prisma as never, { name });
    const b = createPostgresSweepLease(prisma as never, { name });
    const [ra, rb] = await Promise.all([
      a.tryAcquire({ owner: "inst-A", ttlMs: 60_000, now: t0 }),
      b.tryAcquire({ owner: "inst-B", ttlMs: 60_000, now: t0 })
    ]);
    const winners = [ra, rb].filter((r) => r !== null);
    expect(winners).toHaveLength(1); // exactly one instance holds the lease
  });

  it("[2] a live (unexpired) lease cannot be stolen", async () => {
    const store = createPostgresSweepLease(prisma as never, { name });
    const held = await store.tryAcquire({ owner: "owner-1", ttlMs: 60_000, now: t0 });
    expect(held).not.toBeNull();
    // A different instance tries 30s later, while the lease is still valid.
    const stolen = await store.tryAcquire({ owner: "owner-2", ttlMs: 60_000, now: at(30_000) });
    expect(stolen).toBeNull();
  });

  it("[3] an expired lease can be atomically reclaimed (fencing token strictly increases)", async () => {
    const store = createPostgresSweepLease(prisma as never, { name });
    const first = await store.tryAcquire({ owner: "owner-1", ttlMs: 60_000, now: t0 });
    // 61s later the lease has expired; a new owner reclaims it.
    const reclaimed = await store.tryAcquire({ owner: "owner-2", ttlMs: 60_000, now: at(61_000) });
    expect(reclaimed).not.toBeNull();
    expect(reclaimed!.owner).toBe("owner-2");
    expect(reclaimed!.fencingToken).toBeGreaterThan(first!.fencingToken); // monotonic fencing
  });

  it("[4] the previous owner cannot release the lease after ownership changed", async () => {
    const store = createPostgresSweepLease(prisma as never, { name });
    const first = await store.tryAcquire({ owner: "owner-1", ttlMs: 60_000, now: t0 });
    await store.tryAcquire({ owner: "owner-2", ttlMs: 60_000, now: at(61_000) }); // takeover
    const releasedByStale = await store.release(first!, at(62_000)); // stale owner+token
    expect(releasedByStale).toBe(false); // cannot release what it no longer owns
    const state = await store.current();
    expect(state?.owner).toBe("owner-2"); // still owned by the new holder
  });

  it("[5] a crash (no release) safely expires and is reclaimable; a clean release frees immediately", async () => {
    const store = createPostgresSweepLease(prisma as never, { name });
    // Crash path: acquire then never release → after expiry another instance can take over.
    await store.tryAcquire({ owner: "crashed", ttlMs: 30_000, now: t0 });
    const afterExpiry = await store.tryAcquire({ owner: "recovered", ttlMs: 30_000, now: at(31_000) });
    expect(afterExpiry).not.toBeNull();
    // Clean release path: releasing frees the lease before expiry for the next acquirer.
    const ok = await store.release(afterExpiry!, at(32_000));
    expect(ok).toBe(true);
    const next = await store.tryAcquire({ owner: "next", ttlMs: 30_000, now: at(33_000) });
    expect(next).not.toBeNull(); // acquired well before the previous lease would have expired
  });

  it("[7] the kill switch is OFF by default: no row is OFF, and a fresh row defaults to disabled", async () => {
    const killSwitch = createPostgresSweepKillSwitch(prisma as never, { name });
    expect(await killSwitch.isEnabled()).toBe(false); // no control row → OFF

    // Insert relying on the column DEFAULT (do not set enabled) — it must land disabled.
    await prisma.$executeRawUnsafe(`INSERT INTO payment_sweep_control (name) VALUES ($1)`, name);
    expect(await killSwitch.isEnabled()).toBe(false);

    // Operator enables WITHOUT a deploy (a plain row update), then disables again.
    await prisma.$executeRawUnsafe(`UPDATE payment_sweep_control SET enabled = true WHERE name = $1`, name);
    expect(await killSwitch.isEnabled()).toBe(true);
    await prisma.$executeRawUnsafe(`UPDATE payment_sweep_control SET enabled = false WHERE name = $1`, name);
    expect(await killSwitch.isEnabled()).toBe(false);
  });
});
