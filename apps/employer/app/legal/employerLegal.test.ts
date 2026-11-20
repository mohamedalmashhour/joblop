import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pricingCopy } from "../pricing/pricingContent";
import { employerPrivacy, employerTerms } from "./employerLegal";
import { employerLegalLanguage } from "./LegalDocumentPage";

const app = join(__dirname, "..");
const read = (path: string) => readFileSync(join(app, path), "utf8");
const text = (blocks: unknown) => JSON.stringify(blocks);

describe("employer Terms and Privacy", () => {
  it("are real documents in English and French with the same structure", () => {
    for (const docs of [employerTerms, employerPrivacy]) {
      expect(docs.fr.map((b) => b.kind)).toEqual(docs.en.map((b) => b.kind));
      expect(docs.en.length).toBeGreaterThan(30);
    }
    expect(text(employerTerms.ar)).toContain("النصّان الفرنسي والإنجليزي هما المعتمدان");
    expect(text(employerPrivacy.ar)).toContain("النصّان الفرنسي والإنجليزي هما المعتمدان");
  });

  it("say the same as the Pricing page, in both languages", () => {
    const enTerms = text(employerTerms.en);
    const frTerms = text(employerTerms.fr);
    for (const point of [...pricingCopy["en-CA"].shortPoints.slice(4, 6), ...pricingCopy["en-CA"].cancelPoints.slice(1)]) {
      expect(enTerms).toContain(point);
    }
    expect(enTerms).toContain("Canceling stops the next month");
    expect(frTerms).toContain(pricingCopy["fr-CA"].cancelPoints[1]!);
    expect(frTerms).toContain("L’annulation arrête le mois suivant");
    for (const fact of ["C$49", "C$149", "C$99", "14 days", "50% off", "at least 6 hours", "Interac e-transfer", "Stripe"]) {
      expect(enTerms).toContain(fact);
    }
    expect(enTerms).toContain("Joblop’s service fee is already included in that rate.");
  });

  it("never state the size of Joblop's service fee or the worker's rate", () => {
    for (const docs of [employerTerms, employerPrivacy]) {
      for (const lang of ["en", "fr", "ar"] as const) {
        expect(text(docs[lang])).not.toMatch(/margin|marge|\bcommission(?! d’accès)|20 ?%|هامش|عمولة/i);
      }
    }
  });

  it("disclose AI, speech, outside-Québec processing, Law 25 rights and account closing", () => {
    const privacy = text(employerPrivacy.en);
    for (const fact of ["Anthropic", "speech service (Google or Apple)", "United States", "Commission d’accès à l’information", "Privacy Officer, 9375-7649 Québec Inc.", "Delete my account", "Brevo", "Render"]) {
      expect(privacy).toContain(fact);
    }
  });

  it("pick the language from the site locale", () => {
    expect(employerLegalLanguage("fr-CA")).toBe("fr");
    expect(employerLegalLanguage("ar")).toBe("ar");
    expect(employerLegalLanguage("en-CA")).toBe("en");
  });
});

describe("employer public pages and footers", () => {
  it("render /terms, /privacy, /signin and /signup with the public header and footer", () => {
    for (const page of ["terms/page.tsx", "privacy/page.tsx"]) {
      expect(read(page)).toContain("LegalDocumentPage");
      expect(read(page)).not.toContain("EmployerShell");
    }
    expect(read("legal/LegalDocumentPage.tsx")).toContain("<PublicFooter nav={nav} />");
    expect(read("legal/LegalDocumentPage.tsx")).toContain("<PublicHeader nav={nav}");
    for (const page of ["signin/page.tsx", "signup/employer/page.tsx"]) {
      expect(read(page)).toContain("<PublicPageFrame");
      expect(read(page)).not.toContain("<EmployerShell");
    }
  });

  it("put Terms, Privacy and FAQ in every footer", () => {
    const footer = read("pricing/publicPageStyles.tsx");
    for (const href of ["/terms", "/privacy", "/faq"]) expect(footer).toContain(`href="${href}"`);
    for (const page of ["page.tsx", "contact/page.tsx", "about/page.tsx", "how-it-works/page.tsx"]) {
      expect(read(page)).toContain("<PublicSiteFooter />");
      expect(read(page)).not.toContain("<footer");
    }
    for (const page of ["pricing/page.tsx", "faq/page.tsx", "shared/PublicPageFrame.tsx"]) {
      expect(read(page)).toContain("<PublicFooter nav=");
    }
    const shell = read("employer/EmployerShell.tsx");
    for (const href of ["/terms", "/privacy", "/faq"]) expect(shell).toContain(`href="${href}"`);
  });

  it("translate the footer links", () => {
    expect(pricingCopy["fr-CA"].nav.terms).toBe("Conditions");
    expect(pricingCopy.ar.nav.privacy).toBe("الخصوصية");
  });
});
