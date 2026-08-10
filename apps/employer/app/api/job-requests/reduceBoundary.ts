// Employer-app boundary parser for the Reduce flow. Whitelists exactly the fields
// the selection UI needs — no worker identity, no internal metadata.

export class ReduceDtoError extends Error {
  constructor() {
    super("The reduce response did not match the expected shape.");
    this.name = "ReduceDtoError";
  }
}

export type ReduceEligibleAssignmentDto = Readonly<{
  id: string;
  status: string;
  startAt: string;
  endAt: string;
}>;

export type ReducePreviewDto = Readonly<{
  jobRequestId: string;
  previousTarget: number;
  newTarget: number;
  confirmedWorkers: number;
  unfilledCapacity: number;
  unfilledRemoved: number;
  affectedConfirmed: number;
  requiresConfirmedSelection: boolean;
  eligibleAssignments: readonly ReduceEligibleAssignmentDto[];
  withinCutoff: boolean;
  governedRateMinor: number | null;
  currency: string;
  obligationApplies: boolean;
  obligationAmountMinor: number;
}>;

export type ReduceConfirmationDto = Readonly<{
  reduction: Readonly<{
    id: string;
    status: string;
    previousTarget: number;
    newTarget: number;
    affectedConfirmed: number;
    obligationAmountMinor: number | null;
    obligationCurrency: string | null;
  }>;
  preview: ReducePreviewDto;
}>;

export function parseReducePreview(input: unknown): ReducePreviewDto {
  const r = asRecord(input);
  return {
    jobRequestId: reqString(r, "jobRequestId"),
    previousTarget: reqInt(r, "previousTarget"),
    newTarget: reqInt(r, "newTarget"),
    confirmedWorkers: reqInt(r, "confirmedWorkers"),
    unfilledCapacity: reqInt(r, "unfilledCapacity"),
    unfilledRemoved: reqInt(r, "unfilledRemoved"),
    affectedConfirmed: reqInt(r, "affectedConfirmed"),
    requiresConfirmedSelection: reqBool(r, "requiresConfirmedSelection"),
    eligibleAssignments: Array.isArray(r.eligibleAssignments)
      ? r.eligibleAssignments.map((raw) => {
          const a = asRecord(raw);
          return { id: reqString(a, "id"), status: reqString(a, "status"), startAt: reqString(a, "startAt"), endAt: reqString(a, "endAt") };
        })
      : [],
    withinCutoff: reqBool(r, "withinCutoff"),
    governedRateMinor: r.governedRateMinor === null || r.governedRateMinor === undefined ? null : reqInt(r, "governedRateMinor"),
    currency: reqString(r, "currency"),
    obligationApplies: reqBool(r, "obligationApplies"),
    obligationAmountMinor: reqInt(r, "obligationAmountMinor")
  };
}

export function parseReduceConfirmation(input: unknown): ReduceConfirmationDto {
  const r = asRecord(input);
  const red = asRecord(r.reduction);
  return {
    reduction: {
      id: reqString(red, "id"),
      status: reqString(red, "status"),
      previousTarget: reqInt(red, "previousTarget"),
      newTarget: reqInt(red, "newTarget"),
      affectedConfirmed: reqInt(red, "affectedConfirmed"),
      obligationAmountMinor:
        red.obligationAmountMinor === null || red.obligationAmountMinor === undefined ? null : reqInt(red, "obligationAmountMinor"),
      obligationCurrency:
        red.obligationCurrency === null || red.obligationCurrency === undefined ? null : reqString(red, "obligationCurrency")
    },
    preview: parseReducePreview(r.preview)
  };
}

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw new ReduceDtoError();
  return input as Record<string, unknown>;
}
function reqString(r: Record<string, unknown>, k: string) {
  const v = r[k];
  if (typeof v !== "string" || !v) throw new ReduceDtoError();
  return v;
}
function reqInt(r: Record<string, unknown>, k: string) {
  const v = r[k];
  if (typeof v !== "number" || !Number.isInteger(v)) throw new ReduceDtoError();
  return v;
}
function reqBool(r: Record<string, unknown>, k: string) {
  const v = r[k];
  if (typeof v !== "boolean") throw new ReduceDtoError();
  return v;
}
