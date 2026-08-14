import { describe, expect, it } from "vitest";
import {
  COUNTRY_CONFIG_ERRORS,
  isCountryProfileActivatable,
  resolveCountryConfig
} from "@rwos/config";
import { syriaCountryProfile } from "./profile";

describe("Syria country profile (isolated; gate CLOSED, incomplete)", () => {
  it("declares Syria country context values", () => {
    expect(syriaCountryProfile.country).toBe("syria");
    expect(syriaCountryProfile.currency).toBe("SYP");
    expect(syriaCountryProfile.timezone).toBe("Asia/Damascus");
    expect(syriaCountryProfile.phoneCountryCode).toBe("+963");
  });

  it("is NOT activatable — gate closed + DRAFT legal + unbound providers + undecided region", () => {
    expect(syriaCountryProfile.activationGate).toBe("closed");
    expect(syriaCountryProfile.legalTermsVersion).toBeNull();
    expect(syriaCountryProfile.privacyTermsVersion).toBeNull();
    expect(syriaCountryProfile.dataRegion).toBeNull();
    expect(syriaCountryProfile.providers).toEqual({ payment: null, sms: null, geocoding: null });
    expect(isCountryProfileActivatable(syriaCountryProfile)).toBe(false);
  });

  it("selecting Syria in production FAILS CLOSED (RWOS_COUNTRY_PROFILE_INCOMPLETE)", () => {
    expect(() =>
      resolveCountryConfig({
        rwosEnv: "production",
        country: "syria",
        registry: { syria: syriaCountryProfile }
      })
    ).toThrow(COUNTRY_CONFIG_ERRORS.INCOMPLETE);
  });
});
