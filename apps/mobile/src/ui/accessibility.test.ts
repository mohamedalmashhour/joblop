import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const primitivesSource = readFileSync(new URL("./primitives.tsx", import.meta.url), "utf8");
const productionSource = readFileSync(new URL("../ProductionApp.tsx", import.meta.url), "utf8");
const fixtureSource = readFileSync(new URL("../../App.tsx", import.meta.url), "utf8");

describe("worker accessibility contracts", () => {
  it("announces disabled buttons and loading progress", () => {
    expect(primitivesSource).toContain("accessibilityState={{ disabled }}");
    expect(primitivesSource).toContain('accessibilityRole="progressbar"');
    expect(primitivesSource).toContain('accessibilityLiveRegion="polite"');
  });

  it("labels the production brand logo as a header for screen readers", () => {
    expect(productionSource).toContain('accessibilityRole="header"');
    expect(productionSource).toContain("accessibilityLabel={productName}");
  });

  it("exposes fixture navigation with tab semantics and selected state", () => {
    expect(fixtureSource).toContain('accessibilityRole="tablist"');
    expect(fixtureSource).toContain('accessibilityRole="tab"');
    expect(fixtureSource).toContain("accessibilityState={{ selected: activeTabId === tab.id }}");
  });
});
