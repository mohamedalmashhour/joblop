// Employer-app boundary for the order late-cancellation warning.

export type OrderLateCancellationDto = Readonly<{
  applies: boolean;
  cutoffHours: number;
  chargeHours: number;
  confirmedWorkers: number;
  estimatedSubtotalMinor: number;
  currency: string;
}>;

// Whitelists the late-cancellation warning fields. Never a rate, never Joblop's share.
export function parseOrderLateCancellation(input: unknown): OrderLateCancellationDto | null {
  if (typeof input !== "object" || input === null) return null;
  const r = (input as { lateCancellation?: unknown }).lateCancellation as Record<string, unknown> | undefined;
  if (!r || typeof r !== "object") return null;
  const int = (k: string) => (typeof r[k] === "number" && Number.isInteger(r[k]) ? (r[k] as number) : null);
  const applies = r.applies;
  const values = [int("cutoffHours"), int("chargeHours"), int("confirmedWorkers"), int("estimatedSubtotalMinor")];
  if (typeof applies !== "boolean" || values.some((v) => v === null) || typeof r.currency !== "string") return null;
  const [cutoffHours, chargeHours, confirmedWorkers, estimatedSubtotalMinor] = values as number[];
  return { applies, cutoffHours: cutoffHours!, chargeHours: chargeHours!, confirmedWorkers: confirmedWorkers!, estimatedSubtotalMinor: estimatedSubtotalMinor!, currency: r.currency };
}
