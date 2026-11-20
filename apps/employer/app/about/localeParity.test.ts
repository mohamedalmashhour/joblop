import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aboutCopy, trustMechanisms } from "./aboutContent";

/** Same shape: same keys, same array lengths, recursively. */
function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shapeOf(inner)]));
  }
  return typeof value;
}

describe("about page languages", () => {
  it("has French and Arabic copy with the same shape as English, and different text", () => {
    const en = aboutCopy["en-CA"];
    for (const locale of ["fr-CA", "ar"] as const) {
      expect(shapeOf(aboutCopy[locale])).toEqual(shapeOf(en));
      expect(aboutCopy[locale].title).not.toBe(en.title);
      expect(aboutCopy[locale].trustMechanisms[0]?.title).not.toBe(en.trustMechanisms[0]?.title);
    }
    expect(en.trustMechanisms).toBe(trustMechanisms);
  });

  it("uses the shared site header (with the language switch) instead of its own", () => {
    const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(page).toContain('<SiteHeader current="/about" />');
    expect(page).not.toContain("<header");
  });
});
