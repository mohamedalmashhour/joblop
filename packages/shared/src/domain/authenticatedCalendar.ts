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

// Employer-authorized assignment reference (GET /organizations/:id/assignments →
// serializeEmployerAssignment). A persisted, org-scoped read — never a fixture.
export type EmployerAssignmentDto = Readonly<{
  audience: "employer";
  assignmentId: string;
  status: string;
  title: string | null;
  roleSummary: string | null;
  worksiteSummary: string | null;
  departmentSummary: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  attendanceBoundary: string | null;
  versionToken: number;
  updatedAt: string;
  visibility: "employer_authorized_assignment";
}>;

export function parseEmployerAssignmentList(input: unknown): readonly EmployerAssignmentDto[] {
  const record = asRecord(input);
  if (!Array.isArray(record.assignments)) throw new CalendarDtoError();
  return record.assignments.map(parseEmployerAssignmentDto);
}

function parseEmployerAssignmentDto(input: unknown): EmployerAssignmentDto {
  const record = asRecord(input);
  return {
    audience: "employer",
    assignmentId: requiredString(record, "assignmentId"),
    status: requiredString(record, "status"),
    title: nullableString(record, "title"),
    roleSummary: nullableString(record, "roleSummary"),
    worksiteSummary: nullableString(record, "worksiteSummary"),
    departmentSummary: nullableString(record, "departmentSummary"),
    startAt: requiredString(record, "startAt"),
    endAt: requiredString(record, "endAt"),
    timezone: requiredString(record, "timezone"),
    attendanceBoundary: nullableString(record, "attendanceBoundary"),
    versionToken: nonNegativeInteger(record, "versionToken"),
    updatedAt: requiredString(record, "updatedAt"),
    visibility: "employer_authorized_assignment"
  };
}

// Employer-authorized attendance reference (GET /organizations/:id/attendance →
// serializeAttendanceRecord). Whitelists scheduling + presence status only — no
// worker identity, no evidence/location detail, no supervisor notes, no user ids.
export type EmployerAttendanceDto = Readonly<{
  audience: "employer";
  attendanceRecordId: string;
  assignmentId: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  verificationMethod: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  // Who cancelled the shift. The staff's free-text reason is internal and never reaches the employer.
  cancelledBy: "joblop" | "company" | "worker" | null;
  completedAt: string | null;
  cancelledAt: string | null;
  versionToken: number;
  updatedAt: string;
  visibility: "employer_authorized_attendance";
}>;

export function parseEmployerAttendanceList(input: unknown): readonly EmployerAttendanceDto[] {
  const record = asRecord(input);
  if (!Array.isArray(record.attendanceRecords)) throw new CalendarDtoError();
  return record.attendanceRecords.map(parseEmployerAttendanceDto);
}

function parseEmployerAttendanceDto(input: unknown): EmployerAttendanceDto {
  const record = asRecord(input);
  return {
    audience: "employer",
    attendanceRecordId: requiredString(record, "id"),
    assignmentId: requiredString(record, "assignmentId"),
    status: requiredString(record, "status"),
    scheduledStartAt: requiredString(record, "scheduledStartAt"),
    scheduledEndAt: requiredString(record, "scheduledEndAt"),
    timezone: requiredString(record, "timezone"),
    verificationMethod: requiredString(record, "verificationMethod"),
    checkInAt: nullableString(record, "checkInAt"),
    checkOutAt: nullableString(record, "checkOutAt"),
    cancelledBy: record.cancelledBy === "joblop" || record.cancelledBy === "company" || record.cancelledBy === "worker" ? record.cancelledBy : null,
    completedAt: nullableString(record, "completedAt"),
    cancelledAt: nullableString(record, "cancelledAt"),
    versionToken: nonNegativeInteger(record, "version"),
    updatedAt: requiredString(record, "updatedAt"),
    visibility: "employer_authorized_attendance"
  };
}

// Employer-authorized timesheet reference (GET /organizations/:id/timesheets →
// serializeTimesheet). The serializer spreads the full timesheet; the parser
// whitelists the employer review surface (status, window, reviewed totals, review
// states) and DROPS worker identity, per-user reviewer ids, internal candidate
// minute breakdowns, and correction notes.
export type EmployerTimesheetDto = Readonly<{
  audience: "employer";
  timesheetId: string;
  assignmentId: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  timezone: string;
  payableMinutes: number | null;
  billableMinutes: number | null;
  breakMinutes: number;
  excludedMinutes: number;
  exceptionSummary: string | null;
  workerReviewStatus: string;
  employerReviewStatus: string;
  platformReviewStatus: string;
  employerReviewedAt: string | null;
  approvedAt: string | null;
  lockedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  versionToken: number;
  updatedAt: string;
  visibility: "employer_authorized_timesheet";
}>;

export function parseEmployerTimesheetList(input: unknown): readonly EmployerTimesheetDto[] {
  const record = asRecord(input);
  if (!Array.isArray(record.timesheets)) throw new CalendarDtoError();
  return record.timesheets.map(parseEmployerTimesheetDto);
}

export function parseEmployerTimesheetDto(input: unknown): EmployerTimesheetDto {
  const record = asRecord(input);
  return {
    audience: "employer",
    timesheetId: requiredString(record, "id"),
    assignmentId: requiredString(record, "assignmentId"),
    status: requiredString(record, "status"),
    scheduledStartAt: requiredString(record, "scheduledStartAt"),
    scheduledEndAt: requiredString(record, "scheduledEndAt"),
    actualCheckInAt: nullableString(record, "actualCheckInAt"),
    actualCheckOutAt: nullableString(record, "actualCheckOutAt"),
    timezone: requiredString(record, "timezone"),
    payableMinutes: nullableNonNegativeInteger(record, "payableMinutes"),
    billableMinutes: nullableNonNegativeInteger(record, "billableMinutes"),
    breakMinutes: nonNegativeInteger(record, "breakMinutes"),
    excludedMinutes: nonNegativeInteger(record, "excludedMinutes"),
    exceptionSummary: nullableString(record, "exceptionSummary"),
    workerReviewStatus: requiredString(record, "workerReviewStatus"),
    employerReviewStatus: requiredString(record, "employerReviewStatus"),
    platformReviewStatus: requiredString(record, "platformReviewStatus"),
    employerReviewedAt: nullableString(record, "employerReviewedAt"),
    approvedAt: nullableString(record, "approvedAt"),
    lockedAt: nullableString(record, "lockedAt"),
    rejectedAt: nullableString(record, "rejectedAt"),
    cancelledAt: nullableString(record, "cancelledAt"),
    versionToken: nonNegativeInteger(record, "version"),
    updatedAt: requiredString(record, "updatedAt"),
    visibility: "employer_authorized_timesheet"
  };
}

// Employer-authorized residence reference (GET /organizations/:id/residences →
// serializeResidence). The serializer spreads the full record; the parser
// whitelists the operating-site fields an employer sees and DROPS the creator
// user id and organization id.
export type EmployerResidenceDto = Readonly<{
  audience: "employer";
  residenceId: string;
  publicId: string;
  name: string;
  status: string;
  addressSummary: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  archivedAt: string | null;
  updatedAt: string;
  visibility: "employer_authorized_residence";
}>;

export function parseEmployerResidenceList(input: unknown): readonly EmployerResidenceDto[] {
  const record = asRecord(input);
  if (!Array.isArray(record.residences)) throw new CalendarDtoError();
  return record.residences.map(parseEmployerResidenceDto);
}

function parseEmployerResidenceDto(input: unknown): EmployerResidenceDto {
  const record = asRecord(input);
  return {
    audience: "employer",
    residenceId: requiredString(record, "id"),
    publicId: requiredString(record, "publicId"),
    name: requiredString(record, "name"),
    status: requiredString(record, "status"),
    addressSummary: nullableString(record, "addressSummary"),
    city: nullableString(record, "city"),
    region: nullableString(record, "region"),
    country: nullableString(record, "country"),
    archivedAt: nullableString(record, "archivedAt"),
    updatedAt: requiredString(record, "updatedAt"),
    visibility: "employer_authorized_residence"
  };
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

function nullableNonNegativeInteger(record: Record<string, unknown>, key: string) {
  if (record[key] === null) return null;
  return nonNegativeInteger(record, key);
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
