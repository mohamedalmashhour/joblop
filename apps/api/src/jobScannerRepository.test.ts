import { describe, expect, it } from "vitest";
import { leadQueryTokens } from "./jobScannerRepository";

// The role/keyword search tokenizer that powers JobScanner relevance filtering. When a visitor
// searches "chef", queryStoredLeads narrows to leads whose title/employer/category contain a token,
// instead of returning every lead merely ranked — the "mixed results" bug this fixes.
describe("leadQueryTokens", () => {
  it("returns no tokens for empty/undefined/whitespace input", () => {
    expect(leadQueryTokens(undefined)).toEqual([]);
    expect(leadQueryTokens("")).toEqual([]);
    expect(leadQueryTokens("   ")).toEqual([]);
    expect(leadQueryTokens(" , , ")).toEqual([]);
  });

  it("splits a single role into one token", () => {
    expect(leadQueryTokens("chef")).toEqual(["chef"]);
    expect(leadQueryTokens("  chef  ")).toEqual(["chef"]);
  });

  it("splits on whitespace and commas, dropping empties", () => {
    expect(leadQueryTokens("chef cook")).toEqual(["chef", "cook"]);
    expect(leadQueryTokens("chef, cook")).toEqual(["chef", "cook"]);
    expect(leadQueryTokens("chef,  , cook  dishwasher")).toEqual(["chef", "cook", "dishwasher"]);
  });

  it("caps at 8 tokens so a pathological query can't explode the OR filter", () => {
    const many = Array.from({ length: 20 }, (_, i) => `role${i}`).join(" ");
    expect(leadQueryTokens(many)).toHaveLength(8);
  });
});
