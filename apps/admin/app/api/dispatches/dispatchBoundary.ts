export type AdminDispatchReview = Readonly<{
  id: string;
  jobRequestId: string;
  jobRequestNumber?: string | null;
  /** The shift the dispatch staffs (list only; null when the request could not be read). */
  shiftStartAt?: string | null;
  shiftEndAt?: string | null;
  shiftTimezone?: string | null;
  state:
    | "draft"
    | "active"
    | "candidate_review"
    | "shortlist_ready"
    | "offer_preparation"
    | "paused"
    | "cancelled"
    | "closed";
  priority: "normal" | "urgent" | "emergency";
  requiredWorkerCount: number;
  shortlistedCandidateCount: number;
  preparedOfferCount: number;
  remainingWorkerCount: number;
  versionToken: number;
  createdAt: string;
  updatedAt: string;
}>;

export function readDispatchCreateInput(input: unknown) {
  const record = asRecord(input);
  if (!hasOnlyKeys(record, ["jobRequestId", "priority"]) || !isUuid(record.jobRequestId)) {
    return null;
  }
  if (
    record.priority !== undefined &&
    !["normal", "urgent", "emergency"].includes(String(record.priority))
  ) {
    return null;
  }
  return {
    jobRequestIdOrNumber: record.jobRequestId,
    ...(record.priority === undefined
      ? {}
      : { priority: record.priority as "normal" | "urgent" | "emergency" })
  };
}

export function readDispatchTransitionInput(input: unknown) {
  const record = asRecord(input);
  return hasOnlyKeys(record, ["expectedVersion"]) && positiveInteger(record.expectedVersion)
    ? { expectedVersion: record.expectedVersion as number }
    : null;
}

export function parseCandidateSourceStatus(input: unknown) {
  const record = asRecord(input);
  if (!["available", "candidate_source_unavailable"].includes(String(record.status))) {
    throw new Error("RWOS_INVALID_CANDIDATE_SOURCE_STATUS");
  }
  return {
    status: record.status as "available" | "candidate_source_unavailable"
  };
}

export function parseAdminDispatchReview(
  input: unknown,
  expectedDispatchReviewId?: string
): AdminDispatchReview {
  const record = asRecord(input);
  const states = [
    "draft",
    "active",
    "candidate_review",
    "shortlist_ready",
    "offer_preparation",
    "paused",
    "cancelled",
    "closed"
  ];
  if (
    !isUuid(record.id) ||
    (expectedDispatchReviewId !== undefined && record.id !== expectedDispatchReviewId) ||
    !isUuid(record.jobRequestId) ||
    !states.includes(String(record.state)) ||
    !["normal", "urgent", "emergency"].includes(String(record.priority)) ||
    !nonNegativeInteger(record.requiredWorkerCount) ||
    !nonNegativeInteger(record.shortlistedCandidateCount) ||
    !nonNegativeInteger(record.preparedOfferCount) ||
    !nonNegativeInteger(record.remainingWorkerCount) ||
    !positiveInteger(record.versionToken) ||
    !validIsoDate(record.createdAt) ||
    !validIsoDate(record.updatedAt) ||
    (record.preparedOfferCount as number) > (record.requiredWorkerCount as number) ||
    record.remainingWorkerCount !==
      Math.max(0, (record.requiredWorkerCount as number) - (record.preparedOfferCount as number))
  ) {
    throw new Error("RWOS_INVALID_DISPATCH_RESPONSE");
  }
  return {
    id: record.id,
    jobRequestId: record.jobRequestId,
    jobRequestNumber:
      typeof record.jobRequestNumber === "string" ? record.jobRequestNumber : null,
    shiftStartAt: validIsoDate(record.shiftStartAt) ? new Date(record.shiftStartAt as string).toISOString() : null,
    shiftEndAt: validIsoDate(record.shiftEndAt) ? new Date(record.shiftEndAt as string).toISOString() : null,
    shiftTimezone: typeof record.shiftTimezone === "string" && record.shiftTimezone ? record.shiftTimezone : null,
    state: record.state as AdminDispatchReview["state"],
    priority: record.priority as AdminDispatchReview["priority"],
    requiredWorkerCount: record.requiredWorkerCount as number,
    shortlistedCandidateCount: record.shortlistedCandidateCount as number,
    preparedOfferCount: record.preparedOfferCount as number,
    remainingWorkerCount: record.remainingWorkerCount as number,
    versionToken: record.versionToken as number,
    createdAt: new Date(record.createdAt as string).toISOString(),
    updatedAt: new Date(record.updatedAt as string).toISOString()
  };
}

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function isString(input: unknown): input is string {
  return typeof input === "string" && input.trim().length > 0;
}

function isUuid(input: unknown): input is string {
  return (
    isString(input) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input)
  );
}

function hasOnlyKeys(input: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(input).every((key) => keys.includes(key));
}

function nonNegativeInteger(input: unknown) {
  return Number.isInteger(input) && (input as number) >= 0;
}

function positiveInteger(input: unknown) {
  return Number.isInteger(input) && (input as number) > 0;
}

function validIsoDate(input: unknown) {
  if (typeof input !== "string") return false;
  const date = new Date(input);
  return !Number.isNaN(date.valueOf()) && date.toISOString() === input;
}
