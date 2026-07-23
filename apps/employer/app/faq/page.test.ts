import { describe, expect, it } from "vitest";
import { aiFaqRules, faqAnswers, faqCategories, sensitiveSearchWarning } from "./faqContent";

describe("Page 006 FAQ content", () => {
  it("keeps the approved FAQ categories visible", () => {
    expect(faqCategories).toContain("Safety And Active-Shift Support");
    expect(faqCategories).toContain("AI And Automated Assistance");
    expect(faqCategories).toContain("Pricing, Billing, And Invoices");
  });

  it("requires visible governance metadata on every answer", () => {
    for (const answer of faqAnswers) {
      expect(answer.governance.owner).toBeTruthy();
      expect(["Draft", "Under Review", "Approved", "Archived"]).toContain(
        answer.governance.reviewStatus
      );
      expect(answer.governance.version).toBe("Version 1.x");
      expect(answer.governance.lastReviewed).toBe("Pending");
      expect(answer.governance.sourceOfTruth).toBeTruthy();
      expect(answer.governance.escalationPath).toBeTruthy();
    }
  });

  it("keeps active-shift and AI answers truthful", () => {
    const copy = faqAnswers.map((answer) => `${answer.summary} ${answer.detail}`).join(" ");
    expect(copy).toContain("Replacement availability is not guaranteed");
    expect(copy).toContain("AI cannot");
    expect(copy).not.toMatch(/automatically assigns|staffing is guaranteed|invoice is guaranteed/i);
  });

  it("prevents automatic AI publication and metadata removal", () => {
    expect(aiFaqRules).toContain("AI must not publish FAQ content automatically.");
    expect(aiFaqRules).toContain("AI must not remove governance metadata.");
    expect(aiFaqRules).toContain("AI must not invent policy.");
  });

  it("warns against sensitive public search input", () => {
    expect(sensitiveSearchWarning).toContain("Do not include banking credentials.");
    expect(sensitiveSearchWarning).toContain("Do not include unnecessary health records.");
  });
});
