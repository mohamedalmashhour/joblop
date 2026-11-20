import { describe, expect, it } from "vitest";
import { gradePostingFromRequest, parseGradePostingRequest, type GradePostingRequest } from "@rwos/shared";
import { JOB_GRADING_ENGINE_VERSION, toJobGradingAuditRow } from "./jobGradingAuditRepository";

const req = parseGradePostingRequest({
  family: "professional",
  degrees: { skill: 5, effort: 4, responsibility: 5, workingConditions: 3 },
  engagement: "contract",
  marketMedianMinor: 2500,
  currency: "CAD",
  locale: "en"
}) as GradePostingRequest;

describe("job grading audit row mapping (pure, no DB)", () => {
  it("maps a graded response + request into the persisted audit row faithfully", () => {
    const graded = gradePostingFromRequest(req);
    if (graded.status !== "graded") throw new Error("expected graded");
    const row = toJobGradingAuditRow({
      organizationId: "11111111-1111-1111-1111-111111111111",
      createdByUserId: "22222222-2222-2222-2222-222222222222",
      jobRequestId: null,
      request: req,
      graded,
      evaluatedBy: "engine:test"
    });
    expect(row.family).toBe("professional");
    expect(row.tier).toBe(graded.tier);
    expect(row.tierCeiling).toBe(graded.tierCeiling);
    expect(row.rawScore).toBe(graded.audit.rawScore);
    expect(row.degreeSkill).toBe(5);
    expect(row.degreeEffort).toBe(4);
    expect(row.degreeResponsibility).toBe(5);
    expect(row.degreeWorkingConditions).toBe(3);
    expect(row.factorWeights).toEqual({ skill: 1, effort: 1, responsibility: 1, workingConditions: 1 });
    expect(row.bandCurrency).toBe("CAD");
    expect(row.bandMidMinor).toBe(graded.band.midMinor);
    expect(row.engagement).toBe("contract");
    expect(row.premiumPpm).toBe(graded.premiumPpm);
    expect(row.needsHumanReview).toBe(graded.needsHumanReview);
    expect(row.auditNoteEn).toBe(graded.audit.note.en);
    expect(row.auditNoteFr).toContain("équité salariale");
    expect(row.engineVersion).toBe(JOB_GRADING_ENGINE_VERSION);
    expect(row.evaluatedBy).toBe("engine:test");
    expect(row.jobRequestId).toBeNull();
  });
});
