import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ar, en, fr } from "./i18n/messages";

const src = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("worker production wording", () => {
  it("My pay hides the test banner, chip and synthetic footer on the production tier", () => {
    const pay = src("./pay/MyPay.tsx");
    expect(pay).toContain("const production = isProductionTier();");
    expect(pay).toContain('t(production ? "pay.productionNotice" : "pay.defaultNotice")');
    expect(pay).toContain('t(production ? "pay.productionFooter" : "pay.footer")');
    expect(pay).toMatch(/production \? null : \([\s\S]*?pay\.syntheticChip/);
  });

  it("production pay wording has no test words in EN/FR/AR", () => {
    for (const dict of [en, fr, ar]) {
      for (const key of ["pay.productionNotice", "pay.productionFooter"] as const) {
        expect(dict[key]).toBeTruthy();
        expect(dict[key]).not.toMatch(/test|synth|essai|تجريب/i);
      }
      expect(dict["offers.footer"]).not.toMatch(/governed|encadrée|no money|aucun argent/i);
    }
  });

  it("the Stripe TEST card hint is never shown on the production tier", () => {
    const pro = src("./cv-builder/ProUpgrade.tsx");
    expect(pro).toContain("cardEnabled && !isProductionTier()");
  });

  it("onboarding shows a plain agreement line with no version code", () => {
    const onboarding = src("./onboarding/Onboarding.tsx");
    expect(onboarding).toContain("I accept and sign my employment agreement.");
    expect(onboarding).not.toMatch(/agreement \(version/);
  });

  it("/browse makes no unbuilt claims and has a single footer", () => {
    const browse = src("./browse/PublicJobBoard.tsx");
    expect(browse).not.toMatch(/Background checked|Secure Payments|fCareers|fCookie/);
    expect(src("./FooterGate.tsx")).toContain('"/browse"');
    expect(src("./layout.tsx")).toMatch(/<FooterGate>\s*<Footer/);
  });
});
