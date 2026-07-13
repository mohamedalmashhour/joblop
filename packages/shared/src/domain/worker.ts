export const preferredLanguages = ["en", "fr", "ar"] as const;
export const workEligibilityStatuses = ["unknown", "pending", "verified", "rejected", "expired"] as const;
export const verificationStatuses = ["unverified", "pending", "verified", "rejected"] as const;

export type PreferredLanguage = (typeof preferredLanguages)[number];
export type WorkEligibilityStatus = (typeof workEligibilityStatuses)[number];
export type VerificationStatus = (typeof verificationStatuses)[number];

export type WorkerIdentity = Readonly<{
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  preferredLanguage: PreferredLanguage;
  profilePhotoUrl: string | null;
  city: string;
  province: string;
  country: string;
  workEligibilityStatus: WorkEligibilityStatus;
  profileCompletionPercent: number;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}>;
