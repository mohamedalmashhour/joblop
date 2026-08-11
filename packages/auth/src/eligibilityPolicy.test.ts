import { describe, expect, it } from "vitest";
import {
  canWorkerExpressInterest,
  canWorkerReceiveOffer,
  canEmployerPublishMarketplaceJob,
  DEFAULT_VERIFICATION_POLICY,
  type VerificationPolicy
} from "./eligibilityPolicy";

const unverified = { identity: "unverified" as const, backgroundCheck: "unverified" as const };
const verified = { identity: "verified" as const, backgroundCheck: "verified" as const };

describe("eligibility policy", () => {
  it("default policy is permissive — unverified workers/employers are still allowed", () => {
    expect(canWorkerExpressInterest({ trust: unverified }).allowed).toBe(true);
    expect(canWorkerReceiveOffer({ trust: unverified }).allowed).toBe(true);
    expect(canEmployerPublishMarketplaceJob({ employerStatus: "unverified" }).allowed).toBe(true);
    expect(DEFAULT_VERIFICATION_POLICY.requireIdentityForInterest).toBe(false);
  });

  it("when identity is required for interest, unverified is blocked with a reason", () => {
    const policy: VerificationPolicy = { ...DEFAULT_VERIFICATION_POLICY, requireIdentityForInterest: true };
    expect(canWorkerExpressInterest({ trust: unverified, policy })).toEqual({ allowed: false, reasons: ["identity_required"] });
    expect(canWorkerExpressInterest({ trust: verified, policy }).allowed).toBe(true);
  });

  it("offer gate can require identity and/or background check", () => {
    const policy: VerificationPolicy = { ...DEFAULT_VERIFICATION_POLICY, requireIdentityForOffer: true, requireBackgroundCheckForOffer: true };
    expect(canWorkerReceiveOffer({ trust: unverified, policy }).reasons.slice().sort()).toEqual(["background_check_required", "identity_required"]);
    expect(canWorkerReceiveOffer({ trust: verified, policy }).allowed).toBe(true);
    // identity verified but background not
    expect(canWorkerReceiveOffer({ trust: { identity: "verified", backgroundCheck: "pending" }, policy }).reasons).toEqual(["background_check_required"]);
  });

  it("employer publish gate requires business_verified only when enabled", () => {
    const policy: VerificationPolicy = { ...DEFAULT_VERIFICATION_POLICY, requireEmployerVerifiedToPublish: true };
    expect(canEmployerPublishMarketplaceJob({ employerStatus: "unverified", policy })).toEqual({ allowed: false, reasons: ["employer_verification_required"] });
    expect(canEmployerPublishMarketplaceJob({ employerStatus: "business_verified", policy }).allowed).toBe(true);
  });
});
