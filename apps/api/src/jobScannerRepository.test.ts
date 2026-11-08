import { describe, expect, it } from "vitest";
import { expandLeadQueryTokens, leadMatchesWholeWord, leadQueryTokens } from "./jobScannerRepository";

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

  it("drops EN/FR stopwords so common words like 'de' don't match everything", () => {
    expect(leadQueryTokens("chef de cuisine")).toEqual(["chef", "cuisine"]);
    expect(leadQueryTokens("aide de la cuisine")).toEqual(["aide", "cuisine"]);
    expect(leadQueryTokens("head of the kitchen")).toEqual(["head", "kitchen"]);
    // a query that is only stopwords yields nothing (no match-everything)
    expect(leadQueryTokens("de la le")).toEqual([]);
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

describe("expandLeadQueryTokens", () => {
  it("adds the French job-title words for an English search, so Québec listings are found", () => {
    expect(expandLeadQueryTokens("driver", ["driver"])).toEqual(expect.arrayContaining(["driver", "chauffeur", "livreur"]));
    expect(expandLeadQueryTokens("Cleaner", ["Cleaner"])).toEqual(expect.arrayContaining(["cleaner", "entretien", "ménage"]));
  });
  it("matches a whole multi-word role and leaves unknown words alone", () => {
    expect(expandLeadQueryTokens("personal support worker", ["personal", "support", "worker"])).toContain("préposé");
    expect(expandLeadQueryTokens("plumber", ["plumber"])).toEqual(["plumber"]);
  });
});

describe("leadMatchesWholeWord", () => {
  it("does not match a search word hidden inside another word", () => {
    expect(leadMatchesWholeWord({ title: "Technicien d'écloserie", employer: "Cooke Aquaculture Inc." }, ["cook"])).toBe(false);
  });
  it("matches whole words, simple endings and accented French words", () => {
    expect(leadMatchesWholeWord({ title: "Line Cook", employer: "A&W" }, ["cook"])).toBe(true);
    expect(leadMatchesWholeWord({ title: "Cooks wanted" }, ["cook"])).toBe(true);
    expect(leadMatchesWholeWord({ title: "Préposée aux bénéficiaires" }, ["préposée"])).toBe(true);
    expect(leadMatchesWholeWord({ title: "Commis d'entrepôt" }, ["entrepôt"])).toBe(true);
    expect(leadMatchesWholeWord({ title: "Chauffeur-livreur" }, ["livreur"])).toBe(true);
  });
});
