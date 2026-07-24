import { describe, expect, it } from "vitest";
import {
  getEligibilitySummary,
  workerShiftBoundaries,
  workerShiftDataTruth,
  workerShiftDetailFields,
  workerShiftFilters
} from "./workerShiftDiscoveryContent";

describe("worker shift discovery content", () => {
  it("covers required available-shift filters", () => {
    expect(workerShiftFilters).toContain("date");
    expect(workerShiftFilters).toContain("role");
    expect(workerShiftFilters).toContain("residence");
    expect(workerShiftFilters).toContain("qualification match");
    expect(workerShiftFilters).toContain("transport terms");
  });

  it("covers required shift detail fields", () => {
    expect(workerShiftDetailFields).toContain("eligibility summary");
    expect(workerShiftDetailFields).toContain("urgent premium");
    expect(workerShiftDetailFields).toContain("worker-count requirement");
    expect(workerShiftDetailFields).toContain("fixture or integration status");
  });

  it("preserves shift and assignment boundaries", () => {
    expect(workerShiftBoundaries).toContain("Visible Shift != Eligible Shift");
    expect(workerShiftBoundaries).toContain("Eligible != Guaranteed Assignment");
    expect(workerShiftBoundaries).toContain("Application Submitted != Selected");
  });

  it("labels fixture-backed discovery and missing integrations", () => {
    expect(workerShiftDataTruth).toContain("Fixture-backed shift discovery data");
    expect(workerShiftDataTruth).toContain("No live eligibility engine");
    expect(workerShiftDataTruth).toContain("No guaranteed assignment");
  });

  it("summarizes eligibility without guaranteeing assignment", () => {
    expect(
      getEligibilitySummary({ hasRequiredCertifications: true, hasScheduleConflict: false })
    ).toContain("final selection is not guaranteed");
    expect(
      getEligibilitySummary({ hasRequiredCertifications: false, hasScheduleConflict: false })
    ).toContain("Information required");
    expect(
      getEligibilitySummary({ hasRequiredCertifications: true, hasScheduleConflict: true })
    ).toContain("schedule conflict");
  });
});
