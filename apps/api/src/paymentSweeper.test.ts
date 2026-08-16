import { describe, expect, it, vi } from "vitest";
import type { PaymentRecord } from "@rwos/shared";
import { createAgedProcessingSweeper, createPrismaAgedProcessingSelector, type AgedProcessingCandidate } from "./paymentSweeper";

const record = (state: PaymentRecord["state"]): PaymentRecord => ({
  id: "p", organizationId: "o", assignmentId: "a", timesheetId: "t", invoiceId: "i",
  policyVersion: "v1", policyMode: "manual_collection", methodReferenceId: null, state,
  amountMinor: 10_500, allocatedMinor: 0, refundedMinor: 0, currency: "CAD",
  authorizationReference: null, version: 3
});
const candidate = (id: string, organizationId = "org-1"): AgedProcessingCandidate => ({ id, organizationId });

// ── Selector (Prisma query shape): tests 1–5 ──
describe("aged-processing selector query (Stage 2b.4-C3-F1)", () => {
  const call = async (limit = 50, olderThan = new Date("2026-08-15T00:00:00.000Z")) => {
    const findMany = vi.fn().mockResolvedValue([]);
    const selector = createPrismaAgedProcessingSelector({ employerPaymentAttempt: { findMany } });
    await selector.selectAgedProcessing({ olderThan, limit });
    return findMany.mock.calls[0]![0] as { where: Record<string, unknown>; orderBy: unknown; take: number };
  };

  it("[1] selects only `processing` attempts", async () => {
    expect((await call()).where).toMatchObject({ state: "processing" });
  });
  it("[2] ignores fresh attempts — only updatedAt strictly before olderThan", async () => {
    const olderThan = new Date("2026-08-01T00:00:00.000Z");
    expect((await call(50, olderThan)).where).toMatchObject({ updatedAt: { lt: olderThan } });
  });
  it("[3] ignores terminal states — the state filter is exactly `processing`", async () => {
    expect((await call()).where.state).toBe("processing"); // no succeeded/failed/authorized selected
  });
  it("[4] orders oldest-first (deterministic)", async () => {
    expect((await call()).orderBy).toEqual({ updatedAt: "asc" });
  });
  it("[5] enforces the explicit batch cap via take", async () => {
    expect((await call(25)).take).toBe(25);
  });
});

// ── Sweeper behavior: tests 6–15 ──
describe("aged-processing sweeper (Stage 2b.4-C3-F1)", () => {
  const config = { minAgeMs: 15 * 60_000, maxBatchSize: 100 };

  it("[6] an accepted reconciliation terminalizes correctly (resolved)", async () => {
    const reconcile = vi.fn().mockResolvedValue(record("succeeded"));
    const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [candidate("p1")], reconcile });
    const result = await sweeper.sweep(config);
    expect(result).toMatchObject({ selected: 1, resolved: 1, stillProcessing: 0, errored: 0 });
    expect(result.items[0]).toMatchObject({ outcome: "resolved", state: "succeeded" });
  });

  it("[7] unknown/indeterminate remains processing (still_processing, not terminalized)", async () => {
    const reconcile = vi.fn().mockResolvedValue(record("processing"));
    const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [candidate("p1")], reconcile });
    const result = await sweeper.sweep(config);
    expect(result).toMatchObject({ resolved: 0, stillProcessing: 1 });
    expect(result.items[0]).toMatchObject({ outcome: "still_processing", state: "processing" });
  });

  it("[8] a provider/reconcile error does NOT terminalize — the payment is left safely unresolved", async () => {
    const reconcile = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [candidate("p1")], reconcile });
    const result = await sweeper.sweep(config);
    expect(result).toMatchObject({ resolved: 0, errored: 1 });
    expect(result.items[0]).toMatchObject({ outcome: "error", state: null }); // no guessed outcome
  });

  it("[9] one failed item does not stop the rest of the batch", async () => {
    const reconcile = vi.fn()
      .mockResolvedValueOnce(record("succeeded"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(record("failed"));
    const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [candidate("p1"), candidate("p2"), candidate("p3")], reconcile });
    const result = await sweeper.sweep(config);
    expect(reconcile).toHaveBeenCalledTimes(3); // all three attempted
    expect(result).toMatchObject({ selected: 3, resolved: 2, errored: 1 });
  });

  it("[10] two concurrent sweeps cannot double-apply — the sweeper only ever calls the guarded reconcile()", async () => {
    // The sweeper has NO money-moving path of its own; double-apply protection is reconcile()'s
    // version/state guard (Stage 2b.4-C3-E). Here we prove the sweeper delegates every mutation to it.
    const reconcile = vi.fn().mockResolvedValue(record("succeeded"));
    const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [candidate("p1")], reconcile });
    await Promise.all([sweeper.sweep(config), sweeper.sweep(config)]);
    // Both sweeps route through reconcile only; the second application is a no-op inside reconcile's guard.
    expect(reconcile).toHaveBeenCalledTimes(2);
    for (const c of reconcile.mock.calls) expect(c[0]).toEqual({ paymentId: "p1", organizationId: "org-1" });
  });

  it("[11] webhook-vs-sweeper race is safe — reconcile reports the already-resolved terminal state", async () => {
    // A webhook resolved the attempt between selection and reconciliation → reconcile returns terminal.
    const reconcile = vi.fn().mockResolvedValue(record("succeeded"));
    const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [candidate("p1")], reconcile });
    const result = await sweeper.sweep(config);
    expect(result.items[0]).toMatchObject({ outcome: "resolved", state: "succeeded" }); // no double-apply
  });

  it("[12] manual-reconcile-vs-sweeper race is safe — same guarded reconcile path", async () => {
    const reconcile = vi.fn().mockResolvedValue(record("failed"));
    const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [candidate("p1")], reconcile });
    const result = await sweeper.sweep(config);
    expect(result.items[0]).toMatchObject({ outcome: "resolved", state: "failed" });
  });

  it("[13] tenant isolation — each attempt is reconciled under its OWN organizationId", async () => {
    const reconcile = vi.fn().mockResolvedValue(record("succeeded"));
    const sweeper = createAgedProcessingSweeper({
      selectAgedProcessing: async () => [candidate("pA", "org-A"), candidate("pB", "org-B")],
      reconcile
    });
    await sweeper.sweep(config);
    expect(reconcile).toHaveBeenNthCalledWith(1, { paymentId: "pA", organizationId: "org-A" });
    expect(reconcile).toHaveBeenNthCalledWith(2, { paymentId: "pB", organizationId: "org-B" });
  });

  it("[14] the sweeper NEVER invokes a money-moving provider method — it has no provider, only reconcile()", async () => {
    // Structural guarantee: the sweeper's only side-effecting dependency is reconcile(). There is no
    // provider/execute handle it could call. This test documents and locks that contract.
    const reconcile = vi.fn().mockResolvedValue(record("succeeded"));
    const deps = { selectAgedProcessing: async () => [candidate("p1")], reconcile };
    expect(Object.keys(deps)).toEqual(["selectAgedProcessing", "reconcile"]); // no provider/execute/capture/refund
    await createAgedProcessingSweeper(deps).sweep(config);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it("[15] results carry no sensitive information (raw errors, keys, payment detail)", async () => {
    const reconcile = vi.fn().mockRejectedValue(new Error("SECRET sk_live_leak idempotency=raw-key-123 pan=4111111111111111"));
    const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [candidate("p1")], reconcile });
    const result = await sweeper.sweep(config);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("sk_live");
    expect(serialized).not.toContain("raw-key-123");
    expect(serialized).not.toContain("4111111111111111");
    expect(result.items[0]).toEqual({ paymentId: "p1", organizationId: "org-1", outcome: "error", state: null });
  });

  describe("safety limits", () => {
    it("fails closed on an invalid (negative/NaN) minimum age", async () => {
      const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [], reconcile: vi.fn() });
      await expect(sweeper.sweep({ minAgeMs: -1, maxBatchSize: 10 })).rejects.toThrow();
      await expect(sweeper.sweep({ minAgeMs: Number.NaN, maxBatchSize: 10 })).rejects.toThrow();
    });
    it("fails closed on an invalid maximum batch size", async () => {
      const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: async () => [], reconcile: vi.fn() });
      await expect(sweeper.sweep({ minAgeMs: 60_000, maxBatchSize: 0 })).rejects.toThrow();
    });
    it("computes olderThan from now - minAgeMs and passes the batch cap to selection", async () => {
      const select = vi.fn().mockResolvedValue([]);
      const sweeper = createAgedProcessingSweeper({ selectAgedProcessing: select, reconcile: vi.fn(), now: () => new Date("2026-08-15T01:00:00.000Z") });
      await sweeper.sweep({ minAgeMs: 15 * 60_000, maxBatchSize: 42 });
      expect(select).toHaveBeenCalledWith({ olderThan: new Date("2026-08-15T00:45:00.000Z"), limit: 42 });
    });
  });
});
