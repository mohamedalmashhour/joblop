import { describe, expect, it } from "vitest";
import { COMPENSABLE_FACTORS, type FactorDegree } from "./jobGrading";
import { WIZARD_DEGREE_ANCHORS, WIZARD_FACTOR_ORDER, degreeAnchor } from "./jobGradingAnchors";

describe("wizard degree anchors — bilingual, complete, CNESST-aligned", () => {
  it("covers every statutory factor × degree 1–5 with non-empty EN + FR text", () => {
    for (const factor of COMPENSABLE_FACTORS) {
      for (let d = 1 as FactorDegree; d <= 5; d = (d + 1) as FactorDegree) {
        const anchor = WIZARD_DEGREE_ANCHORS[factor][d];
        expect(anchor.en.length).toBeGreaterThan(0);
        expect(anchor.fr.length).toBeGreaterThan(0);
      }
    }
  });

  it("degreeAnchor() returns the same entry", () => {
    expect(degreeAnchor("skill", 4)).toBe(WIZARD_DEGREE_ANCHORS.skill[4]);
    expect(degreeAnchor("workingConditions", 1).fr.length).toBeGreaterThan(0);
  });

  it("wizard factor order matches the engine's statutory factor list (parity)", () => {
    expect([...WIZARD_FACTOR_ORDER]).toEqual([...COMPENSABLE_FACTORS]);
  });
});
