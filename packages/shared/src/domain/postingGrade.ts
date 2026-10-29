// Embedded job grading — composition (ACR-0005). Chains the Phase 1 scorer → Phase 2 band → Phase 3
// engagement premium into ONE advisory posting grade, and emits a deterministic, gender-neutral
// PAY-EQUITY AUDIT TRAIL explaining exactly why a tier was assigned (Québec Loi sur l'équité salariale
// defensibility). PURE, deterministic, advisory ONLY — no persistence, no route, no money.

import {
  COMPENSABLE_FACTORS,
  DEFAULT_FACTOR_WEIGHTS,
  FAMILY_TIER_CEILING,
  gradeRole,
  type CompensableFactor,
  type FactorDegrees,
  type GradeOptions,
  type RoleFamily
} from "./jobGrading";
import { deriveTierBand, isTierBand, type TierBand, type TierBandOptions } from "./tierBand";
import { applyEngagementPremium, type EngagementType } from "./engagementPremium";

export type PayEquityAudit = Readonly<{
  methodology: "point-factor-deterministic";
  /** The four factors are gender-neutral, balancing operational/physical/mental demands uniformly. */
  genderNeutral: true;
  family: RoleFamily;
  tierCeiling: number;
  assignedTier: number;
  rawScore: number;
  normalized: number;
  /** Per-factor explanation: the degree the employer selected, its weight, and the resulting points. */
  factors: ReadonlyArray<Readonly<{ factor: CompensableFactor; degree: number; weight: number; points: number }>>;
  /** Phase 2 base tier multiplier (before any engagement premium). */
  bandMultiplier: number;
  engagement: EngagementType;
  premiumPpm: number;
  note: string;
}>;

export type PostingGrade = Readonly<{
  status: "graded";
  family: RoleFamily;
  tier: number;
  factorScores: Readonly<Record<CompensableFactor, number>>;
  confidence: number;
  needsHumanReview: boolean;
  /** Advisory compensation band AFTER the engagement premium. */
  band: TierBand;
  engagement: EngagementType;
  premiumPpm: number;
  audit: PayEquityAudit;
}>;

export type PostingGradeResult = PostingGrade | Readonly<{ status: "invalid"; reason: string }>;

export type GradePostingInput = Readonly<{
  family: RoleFamily;
  degrees: FactorDegrees; // structured wizard input
  marketMedianMinor: number; // market-wage anchor
  currency: string;
  engagement: EngagementType;
}>;

export type GradePostingOptions = Readonly<{
  grade?: GradeOptions;
  tierBand?: TierBandOptions;
  premiumPpm?: number;
}>;

/**
 * Compose an advisory posting grade. Fail-closed: any invalid stage propagates `{ status: "invalid" }`.
 * Deterministic end to end, so the audit trail is reproducible.
 */
export function gradePosting(input: GradePostingInput, options: GradePostingOptions = {}): PostingGradeResult {
  const grade = gradeRole(input.family, input.degrees, options.grade);
  if (grade.status !== "graded") return { status: "invalid", reason: grade.reason };

  const baseBand = deriveTierBand(
    { family: input.family, tier: grade.tier, marketMedianMinor: input.marketMedianMinor, currency: input.currency },
    options.tierBand
  );
  if (!isTierBand(baseBand)) return { status: "invalid", reason: baseBand.reason };

  const withPremium = applyEngagementPremium(baseBand, input.engagement, options.premiumPpm);
  if (!("band" in withPremium)) return { status: "invalid", reason: withPremium.reason };

  const weights = options.grade?.weights ?? DEFAULT_FACTOR_WEIGHTS;
  const audit: PayEquityAudit = {
    methodology: "point-factor-deterministic",
    genderNeutral: true,
    family: input.family,
    tierCeiling: FAMILY_TIER_CEILING[input.family],
    assignedTier: grade.tier,
    rawScore: grade.rawScore,
    normalized: grade.normalized,
    factors: COMPENSABLE_FACTORS.map((factor) => ({
      factor,
      degree: input.degrees[factor],
      weight: weights[factor],
      points: grade.factorScores[factor]
    })),
    bandMultiplier: baseBand.multiplier,
    engagement: input.engagement,
    premiumPpm: withPremium.premiumPpm,
    note:
      `${input.family} role graded tier ${grade.tier}/${FAMILY_TIER_CEILING[input.family]} by a deterministic ` +
      `point-factor method over gender-neutral factors (skill, autonomy, complexity, responsibility). ` +
      `Advisory market guidance only — not binding pay.`
  };

  return {
    status: "graded",
    family: grade.family,
    tier: grade.tier,
    factorScores: grade.factorScores,
    confidence: grade.confidence,
    needsHumanReview: grade.needsHumanReview,
    band: withPremium.band,
    engagement: withPremium.engagement,
    premiumPpm: withPremium.premiumPpm,
    audit
  };
}
