export const workerShiftFilters = [
  "date",
  "role",
  "residence",
  "service area",
  "rate",
  "urgent status",
  "duration",
  "shift type",
  "qualification match",
  "transport terms"
] as const;

export const workerShiftDetailFields = [
  "employer or residence identity",
  "role",
  "department",
  "date",
  "start and end time",
  "timezone",
  "rate",
  "urgent premium",
  "transport terms",
  "travel terms",
  "responsibilities",
  "qualification requirements",
  "worker-count requirement",
  "eligibility summary",
  "application deadline",
  "cancellation terms",
  "data freshness",
  "fixture or integration status"
] as const;

export const workerShiftBoundaries = [
  "Visible Shift != Eligible Shift",
  "Eligible != Guaranteed Assignment",
  "Application Submitted != Selected",
  "AI Guidance != Authoritative Decision"
] as const;

export const workerShiftDataTruth = [
  "Fixture-backed shift discovery data",
  "No live eligibility engine",
  "No backend application persistence beyond mock repository",
  "No guaranteed assignment",
  "Data freshness shown from fixture updatedAt"
] as const;

export function getEligibilitySummary({
  hasRequiredCertifications,
  hasScheduleConflict
}: {
  hasRequiredCertifications: boolean;
  hasScheduleConflict: boolean;
}) {
  if (!hasRequiredCertifications) {
    return "Information required before eligibility can be confirmed.";
  }
  if (hasScheduleConflict) {
    return "Potential schedule conflict requires worker review.";
  }
  return "Profile appears aligned in fixture data; final selection is not guaranteed.";
}
