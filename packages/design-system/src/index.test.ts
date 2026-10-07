import { describe, expect, it } from "vitest";
import {
  accessibilityThresholds,
  breakpoints,
  colors,
  componentStates,
  contrastRatio,
  createCssVariableBlock,
  cssVariables,
  dataStates,
  residentJobStatusDefinitions,
  statusColors,
  statusSemantics,
  touch,
  typographyRoles
} from "./index";

describe("design system colors", () => {
  it("uses the approved dark-blue foundation palette", () => {
    expect(colors.deepTeal).toBe("#0c2654");
    expect(colors.deepTealMuted).toBe("#13346e");
    expect(colors.text).toBe("#0b1f3a");
  });

  it("defines non-color-only status semantics for governed states", () => {
    expect(statusColors.success.foreground).toBe(colors.success);
    expect(statusColors.warning.foreground).toBe(colors.warning);
    expect(statusColors.danger.foreground).toBe(colors.danger);
    expect(statusSemantics.warning).toContain("human review");
    expect(statusSemantics.informational).toContain("not an approval");
  });

  it("keeps status text above the normal-text contrast threshold", () => {
    for (const tone of Object.values(statusColors)) {
      expect(contrastRatio(tone.foreground, tone.background)).toBeGreaterThanOrEqual(
        accessibilityThresholds.normalTextContrast
      );
    }
    expect(() => contrastRatio("transparent", colors.surface)).toThrow(
      "RJDS_CONTRAST_COLOR_INVALID"
    );
  });

  it("defines Resident Job workflow status meanings without crossing boundaries", () => {
    expect(residentJobStatusDefinitions.invoiceIssued.meaning).toContain("payment is separate");
    expect(residentJobStatusDefinitions.workerEnRoute.meaning).toContain("attendance has not started");
    expect(residentJobStatusDefinitions.paid.meaning).toContain("settlement reference");
    expect(residentJobStatusDefinitions.matching.meaning).toContain("AI remains advisory");
  });

  it("exports CSS variables for approved tokens", () => {
    expect(cssVariables["--rj-color-deep-teal"]).toBe(colors.deepTeal);
    expect(cssVariables["--rj-touch-minimum"]).toBe(`${touch.minimumTarget}px`);
    expect(createCssVariableBlock()).toContain("--rj-color-focus");
  });

  it("defines responsive and accessibility foundation values", () => {
    expect(breakpoints.tablet).toBe(768);
    expect(touch.minimumTarget).toBeGreaterThanOrEqual(44);
    expect(typographyRoles.numericKpi.fontVariantNumeric).toBe("tabular-nums");
    expect(componentStates).toContain("focus-visible");
    expect(dataStates).toContain("access-denied");
  });
});
