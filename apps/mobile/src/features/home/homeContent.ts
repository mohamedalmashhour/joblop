// Pure copy + the home destinations list. UI-free so the set of primary actions is unit-tested.

export type HomeDestination = "available" | "myShifts" | "calendar" | "earnings" | "onboarding";

export const homeDestinations: readonly Readonly<{ id: HomeDestination; label: string; description: string }>[] = [
  { id: "available", label: "Browse open shifts", description: "Find and apply to open shifts near you." },
  { id: "myShifts", label: "My shifts & applications", description: "Track what you've applied to and your confirmed shifts." },
  { id: "calendar", label: "My calendar", description: "See offers waiting for your response." },
  { id: "earnings", label: "My earnings", description: "What's registered to your account and what's been paid." },
  { id: "onboarding", label: "Get set up", description: "Complete your worker profile to receive offers." }
];

export const homeCopy = {
  title: "Welcome to JobLop",
  intro: "Your worker home. Browse open shifts, track your applications, check in to work, and see your earnings — all in one place.",
  signedOutNote: "Sign in to apply to shifts, check in, and see your earnings."
} as const;
