import { describe, expect, it } from "vitest";
import { gradePosting } from "./postingGrade";
import type { FactorDegree, FactorDegrees } from "./jobGrading";

const deg = (s: number, e: number, r: number, w: number): FactorDegrees => ({
  skill: s as FactorDegree,
  effort: e as FactorDegree,
  responsibility: r as FactorDegree,
  workingConditions: w as FactorDegree
});

describe("gradePosting — composes scorer → band → premium with a pay-equity audit", () => {
  it("top-tier professional, permanent: band = base (no premium), full audit", () => {
    const r = gradePosting({
      family: "professional",
      degrees: deg(5, 5, 5, 5),
      marketMedianMinor: 2000,
      currency: "CAD",
      engagement: "permanent"
    });
    expect(r.status).toBe("graded");
    if (r.status !== "graded") return;
    expect(r.tier).toBe(6);
    expect(r.needsHumanReview).toBe(true); // top tier
    expect(r.band).toEqual({ currency: "CAD", minMinor: 2430, midMinor: 2700, maxMinor: 2970, multiplier: 1.35 });
    expect(r.engagement).toBe("permanent");
    expect(r.premiumPpm).toBe(0);
    // Audit trail
    expect(r.audit).toMatchObject({
      methodology: "point-factor-deterministic",
      genderNeutral: true,
      family: "professional",
      tierCeiling: 6,
      assignedTier: 6,
      rawScore: 20,
      normalized: 1,
      bandMultiplier: 1.35,
      engagement: "permanent",
      premiumPpm: 0
    });
    expect(r.audit.factors).toHaveLength(4);
    expect(r.audit.factors).toContainEqual({ factor: "skill", degree: 5, weight: 1, points: 5 });
    expect(r.audit.note).toContain("tier 6/6");
    expect(r.audit.note).toContain("gender-neutral");
  });

  it("shift engagement raises the band above the permanent base and records the premium", () => {
    const base = gradePosting({ family: "service", degrees: deg(4, 4, 4, 4), marketMedianMinor: 2000, currency: "CAD", engagement: "permanent" });
    const shift = gradePosting({ family: "service", degrees: deg(4, 4, 4, 4), marketMedianMinor: 2000, currency: "CAD", engagement: "shift" });
    if (base.status !== "graded" || shift.status !== "graded") throw new Error("expected graded");
    expect(shift.band.midMinor).toBeGreaterThan(base.band.midMinor);
    expect(shift.audit.premiumPpm).toBe(300_000);
    expect(shift.audit.tierCeiling).toBe(4); // family scaling preserved in the audit
  });

  it("fail-closed: an invalid stage propagates", () => {
    expect(gradePosting({ family: "service", degrees: deg(0, 4, 4, 4), marketMedianMinor: 2000, currency: "CAD", engagement: "shift" }).status).toBe("invalid");
    expect(gradePosting({ family: "service", degrees: deg(4, 4, 4, 4), marketMedianMinor: 0, currency: "CAD", engagement: "shift" }).status).toBe("invalid");
    expect(gradePosting({ family: "service", degrees: deg(4, 4, 4, 4), marketMedianMinor: 2000, currency: "CAD", engagement: "weekly" as never }).status).toBe("invalid");
  });

  it("is deterministic end to end (reproducible audit)", () => {
    const input = { family: "professional" as const, degrees: deg(3, 4, 2, 5), marketMedianMinor: 2500, currency: "CAD", engagement: "contract" as const };
    expect(gradePosting(input)).toEqual(gradePosting(input));
  });
});
