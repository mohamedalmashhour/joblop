// Worker-facing allowance view. Under JobLop's hidden-markup model the worker must see the amount
// THEY receive (employer-funded amount − platform margin), taken from the immutable approval
// snapshot — never the employer-funded amount. When no snapshot exists yet (request not approved),
// the amount is not finalized and is reported as null, so the employer amount (E) is never exposed.

export type AllowanceProfileView =
  | {
      transportProvision?: string | null;
      transportAmountMinor?: number | null;
      transportNote?: string | null;
      mealProvision?: string | null;
      mealAmountMinor?: number | null;
      mealNote?: string | null;
      lodgingProvision?: string | null;
      lodgingAmountMinor?: number | null;
      lodgingNote?: string | null;
    }
  | null
  | undefined;

export type WorkerAllowanceSplitView =
  | {
      transportWorkerMinor: number;
      mealWorkerMinor: number;
      lodgingWorkerMinor: number;
    }
  | null
  | undefined;

export type WorkerAllowanceEntry = {
  provision: string;
  amountMinor: number | null;
  note: string | null;
} | null;

export function workerAllowances(profile: AllowanceProfileView, snapshot?: WorkerAllowanceSplitView) {
  const entry = (
    provision?: string | null,
    note?: string | null,
    workerMinor?: number | null
  ): WorkerAllowanceEntry =>
    provision && provision !== "none"
      ? {
          provision,
          amountMinor: provision === "allowance" ? (workerMinor ?? null) : null,
          note: note ?? null
        }
      : null;
  return {
    transport: entry(profile?.transportProvision, profile?.transportNote, snapshot?.transportWorkerMinor),
    meal: entry(profile?.mealProvision, profile?.mealNote, snapshot?.mealWorkerMinor),
    lodging: entry(profile?.lodgingProvision, profile?.lodgingNote, snapshot?.lodgingWorkerMinor)
  };
}
