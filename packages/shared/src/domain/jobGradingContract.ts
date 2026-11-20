// Embedded job grading — API contract (ACR-0005). The typed request/response shape for the FUTURE
// employer-wizard grading endpoint, plus a fail-closed parser for the untrusted request body and a
// mapper from the engine result to the response. LIBRARY-ONLY — no route, no DB, no money. Building
// the contract (and its input-validation boundary) now lets the frontend and backend agree before any
// wire-up, and the route will reuse `parseGradePostingRequest` verbatim.

import {
  COMPENSABLE_FACTORS,
  MAX_DEGREE,
  MIN_DEGREE,
  isRoleFamily,
  type CompensableFactor,
  type FactorDegree,
  type FactorDegrees,
  type RoleFamily
} from "./jobGrading";
import { isEngagementType, type EngagementType } from "./engagementPremium";
import { gradePosting, type PayEquityAudit, type PostingGradeResult } from "./postingGrade";
import type { TierBand } from "./tierBand";

/** What the employer wizard submits. `marketMedianMinor` is supplied by the market-wage engine. */
export type GradePostingRequest = Readonly<{
  family: RoleFamily;
  degrees: FactorDegrees;
  engagement: EngagementType;
  marketMedianMinor: number;
  currency: string;
  locale: "en" | "fr";
}>;

/** What the endpoint returns (advisory). `tier`/`tierCeiling` give the family-scaled level. */
export type GradePostingResponse =
  | Readonly<{
      status: "graded";
      family: RoleFamily;
      tier: number;
      tierCeiling: number;
      band: TierBand;
      engagement: EngagementType;
      premiumPpm: number;
      needsHumanReview: boolean;
      confidence: number;
      audit: PayEquityAudit;
    }>
  | Readonly<{ status: "invalid"; reason: string }>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readDegree(value: unknown): FactorDegree | null {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_DEGREE && value <= MAX_DEGREE
    ? (value as FactorDegree)
    : null;
}

/**
 * Fail-closed parse of an untrusted request body → a typed `GradePostingRequest`. Returns
 * `{ status: "invalid", reason }` on any malformed field; never throws, never defaults. The eventual
 * route uses this as its input boundary.
 */
export function parseGradePostingRequest(
  body: unknown
): GradePostingRequest | Readonly<{ status: "invalid"; reason: string }> {
  const b = asRecord(body);
  if (!b) return { status: "invalid", reason: "RWOS_GRADEREQ_BODY_INVALID" };
  if (!isRoleFamily(b.family)) return { status: "invalid", reason: "RWOS_GRADEREQ_FAMILY_INVALID" };
  if (!isEngagementType(b.engagement)) return { status: "invalid", reason: "RWOS_GRADEREQ_ENGAGEMENT_INVALID" };
  if (b.locale !== "en" && b.locale !== "fr") return { status: "invalid", reason: "RWOS_GRADEREQ_LOCALE_INVALID" };
  if (typeof b.marketMedianMinor !== "number" || !Number.isFinite(b.marketMedianMinor) || b.marketMedianMinor <= 0) {
    return { status: "invalid", reason: "RWOS_GRADEREQ_MEDIAN_INVALID" };
  }
  if (typeof b.currency !== "string" || b.currency.trim().length === 0) {
    return { status: "invalid", reason: "RWOS_GRADEREQ_CURRENCY_INVALID" };
  }
  const degreesRecord = asRecord(b.degrees);
  if (!degreesRecord) return { status: "invalid", reason: "RWOS_GRADEREQ_DEGREES_INVALID" };
  const degrees = {} as Record<CompensableFactor, FactorDegree>;
  for (const factor of COMPENSABLE_FACTORS) {
    const d = readDegree(degreesRecord[factor]);
    if (d === null) return { status: "invalid", reason: `RWOS_GRADEREQ_DEGREE_INVALID:${factor}` };
    degrees[factor] = d;
  }
  return {
    family: b.family,
    degrees,
    engagement: b.engagement,
    marketMedianMinor: b.marketMedianMinor,
    currency: b.currency,
    locale: b.locale
  };
}

/** Map the engine's composed result to the API response shape (flattening tierCeiling up). */
export function toGradePostingResponse(result: PostingGradeResult): GradePostingResponse {
  if (result.status !== "graded") return { status: "invalid", reason: result.reason };
  return {
    status: "graded",
    family: result.family,
    tier: result.tier,
    tierCeiling: result.audit.tierCeiling,
    band: result.band,
    engagement: result.engagement,
    premiumPpm: result.premiumPpm,
    needsHumanReview: result.needsHumanReview,
    confidence: result.confidence,
    audit: result.audit
  };
}

/** Convenience: validated request → engine → response (what the route handler body will be). */
export function gradePostingFromRequest(req: GradePostingRequest): GradePostingResponse {
  return toGradePostingResponse(
    gradePosting({
      family: req.family,
      degrees: req.degrees,
      marketMedianMinor: req.marketMedianMinor,
      currency: req.currency,
      engagement: req.engagement
    })
  );
}
