import { describe, expect, it } from "vitest";
import { phase01Routes, reviewChecks, reviewNotices } from "./phase01ReviewContent";

describe("Phase 01 owner review navigation", () => {
  it("links every implemented Page 063-075 route exactly once", () => {
    expect(phase01Routes.map((route) => route.page)).toEqual([
      "063",
      "064",
      "065",
      "066",
      "067",
      "068",
      "069",
      "070",
      "071",
      "072",
      "073",
      "074",
      "075"
    ]);
    expect(new Set(phase01Routes.map((route) => route.route)).size).toBe(13);
  });

  it("keeps owner-review navigation truthful and non-operational", () => {
    expect(reviewNotices).toContain("Development/demo fixtures may be shown.");
    expect(reviewNotices).toContain("No live backend integration is claimed.");
    expect(reviewNotices).toContain(
      "No authoritative operational actions execute from these pages."
    );
    expect(reviewNotices).toContain("AI remains advisory and human-reviewed.");
  });

  it("marks every route as implemented, build verified, and linked", () => {
    expect(phase01Routes.every((route) => route.status === "Implemented")).toBe(true);
    expect(phase01Routes.every((route) => route.buildStatus === "Build verified")).toBe(true);
    expect(
      phase01Routes.every((route) => route.navigationStatus === "Linked from owner review index")
    ).toBe(true);
  });

  it("gives the owner a review checklist covering states, layout, AI, privacy, and handoffs", () => {
    expect(reviewChecks).toContain("Inspect desktop and mobile layout.");
    expect(reviewChecks).toContain(
      "Confirm empty, stale, partial, denied, restricted, unavailable, and error states."
    );
    expect(reviewChecks).toContain("Confirm governed handoffs do not execute workflows.");
    expect(reviewChecks).toContain("Confirm AI may explain or summarize only.");
    expect(reviewChecks).toContain("Confirm privacy and security language remains visible.");
  });
});
