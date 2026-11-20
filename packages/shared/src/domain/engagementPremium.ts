// Embedded job grading — Phase 3 (ACR-0005): apply the engagement-type PREMIUM MODIFIER to an advisory
// tier band. Short-term work carries a premium over the permanent band (to offset the lack of stability
// and benefits); permanent is the base. PURE, deterministic, advisory ONLY — market GUIDANCE, moves no
// money, and does NOT replace the live offer engine's variable comp (this is the guidance-band layer).

import { isTierBand, type TierBand, type TierBandResult } from "./tierBand";

export type EngagementType = "shift" | "contract" | "permanent";
export const ENGAGEMENT_TYPES: readonly EngagementType[] = ["shift", "contract", "permanent"];

/** Default premiums in parts-per-million (300_000 = +30%). Calibration knob (ACR-0005 open decision). */
export const DEFAULT_ENGAGEMENT_PREMIUM_PPM: Readonly<Record<EngagementType, number>> = {
  shift: 300_000, // +30% — most stability/benefit offset
  contract: 150_000, // +15%
  permanent: 0 // base
};

export function isEngagementType(value: unknown): value is EngagementType {
  return value === "shift" || value === "contract" || value === "permanent";
}

export type EngagementBandResult =
  | Readonly<{ band: TierBand; engagement: EngagementType; premiumPpm: number }>
  | Readonly<{ status: "invalid"; reason: string }>;

/**
 * Apply the engagement premium to a band. Accepts a `TierBandResult` so an invalid upstream band
 * propagates fail-closed. `premiumPpm` overrides the default for the engagement type.
 */
export function applyEngagementPremium(
  band: TierBandResult,
  engagement: EngagementType,
  premiumPpm?: number
): EngagementBandResult {
  if (!isTierBand(band)) return { status: "invalid", reason: band.reason };
  if (!isEngagementType(engagement)) return { status: "invalid", reason: "RWOS_ENGAGEMENT_UNSUPPORTED" };

  const ppm = premiumPpm ?? DEFAULT_ENGAGEMENT_PREMIUM_PPM[engagement];
  if (!Number.isFinite(ppm) || ppm < 0) return { status: "invalid", reason: "RWOS_ENGAGEMENT_PREMIUM_INVALID" };

  const factor = 1 + ppm / 1_000_000;
  const scale = (minor: number) => Math.round(minor * factor);

  return {
    band: {
      currency: band.currency,
      minMinor: scale(band.minMinor),
      midMinor: scale(band.midMinor),
      maxMinor: scale(band.maxMinor),
      multiplier: band.multiplier * factor
    },
    engagement,
    premiumPpm: ppm
  };
}
