export type AdminIntakeAction = "admin-review" | "request-information" | "approve-for-dispatch";

export function readAdminIntakeMutation(input: unknown, needsReason: boolean) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (!Number.isInteger(record.expectedVersion) || (record.expectedVersion as number) < 0) {
    return null;
  }
  if (!needsReason) return { expectedVersion: record.expectedVersion as number };
  if (
    typeof record.reason !== "string" ||
    record.reason.trim().length < 4 ||
    record.reason.trim().length > 1000
  ) {
    return null;
  }
  return {
    expectedVersion: record.expectedVersion as number,
    reason: record.reason.trim()
  };
}

export function parseAdminIntakeMutationResult(input: unknown) {
  const outer = asRecord(input);
  const request = asRecord(outer.jobRequest);
  if (
    !isString(request.id) ||
    !isString(request.jobRequestNumber) ||
    !isString(request.status) ||
    !isString(request.title) ||
    !Number.isInteger(request.versionToken) ||
    (request.versionToken as number) < 0
  ) {
    throw new Error("RWOS_INVALID_ADMIN_INTAKE_RESPONSE");
  }
  return {
    id: request.id,
    jobRequestNumber: request.jobRequestNumber,
    status: request.status,
    title: request.title,
    versionToken: request.versionToken as number,
    informationRequestReason:
      request.status === "information_required" && isString(request.adminReviewReason)
        ? request.adminReviewReason
        : null
  };
}

export function intakeActionPath(action: AdminIntakeAction) {
  return action;
}

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function isString(input: unknown): input is string {
  return typeof input === "string" && input.trim().length > 0;
}
