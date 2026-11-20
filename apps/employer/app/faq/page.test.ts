import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getLandingContent } from "../landingContent";
import { faqCopy, faqIds, homeFaqAnchors } from "./faqContent";

const locales = ["en-CA", "fr-CA", "ar"] as const;
const pageSource = readFileSync(join(__dirname, "page.tsx"), "utf8");

describe("public /faq", () => {
  it("has 10 to 15 real answers in English, French and Arabic", () => {
    expect(faqIds.length).toBeGreaterThanOrEqual(10);
    expect(faqIds.length).toBeLessThanOrEqual(15);
    for (const locale of locales) {
      for (const id of faqIds) {
        const [question, answer] = faqCopy[locale].answers[id];
        expect(question.length).toBeGreaterThan(5);
        expect(answer.length).toBeGreaterThan(30);
      }
    }
  });

  it("answers every home page FAQ question with a real anchor", () => {
    for (const locale of locales) {
      const home = getLandingContent(locale).faq.questions;
      expect(homeFaqAnchors).toHaveLength(home.length);
      home.forEach((question, i) => {
        expect(faqCopy[locale].answers[homeFaqAnchors[i]!][0]).toBe(question);
      });
    }
  });

  it("drops the placeholder search, governance metadata and share leaks", () => {
    expect(pageSource).not.toMatch(/<input|placeholder|Governance|Review Status|Source of Truth/);
    for (const locale of locales) {
      const text = JSON.stringify(faqCopy[locale]);
      expect(text).not.toMatch(/margin|marge|commission|share of|hourly share|part horaire|حصة|هامش|عمولة|20 ?%|Stripe|4242/i);
    }
  });

  it("states the cancellation and payment rules", () => {
    const en = JSON.stringify(faqCopy["en-CA"]);
    expect(en).toContain("24 hours or more before the start is free");
    expect(en).toContain("billed 6 hours");
    expect(en).toContain("Interac e-transfer");
    expect(en).toContain("Canceling stops the next month.");
  });
});
