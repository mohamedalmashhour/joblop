export type ApplicantStatus =
  | "New"
  | "Under review"
  | "Shortlisted"
  | "Clarification requested"
  | "Selected for assignment review"
  | "Not selected";

export type AssignmentStatus =
  | "Proposed"
  | "Pending Response"
  | "Accepted"
  | "Declined"
  | "Expired"
  | "Cancelled";

export type ApplicantSummary = {
  id: string;
  displayName: string;
  roleFit: string;
  availability: string;
  experience: string;
  qualifications: string;
  aiExplanation: string;
  status: ApplicantStatus;
  privacyLevel: string;
};

export const assignmentWorkflow = [
  {
    page: "045",
    title: "Applicants",
    route: "/employer/applicants",
    status: "Human review",
    boundary: "Applicant review does not assign workers or duplicate AI ranking."
  },
  {
    page: "045",
    title: "Applicant Detail",
    route: "/employer/applicants/detail",
    status: "Candidate detail",
    boundary: "Detail shows minimum necessary staffing information only."
  },
  {
    page: "045",
    title: "Candidate Comparison",
    route: "/employer/applicants/compare",
    status: "Human comparison",
    boundary: "Comparison supports review but does not create assignment or rejection."
  },
  {
    page: "058",
    title: "Manual Assignment",
    route: "/employer/assignments/manual",
    status: "Human selection",
    boundary: "Manual selection cannot bypass eligibility or accepted shift terms."
  },
  {
    page: "058",
    title: "Assignment Review",
    route: "/employer/assignments/review",
    status: "High-impact review",
    boundary: "Review records a human decision but does not simulate worker acceptance."
  },
  {
    page: "058",
    title: "Assignment Confirmation",
    route: "/employer/assignments/confirmation",
    status: "Created fixture",
    boundary: "Assignment created does not mean worker notified or accepted."
  },
  {
    page: "046",
    title: "Worker Response State",
    route: "/employer/assignments/worker-response",
    status: "Awaiting worker",
    boundary: "Worker response state is displayed truthfully and never fabricated."
  },
  {
    page: "046",
    title: "Assignment Detail",
    route: "/employer/assignments/detail",
    status: "Assignment visibility",
    boundary: "Assignment detail does not own attendance, payroll, invoices, or payments."
  },
  {
    page: "048",
    title: "Attendance Handoff",
    route: "/employer/attendance",
    status: "Next milestone boundary",
    boundary: "Attendance monitoring is not implemented in this assignment milestone."
  }
] as const;

export const applicantFixtures: ApplicantSummary[] = [
  {
    id: "app-001",
    displayName: "Candidate A",
    roleFit: "Kitchen support experience aligns with the shift role.",
    availability: "Available for the published time window.",
    experience: "Three years of senior residence kitchen support.",
    qualifications: "Food safety credential visible as reviewed summary.",
    aiExplanation: "AI notes strong role and availability alignment; human review required.",
    status: "Shortlisted",
    privacyLevel: "Employer-visible operational summary only"
  },
  {
    id: "app-002",
    displayName: "Candidate B",
    roleFit: "Maintenance background partially aligns with role requirements.",
    availability: "Available with travel timing review.",
    experience: "Two years of facilities support.",
    qualifications: "Required credential summary appears complete.",
    aiExplanation: "AI flags travel timing as an uncertainty; human review required.",
    status: "Under review",
    privacyLevel: "No sensitive profile, banking, health, or investigation data exposed"
  },
  {
    id: "app-003",
    displayName: "Candidate C",
    roleFit: "Care aide experience aligns with alternate shift needs.",
    availability: "Potential conflict requires worker clarification.",
    experience: "Five years in resident support roles.",
    qualifications: "Credential review summary visible; source documents stay private.",
    aiExplanation: "AI recommends clarification before any assignment decision.",
    status: "Clarification requested",
    privacyLevel: "Worker-private notes and platform-only review data hidden"
  }
];

export const applicantFilters = [
  "All applicants",
  "Shortlisted",
  "Under review",
  "Clarification requested"
] as const;

export const applicantSorts = [
  "Newest first",
  "Availability",
  "Role fit",
  "Status"
] as const;

export const applicantBoundaries = [
  "Applicant review != Assignment",
  "Shortlisted != Selected",
  "AI explanation != Employer decision",
  "Visible qualification summary != Source credential file",
  "Employer notes must not use protected or retaliatory criteria"
] as const;

export const aiRecommendationBoundaries = [
  "Recommendation != Assignment",
  "Confidence != Approval",
  "AI first position != Required candidate",
  "AI summary != Eligibility decision",
  "AI cannot reject, rank secretly, notify, or assign workers"
] as const;

export const manualAssignmentLifecycle: AssignmentStatus[] = [
  "Proposed",
  "Pending Response",
  "Accepted",
  "Declined",
  "Expired",
  "Cancelled"
];

export const assignmentBoundaries = [
  "Candidate selected != Assignment created",
  "Assignment created != Worker notified",
  "Worker notified != Worker accepted",
  "Accepted != Attendance confirmed",
  "Attendance confirmed != Timesheet approved",
  "Timesheet approved != Payroll paid"
] as const;

export const assignmentDataStates = [
  "Fixture-backed candidate data",
  "Local browser assignment draft",
  "No backend assignment engine",
  "No real notifications",
  "No simulated worker acceptance",
  "Attendance integration pending"
] as const;

export const prohibitedSensitiveApplicantData = [
  "full date of birth",
  "banking details",
  "tax identifiers",
  "health information",
  "worker-private notes",
  "investigation material",
  "protected characteristics"
] as const;

export function getPrimaryApplicant() {
  const applicant = applicantFixtures[0];
  if (!applicant) {
    throw new Error("Applicant fixture is required for the employer applicant workflow.");
  }
  return applicant;
}

export function filterApplicants(filter: string, applicants = applicantFixtures) {
  if (filter === "All applicants") {
    return applicants;
  }
  return applicants.filter((applicant) => applicant.status === filter);
}

export function selectAssignmentCandidate(candidateId = "app-001") {
  const candidate = applicantFixtures.find((applicant) => applicant.id === candidateId) ?? getPrimaryApplicant();
  return {
    candidate,
    assignmentStatus: "Proposed" as AssignmentStatus,
    decisionActor: "Authorized employer operator",
    decisionReason: "Role, availability, and qualification summaries reviewed.",
    authoritativeHandoff: "Pending assignment workflow integration"
  };
}
