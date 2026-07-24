export type ShiftDraft = {
  employerOrganization: string;
  residence: string;
  department: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  workerCount: string;
  responsibilities: string;
  qualificationRequirements: string;
  experienceRequirement: string;
  rate: string;
  urgentPremium: string;
  transportTerms: string;
  travelAllowance: string;
  notes: string;
  shiftType: "Normal" | "Recurring" | "Urgent";
  recurrence: string;
  publicationState: "Draft" | "Validation Required" | "Ready" | "Publication Requested" | "Published";
};

export const shiftDraftStorageKey = "rwos.employer.shiftDraft.v1";

export const defaultShiftDraft: ShiftDraft = {
  employerOrganization: "Development fixture organization",
  residence: "Development fixture residence",
  department: "Kitchen",
  role: "Kitchen aide",
  date: "2026-08-01",
  startTime: "16:00",
  endTime: "21:00",
  timezone: "Local timezone",
  workerCount: "2",
  responsibilities: "Dining prep, dish area support, closing cleanup",
  qualificationRequirements: "Food handling requirement where applicable",
  experienceRequirement: "Previous residence or food-service experience preferred",
  rate: "Configured worker-facing rate summary",
  urgentPremium: "Not applied",
  transportTerms: "Standard arrival responsibility",
  travelAllowance: "Configured only where governed",
  notes: "Development fixture only. Not submitted to a server.",
  shiftType: "Normal",
  recurrence: "Not recurring",
  publicationState: "Draft"
};

export const requiredShiftFields: readonly (keyof ShiftDraft)[] = [
  "employerOrganization",
  "residence",
  "department",
  "role",
  "date",
  "startTime",
  "endTime",
  "timezone",
  "workerCount",
  "responsibilities",
  "qualificationRequirements",
  "rate"
] as const;

export function validateShiftDraft(draft: ShiftDraft) {
  const missing = requiredShiftFields.filter((field) => !draft[field].trim());
  return {
    missing,
    state: missing.length > 0 ? "Validation Required" : "Ready"
  } as const;
}

export function markPublicationRequested(draft: ShiftDraft): ShiftDraft {
  return {
    ...draft,
    publicationState: "Publication Requested"
  };
}

export function markPublishedFixture(draft: ShiftDraft): ShiftDraft {
  return {
    ...draft,
    publicationState: "Published"
  };
}

export const shiftCreationHandoffs = [
  {
    title: "Review",
    route: "/employer/shifts/review",
    boundary: "Review validates development fixture data only."
  },
  {
    title: "Publish",
    route: "/employer/shifts/publish",
    boundary: "Publish records local fixture state only, not server publication."
  },
  {
    title: "Shift Detail",
    route: "/employer/shifts/detail",
    boundary: "Detail shows fixture-backed status and routes to applicants."
  },
  {
    title: "Applicants",
    route: "/employer/applicants",
    boundary: "Applicants is the next authoritative review workflow."
  }
] as const;

export const shiftOperationalStates = [
  "Draft",
  "Validation Required",
  "Ready",
  "Published",
  "Applications Open",
  "Candidate Review",
  "Assignment Pending",
  "Assigned",
  "In Progress",
  "Completed",
  "Cancelled",
  "Expired",
  "Unfilled",
  "Replacement Required"
] as const;

export const shiftDataStates = [
  "Development fixture",
  "Local browser state",
  "Integration pending",
  "No server persistence",
  "No backend publication"
] as const;

