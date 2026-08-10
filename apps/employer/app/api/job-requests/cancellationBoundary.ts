// Employer-app boundary parser for the cancellation flow. Whitelists exactly the
// fields the employer UI needs; drops any internal platform metadata.

export class CancellationDtoError extends Error {
  constructor() {
    super("The cancellation response did not match the expected shape.");
    this.name = "CancellationDtoError";
  }
}

export type CancellationPreviewDto = Readonly<{
  jobRequestId: string;
  shiftStartAt: string;
  cause: string;
  hoursBeforeStart: number;
  withinCutoff: boolean;
  affectedConfirmedWorkers: number;
  governedRateMinor: number | null;
  currency: string;
  minimumShiftHours: number;
  cutoffHours: number;
  obligationApplies: boolean;
  obligationAmountMinor: number;
  requiresPlatformHandoff: boolean;
}>;

export type CancellationConfirmationDto = Readonly<{
  cancellation: Readonly<{
    id: string;
    status: string;
    cause: string;
    affectedConfirmedWorkers: number;
    obligationAmountMinor: number | null;
    obligationCurrency: string | null;
  }>;
  preview: CancellationPreviewDto;
}>;

export function parseCancellationPreview(input: unknown): CancellationPreviewDto {
  const r = asRecord(input);
  return {
    jobRequestId: reqString(r, "jobRequestId"),
    shiftStartAt: reqString(r, "shiftStartAt"),
    cause: reqString(r, "cause"),
    hoursBeforeStart: reqNumber(r, "hoursBeforeStart"),
    withinCutoff: reqBool(r, "withinCutoff"),
    affectedConfirmedWorkers: reqInt(r, "affectedConfirmedWorkers"),
    governedRateMinor: nullableInt(r, "governedRateMinor"),
    currency: reqString(r, "currency"),
    minimumShiftHours: reqInt(r, "minimumShiftHours"),
    cutoffHours: reqInt(r, "cutoffHours"),
    obligationApplies: reqBool(r, "obligationApplies"),
    obligationAmountMinor: reqInt(r, "obligationAmountMinor"),
    requiresPlatformHandoff: reqBool(r, "requiresPlatformHandoff")
  };
}

export function parseCancellationConfirmation(input: unknown): CancellationConfirmationDto {
  const r = asRecord(input);
  const c = asRecord(r.cancellation);
  const obligation = c.obligation === null || c.obligation === undefined ? null : asRecord(c.obligation);
  return {
    cancellation: {
      id: reqString(c, "id"),
      status: reqString(c, "status"),
      cause: reqString(c, "cause"),
      affectedConfirmedWorkers: reqInt(c, "affectedConfirmedWorkers"),
      obligationAmountMinor: obligation ? reqInt(obligation, "amountMinor") : null,
      obligationCurrency: obligation ? reqString(obligation, "currency") : null
    },
    preview: parseCancellationPreview(r.preview)
  };
}

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw new CancellationDtoError();
  return input as Record<string, unknown>;
}
function reqString(r: Record<string, unknown>, k: string) {
  const v = r[k];
  if (typeof v !== "string" || !v) throw new CancellationDtoError();
  return v;
}
function reqNumber(r: Record<string, unknown>, k: string) {
  const v = r[k];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new CancellationDtoError();
  return v;
}
function reqInt(r: Record<string, unknown>, k: string) {
  const v = reqNumber(r, k);
  if (!Number.isInteger(v)) throw new CancellationDtoError();
  return v;
}
function nullableInt(r: Record<string, unknown>, k: string) {
  if (r[k] === null || r[k] === undefined) return null;
  return reqInt(r, k);
}
function reqBool(r: Record<string, unknown>, k: string) {
  const v = r[k];
  if (typeof v !== "boolean") throw new CancellationDtoError();
  return v;
}
