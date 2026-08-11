// Eligibility policy — ONE server-side place for trust/verification rules, instead of
// scattering them across UI components. Verification is an INPUT to eligibility.
//
// The default policy is PERMISSIVE: verification is tracked but not yet required, so existing
// flows keep working. Tightening a rule is a single governed config change here — never a
// browser or per-component decision.

import type { WorkerVerificationStatus, EmployerVerificationStatus } from "./verification";

export type VerificationPolicy = Readonly<{
  requireIdentityForInterest: boolean;
  requireIdentityForOffer: boolean;
  requireBackgroundCheckForOffer: boolean;
  requireEmployerVerifiedToPublish: boolean;
}>;

// Default: nothing is gated on verification yet (permissive). Trust states are still recorded
// and surfaced; turning a switch on here is how JobLop later enforces a rule everywhere.
export const DEFAULT_VERIFICATION_POLICY: VerificationPolicy = {
  requireIdentityForInterest: false,
  requireIdentityForOffer: false,
  requireBackgroundCheckForOffer: false,
  requireEmployerVerifiedToPublish: false
};

export type EligibilityPolicyReason =
  | "identity_required"
  | "background_check_required"
  | "employer_verification_required";

export type EligibilityDecision = Readonly<{ allowed: boolean; reasons: readonly EligibilityPolicyReason[] }>;

export type WorkerTrust = Readonly<{ identity: WorkerVerificationStatus; backgroundCheck: WorkerVerificationStatus }>;

function decide(reasons: EligibilityPolicyReason[]): EligibilityDecision {
  return { allowed: reasons.length === 0, reasons };
}

export function canWorkerExpressInterest(input: { trust: WorkerTrust; policy?: VerificationPolicy }): EligibilityDecision {
  const policy = input.policy ?? DEFAULT_VERIFICATION_POLICY;
  const reasons: EligibilityPolicyReason[] = [];
  if (policy.requireIdentityForInterest && input.trust.identity !== "verified") reasons.push("identity_required");
  return decide(reasons);
}

export function canWorkerReceiveOffer(input: { trust: WorkerTrust; policy?: VerificationPolicy }): EligibilityDecision {
  const policy = input.policy ?? DEFAULT_VERIFICATION_POLICY;
  const reasons: EligibilityPolicyReason[] = [];
  if (policy.requireIdentityForOffer && input.trust.identity !== "verified") reasons.push("identity_required");
  if (policy.requireBackgroundCheckForOffer && input.trust.backgroundCheck !== "verified") reasons.push("background_check_required");
  return decide(reasons);
}

export function canEmployerPublishMarketplaceJob(input: {
  employerStatus: EmployerVerificationStatus;
  policy?: VerificationPolicy;
}): EligibilityDecision {
  const policy = input.policy ?? DEFAULT_VERIFICATION_POLICY;
  const reasons: EligibilityPolicyReason[] = [];
  if (policy.requireEmployerVerifiedToPublish && input.employerStatus !== "business_verified") {
    reasons.push("employer_verification_required");
  }
  return decide(reasons);
}
