import { describe, expect, it } from "vitest";
import {
  LEGAL_COMPANY,
  LEGAL_DOCUMENTS_VERSION,
  LEGAL_EFFECTIVE_DATE,
  legalLanguageFor,
  readAcceptedLegalVersion
} from "./legalDocuments";
import { privacyAdditions } from "./legalPrivacyAdditions";

describe("legal documents", () => {
  it("is version 2026-11-10, effective the same day", () => {
    expect(LEGAL_DOCUMENTS_VERSION).toBe("2026-11-10");
    expect(LEGAL_EFFECTIVE_DATE).toBe("2026-11-10");
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
});
