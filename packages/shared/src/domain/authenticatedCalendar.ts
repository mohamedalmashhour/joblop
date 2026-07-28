export type AuthenticatedViewState<T> =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; data: T }>
  | Readonly<{ status: "partial"; data: T }>
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "denied" }>
  | Readonly<{ status: "error" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "stale" }>;

type Verification = Readonly<{
  contract: VerificationState;
  location: VerificationState;
  paymentMethodReadiness: VerificationState;
}>;

export type VerificationState = "pending" | "verified" | "failed" | "unavailable";
export type ClientCalendarStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "published"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";
export type AdminAuthoritativeStatus =
  | "draft"
  | "submitted"
  | "admin_review"
  | "information_required"
  | "approved_for_dispatch"
  | "cancelled"
  | "expired"
  | "archived";
export type WorkerOfferStatus =
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

type CommonCalendarDto = Readonly<{
  id: string;
  requestNumber: string;
  organizationId: string;
  title: string;
  numberOfWorkers: number;
  timezone: string;
  startAt: string;
  endAt: string;
  status: ClientCalendarStatus;
  dutiesSummary: string | null;
  qualifications: readonly string[];
  addressSummary: string | null;
  specialInstructions: string | null;
  verification: Verification;
  versionToken: number;
}>;

export type ClientCalendarDto = CommonCalendarDto &
  Readonly<{
    audience: "client";
    actionRequired: "information_required" | null;
    actionRequiredReason: string | null;
  }>;
export type AdminCalendarDto = CommonCalendarDto &
  Readonly<{
    audience: "admin";
    authoritativeStatus: AdminAuthoritativeStatus;
    adminReviewReason: string | null;
  }>;

export type WorkerCalendarDto = Readonly<{
  audience: "worker";
  workerOfferId: string;
  jobRequestId: string;
  status: WorkerOfferStatus;
  expiresAt: string;
  title: string | null;
  summary: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string | null;
  compensationSummary: string | null;
  policySummary: string | null;
  termsVersionId: string | null;
  versionToken: number;
  visibility: "worker_authorized_offer_reference";
}>;

export class CalendarDtoError extends Error {
  constructor() {
    super("Calendar response is unavailable.");
  }
}

export function parseClientCalendarDto(input: unknown): ClientCalendarDto {
  const record = asRecord(input);
  const actionRequired =
    record.actionRequired === null
      ? null
      : record.actionRequired === "information_required"
        ? "information_required"
        : invalidActionRequired();
  const actionRequiredReason = nullableString(record, "actionRequiredReason");
  if (
    (actionRequired === "information_required" && !actionRequiredReason) ||
    (actionRequired === null && actionRequiredReason !== null)
  ) {
    throw new CalendarDtoError();
  }
  return {
    ...parseCommon(record, "client"),
    audience: "client",
    actionRequired,
    actionRequiredReason
  };
}

export function parseAdminCalendarDto(input: unknown): AdminCalendarDto {
  const record = asRecord(input);
  return {
    ...parseCommon(record, "admin"),
    audience: "admin",
    authoritativeStatus: adminStatus(record, "authoritativeStatus"),
    adminReviewReason: nullableString(record, "adminReviewReason")
  };
}

export function parseWorkerCalendarDto(input: unknown): WorkerCalendarDto {
  const record = asRecord(input);
  if (record.visibility !== "worker_authorized_offer_reference") throw new CalendarDtoError();
  const startAt = nullableString(record, "startAt");
  const endAt = nullableString(record, "endAt");
  const timezone = nullableString(record, "timezone");
  validateOptionalWindow(startAt, endAt, timezone);
  return {
    audience: "worker",
    workerOfferId: requiredString(record, "workerOfferId"),
    jobRequestId: requiredString(record, "jobRequestId"),
    status: workerOfferStatus(record, "status"),
    expiresAt: timestamp(record, "expiresAt"),
    title: nullableString(record, "title"),
    summary: nullableString(record, "summary"),
    startAt,
    endAt,
    timezone,
    compensationSummary: nullableString(record, "compensationSummary"),
    policySummary: nullableString(record, "policySummary"),
    termsVersionId: optionalNullableString(record, "termsVersionId"),
    versionToken: nonNegativeInteger(record, "versionToken"),
    visibility: "worker_authorized_offer_reference"
  };
}

export function parseClientCalendarList(input: unknown) {
  return parseList(input, parseClientCalendarDto);
}

export function parseAdminCalendarList(input: unknown) {
  return parseList(input, parseAdminCalendarDto);
}

export function calendarListState<T>(items: readonly T[]): AuthenticatedViewState<readonly T[]> {
  return items.length === 0 ? { status: "empty" } : { status: "ready", data: items };
}

export function calendarLoadingState(): AuthenticatedViewState<never> {
  return { status: "loading" };
}

export function calendarPartialState<T>(items: readonly T[]): AuthenticatedViewState<readonly T[]> {
  if (items.length === 0) return { status: "empty" };
  return { status: "partial", data: items };
}

export function calendarFailureState(status: number): AuthenticatedViewState<never> {
  if (status === 401 || status === 403) return { status: "denied" };
  if (status === 409 || status === 412) return { status: "stale" };
  if (status === 503) return { status: "unavailable" };
  return { status: "error" };
}

function parseList<T>(input: unknown, parser: (value: unknown) => T): readonly T[] {
  const record = asRecord(input);
  if (!Array.isArray(record.requests)) throw new CalendarDtoError();
  return record.requests.map(parser);
}

function parseCommon(input: unknown, audience: "client" | "admin"): CommonCalendarDto {
  const record = asRecord(input);
  if (record.audience !== audience) throw new CalendarDtoError();
  const verification = asRecord(record.verification);
  const startAt = requiredString(record, "startAt");
  const endAt = requiredString(record, "endAt");
  const timezone = requiredString(record, "timezone");
  validateWindow(startAt, endAt, timezone);
  const numberOfWorkers = nonNegativeInteger(record, "numberOfWorkers");
  if (numberOfWorkers === 0) throw new CalendarDtoError();
  return {
    id: requiredString(record, "id"),
    requestNumber: requiredString(record, "requestNumber"),
    organizationId: requiredString(record, "organizationId"),
    title: requiredString(record, "title"),
    numberOfWorkers,
    timezone,
    startAt,
    endAt,
    status: calendarStatus(record, "status"),
    dutiesSummary: nullableString(record, "dutiesSummary"),
    qualifications: stringArray(record, "qualifications"),
    addressSummary: nullableString(record, "addressSummary"),
    specialInstructions: nullableString(record, "specialInstructions"),
    verification: {
      contract: verificationState(verification, "contract"),
      location: verificationState(verification, "location"),
      paymentMethodReadiness: verificationState(verification, "paymentMethodReadiness")
    },
    versionToken: nonNegativeInteger(record, "versionToken")
  };
}

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    throw new CalendarDtoError();
  return input as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "string" || !value) throw new CalendarDtoError();
  return value;
}

function nullableString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value === null) return null;
  if (typeof value !== "string") throw new CalendarDtoError();
  return value;
}

function optionalNullableString(record: Record<string, unknown>, key: string) {
  if (!(key in record)) return null;
  return nullableString(record, key);
}

function requiredNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new CalendarDtoError();
  return value;
}

function nonNegativeInteger(record: Record<string, unknown>, key: string) {
  const value = requiredNumber(record, key);
  if (!Number.isInteger(value) || value < 0) throw new CalendarDtoError();
  return value;
}

function calendarStatus(record: Record<string, unknown>, key: string): ClientCalendarStatus {
  const value = requiredString(record, key);
  const allowed: readonly string[] = [
    "draft",
    "submitted",
    "under_review",
    "published",
    "assigned",
    "in_progress",
    "completed",
    "cancelled"
  ];
  if (!allowed.includes(value)) throw new CalendarDtoError();
  return value as ClientCalendarStatus;
}

function verificationState(record: Record<string, unknown>, key: string): VerificationState {
  const value = requiredString(record, key);
  if (!["pending", "verified", "failed", "unavailable"].includes(value)) {
    throw new CalendarDtoError();
  }
  return value as VerificationState;
}

function adminStatus(record: Record<string, unknown>, key: string): AdminAuthoritativeStatus {
  const value = requiredString(record, key);
  const allowed: readonly string[] = [
    "draft",
    "submitted",
    "admin_review",
    "information_required",
    "approved_for_dispatch",
    "cancelled",
    "expired",
    "archived"
  ];
  if (!allowed.includes(value)) throw new CalendarDtoError();
  return value as AdminAuthoritativeStatus;
}

function workerOfferStatus(record: Record<string, unknown>, key: string): WorkerOfferStatus {
  const value = requiredString(record, key);
  const allowed: readonly string[] = [
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
  ];
  if (!allowed.includes(value)) throw new CalendarDtoError();
  return value as WorkerOfferStatus;
}

function invalidActionRequired(): never {
  throw new CalendarDtoError();
}

function timestamp(record: Record<string, unknown>, key: string) {
  const value = requiredString(record, key);
  if (!Number.isFinite(Date.parse(value))) throw new CalendarDtoError();
  return value;
}

function validateOptionalWindow(
  startAt: string | null,
  endAt: string | null,
  timezone: string | null
) {
  if (startAt === null && endAt === null && timezone === null) return;
  if (startAt === null || endAt === null || timezone === null) throw new CalendarDtoError();
  validateWindow(startAt, endAt, timezone);
}

function validateWindow(startAt: string, endAt: string, timezone: string) {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new CalendarDtoError();
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
  } catch {
    throw new CalendarDtoError();
  }
}

function stringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
    throw new CalendarDtoError();
  return value as readonly string[];
}
