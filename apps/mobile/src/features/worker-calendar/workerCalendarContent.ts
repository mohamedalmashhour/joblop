import type {
  AttendanceHandoffState,
  WorkerConfirmedCalendarEvent,
  WorkerOfferCalendarEvent
} from "@rwos/shared";

export const workerOfferCalendarFixture = {
  audience: "worker",
  eventType: "published_offer",
  offerId: "offer_calendar_001",
  requestId: "request_calendar_001",
  roleLabel: "Personal Support Worker",
  clientDisplayName: "Sunrise of Oak Hill",
  locationSummary: "Toronto · 7 km away",
  dutiesSummary: "Support the scheduled resident-care routine and operational handoff.",
  qualifications: ["PSW certificate", "Current vulnerable-sector screening"],
  startsAt: "2026-08-03T12:00:00.000Z",
  endsAt: "2026-08-03T20:00:00.000Z",
  timezone: "America/Toronto",
  status: "accepted",
  publishedAt: "2026-07-27T14:00:00.000Z",
  respondedAt: "2026-07-27T14:30:00.000Z",
  workerEconomics: {
    hourlyRate: { amountMinor: 3000, currency: "CAD" },
    transportationCompensation: { amountMinor: 500, currency: "CAD" },
    termsVersion: "worker-terms-v1"
  }
} satisfies WorkerOfferCalendarEvent;

export const workerConfirmedCalendarFixture = {
  audience: "worker",
  eventType: "confirmed_assignment",
  assignmentId: "assignment_calendar_001",
  requestId: "request_calendar_001",
  workerId: "worker_fixture_self",
  roleLabel: "Personal Support Worker",
  clientDisplayName: "Sunrise of Oak Hill",
  locationSummary: "Sunrise of Oak Hill, Toronto",
  startsAt: "2026-08-03T12:00:00.000Z",
  endsAt: "2026-08-03T20:00:00.000Z",
  timezone: "America/Toronto",
  status: "confirmed"
} satisfies WorkerConfirmedCalendarEvent;

export const workerCalendarDisplay = {
  date: "Monday, August 3, 2026",
  hours: "8:00 AM–4:00 PM · 8 hours",
  wage: "$30.00 CAD / hour",
  transportation: "$5.00 CAD transportation compensation",
  estimatedEarnings: "$245.00 CAD estimated worker earnings",
  distance: "Approximately 7 km",
  mapPlaceholder: "Map placeholder · no map provider connected",
  responseBoundary: "Accept and decline update this fixture screen only; no server action or notification."
} as const;

export const workerCalendarPrivacy = [
  "Only worker-authorized offer economics are shown.",
  "Client commercial terms are not part of this view.",
  "Client payment information is not part of this view.",
  "Internal administrator notes are not part of this view.",
  "Acceptance is local fixture state until an authoritative Assignment exists."
] as const;

export const workerArrivalInstructions = {
  meetingPoint: "Report to reception at Sunrise of Oak Hill.",
  contactRole: "Ask for the duty supervisor.",
  timing: "Arrive 10 minutes before the scheduled start.",
  locationBoundary: "Operational location for this confirmed assignment only."
} as const;

export const workerAttendanceHandoff = {
  eventType: "attendance_handoff",
  assignmentId: workerConfirmedCalendarFixture.assignmentId,
  eligibility: "ready",
  authority: "handoff_only",
  attendanceExecution: "not_started"
} satisfies AttendanceHandoffState;
