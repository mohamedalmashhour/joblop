// A post-lock adjustment stores the FULL recomputed pay, and the calculation it corrects stays locked
// as history. So any total that adds calculations up must count each worker's period once, at its
// latest revision, or the same work is counted twice. Payouts differ: they pay the difference instead
// (see workerPayoutAmountMinor).

// Rows from before revision lineage carry this placeholder, so each one stands alone.
const NO_FAMILY_ROOT = "00000000-0000-0000-0000-000000000000";

export function currentPayrollCalculations<T extends { id: string; familyRootId: string; revision: number }>(
  calculations: readonly T[]
): T[] {
  const latest = new Map<string, T>();
  for (const calc of calculations) {
    const family = calc.familyRootId === NO_FAMILY_ROOT ? calc.id : calc.familyRootId;
    const held = latest.get(family);
    if (!held || calc.revision > held.revision) latest.set(family, calc);
  }
  return [...latest.values()];
}
