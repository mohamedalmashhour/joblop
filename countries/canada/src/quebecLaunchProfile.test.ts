import { describe, expect, it } from "vitest";
import { isCountryProfileActivatable, resolveCountryConfig } from "@rwos/config";
import { LEGAL_DOCUMENTS_VERSION, moneyEngineCurrencies } from "@rwos/shared";
import { canadaCountryProfile } from "./profile";
import { CANADA_QUEBEC_COUNTRY_KEY, canadaQuebecCountryProfile } from "./quebecLaunchProfile";

describe("Canada/Québec launch profile", () => {
  it("is selected by RWOS_COUNTRY=canada-quebec", () => {
    expect(CANADA_QUEBEC_COUNTRY_KEY).toBe("canada-quebec");
    expect(canadaQuebecCountryProfile.country).toBe("canada-quebec");
  });

  it("is complete and activatable (open gate), unlike the closed reference profile", () => {
    expect(canadaQuebecCountryProfile.activationGate).toBe("open");
    expect(isCountryProfileActivatable(canadaQuebecCountryProfile)).toBe(true);
    expect(isCountryProfileActivatable(canadaCountryProfile)).toBe(false);
  });

  it("resolves in production and staging when it is in the registry", () => {
    const registry = { [CANADA_QUEBEC_COUNTRY_KEY]: canadaQuebecCountryProfile };
    for (const rwosEnv of ["production", "staging", "test", "local"]) {
      expect(resolveCountryConfig({ rwosEnv, country: "canada-quebec", registry })).toBe(
        canadaQuebecCountryProfile
      );
    }
  });

  it("carries the same country context as the Canada reference (CAD, America/Toronto, +1)", () => {
    expect(canadaQuebecCountryProfile.currency).toBe(canadaCountryProfile.currency);
    expect(canadaQuebecCountryProfile.timezone).toBe(canadaCountryProfile.timezone);
    expect(canadaQuebecCountryProfile.phoneCountryCode).toBe(canadaCountryProfile.phoneCountryCode);
    expect(canadaQuebecCountryProfile.dataRegion).toBe(canadaCountryProfile.dataRegion);
    expect(moneyEngineCurrencies as readonly string[]).toContain(canadaQuebecCountryProfile.currency);
  });

  it("uses the published legal version and declares EN/FR/AR and GST+QST", () => {
    expect(canadaQuebecCountryProfile.legalTermsVersion).toBe(`terms-${LEGAL_DOCUMENTS_VERSION}`);
    expect(canadaQuebecCountryProfile.privacyTermsVersion).toBe(`privacy-${LEGAL_DOCUMENTS_VERSION}`);
    expect(canadaQuebecCountryProfile.languages).toEqual(["en", "fr", "ar"]);
    expect(canadaQuebecCountryProfile.salesTaxes).toEqual([
      { code: "GST", ratePartsPerMillion: 50_000 },
      { code: "QST", ratePartsPerMillion: 99_750 }
    ]);
  });

  it("defaults the production job-flow and public sign-up flags ON", () => {
    expect(canadaQuebecCountryProfile.productionDefaults).toEqual({ jobFlow: true, publicSignup: true });
    expect(canadaCountryProfile.productionDefaults).toBeUndefined();
  });
});
