export type AdminWorkerOfferSummary = Readonly<{
  id: string;
  dispatchReviewId: string;
  jobRequestId: string;
  workerIdentityId: string;
  status:
    | "draft"
    | "approved"
    | "sent"
    | "delivered"
    | "viewed"
    | "accepted"
    | "declined"
    | "expired"
    | "withdrawn"
    | "cancelled";
  expiresAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  respondedAt: string | null;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  versionToken: number;
}>;

export type AdminAssignmentSummary = Readonly<{
  id: string;
  dispatchReviewId: string;
  workerOfferId: string;
  workerIdentityId: string;
  status: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  attendanceBoundary: "not_started" | "handoff_ready" | "handoff_completed";
  versionToken: number;
  updatedAt: string;
}>;

export function parseAdminWorkerOffers(input: unknown, dispatchReviewId: string) {
  if (!Array.isArray(input)) throw new Error("RWOS_INVALID_ADMIN_OFFERS");
  return input.map((item) => parseAdminWorkerOffer(item, dispatchReviewId));
}

export function parseAdminAssignments(input: unknown, dispatchReviewId: string) {
  if (!Array.isArray(input)) throw new Error("RWOS_INVALID_ADMIN_ASSIGNMENTS");
  return input.map((item) => parseAdminAssignment(item, dispatchReviewId));
}

function parseAdminWorkerOffer(input: unknown, dispatchReviewId: string): AdminWorkerOfferSummary {
  const record = asRecord(input);
  const terms = asRecord(record.currentTermsVersion);
  const status = requiredString(record, "status");
  if (
    !workerOfferStatuses.some((candidateStatus) => candidateStatus === status) ||
    requiredString(record, "dispatchReviewId") !== dispatchReviewId
  ) {
    throw new Error("RWOS_INVALID_ADMIN_OFFER");
  }
  return {
    id: uuid(record, "id"),
    dispatchReviewId: uuid(record, "dispatchReviewId"),
    jobRequestId: uuid(record, "jobRequestId"),
    workerIdentityId: uuid(record, "workerIdentityId"),
    status: status as AdminWorkerOfferSummary["status"],
    expiresAt: isoDate(record, "expiresAt"),
    sentAt: nullableIsoDate(record, "sentAt"),
    deliveredAt: nullableIsoDate(record, "deliveredAt"),
    respondedAt: nullableIsoDate(record, "respondedAt"),
    title: requiredString(terms, "workerVisibleTitle"),
    startAt: isoDate(terms, "startAt"),
    endAt: isoDate(terms, "endAt"),
    timezone: requiredString(terms, "timezone"),
    versionToken: nonNegativeInteger(record, "versionToken")
  };
}

function parseAdminAssignment(input: unknown, dispatchReviewId: string): AdminAssignmentSummary {
  const record = asRecord(input);
  const attendanceBoundary = requiredString(record, "attendanceBoundary");
  if (
    requiredString(record, "dispatchReviewId") !== dispatchReviewId ||
    !["not_started", "handoff_ready", "handoff_completed"].includes(attendanceBoundary)
  ) {
    throw new Error("RWOS_INVALID_ADMIN_ASSIGNMENT");
  }
  return {
    id: uuid(record, "id"),
    dispatchReviewId: uuid(record, "dispatchReviewId"),
    workerOfferId: uuid(record, "workerOfferId"),
    workerIdentityId: uuid(record, "workerIdentityId"),
    status: requiredString(record, "status"),
    title: requiredString(record, "confirmedTitle"),
    startAt: isoDate(record, "confirmedStartAt"),
    endAt: isoDate(record, "confirmedEndAt"),
    timezone: requiredString(record, "timezone"),
    attendanceBoundary: attendanceBoundary as AdminAssignmentSummary["attendanceBoundary"],
    versionToken: nonNegativeInteger(record, "versionToken"),
    updatedAt: isoDate(record, "updatedAt")
  };
}

const workerOfferStatuses = [
  "draft",
  "approved",
  "sent",
  "delivered",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
  "cancelled"
] as const;

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("RWOS_INVALID_ADMIN_OPERATIONAL_RECORD");
  }
  return input as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "string" || !value) throw new Error("RWOS_INVALID_ADMIN_OPERATIONAL_FIELD");
  return value;
}

function uuid(record: Record<string, unknown>, key: string) {
  const value = requiredString(record, key);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new Error("RWOS_INVALID_ADMIN_OPERATIONAL_ID");
  }
  return value;
}

function isoDate(record: Record<string, unknown>, key: string) {
  const value = requiredString(record, key);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new Error("RWOS_INVALID_ADMIN_OPERATIONAL_DATE");
  }
  return value;
}

function nullableIsoDate(record: Record<string, unknown>, key: string) {
  if (record[key] === null) return null;
  return isoDate(record, key);
}

function nonNegativeInteger(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error("RWOS_INVALID_ADMIN_OPERATIONAL_VERSION");
  }
  return value as number;
}
