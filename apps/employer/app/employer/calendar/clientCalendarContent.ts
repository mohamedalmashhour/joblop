import type { AssignmentCalendarVisibility, ClientCalendarEvent } from "@rwos/shared";

export const clientCalendarWorkflow = [
  {
    page: "C01",
    title: "Request Calendar",
    route: "/employer/calendar",
    status: "Client calendar",
    boundary: "Your requests and where each one stands."
  },
  {
    page: "C02",
    title: "Create Staffing Request",
    route: "/employer/calendar/create",
    status: "Persisted request entry",
    boundary: "Creates a persisted draft; publishing and assignment remain separate workflows."
  },
  {
    page: "C03",
    title: "Request Detail",
    route: "/employer/calendar/request",
    status: "Client detail",
    boundary: "Status and readiness display only; admin review remains a separate role workflow."
  },
  {
    page: "C04",
    title: "Staffing Progress",
    route: "/employer/calendar/assignment",
    status: "Dispatch progress",
    boundary:
      "How many workers are confirmed for your request."
  }
] as const;

export const clientCalendarStatuses = [
  "draft",
  "submitted",
  "under_review",
  "published",
  "assigned",
  "in_progress",
  "completed",
  "cancelled"
] as const;

export const clientCalendarEvent = {
  audience: "client",
  eventType: "client_request",
  requestId: "request_calendar_001",
  organizationId: "org_sunrise_001",
  roleLabel: "Personal Support Worker",
  requestedWorkerCount: 2,
  startsAt: "2026-08-03T12:00:00.000Z",
  endsAt: "2026-08-03T20:00:00.000Z",
  timezone: "America/Toronto",
  locationSummary: "Sunrise of Oak Hill, Toronto",
  status: "assigned",
  clientEconomics: {
    billRate: { amountMinor: 4500, currency: "CAD" },
    termsVersion: "client-terms-v1"
  }
} satisfies ClientCalendarEvent;

export const clientRequestDetail = {
  role: clientCalendarEvent.roleLabel,
  date: "August 3, 2026",
  start: "8:00 AM",
  end: "4:00 PM",
  workers: clientCalendarEvent.requestedWorkerCount,
  qualifications: ["PSW certificate", "Current vulnerable-sector screening"],
  duties: "Support the scheduled resident-care routine and document operational handoff.",
  clientRate: "$45.00 CAD / hour",
  transportation: "Client transport allowance configured: $5.00 CAD",
  address: "Sunrise of Oak Hill, Toronto",
  specialInstructions: "Report to reception and ask for the duty supervisor.",
  contractVerification: "Confirmed",
  paymentVerification: "Verified payment method on file — details hidden",
  mapPlaceholder: "Map preview unavailable in fixture mode — no map provider connected"
} as const;

export const clientCalendarRows = clientCalendarStatuses.map((status, index) => ({
  id: `calendar_fixture_${index + 1}`,
  role: index % 2 === 0 ? "Personal Support Worker" : "Dietary Aide",
  date: `Aug ${3 + index}, 2026`,
  time: index % 2 === 0 ? "8:00 AM–4:00 PM" : "3:00 PM–11:00 PM",
  status,
  route: "/employer/calendar/request"
}));

export const clientCalendarPrimaryLinks = [
  { label: "Create staffing request", from: "/employer/calendar", to: "/employer/calendar/create" },
  {
    label: "Review fixture request",
    from: "/employer/calendar/create",
    to: "/employer/calendar/request?mode=fixture"
  },
  {
    label: "View authorized assignment",
    from: "/employer/calendar/request",
    to: "/employer/calendar/assignment"
  },
  {
    label: "Back to request calendar",
    from: "/employer/calendar/assignment",
    to: "/employer/calendar"
  }
] as const;

export const clientAssignmentVisibility = {
  audience: "client",
  eventType: "assignment_visibility",
  assignmentId: "assignment_calendar_001",
  requestId: "request_calendar_001",
  status: "confirmed",
  assignedWorker: {
    displayName: "Amina K.",
    roleLabel: "Personal Support Worker"
  }
} satisfies AssignmentCalendarVisibility;
