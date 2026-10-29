import type { createPrismaClient } from "@rwos/database";
import type { GradePostingRequest, GradePostingResponse } from "@rwos/shared";

// Persistence for the advisory job-grading audit (ACR-0005). The field mapping is a PURE function
// (unit-tested without a DB); the prisma-backed store just inserts the mapped row. ADVISORY — this
// table records WHY a tier was assigned (pay-equity defensibility); it moves no money.

export const JOB_GRADING_ENGINE_VERSION = "v1.1-statutory";

type GradedResponse = Extract<GradePostingResponse, { status: "graded" }>;

export type JobGradingAuditInput = Readonly<{
  organizationId: string;
  createdByUserId: string;
  jobRequestId: string | null;
  request: GradePostingRequest;
  graded: GradedResponse;
  evaluatedBy: string;
}>;

export type JobGradingAuditRow = Readonly<{
  organizationId: string;
  createdByUserId: string;
  jobRequestId: string | null;
  family: string;
  tier: number;
  tierCeiling: number;
  rawScore: number;
  normalizedScore: number;
  degreeSkill: number;
  degreeEffort: number;
  degreeResponsibility: number;
  degreeWorkingConditions: number;
  factorWeights: Record<string, number>;
  bandCurrency: string;
  bandMinMinor: number;
  bandMidMinor: number;
  bandMaxMinor: number;
  bandMultiplier: number;
  engagement: string;
  premiumPpm: number;
  needsHumanReview: boolean;
  confidence: number;
  evaluatedBy: string;
  auditNoteEn: string;
  auditNoteFr: string;
  engineVersion: string;
}>;

/** Pure: map a graded response + its request into the persisted audit row. Deterministic. */
export function toJobGradingAuditRow(input: JobGradingAuditInput): JobGradingAuditRow {
  const { graded, request } = input;
  const audit = graded.audit;
  const factorWeights: Record<string, number> = {};
  for (const f of audit.factors) factorWeights[f.factor] = f.weight;
  return {
    organizationId: input.organizationId,
    createdByUserId: input.createdByUserId,
    jobRequestId: input.jobRequestId,
    family: graded.family,
    tier: graded.tier,
    tierCeiling: graded.tierCeiling,
    rawScore: audit.rawScore,
    normalizedScore: audit.normalized,
    degreeSkill: request.degrees.skill,
    degreeEffort: request.degrees.effort,
    degreeResponsibility: request.degrees.responsibility,
    degreeWorkingConditions: request.degrees.workingConditions,
    factorWeights,
    bandCurrency: graded.band.currency,
    bandMinMinor: graded.band.minMinor,
    bandMidMinor: graded.band.midMinor,
    bandMaxMinor: graded.band.maxMinor,
    bandMultiplier: graded.band.multiplier,
    engagement: graded.engagement,
    premiumPpm: graded.premiumPpm,
    needsHumanReview: graded.needsHumanReview,
    confidence: graded.confidence,
    evaluatedBy: input.evaluatedBy,
    auditNoteEn: audit.note.en,
    auditNoteFr: audit.note.fr,
    engineVersion: JOB_GRADING_ENGINE_VERSION
  };
}

/** Port the route depends on (so it can be faked in tests, prisma-backed in production). */
export interface JobGradingAuditStore {
  record(input: JobGradingAuditInput): Promise<{ id: string }>;
}

export function createPrismaJobGradingAuditStore(
  prisma: ReturnType<typeof createPrismaClient>
): JobGradingAuditStore {
  return {
    record: async (input) => {
      const created = await prisma.jobGradingAudit.create({
        data: toJobGradingAuditRow(input),
        select: { id: true }
      });
      return { id: created.id };
    }
  };
}
