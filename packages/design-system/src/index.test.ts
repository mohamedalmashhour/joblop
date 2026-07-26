import { describe, expect, it } from "vitest";
import {
  breakpoints,
  colors,
  componentStates,
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
    expect(colors.deepTeal).toBe("#071f4d");
    expect(colors.deepTealMuted).toBe("#123b78");
    expect(colors.text).toBe("#0b1f3a");
  });

  it("defines non-color-only status semantics for governed states", () => {
    expect(statusColors.success.foreground).toBe(colors.success);
    expect(statusColors.warning.foreground).toBe(colors.warning);
    expect(statusColors.danger.foreground).toBe(colors.danger);
    expect(statusSemantics.warning).toContain("human review");
    expect(statusSemantics.informational).toContain("not an approval");
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
