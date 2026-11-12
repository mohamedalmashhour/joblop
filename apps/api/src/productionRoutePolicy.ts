// Production route policy (RWOS_ENV=production ONLY; local, test and staging never consult it).
//
// History: production used to 404 EVERY write under the job-flow route groups below, plus the
// dispatch candidate search, and /auth/register. That kept the core flow (offer accept, check-in,
// timesheets, staff dispatch) off in production. It is now governed by two explicit flags:
//
//   RWOS_JOB_FLOW_ENABLED       opens the job-flow routes listed in JOB_FLOW_ROUTES.
//   RWOS_PUBLIC_SIGNUP_ENABLED  opens POST /auth/register.
//
// Each flag is `enabled` / `disabled`; when unset it takes the selected country profile's default
// (Canada/Québec: ON). With no profile default the flags are OFF, i.e. the historical production
// behaviour exactly.
//
// The block is still the outer rule: a request under a job-flow group is blocked unless the flag is
// on AND its matched route template is on the allowlist. A route added under these groups later
// therefore stays blocked in production until someone reviews it and lists it here.

export type ProductionFeatureFlags = Readonly<{
  jobFlowEnabled: boolean;
  publicSignupEnabled: boolean;
}>;

export type ProductionFeatureDefaults = Readonly<{ jobFlow: boolean; publicSignup: boolean }>;

type FlagValue = "enabled" | "disabled" | null | undefined;

export function resolveProductionFeatureFlags(
  flags: Readonly<{ jobFlow: FlagValue; publicSignup: FlagValue }>,
  defaults: ProductionFeatureDefaults | undefined
): ProductionFeatureFlags {
  const pick = (value: FlagValue, fallback: boolean) =>
    value === "enabled" ? true : value === "disabled" ? false : fallback;
  return {
    jobFlowEnabled: pick(flags.jobFlow, defaults?.jobFlow === true),
    publicSignupEnabled: pick(flags.publicSignup, defaults?.publicSignup === true)
  };
}

/** The route groups production historically closed (all non-GET methods under these prefixes). */
export const JOB_FLOW_ROUTE_PREFIXES = [
  "/platform/dispatches",
  "/platform/worker-offers",
  "/worker/offers",
  "/platform/assignments",
  "/worker/assignments",
  "/platform/attendance",
  "/worker/attendance",
  "/platform/timesheets",
  "/worker/timesheets"
] as const;

/**
 * Routes RWOS_JOB_FLOW_ENABLED opens, as "METHOD <fastify route template>". Every entry is used by
 * the live flow: the worker site and phone app (worker routes), the admin console (staff routes),
 * or a staff recovery step for a best-effort automatic step (noted below).
 */
export const JOB_FLOW_ROUTES: readonly string[] = [
  // Worker: offers, assignments, attendance, timesheets (worker site + phone app).
  "POST /worker/offers/:workerOfferId/accept",
  "POST /worker/offers/:workerOfferId/decline",
  "POST /worker/assignments/:assignmentId/acknowledge",
  "POST /worker/assignments/:assignmentId/withdraw",
  "POST /worker/attendance/:attendanceRecordId/check-in",
  "POST /worker/attendance/:attendanceRecordId/check-out",
  "POST /worker/attendance/:attendanceRecordId/cancel",
  // "Report my hours": a shift worked with no check-in (staff approve or reject below).
  "POST /worker/attendance/:attendanceRecordId/report-hours",
  "POST /worker/timesheets/:timesheetId/confirm",
  "POST /worker/timesheets/:timesheetId/dispute",
  // Staff dispatch (admin console: create, review, source and shortlist, offer preparation, lifecycle).
  "POST /platform/dispatches",
  "POST /platform/dispatches/:dispatchReviewId/owner",
  "POST /platform/dispatches/:dispatchReviewId/candidate-review",
  "GET /platform/dispatches/:dispatchReviewId/candidates/search",
  "POST /platform/dispatches/:dispatchReviewId/candidates/evaluate",
  "POST /platform/dispatches/:dispatchReviewId/shortlist",
  "POST /platform/dispatches/:dispatchReviewId/shortlist/reorder",
  "POST /platform/dispatches/:dispatchReviewId/shortlist-ready",
  "POST /platform/dispatches/:dispatchReviewId/offer-preparation",
  "POST /platform/dispatches/:dispatchReviewId/pause",
  "POST /platform/dispatches/:dispatchReviewId/resume",
  "POST /platform/dispatches/:dispatchReviewId/cancel",
  "POST /platform/dispatches/:dispatchReviewId/close",
  // Staff worker offers.
  "POST /platform/worker-offers",
  "POST /platform/worker-offers/:workerOfferId/approve",
  "POST /platform/worker-offers/:workerOfferId/send",
  "POST /platform/worker-offers/:workerOfferId/delivery/retry",
  "POST /platform/worker-offers/:workerOfferId/withdraw",
  "POST /platform/worker-offers/:workerOfferId/cancel",
  // Staff assignments. Creating an assignment also schedules it (ready-for-attendance, handoff,
  // attendance record) on a best-effort basis; the two transitions below and POST /platform/attendance
  // are the staff recovery path when that automatic step fails.
  "POST /platform/assignments",
  "POST /platform/assignments/:assignmentId/ready-for-attendance",
  "POST /platform/assignments/:assignmentId/attendance-handoff",
  "POST /platform/assignments/:assignmentId/cancel",
  "POST /platform/assignments/:assignmentId/replacement-required",
  // Staff attendance.
  "POST /platform/attendance",
  "POST /platform/attendance/:attendanceRecordId/complete",
  "POST /platform/attendance/:attendanceRecordId/missed",
  "POST /platform/attendance/:attendanceRecordId/exception",
  "POST /platform/attendance/:attendanceRecordId/cancel",
  // Staff decision on a worker's reported hours (admin Timesheets console, "Reported hours").
  "POST /platform/attendance/hours-reports/:hoursReportId/approve",
  "POST /platform/attendance/hours-reports/:hoursReportId/reject",
  // Staff timesheets (admin Timesheets console: prepare, accept exceptions, approve, lock). calculate,
  // request-correction and reject are how staff move a disputed timesheet (correction_required) on.
  "POST /platform/timesheets/prepare",
  "POST /platform/timesheets/:timesheetId/calculate",
  "POST /platform/timesheets/:timesheetId/request-correction",
  "POST /platform/timesheets/:timesheetId/override-exceptions",
  "POST /platform/timesheets/:timesheetId/approve",
  "POST /platform/timesheets/:timesheetId/reject",
  "POST /platform/timesheets/:timesheetId/lock"
];

/**
 * Kept blocked in production even with RWOS_JOB_FLOW_ENABLED, with the reason. (Anything under the
 * job-flow groups that is not in JOB_FLOW_ROUTES is blocked; this list documents the known ones.)
 */
export const JOB_FLOW_ROUTES_KEPT_BLOCKED: Readonly<Record<string, string>> = {
  "POST /platform/assignments/:assignmentId/attendance-window":
    "No caller. Optional intermediate state; the handoff moves straight from ready_for_attendance.",
  "POST /platform/timesheets":
    "Bare create leaves an uncalculated timesheet and skips completing the attendance; the admin console uses /platform/timesheets/prepare, which does both."
};

/**
 * Test-only / synthetic routes. Always 404 in production, whatever the flags. They are already inert
 * there (their config gates are refused or forced off in production); this is defence in depth.
 */
const SYNTHETIC_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/platform\/worker-payouts\/[^/]+\/execute-test-payout$/,
  /^\/organizations\/[^/]+\/payment-methods\/local-fake$/,
  /^\/payments\/webhooks\/local-fake$/
];

const jobFlowRouteSet = new Set(JOB_FLOW_ROUTES);

function isLegacyBlockedJobFlowOperation(method: string, path: string) {
  if (method === "GET" && /\/platform\/dispatches\/[^/]+\/candidates\/search$/.test(path)) {
    return true;
  }
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  return JOB_FLOW_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * True when production must answer 404 RWOS_RESOURCE_UNAVAILABLE. `routeTemplate` is the matched
 * Fastify route (request.routeOptions.url), undefined for an unmatched URL.
 */
export function isProductionBlockedOperation(
  method: string,
  url: string,
  routeTemplate: string | undefined,
  flags: ProductionFeatureFlags
): boolean {
  const path = url.split("?")[0] ?? url;
  if (SYNTHETIC_ROUTE_PATTERNS.some((pattern) => pattern.test(path))) return true;
  if (!isLegacyBlockedJobFlowOperation(method, path)) return false;
  if (!flags.jobFlowEnabled || !routeTemplate) return true;
  return !jobFlowRouteSet.has(`${method} ${routeTemplate}`);
}
