export type WorkerOnboardingStatus =
  | "Not Started"
  | "In Progress"
  | "Submitted"
  | "Review Pending"
  | "Information Required"
  | "Verified"
  | "Rejected"
  | "Expired"
  | "Renewal Required";

export const workerOnboardingFlow = [
  {
    title: "Public Entry",
    screen: "home",
    boundary: "Public entry explains the worker path but does not create an account."
  },
  {
    title: "Worker Sign Up",
    screen: "worker-signup",
    boundary: "Account setup does not verify identity, approve credentials, or guarantee work."
  },
  {
    title: "Identity and Profile Setup",
    screen: "worker-profile-setup",
    boundary: "Profile complete does not mean eligible for every shift."
  },
  {
    title: "Role and Qualification Setup",
    screen: "worker-qualifications-setup",
    boundary: "Document uploaded does not mean document approved."
  },
  {
    title: "Availability and Preferences",
    screen: "worker-availability-setup",
    boundary: "Availability influences matching but does not create assignment."
  },
  {
    title: "Onboarding Review",
    screen: "worker-onboarding-review",
    boundary: "Submitted does not mean verified."
  },
  {
    title: "Worker Dashboard",
    screen: "worker-dashboard",
    boundary: "Dashboard summarizes next steps and does not bypass review."
  }
] as const;

export const workerOnboardingStatuses: WorkerOnboardingStatus[] = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Review Pending",
  "Information Required",
  "Verified",
  "Rejected",
  "Expired",
  "Renewal Required"
];

export const workerProfileSections = [
  {
    title: "Identity and contact",
    fields: [
      "legal name",
      "preferred display name",
      "contact information",
      "preferred language",
      "emergency contact where governed",
      "accessibility needs where governed"
    ],
    status: "In Progress" as WorkerOnboardingStatus
  },
  {
    title: "Role and experience",
    fields: ["role or roles", "experience summary", "work history summary", "education"],
    status: "Submitted" as WorkerOnboardingStatus
  },
  {
    title: "Qualifications",
    fields: [
      "certifications",
      "qualification status",
      "work authorization state",
      "background-check state"
    ],
    status: "Review Pending" as WorkerOnboardingStatus
  },
  {
    title: "Service area and preferences",
    fields: [
      "service area",
      "transport availability",
      "maximum travel range",
      "availability calendar",
      "preferred shift types",
      "minimum acceptable rate",
      "urgent-shift preference",
      "notification consent state"
    ],
    status: "In Progress" as WorkerOnboardingStatus
  }
] as const;

export const onboardingTruthBoundaries = [
  "Submitted != Verified",
  "Document Uploaded != Document Approved",
  "Profile Complete != Eligible for Every Shift",
  "Availability Set != Assignment Created",
  "AI Guidance != Authoritative Decision"
] as const;

export const onboardingDataTruth = [
  "Fixture-backed worker onboarding data",
  "No backend account creation",
  "No identity verification integration",
  "No credential approval integration",
  "No background-check integration",
  "Worker dashboard handoff only"
] as const;

export function getOnboardingCompletionScore() {
  const completedSections = workerProfileSections.filter((section) =>
    ["Submitted", "Review Pending", "Verified"].includes(section.status)
  ).length;
  return Math.round((completedSections / workerProfileSections.length) * 100);
}

export function canSubmitOnboarding(statuses: readonly WorkerOnboardingStatus[]) {
  return statuses.every((status) => !["Not Started", "Rejected", "Expired"].includes(status));
}
