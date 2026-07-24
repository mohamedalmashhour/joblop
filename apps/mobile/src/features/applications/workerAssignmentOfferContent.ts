export const workerApplicationStateModel = [
  "Draft",
  "Submitted",
  "Employer Reviewing",
  "Additional Information Requested",
  "Withdrawn",
  "Closed",
  "Selected for offer"
] as const;

export const workerAssignmentOfferStateModel = [
  "Proposed",
  "Pending Worker Response",
  "Accepted",
  "Declined",
  "Expired",
  "Cancelled"
] as const;

export const workerApplicationBoundaries = [
  "Viewing a shift != applying",
  "Applying != being selected",
  "Selected != assigned",
  "Assignment created != worker acceptance",
  "Worker acceptance != attendance",
  "Attendance != approved hours"
] as const;

export const workerOfferConsentChecklist = [
  "Review final shift time, residence, role and department",
  "Review compensation summary and any changed terms",
  "Confirm known requirements and cancellation expectations",
  "Respond deliberately; no automatic acceptance is performed"
] as const;

export const workerAssignmentFixtureDisclosure = [
  "Fixture-backed application, offer and confirmation records",
  "No backend assignment engine is connected",
  "No real notifications are sent",
  "Worker acceptance is not simulated by the app"
] as const;

export function getWorkerResponseBoundaryCopy() {
  return [
    "AI and matching signals may explain why an offer is relevant, but the worker response is a human decision.",
    "Declining a fixture-backed offer does not create a penalty, disciplinary event or hidden ranking.",
    "A confirmed assignment still hands off to attendance; it does not prove arrival, work performed or payable hours."
  ] as const;
}

