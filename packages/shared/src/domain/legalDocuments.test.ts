import { describe, expect, it } from "vitest";
import {
  LEGAL_COMPANY,
  LEGAL_DOCUMENTS_VERSION,
  LEGAL_EFFECTIVE_DATE,
  legalLanguageFor,
  readAcceptedLegalVersion
} from "./legalDocuments";
import { AI_FEATURES_ARABIC_SUMMARY, aiFeaturesSection } from "./legalAiFeatures";
import { privacyAdditions } from "./legalPrivacyAdditions";

describe("legal documents", () => {
  it("is version 2026-11-11, effective the same day", () => {
    expect(LEGAL_DOCUMENTS_VERSION).toBe("2026-11-11");
    expect(LEGAL_EFFECTIVE_DATE).toBe("2026-11-11");
    expect(LEGAL_COMPANY.legalName).toBe("9375-7649 Québec Inc.");
    expect(LEGAL_COMPANY.address).toBe("207-805 boul. Chomedey, Laval, QC H7V 0B1");
  });

  it("keeps only a date-shaped accepted version", () => {
    expect(readAcceptedLegalVersion("2026-11-09")).toBe("2026-11-09");
    expect(readAcceptedLegalVersion("<script>")).toBeNull();
    expect(readAcceptedLegalVersion(42)).toBeNull();
  });

  it("maps site and app locales to a legal language (fr-CA is French)", () => {
    expect(legalLanguageFor("fr-CA")).toBe("fr");
    expect(legalLanguageFor("fr")).toBe("fr");
    expect(legalLanguageFor("ar")).toBe("ar");
    expect(legalLanguageFor("en-CA")).toBe("en");
    expect(legalLanguageFor(undefined)).toBe("en");
  });

  it("gives the same privacy additions in French and English, with the Law 25 essentials", () => {
    for (const audience of ["worker", "employer"] as const) {
      const en = privacyAdditions(audience, "en");
      const fr = privacyAdditions(audience, "fr");
      expect(fr.map((block) => block.kind)).toEqual(en.map((block) => block.kind));
      const enText = JSON.stringify(en);
      const frText = JSON.stringify(fr);
      expect(enText).toContain("Commission d’accès à l’information");
      expect(frText).toContain("Commission d’accès à l’information");
      expect(enText).toContain("Privacy Officer, 9375-7649 Québec Inc.");
      expect(enText).toMatch(/United States/);
      expect(frText).toMatch(/États-Unis/);
      expect(enText).toContain("Portability");
      expect(enText).toContain("6 years");
    }
    expect(JSON.stringify(privacyAdditions("employer", "en"))).toContain("speech service (Google or Apple)");
    expect(JSON.stringify(privacyAdditions("worker", "en"))).toContain("A Joblop staff member always makes the decision");
  });

  it("adds section 11 on AI features after section 10, the same in French and English", () => {
    for (const audience of ["worker", "employer"] as const) {
      const en = aiFeaturesSection(audience, "en");
      const fr = aiFeaturesSection(audience, "fr");
      expect(fr.map((block) => block.kind)).toEqual(en.map((block) => block.kind));
      expect(en[0]).toMatchObject({ kind: "h2", id: "ai-features", text: "11. Artificial intelligence (AI) features" });
      expect(fr[0]).toMatchObject({ kind: "h2", text: "11. Fonctions d’intelligence artificielle (IA)" });
      // Section 11 is added at the end of the policy additions; section 10 comes first, unchanged.
      const all = privacyAdditions(audience, "en");
      expect(all.slice(-en.length)).toEqual(en);
      expect(all.findIndex((b) => b.kind === "h2" && b.id === "whats-new")).toBeLessThan(all.length - en.length);
      const enText = JSON.stringify(en);
      const frText = JSON.stringify(fr);
      for (const fact of [
        "Anthropic",
        "United States",
        "“Contact Joblop” chat assistant",
        "staff assistant",
        "No document, photo, scan or other image is ever sent",
        "goes straight to a person",
        "section 12.1",
        "Under our agreement with the provider",
        "does not use this information to train",
        "do not contain the text sent or received",
        "talk to a person",
        "Privacy Officer, 9375-7649 Québec Inc.",
        "turn off all outside AI features at any time"
      ]) {
        expect(enText).toContain(fact);
      }
      for (const fact of ["Anthropic", "États-Unis", "article 12.1", "Selon notre entente avec le fournisseur", "parler à une personne"]) {
        expect(frText).toContain(fact);
      }
      expect(AI_FEATURES_ARABIC_SUMMARY[audience]).toContain("Anthropic");
    }
    expect(JSON.stringify(aiFeaturesSection("worker", "en"))).toContain("CV and cover-letter builder");
    expect(JSON.stringify(aiFeaturesSection("employer", "en"))).not.toContain("CV");
    expect(JSON.stringify(aiFeaturesSection("employer", "en"))).toContain("The optional “Speak” button on the request form does not use Joblop’s servers or Anthropic");
    expect(JSON.stringify(aiFeaturesSection("worker", "en"))).not.toContain("Speak");
  });
});
