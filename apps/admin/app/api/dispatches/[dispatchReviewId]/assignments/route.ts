import { getRuntimeConfig } from "@rwos/config";
import {
  isCanonicalOperationalId,
  parseAdminAssignment,
  parseAdminAssignments,
  readAssignmentCreateInput
} from "../../offerAssignmentBoundary";
import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";
import { forwardShiftOverlap } from "../../../shiftOverlap";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  const { dispatchReviewId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/assignments?dispatchReviewId=${encodeURIComponent(dispatchReviewId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { assignments?: unknown };
    return Response.json(
      {
        assignments: parseAdminAssignments(payload.assignments, dispatchReviewId),
        canCreateAssignment: getRuntimeConfig().assignmentHandoffEnabled
      },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  const config = getRuntimeConfig();
  if (!config.assignmentHandoffEnabled) return assignmentHandoffUnavailable();
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return invalidAssignmentRequest();
  }
  const { dispatchReviewId } = await context.params;
  if (!isCanonicalOperationalId(dispatchReviewId)) return invalidAssignmentRequest();
  const input = readAssignmentCreateInput(await request.json().catch(() => null));
  if (!input) return invalidAssignmentRequest();

  const { gateway, token } = await sessionBoundary();
  // Refused when the worker misses a required certificate and no override is on the offer, unless
  // staff tick the override now (the screen checks first; the API records and logs it).
  const result = await gateway.request("/platform/assignments", "POST", token, {
    workerOfferId: input.workerOfferId,
    dispatchReviewId,
    expectedOfferVersion: input.expectedOfferVersion,
    ...("certificateOverride" in input && input.certificateOverride ? { certificateOverride: true, ...("certificateOverrideReason" in input && input.certificateOverrideReason ? { certificateOverrideReason: input.certificateOverrideReason } : {}) } : {})
  });
  if (result.status !== "ok") return forwardShiftOverlap(result) ?? assignmentMutationFailure(result.status);
  try {
    const payload = result.payload as { assignment?: unknown };
    const assignment = parseAdminAssignment(payload.assignment, dispatchReviewId);
    if (assignment.workerOfferId !== input.workerOfferId) return sessionFailure("error");
    return Response.json(
      { assignment },
      { status: 201, headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}

function assignmentHandoffUnavailable() {
  return Response.json(
    {
      status: "resource_unavailable",
      message: "Assignment creation is not enabled in this environment."
    },
    { status: 404, headers: { "cache-control": "private, no-store" } }
  );
}

function invalidAssignmentRequest() {
  return Response.json(
    { status: "invalid", message: "A valid accepted-offer reference is required." },
    { status: 400, headers: { "cache-control": "private, no-store" } }
  );
}

function assignmentMutationFailure(
  status: "denied" | "not_found" | "stale" | "unavailable" | "error"
) {
  if (status === "not_found") {
    return Response.json(
      {
        status: "source_unavailable",
        message: "Assignment source is unavailable."
      },
      { status: 404, headers: { "cache-control": "private, no-store" } }
    );
  }
  if (status === "stale") {
    return Response.json(
      {
        status: "conflict",
        message: "The offer or staffing state changed. Refresh authoritative records."
      },
      { status: 409, headers: { "cache-control": "private, no-store" } }
    );
  }
  return sessionFailure(status);
}
