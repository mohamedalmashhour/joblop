import { describe, expect, it } from "vitest";
import { legalNameChangeBlocked } from "./organizationLegalName";

const base = { currentLegalName: "9375-7649 Québec inc.", requestedLegalName: "Other inc.", verified: true, platformAdmin: false };

describe("legalNameChangeBlocked", () => {
  it("stops a verified employer changing the legal name", () => {
    expect(legalNameChangeBlocked(base)).toBe(true);
  });

  it("allows an unverified company to change it", () => {
    expect(legalNameChangeBlocked({ ...base, verified: false })).toBe(false);
  });

  it("allows Joblop staff to change it", () => {
    expect(legalNameChangeBlocked({ ...base, platformAdmin: true })).toBe(false);
  });

  it("ignores a save that keeps the same legal name", () => {
    expect(legalNameChangeBlocked({ ...base, requestedLegalName: " 9375-7649  Québec inc. " })).toBe(false);
    expect(legalNameChangeBlocked({ ...base, requestedLegalName: null })).toBe(false);
  });
});
