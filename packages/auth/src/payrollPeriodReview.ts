// HR-6.1 Chunk 1 — period-level / calc-time deterministic review flags (READ-ONLY, ADVISORY).
//
// HR-6 could only review a PayrollCalculation that already exists. Some governed failures happen
// BEFORE any calculation is stored (HR-5.1 fails closed): missing approved worked time or an
// effective contract rate, an ambiguous/unsupported jurisdiction, an unsupported provider, or a
// shift that crosses a contract rate boundary. This module answers, deterministically:
//
//     "Why is there no governed payroll calculation yet for this worker in this period?"
//
// It NEVER calculates payroll, invents a missing amount/rate/hour, or touches authoritative state.
// Like the HR-6 review module it holds no Prisma/repository/service — the API passes already-fetched
// read-only facts in, and only a sanitized, bounded advisory context comes out.
export type PayrollPeriodReviewFlagCode =
  | "MISSING_AUTHORITATIVE_INPUT"
  | "AMBIGUOUS_JURISDICTION"
  | "UNSUPPORTED_JURISDICTION"
  | "UNSUPPORTED_PROVIDER"
  | "INTRA_SHIFT_RATE_BOUNDARY"
  | "READY_TO_CALCULATE"
  | "ALREADY_CALCULATED";

export type PayrollPeriodReviewSeverity = "info" | "low" | "medium" | "high";

export type PayrollPeriodReviewFlag = Readonly<{
  code: PayrollPeriodReviewFlagCode;
  severity: PayrollPeriodReviewSeverity;
  detail: string; // system-generated — never user/worker text
  evidenceRef: string; // resolves into the worker's / period's evidence
}>;

export const PAYROLL_PERIOD_REVIEW_MAX_WORKERS = 500;

// ── Raw read-only inputs (the API fetches these; this module never queries) ──
export type RawPeriodReviewWorker = Readonly<{
  workerIdentityId: string;
  existingCalculationId: string | null; // if present, a governed calc already exists (not a failure)
  hasApprovedWorkedTime: boolean;
  approvedWorkedMinutes: number;
  residenceProvinceResolved: boolean; // could a jurisdiction be derived at all?
  residenceProvinceCandidates: readonly string[]; // >1 distinct → ambiguous
  workerJurisdictionSupported: boolean; // provider supports this worker's derived jurisdiction
  hasEffectiveContractRate: boolean; // an EmployerContract rate resolvable for the role at shift time
  intraShiftRateBoundary: boolean; // a shift spans a contract-rate effective boundary (HR-5.1 fail-closed)
}>;

export type RawPeriodReviewInput = Readonly<{
  period: Readonly<{ id: string; organizationId: string; jurisdiction: { country: string; region: string }; provider: { key: string; version: string }; status: string }>;
  providerSupported: boolean; // the period's configured rule provider key+version is available
  jurisdictionSupportedByProvider: boolean; // the period jurisdiction is supported by that provider
  workers: readonly RawPeriodReviewWorker[];
}>;

// ── Sanitized advisory output ──
export type PayrollPeriodReviewWorkerView = Readonly<{
  workerRef: string; // opaque — never a name/SIN/email
  blocked: boolean; // true when a blocking flag prevents a governed calculation
  approvedWorkedMinutes: number;
  flags: readonly PayrollPeriodReviewFlag[];
}>;

export type PayrollPeriodReviewContext = Readonly<{
  periodRef: string;
  organizationRef: string;
  jurisdiction: { country: string; region: string };
  provider: { key: string; version: string };
  status: string;
  periodFlags: readonly PayrollPeriodReviewFlag[]; // period-wide blockers (provider/jurisdiction)
  workers: readonly PayrollPeriodReviewWorkerView[];
  summary: Readonly<{ total: number; blocked: number; readyToCalculate: number; alreadyCalculated: number }>;
  bounds: Readonly<{ workersIncluded: number; workersTotal: number; workersTruncated: boolean }>;
  synthetic: true;
}>;

// Opaque, display-safe worker reference — mirrors HR-6's workerReference.
function workerReference(workerIdentityId: string): string {
  return `worker-${workerIdentityId.slice(0, 8)}`;
}

// Deterministic period-wide flags (provider / jurisdiction support). These block EVERY worker.
export function computePeriodLevelFlags(input: RawPeriodReviewInput): PayrollPeriodReviewFlag[] {
  const flags: PayrollPeriodReviewFlag[] = [];
  if (!input.providerSupported) {
    flags.push({ code: "UNSUPPORTED_PROVIDER", severity: "high", detail: "The period's configured rule provider version is not available.", evidenceRef: "period:provider" });
  }
  if (!input.jurisdictionSupportedByProvider) {
    flags.push({ code: "UNSUPPORTED_JURISDICTION", severity: "high", detail: "The period jurisdiction is not supported by the configured rule provider.", evidenceRef: "period:jurisdiction" });
  }
  return flags;
}

// Deterministic per-worker flags explaining why no governed calculation exists yet.
export function computeWorkerReviewFlags(worker: RawPeriodReviewWorker, periodBlocked: boolean): PayrollPeriodReviewFlag[] {
  if (worker.existingCalculationId) {
    return [{ code: "ALREADY_CALCULATED", severity: "info", detail: "A governed payroll calculation already exists for this worker in this period.", evidenceRef: "worker:calculation" }];
  }
  const flags: PayrollPeriodReviewFlag[] = [];
  if (!worker.hasApprovedWorkedTime || worker.approvedWorkedMinutes <= 0) {
    flags.push({ code: "MISSING_AUTHORITATIVE_INPUT", severity: "medium", detail: "No approved worked time in this period — nothing authoritative to calculate from.", evidenceRef: "worker:workedTime" });
  }
  if (!worker.hasEffectiveContractRate) {
    flags.push({ code: "MISSING_AUTHORITATIVE_INPUT", severity: "high", detail: "No effective contract rate resolves for this worker's role at the shift instant.", evidenceRef: "worker:contractRate" });
  }
  const distinctProvinces = new Set(worker.residenceProvinceCandidates);
  if (!worker.residenceProvinceResolved || distinctProvinces.size > 1) {
    flags.push({ code: "AMBIGUOUS_JURISDICTION", severity: "medium", detail: distinctProvinces.size > 1 ? `Multiple residence provinces (${distinctProvinces.size}) — jurisdiction cannot be derived unambiguously.` : "Residence province could not be resolved — jurisdiction is undetermined.", evidenceRef: "worker:jurisdiction" });
  } else if (!worker.workerJurisdictionSupported) {
    flags.push({ code: "UNSUPPORTED_JURISDICTION", severity: "high", detail: "The worker's derived jurisdiction is not supported by the configured rule provider.", evidenceRef: "worker:jurisdiction" });
  }
  if (worker.intraShiftRateBoundary) {
    flags.push({ code: "INTRA_SHIFT_RATE_BOUNDARY", severity: "high", detail: "A shift spans a contract-rate effective boundary; the governed engine fails closed here.", evidenceRef: "worker:rateBoundary" });
  }
  if (flags.length === 0 && !periodBlocked) {
    flags.push({ code: "READY_TO_CALCULATE", severity: "info", detail: "Authoritative inputs are present; a governed calculation can be requested by a human.", evidenceRef: "worker:workedTime" });
  }
  return flags;
}

function isBlockingCode(code: PayrollPeriodReviewFlagCode): boolean {
  return code === "MISSING_AUTHORITATIVE_INPUT" || code === "AMBIGUOUS_JURISDICTION" || code === "UNSUPPORTED_JURISDICTION" || code === "INTRA_SHIFT_RATE_BOUNDARY";
}

export function assemblePayrollPeriodReviewContext(input: RawPeriodReviewInput): PayrollPeriodReviewContext {
  const periodFlags = computePeriodLevelFlags(input);
  const periodBlocked = periodFlags.length > 0;

  const workersTotal = input.workers.length;
  const workerSlice = input.workers.slice(0, PAYROLL_PERIOD_REVIEW_MAX_WORKERS);
  const workers: PayrollPeriodReviewWorkerView[] = workerSlice.map((w) => {
    const flags = computeWorkerReviewFlags(w, periodBlocked);
    const blocked = periodBlocked || flags.some((f) => isBlockingCode(f.code));
    return { workerRef: workerReference(w.workerIdentityId), blocked, approvedWorkedMinutes: w.approvedWorkedMinutes, flags };
  });

  const summary = {
    total: workers.length,
    blocked: workers.filter((w) => w.blocked).length,
    readyToCalculate: workers.filter((w) => w.flags.some((f) => f.code === "READY_TO_CALCULATE")).length,
    alreadyCalculated: workers.filter((w) => w.flags.some((f) => f.code === "ALREADY_CALCULATED")).length
  };

  return {
    periodRef: input.period.id,
    organizationRef: input.period.organizationId,
    jurisdiction: input.period.jurisdiction,
    provider: input.period.provider,
    status: input.period.status,
    periodFlags,
    workers,
    summary,
    bounds: { workersIncluded: workers.length, workersTotal, workersTruncated: workersTotal > PAYROLL_PERIOD_REVIEW_MAX_WORKERS },
    synthetic: true
  };
}

// Regex guard mirroring HR-6 — the period context must never carry personal data.
export function periodContextHasNoSensitiveFields(context: PayrollPeriodReviewContext): boolean {
  return !/\b(sin|bankaccount|routing|taxid|passport|dob|password|secret|token)\b/i.test(JSON.stringify(context));
}
