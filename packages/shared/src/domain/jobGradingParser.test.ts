import { describe, expect, it } from "vitest";
import { gradeFromDescription, syntheticJobGradingParser } from "./jobGradingParser";

const SENIOR =
  "Senior certified specialist for physically demanding, fast-paced work under deadline pressure; responsible for the team's safety and budget; performed outdoor at night in hazardous, high-noise conditions.";

describe("synthetic job-grading parser — deterministic, offline, advisory", () => {
  it("lifts factor degrees above base when signals are present", async () => {
    const s = await syntheticJobGradingParser.parse({ description: SENIOR, family: "professional", locale: "en" });
    expect(s.degrees.skill).toBeGreaterThan(2);
    expect(s.degrees.effort).toBeGreaterThan(2);
    expect(s.degrees.responsibility).toBeGreaterThan(2);
    expect(s.degrees.workingConditions).toBeGreaterThan(2);
    expect(s.confidence).toBeGreaterThan(0.2);
    expect(s.confidence).toBeLessThanOrEqual(0.6);
  });

  it("empty description → base degrees + low confidence (never throws)", async () => {
    const s = await syntheticJobGradingParser.parse({ description: "", family: "service", locale: "en" });
    expect(s.degrees).toEqual({ skill: 2, effort: 2, responsibility: 2, workingConditions: 2 });
    expect(s.confidence).toBe(0.2);
  });

  it("is deterministic for identical input", async () => {
    const a = await syntheticJobGradingParser.parse({ description: SENIOR, family: "service", locale: "en" });
    const b = await syntheticJobGradingParser.parse({ description: SENIOR, family: "service", locale: "en" });
    expect(a).toEqual(b);
  });
});

describe("gradeFromDescription — parse → grade, ALWAYS human-reviewed", () => {
  it("produces a graded result that always flags human review (never auto-decides)", async () => {
    const r = await gradeFromDescription(syntheticJobGradingParser, { description: SENIOR, family: "professional", locale: "en" });
    expect(r.status).toBe("graded");
    if (r.status === "graded") {
      expect(r.grade.needsHumanReview).toBe(true);
      expect(r.grade.tier).toBeGreaterThanOrEqual(1);
      expect(r.grade.confidence).toBeLessThanOrEqual(0.6); // bounded by the parser's modest confidence
      expect(r.signals.rationale.length).toBeGreaterThan(0);
    }
  });

  it("a senior/complex posting grades higher than an empty one (same family)", async () => {
    const strong = await gradeFromDescription(syntheticJobGradingParser, { description: SENIOR, family: "professional", locale: "en" });
    const empty = await gradeFromDescription(syntheticJobGradingParser, { description: "", family: "professional", locale: "en" });
    if (strong.status === "graded" && empty.status === "graded") {
      expect(strong.grade.tier).toBeGreaterThan(empty.grade.tier);
    } else {
      throw new Error("expected both to grade");
    }
  });
});
