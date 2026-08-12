// HR-6 Chunk 1 — AI payroll-review TRUST MODEL + sanitized read-only context + deterministic flags.
//
// Trust model (one direction only):
//   AUTHORITATIVE PAYROLL DATA (HR-5.1, frozen)
//     -> deterministic governed payroll artifact (calculation + its immutable snapshot)
//     -> SANITIZED AI review context (this module — read-only, minimized, bounded)
//     -> advisory findings (a FUTURE provider; NOT in this chunk)
//     -> HUMAN review + human-only HR-5.1 actions
//
// There is NO reverse path. This module receives only already-fetched, read-only data structures.
// It holds no Prisma client, no payroll repository, no correction/transition/approve/lock/money
// service — it is structurally incapable of mutating payroll or moving money. It also makes NO
// external model call and persists nothing. Everything here is deterministic and server-side; a
// future AI provider will only EXPLAIN these deterministic facts, never derive or mutate them.

// ── Deterministic review flags (authoritative signals; AI later explains them) ──
// These are REVIEW FLAGS ONLY — they never assert fraud, crime, or dishonesty.

export type PayrollReviewFlagCode =
  | "REPLAY_MISMATCH"
  | "POST_LOCK_ADJUSTMENT"
  | "MULTIPLE_RATE_SEGMENTS"
  | "RATE_CHANGED_FROM_PRIOR_REVISION"
  | "LARGE_REVISION_DELTA"
  | "CORRECTION_REVISION"
  | "HIGH_HOURS_REVIEW";

export type PayrollReviewSeverity = "info" | "low" | "medium" | "high";

export type PayrollReviewFlag = Readonly<{
  code: PayrollReviewFlagCode;
  severity: PayrollReviewSeverity;
  detail: string; // deterministic, system-generated (never user text)
  evidenceRef: string; // points only into context.evidence
}>;

// Configurable, deterministic, test-safe thresholds. NOT statutory/legal thresholds.
export type PayrollReviewThresholds = Readonly<{ largeRevisionDeltaBps: number; highPayableMinutes: number }>;
export const DEFAULT_PAYROLL_REVIEW_THRESHOLDS: PayrollReviewThresholds = { largeRevisionDeltaBps: 2000 /* 20% */, highPayableMinutes: 3600 /* 60h */ };

// ── Evidence refs — every flag/finding must reference only supplied context data ──
export type PayrollReviewEvidence = Readonly<{ kind: string; ref: string }>;

// ── Sanitized, minimized, bounded review context ──
// EXCLUDED by construction (never present): SIN, bank/routing, tax ids, home address, phone, personal
// email, DOB, identity/immigration docs, passwords/secrets/tokens, unrelated HR records.
export type PayrollReviewContext = Readonly<{
  calculationId: string;
  organizationRef: string; // internal org id (not personal data)
  workerRef: string; // OPAQUE display-safe reference — not a name/SIN/email
  period: { start: string; end: string; timezone: string };
  jurisdiction: { country: string; region: string };
  status: string;
  currency: string;
  gross: number;
  deductions: number;
  net: number;
  employerCost: number; // admin-authorized context only
  earningLines: readonly { classification: string; amountMinor: number; contractVersion: string | null }[];
  deductionLines: readonly { category: string; code: string; amountMinor: number }[];
  workedTime: readonly { ref: string; payableMinutes: number; contractVersion: string; appliedHourlyRateMinor: number; scheduledStartAt: string }[];
  provider: { key: string; version: string };
  fingerprint: string;
  revision: number;
  lineage: Readonly<{ previousCalculationId: string | null; correctionType: string | null; adjustsCalculationId: string | null; adjustment: { netDirection: string; netDeltaMinor: number } | null }>;
  verification: { ok: boolean; totalsMatch: boolean };
  priorRevision: { revision: number; gross: number; net: number } | null;
  // User-controlled text is carried in a DEDICATED, clearly-labelled slot so a future provider can
  // keep instruction/data separation. It is DATA, never an instruction. Never concatenated into a
  // prompt as an instruction.
  untrustedText: Readonly<{ correctionReason: string | null }>;
  flags: readonly PayrollReviewFlag[];
  evidence: Readonly<Record<string, PayrollReviewEvidence>>;
  bounds: Readonly<{ workedTimeIncluded: number; workedTimeTotal: number; workedTimeTruncated: boolean; revisionsIncluded: number; revisionsTotal: number; revisionsTruncated: boolean }>;
  synthetic: true;
}>;

// Bounds — context construction is bounded; nothing is silently omitted.
export const PAYROLL_REVIEW_MAX_WORKED_TIME = 100;
export const PAYROLL_REVIEW_MAX_REVISIONS = 50;

// ── Raw (already-fetched, read-only) inputs handed to the assembler ──
// The API layer fetches these with a Prisma READ (after auth + tenant scope) and passes them in.
// This module never touches Prisma.
export type RawReviewCalculation = Readonly<{
  id: string; organizationId: string; workerIdentityId: string; revision: number; status: string;
  jurisdiction: { country: string; region: string }; currency: string;
  grossPayMinor: number; totalDeductionsMinor: number; netPayMinor: number; totalEmployerCostMinor: number;
  ruleProvider: { key: string; version: string }; calculationFingerprint: string;
  previousCalculationId: string | null; correctionType: string | null; correctionReason: string | null;
  adjustsCalculationId: string | null; adjustment: { netDirection: string; netDeltaMinor: number } | null;
  earningLines: readonly { classification: string; amountMinor: number; contractVersion: string | null }[];
  deductionLines: readonly { category: string; code: string; amountMinor: number }[];
  workedTimeRefs: readonly { timesheetId: string; payableMinutes: number; contractVersion: string; appliedHourlyRateMinor: number; scheduledStartAt: string }[];
}>;
export type RawReviewPeriod = Readonly<{ periodStart: string; periodEnd: string; timezone: string }>;
export type RawReviewFamilyMember = Readonly<{ id: string; revision: number; grossPayMinor: number; netPayMinor: number; status: string }>;
export type RawReviewVerification = Readonly<{ ok: boolean; totalsMatch: boolean }>;

export type AssembleReviewInput = Readonly<{
  calculation: RawReviewCalculation;
  period: RawReviewPeriod;
  family: readonly RawReviewFamilyMember[];
  verification: RawReviewVerification;
  thresholds?: PayrollReviewThresholds;
}>;

// Opaque, display-safe worker reference — never a name/SIN/email. The underlying WorkerIdentity id
// is itself an internal opaque UUID; we surface only a short prefix so nothing linkable-to-a-person
// travels further.
function workerReference(workerIdentityId: string): string {
  return `worker-${workerIdentityId.slice(0, 8)}`;
}

// Deterministic review flags computed from the sanitized facts. Pure; stable for identical input.
// NOTE: MISSING_AUTHORITATIVE_INPUT / AMBIGUOUS_JURISDICTION / UNSUPPORTED_JURISDICTION /
// UNSUPPORTED_PROVIDER / INTRA_SHIFT_RATE_BOUNDARY are *calculation-time* failures — they never
// produce a stored calculation, so they cannot apply to an existing calculation's review. They
// belong to a future period/bulk-review surface, not to this per-calculation context.
export function computePayrollReviewFlags(input: {
  workedTime: PayrollReviewContext["workedTime"];
  netPayMinor: number;
  correctionType: string | null;
  verification: RawReviewVerification;
  priorRevision: PayrollReviewContext["priorRevision"];
  thresholds: PayrollReviewThresholds;
}): PayrollReviewFlag[] {
  const flags: PayrollReviewFlag[] = [];
  if (!input.verification.ok || !input.verification.totalsMatch) {
    flags.push({ code: "REPLAY_MISMATCH", severity: "high", detail: "Deterministic replay did not reproduce the stored calculation.", evidenceRef: "verification" });
  }
  if (input.correctionType === "post_lock_adjustment") {
    flags.push({ code: "POST_LOCK_ADJUSTMENT", severity: "medium", detail: "This is a post-lock adjustment linked to a locked original.", evidenceRef: "lineage" });
  } else if (input.correctionType === "pre_lock_revision") {
    flags.push({ code: "CORRECTION_REVISION", severity: "low", detail: "This revision is a governed pre-lock correction of a prior revision.", evidenceRef: "lineage" });
  }
  const contractVersions = new Set(input.workedTime.map((w) => w.contractVersion));
  if (contractVersions.size > 1) {
    flags.push({ code: "MULTIPLE_RATE_SEGMENTS", severity: "medium", detail: `Earnings span ${contractVersions.size} contract-rate segments.`, evidenceRef: "workedTime" });
  }
  if (input.priorRevision) {
    const prior = input.priorRevision.net;
    if (prior > 0) {
      const deltaBps = Math.round((Math.abs(input.netPayMinor - prior) * 10000) / prior);
      if (deltaBps >= input.thresholds.largeRevisionDeltaBps) {
        flags.push({ code: "LARGE_REVISION_DELTA", severity: "medium", detail: `Net pay changed ${(deltaBps / 100).toFixed(1)}% from the prior revision.`, evidenceRef: "priorRevision" });
      }
    }
  }
  const totalMinutes = input.workedTime.reduce((sum, w) => sum + w.payableMinutes, 0);
  if (totalMinutes >= input.thresholds.highPayableMinutes) {
    flags.push({ code: "HIGH_HOURS_REVIEW", severity: "low", detail: `Total payable time (${totalMinutes} min) is at or above the review threshold.`, evidenceRef: "hours" });
  }
  return flags;
}

// Assemble the sanitized, minimized, bounded context + deterministic flags. Pure and deterministic.
export function assemblePayrollReviewContext(input: AssembleReviewInput): PayrollReviewContext {
  const c = input.calculation;
  const thresholds = input.thresholds ?? DEFAULT_PAYROLL_REVIEW_THRESHOLDS;

  const workedTimeTotal = c.workedTimeRefs.length;
  const workedTimeSlice = c.workedTimeRefs.slice(0, PAYROLL_REVIEW_MAX_WORKED_TIME);
  const workedTime = workedTimeSlice.map((w) => ({ ref: `ts-${w.timesheetId.slice(0, 8)}`, payableMinutes: w.payableMinutes, contractVersion: w.contractVersion, appliedHourlyRateMinor: w.appliedHourlyRateMinor, scheduledStartAt: w.scheduledStartAt }));

  // prior revision = the highest revision below this one within the family (deterministic).
  const revisionsTotal = input.family.length;
  const priorMembers = input.family.filter((m) => m.revision < c.revision).sort((a, b) => b.revision - a.revision);
  const priorRevision = priorMembers[0] ? { revision: priorMembers[0].revision, gross: priorMembers[0].grossPayMinor, net: priorMembers[0].netPayMinor } : null;

  const flags = computePayrollReviewFlags({ workedTime, netPayMinor: c.netPayMinor, correctionType: c.correctionType, verification: input.verification, priorRevision, thresholds });

  // Evidence map — the ONLY refs a future finding may cite.
  const evidence: Record<string, PayrollReviewEvidence> = {
    fingerprint: { kind: "fingerprint", ref: c.calculationFingerprint },
    verification: { kind: "verification", ref: `${input.verification.ok}/${input.verification.totalsMatch}` },
    gross: { kind: "total", ref: "gross" },
    deductions: { kind: "total", ref: "deductions" },
    net: { kind: "total", ref: "net" },
    employerCost: { kind: "total", ref: "employerCost" },
    lineage: { kind: "lineage", ref: c.correctionType ?? "none" },
    hours: { kind: "hours", ref: String(workedTime.reduce((s, w) => s + w.payableMinutes, 0)) },
    provider: { kind: "provider", ref: `${c.ruleProvider.key}@${c.ruleProvider.version}` }
  };
  if (priorRevision) evidence.priorRevision = { kind: "revision", ref: `rev-${priorRevision.revision}` };
  for (const w of workedTime) evidence[`workedTime:${w.ref}`] = { kind: "worked_time", ref: w.ref };
  for (const e of c.earningLines) evidence[`earning:${e.classification}`] = { kind: "earning_line", ref: e.classification };
  for (const d of c.deductionLines) evidence[`deduction:${d.code}`] = { kind: "deduction_line", ref: d.code };

  return {
    calculationId: c.id,
    organizationRef: c.organizationId,
    workerRef: workerReference(c.workerIdentityId),
    period: { start: input.period.periodStart, end: input.period.periodEnd, timezone: input.period.timezone },
    jurisdiction: c.jurisdiction,
    status: c.status,
    currency: c.currency,
    gross: c.grossPayMinor,
    deductions: c.totalDeductionsMinor,
    net: c.netPayMinor,
    employerCost: c.totalEmployerCostMinor,
    earningLines: c.earningLines.map((e) => ({ classification: e.classification, amountMinor: e.amountMinor, contractVersion: e.contractVersion })),
    deductionLines: c.deductionLines.map((d) => ({ category: d.category, code: d.code, amountMinor: d.amountMinor })),
    workedTime,
    provider: c.ruleProvider,
    fingerprint: c.calculationFingerprint,
    revision: c.revision,
    lineage: { previousCalculationId: c.previousCalculationId, correctionType: c.correctionType, adjustsCalculationId: c.adjustsCalculationId, adjustment: c.adjustment },
    verification: input.verification,
    priorRevision,
    untrustedText: { correctionReason: c.correctionReason },
    flags,
    evidence,
    bounds: {
      workedTimeIncluded: workedTime.length, workedTimeTotal, workedTimeTruncated: workedTimeTotal > workedTime.length,
      revisionsIncluded: Math.min(revisionsTotal, PAYROLL_REVIEW_MAX_REVISIONS), revisionsTotal, revisionsTruncated: revisionsTotal > PAYROLL_REVIEW_MAX_REVISIONS
    },
    synthetic: true
  };
}

// Guard used by tests + a future provider layer: confirm a context carries no obviously-sensitive
// keys. Advisory only; the real protection is that such fields are never assembled in the first place.
export function contextHasNoSensitiveFields(context: PayrollReviewContext): boolean {
  const json = JSON.stringify(context).toLowerCase();
  return !/"sin"|"bankaccount"|"routing"|"taxid"|"passport"|"dateofbirth"|"\bdob\b"|"password"|"secret"|"token"/.test(json);
}
