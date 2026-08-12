// HR-6.1 Chunk 2 — deterministic provenance / explainability (READ-ONLY, DESCRIPTIVE).
//
// Explains WHY an existing governed payroll result is what it is, using ONLY the immutable
// artifacts HR-5.1 already froze: worked-time snapshots, the applied contract id/version/
// effectiveFrom/rate, worksite-derived jurisdiction, provider key/version, the calculation
// fingerprint, and revision/correction lineage. It recomputes nothing, invents no value, infers
// no rate or jurisdiction, persists nothing, and calls no model. Every explanation item carries an
// evidenceRef that MUST resolve into the supplied immutable evidence; when required evidence is
// missing or contradictory it fails CLOSED (`missing_provenance` / `explanation_unavailable`) rather
// than guessing. Explainability is DESCRIPTIVE ONLY and never authoritative.
//
// Like the sibling HR-6 modules it holds no Prisma/repository/service — the API passes already-
// fetched immutable data in, and only a sanitized, bounded provenance model comes out.
import type { PayrollReviewFlag } from "./payrollReview";

export const PAYROLL_PROVENANCE_CONTRACT_VERSION = "hr6.1.prov.1";
export const PAYROLL_PROVENANCE_MAX_WORKED_TIME = 100;
export const PAYROLL_PROVENANCE_MAX_SEGMENTS = 50;
export const PAYROLL_PROVENANCE_MAX_EARNING_LINES = 100;

export type PayrollProvenanceEvidence = Readonly<{ kind: string; ref: string }>;

export type PayrollProvenanceItem = Readonly<{
  category: "identity" | "provider" | "jurisdiction" | "worked_time" | "rate_segment" | "earning_line" | "lineage" | "verification";
  statement: string; // system-generated description of stored evidence — never user/worker text
  evidenceRef: string; // resolves into `evidence`
  outcome: "explained" | "missing_provenance";
}>;

// ── Raw immutable inputs (the API fetches these from the frozen calculation; this module reads) ──
export type RawProvenanceWorkedTime = Readonly<{
  timesheetId: string;
  payableMinutes: number;
  contractId: string | null;
  contractVersion: string | null;
  contractEffectiveFrom: string | null;
  appliedHourlyRateMinor: number | null;
  scheduledStartAt: string;
}>;
export type RawProvenanceEarningLine = Readonly<{ classification: string; amountMinor: number }>;
export type RawProvenanceCalculation = Readonly<{
  id: string;
  organizationId: string;
  workerIdentityId: string;
  revision: number;
  status: string;
  jurisdiction: { country: string; region: string };
  currency: string;
  calculationFingerprint: string;
  ruleProvider: { key: string; version: string };
  previousCalculationId: string | null;
  correctionType: string | null;
  correctionReason: string | null; // UNTRUSTED raw user text — accepted in input but NEVER surfaced in output
  adjustsCalculationId: string | null;
  workedTimeRefs: readonly RawProvenanceWorkedTime[];
  earningLines: readonly RawProvenanceEarningLine[];
}>;
export type RawProvenanceRevision = Readonly<{ id: string; revision: number; status: string }>;
export type RawProvenanceVerification = Readonly<{ ok: boolean; totalsMatch: boolean }>;
export type AssembleProvenanceInput = Readonly<{
  calculation: RawProvenanceCalculation;
  period: Readonly<{ periodStart: string; periodEnd: string; timezone: string }>;
  revisions: readonly RawProvenanceRevision[];
  verification: RawProvenanceVerification | null;
  flags: readonly PayrollReviewFlag[];
}>;

// ── Sanitized provenance model ──
export type PayrollProvenance = Readonly<{
  status: "ready" | "explanation_unavailable";
  calculationId: string;
  revision: number;
  fingerprint: string;
  provider: { key: string; version: string };
  workerRef: string; // opaque — never a name/SIN/email
  organizationRef: string;
  period: { start: string; end: string; timezone: string };
  jurisdiction: { country: string; region: string; source: string };
  workedTime: readonly Readonly<{ ref: string; payableMinutes: number; contractRef: string | null; contractVersion: string | null; contractEffectiveFrom: string | null; appliedHourlyRateMinor: number | null; evidenceRef: string }>[];
  rateSegments: readonly Readonly<{ contractRef: string; contractVersion: string; contractEffectiveFrom: string; payableMinutes: number; appliedHourlyRateMinor: number; evidenceRef: string }>[];
  earningLines: readonly Readonly<{ classification: string; amountMinor: number; evidenceRef: string }>[];
  lineage: Readonly<{ previousCalculationId: string | null; correctionType: string | null; adjustsCalculationId: string | null; revisions: readonly Readonly<{ revision: number; status: string }>[] }>;
  verification: RawProvenanceVerification | null;
  flags: readonly PayrollReviewFlag[];
  items: readonly PayrollProvenanceItem[];
  evidence: Readonly<Record<string, PayrollProvenanceEvidence>>;
  bounds: Readonly<{ workedTimeIncluded: number; workedTimeTotal: number; workedTimeTruncated: boolean; segmentsIncluded: number; earningLinesIncluded: number; earningLinesTotal: number; earningLinesTruncated: boolean }>;
  contractVersion: string; // provenance model contract version (not a payroll contract)
  synthetic: true;
}>;

function workerReference(workerIdentityId: string): string {
  return `worker-${workerIdentityId.slice(0, 8)}`;
}
function contractReference(contractId: string | null): string | null {
  return contractId ? `contract-${contractId.slice(0, 8)}` : null;
}

export function assemblePayrollProvenance(input: AssembleProvenanceInput): PayrollProvenance {
  const c = input.calculation;
  const items: PayrollProvenanceItem[] = [];
  const evidence: Record<string, PayrollProvenanceEvidence> = {};

  // Identity + fingerprint are the minimum required evidence; without them we cannot explain.
  const identityMissing = !c.id || !c.calculationFingerprint;
  evidence.identity = { kind: "identity", ref: c.id || "unknown" };
  evidence.fingerprint = { kind: "fingerprint", ref: c.calculationFingerprint || "unknown" };
  evidence.provider = { kind: "provider", ref: `${c.ruleProvider.key}@${c.ruleProvider.version}` };
  evidence.jurisdiction = { kind: "jurisdiction", ref: `${c.jurisdiction.country}/${c.jurisdiction.region}` };
  evidence.period = { kind: "period", ref: `${input.period.periodStart}..${input.period.periodEnd}` };
  evidence.lineage = { kind: "lineage", ref: c.correctionType ?? "root" };
  if (input.verification) evidence.verification = { kind: "verification", ref: input.verification.ok ? "ok" : "mismatch" };

  items.push({ category: "identity", statement: `Calculation ${c.id} revision ${c.revision} (status ${c.status}).`, evidenceRef: "identity", outcome: identityMissing ? "missing_provenance" : "explained" });
  items.push({ category: "provider", statement: `Evaluated by rule provider ${c.ruleProvider.key} version ${c.ruleProvider.version}.`, evidenceRef: "provider", outcome: "explained" });
  items.push({ category: "jurisdiction", statement: `Jurisdiction ${c.jurisdiction.country}/${c.jurisdiction.region} was derived from the authoritative worksite (Residence), not caller input.`, evidenceRef: "jurisdiction", outcome: "explained" });

  // Worked-time provenance (bounded).
  const wtTotal = c.workedTimeRefs.length;
  const wtSlice = c.workedTimeRefs.slice(0, PAYROLL_PROVENANCE_MAX_WORKED_TIME);
  const workedTime = wtSlice.map((w) => {
    const ref = `ts-${w.timesheetId.slice(0, 8)}`;
    const key = `workedTime:${ref}`;
    evidence[key] = { kind: "worked_time", ref };
    const hasProv = w.contractId != null && w.contractVersion != null && w.contractEffectiveFrom != null && w.appliedHourlyRateMinor != null;
    items.push({
      category: "worked_time",
      statement: hasProv
        ? `Approved shift ${ref} (${w.payableMinutes} payable min) was governed by contract version ${w.contractVersion} effective ${w.contractEffectiveFrom}, applied rate ${w.appliedHourlyRateMinor} minor/h.`
        : `Approved shift ${ref} (${w.payableMinutes} payable min) has no committed rate provenance in the stored evidence.`,
      evidenceRef: key,
      outcome: hasProv ? "explained" : "missing_provenance"
    });
    return { ref, payableMinutes: w.payableMinutes, contractRef: contractReference(w.contractId), contractVersion: w.contractVersion, contractEffectiveFrom: w.contractEffectiveFrom, appliedHourlyRateMinor: w.appliedHourlyRateMinor, evidenceRef: key };
  });

  // Rate-segment provenance: group fully-provenanced worked time by committed contract version.
  const bySeg = new Map<string, { contractId: string; contractVersion: string; contractEffectiveFrom: string; appliedHourlyRateMinor: number; payableMinutes: number }>();
  for (const w of wtSlice) {
    if (w.contractId == null || w.contractVersion == null || w.contractEffectiveFrom == null || w.appliedHourlyRateMinor == null) continue;
    const seg = bySeg.get(w.contractId) ?? { contractId: w.contractId, contractVersion: w.contractVersion, contractEffectiveFrom: w.contractEffectiveFrom, appliedHourlyRateMinor: w.appliedHourlyRateMinor, payableMinutes: 0 };
    seg.payableMinutes += w.payableMinutes;
    bySeg.set(w.contractId, seg);
  }
  const rateSegments = [...bySeg.values()]
    .sort((a, b) => a.contractEffectiveFrom.localeCompare(b.contractEffectiveFrom))
    .slice(0, PAYROLL_PROVENANCE_MAX_SEGMENTS)
    .map((seg) => {
      const key = `segment:${seg.contractVersion}`;
      evidence[key] = { kind: "rate_segment", ref: seg.contractVersion };
      items.push({ category: "rate_segment", statement: `Segment on contract version ${seg.contractVersion} (effective ${seg.contractEffectiveFrom}): ${seg.payableMinutes} payable min at ${seg.appliedHourlyRateMinor} minor/h.`, evidenceRef: key, outcome: "explained" });
      return { contractRef: contractReference(seg.contractId)!, contractVersion: seg.contractVersion, contractEffectiveFrom: seg.contractEffectiveFrom, payableMinutes: seg.payableMinutes, appliedHourlyRateMinor: seg.appliedHourlyRateMinor, evidenceRef: key };
    });

  // Earning-line provenance (bounded).
  const elTotal = c.earningLines.length;
  const earningLines = c.earningLines.slice(0, PAYROLL_PROVENANCE_MAX_EARNING_LINES).map((e) => {
    const key = `earning:${e.classification}`;
    evidence[key] = { kind: "earning_line", ref: e.classification };
    items.push({ category: "earning_line", statement: `Earning line ${e.classification}: ${e.amountMinor} minor (${c.currency}).`, evidenceRef: key, outcome: "explained" });
    return { classification: e.classification, amountMinor: e.amountMinor, evidenceRef: key };
  });

  // Lineage.
  items.push({ category: "lineage", statement: c.correctionType ? `This revision is a ${c.correctionType}${c.previousCalculationId ? ` of ${c.previousCalculationId}` : ""}.` : "This is a root revision (no correction lineage).", evidenceRef: "lineage", outcome: "explained" });
  if (input.verification) {
    items.push({ category: "verification", statement: input.verification.ok && input.verification.totalsMatch ? "Deterministic replay reproduced the stored calculation (fingerprint + totals matched)." : "Deterministic replay did NOT reproduce the stored calculation.", evidenceRef: "verification", outcome: "explained" });
  }

  return {
    status: identityMissing ? "explanation_unavailable" : "ready",
    calculationId: c.id,
    revision: c.revision,
    fingerprint: c.calculationFingerprint,
    provider: c.ruleProvider,
    workerRef: workerReference(c.workerIdentityId),
    organizationRef: c.organizationId,
    period: { start: input.period.periodStart, end: input.period.periodEnd, timezone: input.period.timezone },
    jurisdiction: { country: c.jurisdiction.country, region: c.jurisdiction.region, source: "worksite_residence" },
    workedTime,
    rateSegments,
    earningLines,
    lineage: { previousCalculationId: c.previousCalculationId, correctionType: c.correctionType, adjustsCalculationId: c.adjustsCalculationId, revisions: [...input.revisions].sort((a, b) => a.revision - b.revision).map((r) => ({ revision: r.revision, status: r.status })) },
    verification: input.verification,
    flags: input.flags,
    items,
    evidence,
    // Note: the raw correctionReason (untrusted user text) is intentionally NOT surfaced — provenance
    // exposes only structured immutable evidence, never raw user text.
    bounds: { workedTimeIncluded: workedTime.length, workedTimeTotal: wtTotal, workedTimeTruncated: wtTotal > PAYROLL_PROVENANCE_MAX_WORKED_TIME, segmentsIncluded: rateSegments.length, earningLinesIncluded: earningLines.length, earningLinesTotal: elTotal, earningLinesTruncated: elTotal > PAYROLL_PROVENANCE_MAX_EARNING_LINES },
    contractVersion: PAYROLL_PROVENANCE_CONTRACT_VERSION,
    synthetic: true
  };
}

// Every provenance item's evidenceRef must resolve into the evidence map (evidence-binding guard).
export function provenanceItemsAreEvidenceBound(p: PayrollProvenance): boolean {
  return p.items.every((it) => Object.prototype.hasOwnProperty.call(p.evidence, it.evidenceRef));
}

// Regex guard mirroring HR-6 — the provenance model must never carry personal data.
export function provenanceHasNoSensitiveFields(p: PayrollProvenance): boolean {
  return !/\b(sin|bankaccount|routing|taxid|passport|dob|password|secret|token)\b/i.test(JSON.stringify(p));
}
