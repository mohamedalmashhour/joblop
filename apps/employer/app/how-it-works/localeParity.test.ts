import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { howItWorksCopy, workerJourney } from "./howItWorksContent";

function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shapeOf(inner)]));
  }
  return typeof value;
}

describe("how it works page languages", () => {
  it("has French and Arabic copy with the same shape as English, and different text", () => {
    const en = howItWorksCopy["en-CA"];
    for (const locale of ["fr-CA", "ar"] as const) {
      expect(shapeOf(howItWorksCopy[locale])).toEqual(shapeOf(en));
      expect(howItWorksCopy[locale].title).not.toBe(en.title);
      expect(howItWorksCopy[locale].phases.map((phase) => phase.key)).toEqual(["before", "during", "after"]);
      expect(howItWorksCopy[locale].phases[0]?.title).not.toBe(en.phases[0]?.title);
    }
    expect(en.workerJourney).toBe(workerJourney);
  });

  it("uses the shared site header (with the language switch) instead of its own", () => {
    const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(page).toContain('<SiteHeader current="/how-it-works" />');
    expect(page).not.toContain("<header");
  });
});
