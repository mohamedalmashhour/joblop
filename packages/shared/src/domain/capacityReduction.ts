// Authoritative capacity-reduction math (server-side). Reduce removes UNFILLED
// capacity first; only when the new target falls below confirmed capacity are
// confirmed assignments affected. Reduce is NOT whole-request Cancel — the request
// stays active with the new target. Reducing to zero must route to the explicit
// whole-request cancellation workflow instead.

export type ReductionPlan = Readonly<{
  valid: boolean;
  reason:
    | "ok"
    | "not_a_reduction" // newTarget >= current requested
    | "reduce_to_zero_use_cancel" // newTarget < 1 → use whole-request Cancel
    | "invalid_target";
  previousTarget: number;
  newTarget: number;
  confirmedWorkers: number;
  unfilledCapacity: number;
  unfilledRemoved: number;
  // Number of currently-confirmed assignments that must be cancelled to reach the
  // new target. The employer must select exactly this many.
  affectedConfirmed: number;
  requiresConfirmedSelection: boolean;
}>;

export function computeReductionPlan(input: {
  requestedTarget: number;
  confirmedWorkers: number;
  newTarget: number;
}): ReductionPlan {
  const { requestedTarget, confirmedWorkers, newTarget } = input;
  const unfilledCapacity = Math.max(0, requestedTarget - confirmedWorkers);

  const base = {
    previousTarget: requestedTarget,
    newTarget,
    confirmedWorkers,
    unfilledCapacity,
    unfilledRemoved: 0,
    affectedConfirmed: 0,
    requiresConfirmedSelection: false
  };

  if (!Number.isInteger(newTarget) || !Number.isInteger(requestedTarget) || !Number.isInteger(confirmedWorkers)) {
    return { ...base, valid: false, reason: "invalid_target" };
  }
  if (newTarget < 1) {
    // Reducing to zero is a whole-request cancellation, not a Reduce.
    return { ...base, valid: false, reason: "reduce_to_zero_use_cancel" };
  }
  if (newTarget >= requestedTarget) {
    return { ...base, valid: false, reason: "not_a_reduction" };
  }

  const reduction = requestedTarget - newTarget;
  const unfilledRemoved = Math.min(unfilledCapacity, reduction);
  const affectedConfirmed = Math.max(0, confirmedWorkers - newTarget);

  return {
    ...base,
    valid: true,
    reason: "ok",
    unfilledRemoved,
    affectedConfirmed,
    requiresConfirmedSelection: affectedConfirmed > 0
  };
}
