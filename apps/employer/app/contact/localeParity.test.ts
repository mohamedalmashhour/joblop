import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeShiftIssues, contactCopy } from "./contactContent";

function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shapeOf(inner)]));
  }
  return typeof value;
}

describe("contact page languages", () => {
  it("has French and Arabic copy with the same shape as English, and different text", () => {
    const en = contactCopy["en-CA"];
    for (const locale of ["fr-CA", "ar"] as const) {
      expect(shapeOf(contactCopy[locale])).toEqual(shapeOf(en));
      expect(contactCopy[locale].title).not.toBe(en.title);
      expect(contactCopy[locale].activeShiftIssues[0]).not.toBe(en.activeShiftIssues[0]);
      expect(contactCopy[locale].paths).toHaveLength(2);
    }
    expect(en.activeShiftIssues).toBe(activeShiftIssues);
  });

  it("keeps the emergency guidance in every language", () => {
    expect(contactCopy["fr-CA"].lede).toContain("services d'urgence");
    expect(contactCopy.ar.lede).toContain("الطوارئ");
  });

  it("uses the shared site header (with the language switch) instead of its own", () => {
    const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(page).toContain('<SiteHeader current="/contact" />');
    expect(page).not.toContain("<header");
  });
});
