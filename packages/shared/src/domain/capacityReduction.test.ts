import { describe, expect, it } from "vitest";
import { computeReductionPlan } from "./capacityReduction";

describe("capacity reduction plan", () => {
  it("removes unfilled capacity first — no confirmed impact when target stays >= confirmed", () => {
    // Requested 5, confirmed 3, unfilled 2. Reduce to 4 → 1 unfilled removed, no confirmed.
    const p = computeReductionPlan({ requestedTarget: 5, confirmedWorkers: 3, newTarget: 4 });
    expect(p).toMatchObject({
      valid: true,
      unfilledCapacity: 2,
      unfilledRemoved: 1,
      affectedConfirmed: 0,
      requiresConfirmedSelection: false
    });
  });

  it("removes all unfilled then affects confirmed when target drops below confirmed", () => {
    // Requested 5, confirmed 3, unfilled 2. Reduce to 2 → 2 unfilled removed, 1 confirmed affected.
    const p = computeReductionPlan({ requestedTarget: 5, confirmedWorkers: 3, newTarget: 2 });
    expect(p).toMatchObject({
      valid: true,
      unfilledRemoved: 2,
      affectedConfirmed: 1,
      requiresConfirmedSelection: true
    });
  });

  it("affects multiple confirmed when reducing well below confirmed", () => {
    const p = computeReductionPlan({ requestedTarget: 5, confirmedWorkers: 3, newTarget: 1 });
    expect(p.affectedConfirmed).toBe(2); // confirmed 3 → target 1
    expect(p.unfilledRemoved).toBe(2);
  });

  it("a fully-confirmed request (no unfilled) affects only confirmed", () => {
    // Requested 3, confirmed 3, unfilled 0. Reduce to 2 → 1 confirmed affected, 0 unfilled removed.
    const p = computeReductionPlan({ requestedTarget: 3, confirmedWorkers: 3, newTarget: 2 });
    expect(p).toMatchObject({ unfilledRemoved: 0, affectedConfirmed: 1, requiresConfirmedSelection: true });
  });

  it("rejects a non-reduction (newTarget >= requested)", () => {
    expect(computeReductionPlan({ requestedTarget: 3, confirmedWorkers: 2, newTarget: 3 }).reason).toBe("not_a_reduction");
    expect(computeReductionPlan({ requestedTarget: 3, confirmedWorkers: 2, newTarget: 5 }).valid).toBe(false);
  });

  it("routes reduce-to-zero to whole-request Cancel", () => {
    const p = computeReductionPlan({ requestedTarget: 3, confirmedWorkers: 1, newTarget: 0 });
    expect(p.valid).toBe(false);
    expect(p.reason).toBe("reduce_to_zero_use_cancel");
  });

  it("rejects non-integer inputs", () => {
    expect(computeReductionPlan({ requestedTarget: 3, confirmedWorkers: 2, newTarget: 1.5 }).reason).toBe("invalid_target");
  });
});
