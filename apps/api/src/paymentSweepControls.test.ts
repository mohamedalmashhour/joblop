import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { PaymentRecord } from "@rwos/shared";
import type { AgedProcessingSweeper, SweepResult } from "./paymentSweeper";
import { createScheduledSweepRunner } from "./paymentSweepRunner";
import {
  createLeaseBackedLock,
  createPostgresSweepKillSwitch,
  type SweepLeaseHandle,
  type SweepLeaseStore
} from "./paymentSweepLease";

const sweeperReturning = (result: Partial<SweepResult> = {}): { sweeper: AgedProcessingSweeper; sweep: ReturnType<typeof vi.fn> } => {
  const sweep = vi.fn().mockResolvedValue({
    selected: 0, resolved: 0, stillProcessing: 0, errored: 0, items: [], ...result
  } satisfies SweepResult);
  return { sweeper: { sweep }, sweep };
};

// A fake in-memory lease store that honours the same atomic-takeover contract as the Postgres one,
// so runner-integration proofs don't need a database. Atomicity itself is proven against real
// Postgres in tests/integration/postgres-payment-sweep-lease.test.ts.
const fakeLeaseStore = (): SweepLeaseStore => {
  let owner: string | null = null;
  let token = 0n;
  let expiresAt: number | null = null;
  return {
    async tryAcquire({ owner: candidate, ttlMs, now }) {
      const t = (now ?? new Date()).getTime();
      if (owner !== null && expiresAt !== null && expiresAt > t) return null; // live lease held
      owner = candidate; token += 1n; expiresAt = t + ttlMs;
      return { owner, fencingToken: token };
    },
    async release(handle) {
      if (owner !== handle.owner || token !== handle.fencingToken) return false;
      owner = null; expiresAt = null; return true;
    },
    async current() {
      return { owner, fencingToken: token, expiresAt: expiresAt === null ? null : new Date(expiresAt) };
    }
  };
};

describe("sweeper durable controls — kill switch (Stage 2b.4-C3-F4 / G-a)", () => {
  it("[6] kill switch OFF prevents candidate selection AND reconciliation", async () => {
    const { sweeper, sweep } = sweeperReturning({ selected: 9 });
    const runner = createScheduledSweepRunner({ sweeper, killSwitch: { isEnabled: async () => false } });
    const metrics = await runner.runOnce();
    expect(metrics.status).toBe("disabled");
    expect(sweep).not.toHaveBeenCalled(); // selection lives inside sweep(); it never ran
  });

  it("[6b] kill switch is evaluated BEFORE the lease is acquired", async () => {
    const store = fakeLeaseStore();
    const tryAcquire = vi.spyOn(store, "tryAcquire");
    const { sweeper } = sweeperReturning();
    const runner = createScheduledSweepRunner({
      sweeper,
      killSwitch: { isEnabled: async () => false },
      lock: createLeaseBackedLock(store, { ttlMs: 60_000 })
    });
    await runner.runOnce();
    expect(tryAcquire).not.toHaveBeenCalled(); // no lease work when disabled
  });

  it("[6c] kill switch ON allows exactly one bounded sweep", async () => {
    const { sweeper, sweep } = sweeperReturning({ selected: 1, resolved: 1 });
    const runner = createScheduledSweepRunner({ sweeper, killSwitch: { isEnabled: async () => true } });
    const metrics = await runner.runOnce();
    expect(metrics.status).toBe("completed");
    expect(sweep).toHaveBeenCalledTimes(1);
  });

  it("[7] the durable kill switch reader defaults OFF: missing row and read errors are both OFF", async () => {
    const missing = createPostgresSweepKillSwitch({ $queryRawUnsafe: vi.fn().mockResolvedValue([]) } as never);
    expect(await missing.isEnabled()).toBe(false); // no control row → OFF

    const disabled = createPostgresSweepKillSwitch({ $queryRawUnsafe: vi.fn().mockResolvedValue([{ enabled: false }]) } as never);
    expect(await disabled.isEnabled()).toBe(false);

    const errored = createPostgresSweepKillSwitch({ $queryRawUnsafe: vi.fn().mockRejectedValue(new Error("db down")) } as never);
    expect(await errored.isEnabled()).toBe(false); // fail closed on read error

    const enabled = createPostgresSweepKillSwitch({ $queryRawUnsafe: vi.fn().mockResolvedValue([{ enabled: true }]) } as never);
    expect(await enabled.isEnabled()).toBe(true); // only an explicit true enables
  });
});

describe("sweeper durable controls — lease-backed lock adapter (Stage 2b.4-C3-F4 / G-a)", () => {
  it("skips a concurrent invocation while a lease is held, then proceeds once released", async () => {
    const store = fakeLeaseStore();
    const lock = createLeaseBackedLock(store, { ttlMs: 60_000 });
    let release!: (r: SweepResult) => void;
    const empty: SweepResult = { selected: 0, resolved: 0, stillProcessing: 0, errored: 0, items: [] };
    const sweep = vi.fn()
      .mockImplementationOnce(() => new Promise<SweepResult>((r) => { release = r; })) // first: controllable
      .mockResolvedValue(empty); // later calls resolve immediately
    const runner = createScheduledSweepRunner({ sweeper: { sweep }, lock });
    const first = runner.runOnce(); // acquires lease, sweep pending
    const second = await runner.runOnce(); // lease held → skipped
    expect(second.status).toBe("skipped_locked");
    expect(sweep).toHaveBeenCalledTimes(1);
    release(empty);
    await first;
    const third = await runner.runOnce(); // lease released → proceeds
    expect(third.status).toBe("completed");
  });
});

describe("sweeper durable controls — correctness invariants (Stage 2b.4-C3-F4 / G-a)", () => {
  const record = (state: PaymentRecord["state"]): PaymentRecord => ({
    id: "p", organizationId: "o", assignmentId: "a", timesheetId: "t", invoiceId: "i",
    policyVersion: "v1", policyMode: "manual_collection", methodReferenceId: null, state,
    amountMinor: 10_500, allocatedMinor: 0, refundedMinor: 0, currency: "CAD",
    authorizationReference: null, version: 3
  });

  it("[8] with the lease BYPASSED (split-brain), correctness still rests on reconcile()'s version/state guard", async () => {
    // Two runners, each with its own always-granting lease (as if two instances had no shared lock).
    // The ONLY thing preventing a double-apply is reconcile()'s guard — modelled here as a version
    // check that lets the first application through and no-ops the second.
    let applied = false;
    const guardedReconcile = vi.fn().mockImplementation(async () => {
      if (applied) return record("succeeded"); // second call: guard no-ops, already terminal
      applied = true; return record("succeeded");
    });
    const { createAgedProcessingSweeper } = await import("./paymentSweeper");
    const sweeper = createAgedProcessingSweeper({
      selectAgedProcessing: async () => [{ id: "p1", organizationId: "org-1" }],
      reconcile: guardedReconcile
    });
    const always: SweepLeaseStore = {
      tryAcquire: async ({ owner }) => ({ owner, fencingToken: 1n } as SweepLeaseHandle),
      release: async () => true,
      current: async () => null
    };
    const a = createScheduledSweepRunner({ sweeper, lock: createLeaseBackedLock(always, { ttlMs: 60_000, owner: "A" }) });
    const b = createScheduledSweepRunner({ sweeper, lock: createLeaseBackedLock(always, { ttlMs: 60_000, owner: "B" }) });
    const [ra, rb] = await Promise.all([a.runOnce(), b.runOnce()]);
    expect(ra.status).toBe("completed");
    expect(rb.status).toBe("completed");
    // Both reconciled through the guard; the guard — not the lease — is what makes overlap safe.
    expect(guardedReconcile).toHaveBeenCalledTimes(2);
  });

  it("[9] emitted metrics expose only safe aggregate counts + status + duration", async () => {
    const { sweeper } = sweeperReturning({
      selected: 2, resolved: 1, stillProcessing: 1,
      items: [{ paymentId: "pay-secret", organizationId: "org-secret", outcome: "resolved", state: "succeeded" }]
    });
    const runner = createScheduledSweepRunner({ sweeper, killSwitch: { isEnabled: async () => true } });
    const metrics = await runner.runOnce();
    expect(Object.keys(metrics).sort()).toEqual(["durationMs", "errored", "resolved", "selected", "status", "stillProcessing"]);
    expect(JSON.stringify(metrics)).not.toMatch(/pay-secret|org-secret|items/);
  });

  it("[10] errors/secrets/PAN/idempotency data cannot leak through metrics", async () => {
    const sweep = vi.fn().mockRejectedValue(new Error("sk_live_x idempotency=raw-key-9 pan=4111111111111111"));
    const runner = createScheduledSweepRunner({ sweeper: { sweep }, killSwitch: { isEnabled: async () => true } });
    const metrics = await runner.runOnce();
    expect(metrics.status).toBe("failed");
    expect(JSON.stringify(metrics)).not.toMatch(/sk_live|raw-key-9|4111111111111111/);
  });

  it("[11] the durable-control surface introduces NO money-moving operation", () => {
    const store = fakeLeaseStore();
    const killSwitch = createPostgresSweepKillSwitch({ $queryRawUnsafe: vi.fn() } as never);
    const forbidden = ["execute", "authorize", "capture", "refund", "void", "charge", "pay"];
    for (const key of forbidden) {
      expect(store).not.toHaveProperty(key);
      expect(killSwitch).not.toHaveProperty(key);
    }
    expect(Object.keys(store).sort()).toEqual(["current", "release", "tryAcquire"]);
    expect(Object.keys(killSwitch)).toEqual(["isEnabled"]);
  });

  it("[12] no scheduler/cron/production activation is introduced by the runner or lease source", () => {
    const runnerSrc = readFileSync(fileURLToPath(new URL("./paymentSweepRunner.ts", import.meta.url)), "utf8");
    const leaseSrc = readFileSync(fileURLToPath(new URL("./paymentSweepLease.ts", import.meta.url)), "utf8");
    for (const src of [runnerSrc, leaseSrc]) {
      expect(src).not.toMatch(/setInterval|setTimeout|node-cron|CloudScheduler|cloud-scheduler|new\s+CronJob/i);
    }
  });
});
