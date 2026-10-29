// Embedded job grading — Phase 2 (ACR-0005): map a graded (family, tier) onto a market pay BAND,
// anchored on a market median supplied by the caller (from the market-wage engine). PURE, deterministic,
// advisory ONLY — this is market GUIDANCE, never binding pay, and it moves no money. The caller passes
// the region/role market anchor + the single active country currency (never defaulted here).

import { FAMILY_TIER_CEILING, type RoleFamily } from "./jobGrading";

export type TierBand = Readonly<{
  currency: string;
  /** Advisory band in minor units (e.g. cents). min ≤ mid ≤ max. */
  minMinor: number;
  midMinor: number;
  maxMinor: number;
  /** The tier multiplier applied to the market median to get `mid` (for transparency). */
  multiplier: number;
}>;

export type TierBandOptions = Readonly<{
  /** Multiplier at tier 1 (default 0.85 = below median for the lowest tier). */
  floorMultiplier?: number;
  /** Multiplier at the family's top tier (default 1.35 = above median for the highest tier). */
  ceilingMultiplier?: number;
  /** Half-width of the band around mid, in parts-per-million (default 100_000 = ±10%). */
  halfWidthPpm?: number;
}>;

const DEFAULT_FLOOR = 0.85;
const DEFAULT_CEILING = 1.35;
const DEFAULT_HALF_WIDTH_PPM = 100_000;

export type TierBandResult = TierBand | Readonly<{ status: "invalid"; reason: string }>;

/**
 * Deterministic tier→band. Fail-closed: invalid tier/median/currency returns `{ status: "invalid" }`.
 * The multiplier interpolates linearly from `floorMultiplier` (tier 1) to `ceilingMultiplier`
 * (family top tier); a single-tier family (ceiling 1) uses the ceiling multiplier.
 */
export function deriveTierBand(
  input: Readonly<{ family: RoleFamily; tier: number; marketMedianMinor: number; currency: string }>,
  options: TierBandOptions = {}
): TierBandResult {
  const ceiling = FAMILY_TIER_CEILING[input.family];
  if (ceiling === undefined) return { status: "invalid", reason: "RWOS_TIERBAND_FAMILY_UNSUPPORTED" };
  if (!Number.isInteger(input.tier) || input.tier < 1 || input.tier > ceiling) {
    return { status: "invalid", reason: "RWOS_TIERBAND_TIER_OUT_OF_RANGE" };
  }
  if (!Number.isFinite(input.marketMedianMinor) || input.marketMedianMinor <= 0) {
    return { status: "invalid", reason: "RWOS_TIERBAND_MEDIAN_INVALID" };
  }
  if (typeof input.currency !== "string" || input.currency.trim().length === 0) {
    return { status: "invalid", reason: "RWOS_TIERBAND_CURRENCY_REQUIRED" };
  }

  const floor = options.floorMultiplier ?? DEFAULT_FLOOR;
  const top = options.ceilingMultiplier ?? DEFAULT_CEILING;
  const halfWidthPpm = options.halfWidthPpm ?? DEFAULT_HALF_WIDTH_PPM;
  if (![floor, top].every((m) => Number.isFinite(m) && m > 0) || !Number.isFinite(halfWidthPpm) || halfWidthPpm < 0) {
    return { status: "invalid", reason: "RWOS_TIERBAND_OPTION_INVALID" };
  }

  const position = ceiling > 1 ? (input.tier - 1) / (ceiling - 1) : 1;
  const multiplier = floor + (top - floor) * position;
  const midMinor = Math.round(input.marketMedianMinor * multiplier);
  const halfWidth = Math.round((midMinor * halfWidthPpm) / 1_000_000);

  return {
    currency: input.currency,
    minMinor: Math.max(0, midMinor - halfWidth),
    midMinor,
    maxMinor: midMinor + halfWidth,
    multiplier
  };
}

export function isTierBand(result: TierBandResult): result is TierBand {
  return !("status" in result);
}
