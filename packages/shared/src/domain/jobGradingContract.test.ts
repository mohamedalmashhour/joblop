import { describe, expect, it } from "vitest";
import { gradePostingFromRequest, parseGradePostingRequest, toGradePostingResponse, type GradePostingRequest } from "./jobGradingContract";

const validBody = {
  family: "professional",
  degrees: { skill: 5, effort: 5, responsibility: 5, workingConditions: 5 },
  engagement: "permanent",
  marketMedianMinor: 2000,
  currency: "CAD",
  locale: "en"
};

describe("job-grading contract — request parsing (fail-closed input boundary)", () => {
  it("accepts a well-formed body", () => {
    const r = parseGradePostingRequest(validBody);
    expect("status" in r).toBe(false);
    if (!("status" in r)) {
      expect(r.family).toBe("professional");
      expect(r.degrees).toEqual({ skill: 5, effort: 5, responsibility: 5, workingConditions: 5 });
      expect(r.locale).toBe("en");
    }
  });

  it("rejects malformed bodies, field by field", () => {
    expect(parseGradePostingRequest(null)).toMatchObject({ status: "invalid" });
    expect(parseGradePostingRequest([])).toMatchObject({ status: "invalid" });
    expect(parseGradePostingRequest({ ...validBody, family: "tech" })).toMatchObject({ status: "invalid", reason: "RWOS_GRADEREQ_FAMILY_INVALID" });
    expect(parseGradePostingRequest({ ...validBody, engagement: "weekly" })).toMatchObject({ reason: "RWOS_GRADEREQ_ENGAGEMENT_INVALID" });
    expect(parseGradePostingRequest({ ...validBody, locale: "es" })).toMatchObject({ reason: "RWOS_GRADEREQ_LOCALE_INVALID" });
    expect(parseGradePostingRequest({ ...validBody, marketMedianMinor: 0 })).toMatchObject({ reason: "RWOS_GRADEREQ_MEDIAN_INVALID" });
    expect(parseGradePostingRequest({ ...validBody, currency: "  " })).toMatchObject({ reason: "RWOS_GRADEREQ_CURRENCY_INVALID" });
    expect(parseGradePostingRequest({ ...validBody, degrees: { skill: 5, effort: 5, responsibility: 5 } })).toMatchObject({
      reason: "RWOS_GRADEREQ_DEGREE_INVALID:workingConditions"
    });
    expect(parseGradePostingRequest({ ...validBody, degrees: { ...validBody.degrees, skill: 6 } })).toMatchObject({
      reason: "RWOS_GRADEREQ_DEGREE_INVALID:skill"
    });
  });
});

describe("job-grading contract — response mapping", () => {
  it("maps a graded engine result to the response (tierCeiling flattened up)", () => {
    const req = parseGradePostingRequest(validBody) as GradePostingRequest;
    const res = gradePostingFromRequest(req);
    expect(res.status).toBe("graded");
    if (res.status === "graded") {
      expect(res.tier).toBe(6);
      expect(res.tierCeiling).toBe(6);
      expect(res.band).toEqual({ currency: "CAD", minMinor: 2430, midMinor: 2700, maxMinor: 2970, multiplier: 1.35 });
      expect(res.audit.note.fr).toContain("équité salariale");
      expect(res.needsHumanReview).toBe(true);
    }
  });

  it("propagates an invalid engine result as an invalid response", () => {
    const res = gradePostingFromRequest({
      family: "service",
      degrees: { skill: 3, effort: 3, responsibility: 3, workingConditions: 3 },
      engagement: "shift",
      marketMedianMinor: 0, // invalid → engine fails closed
      currency: "CAD",
      locale: "en"
    });
    expect(res).toMatchObject({ status: "invalid" });
  });

  it("toGradePostingResponse surfaces an upstream invalid verbatim", () => {
    expect(toGradePostingResponse({ status: "invalid", reason: "X" })).toEqual({ status: "invalid", reason: "X" });
  });
});
