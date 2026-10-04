import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getLandingContent, type LandingContent } from "./landingContent";

const landingSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const en = getLandingContent("en-CA");
const fr = getLandingContent("fr-CA");

function shape(c: LandingContent) {
  return {
    categories: c.categories.items.map((i) => i.key),
    pillars: c.experiences.pillars.map((p) => p.key),
    workerSteps: c.journeys.worker.length,
    employerSteps: c.journeys.employer.length,
    benefits: c.workers.benefits.length,
    controls: c.trust.controls.length,
    faq: c.faq.questions.length,
    nav: c.header.navLinks.length,
    operations: c.dashboard.operations.map((o) => o.filled)
  };
}

describe("Page 001 landing content", () => {
  it("keeps the approved staffing categories visible in both locales", () => {
    expect(en.categories.items.map((category) => category.name)).toEqual([
      "Kitchen",
      "Care / Nurse",
      "Housekeeping & Dining",
      "Maintenance"
    ]);
    // Role strings carry the Québec French source terms the business approved.
    expect(en.categories.items[0]?.roles).toContain("Chef diplômé");
    expect(en.categories.items[1]?.roles).toContain("Préposé(e) aux bénéficiaires");
    expect(fr.categories.items.map((category) => category.name)).toEqual([
      "Cuisine",
      "Soins / Infirmier",
      "Entretien ménager et salle à manger",
      "Entretien"
    ]);
  });

  it("separates worker and employer journeys", () => {
    expect(en.journeys.worker).toEqual([
      "Sign in",
      "Review owned offer",
      "Accept or decline",
      "See confirmed assignment",
      "Continue to attendance handoff"
    ]);
    expect(en.journeys.employer[0]).toBe("Create request");
    expect(fr.journeys.worker[0]).toBe("Se connecter");
    expect(fr.journeys.employer[0]).toBe("Créer une demande");
  });

  it("shows worker value and trust mechanisms without fake proof", () => {
    expect(en.workers.benefits).toContain("Private offer visibility");
    expect(en.workers.benefits).toContain("Truthful empty states");
    expect(en.trust.controls).toEqual([
      "Database-backed roles",
      "Tenant isolation",
      "Worker-owned records",
      "Human dispatch review",
      "Version conflict checks",
      "Attendance handoff boundary"
    ]);
  });

  it("keeps en-CA and fr-CA at structural parity (Bill 96)", () => {
    expect(shape(fr)).toEqual(shape(en));
    // Every landing string must differ between locales except shared proper nouns / data.
    expect(fr.hero.line1).not.toBe(en.hero.line1);
    expect(fr.cta.title).not.toBe(en.cta.title);
    expect(fr.staging.label).toBe("PRÉPRODUCTION");
    expect(fr.header.signIn).toBe("Se connecter");
    // Status styling is driven by a stable boolean, not the translated label.
    expect(en.dashboard.operations.map((o) => o.filled)).toEqual([true, false, false]);
  });

  it("routes public access and gates production without leaking legacy branding", () => {
    expect(landingSource).toContain('isProduction ? "/contact" : "/signup/employer"');
    expect(landingSource).toContain('href="/faq" style={styles.textLink}');
    expect(landingSource).toContain("JobLop");
    expect(landingSource).not.toContain("Resident Job");
    expect(landingSource).not.toContain("Resident Workforce OS home");
  });

  it("renders localized copy from the content module, not hard-coded English", () => {
    // The staging banner and worker headline now come from getLandingContent, so the
    // raw English must NOT be inlined in the page source any more.
    expect(landingSource).toContain("c.staging.label");
    expect(landingSource).not.toContain("Mobile-first staffing without hidden employer economics.");
    expect(en.staging.label).toBe("STAGING");
    expect(en.workers.title).toBe("Mobile-first staffing without hidden employer economics.");
  });

  it("labels the public staging landing page without changing production access", () => {
    expect(landingSource).toContain('process.env.RWOS_ENV === "staging"');
    expect(landingSource).toContain('process.env.NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER === "staging"');
    expect(en.staging.synthetic).toBe("SYNTHETIC DATA");
    expect(fr.staging.noProdData).toBe("AUCUNE DONNÉE CLIENT DE PRODUCTION");
  });
});
