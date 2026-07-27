import type { AdminCalendarEvent } from "@rwos/shared";

export const adminCalendarEvent = {
  audience: "admin",
  eventType: "admin_review",
  requestId: "request_calendar_001",
  organizationId: "org_sunrise_001",
  clientDisplayName: "Sunrise of Oak Hill",
  roleLabel: "Personal Support Worker",
  requestedWorkerCount: 2,
  startsAt: "2026-08-03T12:00:00.000Z",
  endsAt: "2026-08-03T20:00:00.000Z",
  timezone: "America/Toronto",
  locationSummary: "Sunrise of Oak Hill, Toronto",
  dutiesSummary: "Support the scheduled resident-care routine.",
  qualifications: ["PSW certificate", "Current vulnerable-sector screening"],
  reviewStatus: "approved",
  publicationStatus: "published_to_workers",
  workerResponseStatus: "accepted",
  assignmentStatus: "confirmed",
  contractReadiness: "confirmed",
  paymentMethodReadiness: "verified",
  internalAdminNotes: "Fixture note: publish only to the approved PSW eligibility group.",
  clientEconomics: {
    billRate: { amountMinor: 4500, currency: "CAD" },
    termsVersion: "client-terms-v1"
  },
  workerOfferEconomics: {
    hourlyRate: { amountMinor: 3000, currency: "CAD" },
    transportationCompensation: { amountMinor: 500, currency: "CAD" },
    termsVersion: "worker-terms-v1"
  }
} satisfies AdminCalendarEvent;

export const adminCalendarRequests = [
  {
    id: "request_calendar_001",
    client: "Sunrise of Oak Hill",
    role: "Personal Support Worker",
    timing: "Aug 3 · 8:00 AM–4:00 PM",
    status: "Ready for review",
    route: "/calendar/request"
  },
  {
    id: "request_calendar_002",
    client: "Harbour Residence",
    role: "Dietary Aide",
    timing: "Aug 4 · 3:00 PM–11:00 PM",
    status: "Needs correction",
    route: "/calendar/request"
  },
  {
    id: "request_calendar_003",
    client: "Maple Grove",
    role: "Recreation Assistant",
    timing: "Aug 5 · 9:00 AM–5:00 PM",
    status: "Published",
    route: "/calendar/request"
  }
] as const;

export const adminReviewChecks = [
  { label: "Required fields", status: "Complete" },
  { label: "Contract", status: "Confirmed" },
  { label: "Payment method", status: "Verified — raw details hidden" },
  { label: "Location", status: "Verified — provider-neutral fixture" },
  { label: "Qualifications", status: "Configured; eligibility still enforced downstream" },
  { label: "Client pricing", status: "Terms version present" },
  { label: "Transportation", status: "Terms configured separately" }
] as const;

export const adminReviewActions = [
  "approve",
  "reject",
  "return",
  "publish",
  "pause",
  "cancel",
  "reprice"
] as const;

export const adminAiRecommendation = {
  title: "Advisory staffing recommendation",
  recommendation: "Keep the approved worker offer unchanged and monitor eligible responses.",
  evidence: "Role qualifications, schedule window, approved eligibility group, and fixture demand.",
  uncertainty: "Live worker availability and travel feasibility are not connected.",
  requiredDecision: "An authorized administrator must review and choose an action.",
  authority: "advisory_only"
} as const;

export const adminCalendarBoundaries = [
  "Client economics and worker-offer economics remain separate.",
  "Payment readiness never includes raw card, account, token, or provider secrets.",
  "Review controls update local fixture state only.",
  "AI cannot approve, publish, assign, reprice, or notify.",
  "The calendar cannot execute payroll or payment."
] as const;

export const adminAssignmentVisibility = {
  assignmentId: "assignment_calendar_001",
  requestId: adminCalendarEvent.requestId,
  status: "confirmed",
  workerDisplayName: "Amina K.",
  roleLabel: adminCalendarEvent.roleLabel,
  operationalStatus: "Ready for worker arrival",
  clientVisibility: "Assigned status and minimum worker display identity",
  workerVisibility: "Confirmed job, arrival instructions, and attendance handoff",
  attendance: {
    authority: "handoff_only",
    execution: "not_started"
  }
} as const;
