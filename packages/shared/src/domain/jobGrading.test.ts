import { describe, expect, it } from "vitest";
import {
  COMPENSABLE_FACTORS,
  DEGREE_LABELS,
  FACTOR_LABELS,
  FAMILY_LABELS,
  FAMILY_TIER_CEILING,
  ROLE_FAMILIES,
  gradeRole,
  isRoleFamily,
  type FactorDegree,
  type FactorDegrees
} from "./jobGrading";

const deg = (s: number, a: number, c: number, r: number): FactorDegrees => ({
  skill: s as FactorDegree,
  autonomy: a as FactorDegree,
  complexity: c as FactorDegree,
  responsibility: r as FactorDegree
});

describe("job grading — the four compensable factors", () => {
  it("has exactly the four ACR-0005 factors", () => {
    expect([...COMPENSABLE_FACTORS]).toEqual(["skill", "autonomy", "complexity", "responsibility"]);
  });
});

describe("job grading — tier mapping per family (families never share a ladder)", () => {
  it("all-minimum degrees → tier 1 in both families", () => {
    const s = gradeRole("service", deg(1, 1, 1, 1));
    const p = gradeRole("professional", deg(1, 1, 1, 1));
    expect(s).toMatchObject({ status: "graded", tier: 1, rawScore: 4, normalized: 0 });
    expect(p).toMatchObject({ status: "graded", tier: 1, normalized: 0 });
  });

  it("all-maximum degrees → the family's top tier (service 4, professional 6)", () => {
    expect(gradeRole("service", deg(5, 5, 5, 5))).toMatchObject({ status: "graded", tier: 4, normalized: 1 });
    expect(gradeRole("professional", deg(5, 5, 5, 5))).toMatchObject({ status: "graded", tier: 6, normalized: 1 });
  });

  it("the SAME degrees yield a different tier per family (mixed-vertical anchoring)", () => {
    const d = deg(5, 5, 5, 1); // raw 16 → normalized 0.75
    expect(gradeRole("service", d)).toMatchObject({ tier: 3 }); // ceil(0.75*4)=3
    expect(gradeRole("professional", d)).toMatchObject({ tier: 5 }); // ceil(0.75*6)=5
  });

  it("mid degrees map through the normalized curve", () => {
    expect(gradeRole("service", deg(3, 3, 3, 3))).toMatchObject({ tier: 2 }); // 0.5*4=2
    expect(gradeRole("professional", deg(3, 3, 3, 3))).toMatchObject({ tier: 3 }); // 0.5*6=3
    expect(gradeRole("service", deg(2, 2, 2, 2))).toMatchObject({ tier: 1 }); // 0.25*4=1
    expect(gradeRole("professional", deg(2, 2, 2, 2))).toMatchObject({ tier: 2 }); // ceil(1.5)=2
  });

  it("tier never exceeds the family ceiling and never drops below 1", () => {
    for (const family of ROLE_FAMILIES) {
      for (let v = 1 as number; v <= 5; v++) {
        const r = gradeRole(family, deg(v, v, v, v));
        expect(r.status).toBe("graded");
        if (r.status === "graded") {
          expect(r.tier).toBeGreaterThanOrEqual(1);
          expect(r.tier).toBeLessThanOrEqual(FAMILY_TIER_CEILING[family]);
        }
      }
    }
  });
});

describe("job grading — weights", () => {
  it("weighting a factor can raise the tier (weight is an open calibration knob)", () => {
    const d = deg(5, 1, 1, 1);
    expect(gradeRole("service", d)).toMatchObject({ tier: 1 }); // equal weights: raw 8 → 0.25 → 1
    const weighted = gradeRole("service", d, { weights: { skill: 3, autonomy: 1, complexity: 1, responsibility: 1 } });
    // raw = 15+1+1+1 = 18; totalWeight 6 → (18-6)/(30-6)=0.5 → ceil(2)=2
    expect(weighted).toMatchObject({ tier: 2 });
  });
});

describe("job grading — human review flag", () => {
  it("defaults to flagging review only at the family's top tier", () => {
    expect(gradeRole("service", deg(5, 5, 5, 5))).toMatchObject({ needsHumanReview: true });
    expect(gradeRole("service", deg(3, 3, 3, 3))).toMatchObject({ needsHumanReview: false });
  });
  it("respects a custom review threshold", () => {
    expect(gradeRole("professional", deg(3, 3, 3, 3), { reviewAtOrAboveTier: 3 })).toMatchObject({
      needsHumanReview: true
    });
  });
  it("structured input is full confidence", () => {
    expect(gradeRole("service", deg(2, 3, 4, 1))).toMatchObject({ confidence: 1 });
  });
});

describe("job grading — fail-closed validation (never a silent default)", () => {
  it("rejects an unsupported family", () => {
    expect(gradeRole("tech" as never, deg(3, 3, 3, 3))).toEqual({
      status: "invalid",
      reason: "RWOS_JOBGRADE_FAMILY_UNSUPPORTED"
    });
    expect(isRoleFamily("tech")).toBe(false);
  });
  it("rejects out-of-range or non-integer degrees", () => {
    expect(gradeRole("service", deg(0, 3, 3, 3)).status).toBe("invalid");
    expect(gradeRole("service", deg(6, 3, 3, 3)).status).toBe("invalid");
    expect(gradeRole("service", { ...deg(3, 3, 3, 3), skill: 2.5 as FactorDegree }).status).toBe("invalid");
  });
  it("rejects a missing factor", () => {
    const missing = { skill: 3, autonomy: 3, complexity: 3 } as unknown as FactorDegrees;
    const r = gradeRole("service", missing);
    expect(r.status).toBe("invalid");
    if (r.status === "invalid") expect(r.reason).toContain("responsibility");
  });
  it("rejects invalid or all-zero weights", () => {
    expect(
      gradeRole("service", deg(3, 3, 3, 3), { weights: { skill: 0, autonomy: 0, complexity: 0, responsibility: 0 } })
    ).toEqual({ status: "invalid", reason: "RWOS_JOBGRADE_WEIGHTS_ZERO" });
    expect(
      gradeRole("service", deg(3, 3, 3, 3), { weights: { skill: -1, autonomy: 1, complexity: 1, responsibility: 1 } })
        .status
    ).toBe("invalid");
  });
});

describe("job grading — determinism", () => {
  it("identical inputs always yield identical output", () => {
    const a = gradeRole("professional", deg(4, 2, 5, 3));
    const b = gradeRole("professional", deg(4, 2, 5, 3));
    expect(a).toEqual(b);
  });
});

describe("job grading — bilingual wizard labels", () => {
  it("every family, factor and degree has non-empty EN + FR labels", () => {
    for (const fam of ROLE_FAMILIES) {
      expect(FAMILY_LABELS[fam].en.length).toBeGreaterThan(0);
      expect(FAMILY_LABELS[fam].fr.length).toBeGreaterThan(0);
    }
    for (const factor of COMPENSABLE_FACTORS) {
      expect(FACTOR_LABELS[factor].en.length).toBeGreaterThan(0);
      expect(FACTOR_LABELS[factor].fr.length).toBeGreaterThan(0);
    }
    for (let d = 1 as FactorDegree; d <= 5; d = (d + 1) as FactorDegree) {
      expect(DEGREE_LABELS[d].en.length).toBeGreaterThan(0);
      expect(DEGREE_LABELS[d].fr.length).toBeGreaterThan(0);
    }
  });
});
