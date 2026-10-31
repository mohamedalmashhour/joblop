import { describe, expect, it } from "vitest";
import {
  accessibilityThresholds,
  brand,
  breakpoints,
  colors,
  componentStates,
  contrastRatio,
  createCssVariableBlock,
  createJoblopThemeBlock,
  cssVariables,
  dataStates,
  fonts,
  jlCssVariables,
  residentJobStatusDefinitions,
  shadows,
  statusColors,
  statusSemantics,
  touch,
  typeScale,
  typographyRoles
} from "./index";

describe("design system brand palette", () => {
  it("uses the fixed Joblop black + gold + cream foundation", () => {
    expect(brand.black).toBe("#000000");
    expect(brand.ink).toBe("#0c0c0c");
    expect(brand.gold).toBe("#c9a24b");
    expect(brand.goldStrong).toBe("#b8862f");
    expect(brand.goldDeep).toBe("#9a7122");
    expect(brand.goldSoft).toBe("#f0d9a0");
    expect(brand.cream).toBe("#faf6ec");
  });

  it("maps legacy color names onto the brand palette (no raw blue/teal values)", () => {
    expect(colors.deepTeal).toBe(brand.goldStrong);
    expect(colors.actionTeal).toBe(brand.gold);
    expect(colors.navy).toBe(brand.black);
    expect(colors.text).toBe(brand.text);
  });

  it("carries no blue or teal in status backgrounds (warm/gold neutrals only)", () => {
    // Previously neutral/informational used blue (#eef5f5 / #eef4ff / #bfd0f5). Guard against
    // regressions: every neutral/informational surface must be a warm (red-dominant) hue.
    for (const tone of ["neutral", "informational"] as const) {
      const bg = statusColors[tone].background.toLowerCase();
      const [r, , b] = bg
        .slice(1)
        .match(/.{2}/g)!
        .map((c) => Number.parseInt(c, 16));
      expect(r).toBeGreaterThan(b!); // warm, never blue-dominant
    }
  });
});

describe("design system typography", () => {
  it("defines the two brand families: Playfair Display serif + Inter sans", () => {
    expect(fonts.serif).toContain("Playfair Display");
    expect(fonts.serif).toContain("serif");
    expect(fonts.sans).toContain("Inter");
    expect(fonts.serif).toContain("--font-serif");
    expect(fonts.sans).toContain("--font-sans");
  });

  it("pairs serif headings with a sans body across the type scale", () => {
    expect(typeScale.display.family).toBe(fonts.serif);
    expect(typeScale.h1.family).toBe(fonts.serif);
    expect(typeScale.h2.family).toBe(fonts.serif);
    expect(typeScale.h3.family).toBe(fonts.serif);
    expect(typeScale.body.family).toBe(fonts.sans);
    expect(typeScale.label.family).toBe(fonts.sans);
    expect(typeScale.eyebrow.textTransform).toBe("uppercase");
  });
});

describe("design system status + semantics", () => {
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
});

describe("design system css variables", () => {
  it("exports the --jl-* brand variables for every app to theme from", () => {
    expect(jlCssVariables["--jl-black"]).toBe(brand.black);
    expect(jlCssVariables["--jl-gold"]).toBe(brand.gold);
    expect(jlCssVariables["--jl-font-serif"]).toBe(fonts.serif);
    expect(jlCssVariables["--jl-shadow-md"]).toBe(shadows.md);
    expect(createJoblopThemeBlock()).toContain("--jl-gold-strong");
    expect(createJoblopThemeBlock()).toContain("--jl-font-sans");
  });

  it("keeps the legacy --rj-* variables working for compatibility", () => {
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
