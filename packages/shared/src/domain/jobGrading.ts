// Embedded job grading — Phase 1 (ACR-0005). A PURE, deterministic point-factor scorer over
// STRUCTURED wizard input (the employer selects a degree per factor). No LLM, no persistence, no
// money, no auto-decision. It produces a role TIER as ADVISORY market guidance only — it never sets
// binding pay, never moves funds, and never routes money (FINANCE_LIVE untouched). LLM parsing of
// free-text job descriptions is a later phase; this grades the structured degrees directly.
//
// Mixed vertical: families never share a ladder — service L1–L4, professional/tech L1–L6 — so the
// SAME degree inputs can yield a different tier per family (ACR-0005 §"The grading model").

export type RoleFamily = "service" | "professional";

export const ROLE_FAMILIES: readonly RoleFamily[] = ["service", "professional"];

export const COMPENSABLE_FACTORS = ["skill", "autonomy", "complexity", "responsibility"] as const;
export type CompensableFactor = (typeof COMPENSABLE_FACTORS)[number];

/** Degree an employer selects per factor: 1 (minimal) … 5 (highest). */
export const MIN_DEGREE = 1;
export const MAX_DEGREE = 5;
export type FactorDegree = 1 | 2 | 3 | 4 | 5;
export type FactorDegrees = Readonly<Record<CompensableFactor, FactorDegree>>;

/** Per-family tier ceiling (ACR-0005): service L1–L4, professional/tech L1–L6. */
export const FAMILY_TIER_CEILING: Readonly<Record<RoleFamily, number>> = {
  service: 4,
  professional: 6
};

/** Equal weights by default — the weighting curve is an open calibration decision (ACR-0005). */
export const DEFAULT_FACTOR_WEIGHTS: Readonly<Record<CompensableFactor, number>> = {
  skill: 1,
  autonomy: 1,
  complexity: 1,
  responsibility: 1
};

export type GradeOptions = Readonly<{
  /** Per-factor weights (must be finite, ≥ 0, not all zero). Defaults to equal weights. */
  weights?: Readonly<Record<CompensableFactor, number>>;
  /** Flag human review at or above this tier. Defaults to the family's top tier. */
  reviewAtOrAboveTier?: number;
}>;

export type GradeResult =
  | Readonly<{
      status: "graded";
      family: RoleFamily;
      tier: number; // 1 … FAMILY_TIER_CEILING[family]
      rawScore: number; // weighted sum of degrees
      normalized: number; // 0 … 1 within the family-independent degree range
      factorScores: Readonly<Record<CompensableFactor, number>>; // weighted points per factor
      confidence: number; // 1 for deterministic structured input
      needsHumanReview: boolean;
    }>
  | Readonly<{ status: "invalid"; reason: string }>;

export function isRoleFamily(value: unknown): value is RoleFamily {
  return value === "service" || value === "professional";
}

function isValidDegree(value: unknown): value is FactorDegree {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_DEGREE && value <= MAX_DEGREE;
}

/**
 * Deterministic grade. Fail-closed: any invalid input returns `{ status: "invalid" }` — never a silent
 * default. Pure: identical inputs always yield identical output.
 */
export function gradeRole(
  family: RoleFamily,
  degrees: FactorDegrees,
  options: GradeOptions = {}
): GradeResult {
  if (!isRoleFamily(family)) return { status: "invalid", reason: "RWOS_JOBGRADE_FAMILY_UNSUPPORTED" };

  const weights = options.weights ?? DEFAULT_FACTOR_WEIGHTS;
  for (const factor of COMPENSABLE_FACTORS) {
    if (!isValidDegree(degrees[factor])) {
      return { status: "invalid", reason: `RWOS_JOBGRADE_DEGREE_INVALID:${factor}` };
    }
    const w = weights[factor];
    if (typeof w !== "number" || !Number.isFinite(w) || w < 0) {
      return { status: "invalid", reason: `RWOS_JOBGRADE_WEIGHT_INVALID:${factor}` };
    }
  }

  const totalWeight = COMPENSABLE_FACTORS.reduce((sum, f) => sum + weights[f], 0);
  if (totalWeight <= 0) return { status: "invalid", reason: "RWOS_JOBGRADE_WEIGHTS_ZERO" };

  const factorScores = {} as Record<CompensableFactor, number>;
  let rawScore = 0;
  for (const factor of COMPENSABLE_FACTORS) {
    const points = degrees[factor] * weights[factor];
    factorScores[factor] = points;
    rawScore += points;
  }

  // Normalize against the achievable range for these weights (min = all-min degrees, max = all-max),
  // so the tier reflects where this role sits on its scale regardless of the weight magnitudes.
  const minScore = MIN_DEGREE * totalWeight;
  const maxScore = MAX_DEGREE * totalWeight;
  const normalized = maxScore === minScore ? 0 : (rawScore - minScore) / (maxScore - minScore);

  const ceiling = FAMILY_TIER_CEILING[family];
  const tier = Math.min(ceiling, Math.max(1, Math.ceil(normalized * ceiling)));

  const reviewThreshold = options.reviewAtOrAboveTier ?? ceiling;

  return {
    status: "graded",
    family,
    tier,
    rawScore,
    normalized,
    factorScores,
    confidence: 1,
    needsHumanReview: tier >= reviewThreshold
  };
}

// ── Bilingual wizard labels (EN/FR) — static content for the structured wizard. Pure data. ──
type Bilingual = Readonly<{ en: string; fr: string }>;

export const FAMILY_LABELS: Readonly<Record<RoleFamily, Bilingual>> = {
  service: { en: "Service / shift", fr: "Service / quart" },
  professional: { en: "Professional / technical", fr: "Professionnel / technique" }
};

export const FACTOR_LABELS: Readonly<Record<CompensableFactor, Bilingual>> = {
  skill: { en: "Skill & qualification", fr: "Compétence et qualification" },
  autonomy: { en: "Autonomy & supervision", fr: "Autonomie et supervision" },
  complexity: { en: "Complexity & scope", fr: "Complexité et portée" },
  responsibility: { en: "Responsibility & risk", fr: "Responsabilité et risque" }
};

/** Generic degree ladder shown in the wizard (1…5). Per-factor anchor prose is a later refinement. */
export const DEGREE_LABELS: Readonly<Record<FactorDegree, Bilingual>> = {
  1: { en: "Minimal", fr: "Minimal" },
  2: { en: "Basic", fr: "De base" },
  3: { en: "Moderate", fr: "Modéré" },
  4: { en: "Substantial", fr: "Important" },
  5: { en: "Expert", fr: "Expert" }
};
