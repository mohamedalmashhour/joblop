import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { legalLanguageFor, privacyAdditions } from "@rwos/shared";
import { footerLinks, footerWords } from "../Footer";
import { accountDeletionFr, privacyPolicyFr, termsOfServiceFr } from "./workerLegalFr";
import { workerPrivacyArabic, workerTermsAdditions, workerTermsArabic } from "./workerLegalUpdates";

const content = readFileSync(join(__dirname, "content.tsx"), "utf8");
const footer = readFileSync(join(__dirname, "../Footer.tsx"), "utf8");
const headings = (blocks: readonly { kind: string }[]) => blocks.filter((block) => block.kind === "h2").length;

describe("worker legal pages", () => {
  it("keeps the approved October 26 English clauses word for word", () => {
    for (const sentence of [
      "We do <strong>not</strong> sell your personal information.",
      "You must be at least 18 years old and able to form a binding contract.",
      "Joblop is not the employer of workers unless expressly stated in a separate written",
      "Reply STOP to unsubscribe at any time, or",
      "We aim to complete deletion within{\" \"}"
    ]) {
      expect(content).toContain(sentence);
    }
  });

  it("has a complete French translation with the same sections", () => {
    expect(headings(privacyPolicyFr)).toBe(9);
    expect(headings(termsOfServiceFr)).toBe(14);
    expect(headings(accountDeletionFr)).toBe(4);
    expect(JSON.stringify(termsOfServiceFr)).toContain("Répondez STOP");
  });

  it("adds the new clauses in both languages and an Arabic summary that defers to French and English", () => {
    expect(workerTermsAdditions("fr").map((b) => b.kind)).toEqual(workerTermsAdditions("en").map((b) => b.kind));
    expect(JSON.stringify(workerTermsAdditions("en"))).toContain("C$12.99 per month");
    expect(content).toContain('privacyAdditions("worker", "en")');
    expect(content).toContain('privacyAdditions("worker", "fr")');
    expect(privacyAdditions("worker", "en").length).toBeGreaterThan(10);
    for (const blocks of [workerPrivacyArabic, workerTermsArabic]) {
      expect(JSON.stringify(blocks)).toContain("النصّان الفرنسي والإنجليزي هما المعتمدان");
    }
  });

  it("picks the page language from the site locale, including fr-CA", () => {
    expect(legalLanguageFor("fr-CA")).toBe("fr");
    for (const page of ["terms", "privacy", "account-deletion"]) {
      expect(readFileSync(join(__dirname, `../${page}/page.tsx`), "utf8")).toContain("readLegalLanguage(searchParams)");
    }
  });
});

describe("worker footer", () => {
  it("translates for fr-CA and Arabic (not only a bare 'fr')", () => {
    expect(footer).not.toContain('locale === "fr"');
    expect(footer).toContain("legalLanguageFor(locale)");
    expect(footerWords.fr.terms).toBe("Conditions d’utilisation");
    expect(footerWords.ar.privacy).toBe("الخصوصية");
  });

  it("links Terms, Privacy and account deletion", () => {
    expect([...footerLinks]).toEqual(["/terms", "/privacy", "/account-deletion"]);
    for (const href of footerLinks) expect(footer).toContain(`href="${href}"`);
  });
});
