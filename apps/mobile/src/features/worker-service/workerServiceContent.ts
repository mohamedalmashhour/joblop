export type WorkerServiceMode = "ownerReview" | "ratings" | "messages" | "support";

export const workerRatingStates = [
  "Available After Completed Shift",
  "Draft",
  "Submitted",
  "Under Moderation",
  "Published Where Permitted",
  "Hidden",
  "Disputed",
  "Archived"
] as const;

export const workerMessageStates = [
  "Unread",
  "Read",
  "Worker Reply Draft",
  "Sent",
  "Delivery Unknown",
  "Archived",
  "Moderation Review"
] as const;

export const workerSupportStates = [
  "Question",
  "Support",
  "Active Shift Support",
  "Operational Review",
  "Closed",
  "Reopened"
] as const;

export const workerServiceBoundaries = [
  "Ratings do not determine automatic discipline",
  "Messages do not approve shifts, attendance, timesheets or payments",
  "Support cases do not modify authoritative workflow state",
  "AI may summarize or guide, but cannot send messages, publish ratings or close support cases"
] as const;

export const workerOwnerReviewSteps = [
  "Public Entry",
  "Worker Sign Up",
  "Identity/Profile",
  "Role/Qualifications",
  "Availability/Preferences",
  "Dashboard",
  "Available Shifts",
  "Shift Detail",
  "Apply",
  "Application Status",
  "Assignment Offer",
  "Terms Review",
  "Accept/Decline",
  "Upcoming Assignment",
  "Arrival/Attendance",
  "Clock-in",
  "In progress",
  "Break",
  "Clock-out",
  "Timesheet Review",
  "Earnings/Payable",
  "Ratings",
  "Messages",
  "Support"
] as const;

export function getWorkerServiceFixtureDisclosure() {
  return [
    "Fixture-backed service content only",
    "No real messages are sent",
    "No rating is published",
    "No support case is opened or closed"
  ] as const;
}

