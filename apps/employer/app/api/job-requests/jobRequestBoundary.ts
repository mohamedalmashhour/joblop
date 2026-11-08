export type EmployerRequestContext = Readonly<{
  residences: readonly Readonly<{ id: string; name: string }>[];
  departments: readonly Readonly<{ id: string; name: string; residenceId: string }>[];
  workGroups: readonly Readonly<{ id: string; slug: string; displayLabel: string }>[];
  roleDefinitions: readonly Readonly<{
    slug: string;
    displayLabel: string;
    workGroupId: string;
    // Governed pay rate, read from the organization's active contract rate card
    // (never invented here). null when the active contract does not price the role.
    roleDefinitionId: string;
    hourlyRateMinor: number | null;
    currency: string | null;
  }>[];
}>;

export type EmployerJobRequestDraft = Readonly<{
  id: string;
  jobRequestNumber: string;
  status: string;
  title: string;
  versionToken: number;
  description: string | null;
  numberOfWorkers: number;
  urgency: "normal" | "urgent" | "immediate";
  requestType: "single_day" | "multi_day" | "recurring_intent";
  timezone: string;
  startAt: string;
  endAt: string;
  informationRequestReason: string | null;
}>;

export type EmployerDispatchStatus = Readonly<{
  jobRequestId: string;
  requestNumber: string;
  state:
    | "not_started"
    | "draft"
    | "active"
    | "candidate_review"
    | "shortlist_ready"
    | "offer_preparation"
    | "paused"
    | "cancelled"
    | "closed";
  requiredWorkerCount: number;
  remainingWorkerCount: number;
  updatedAt: string | null;
}>;

export function parseEmployerDispatchStatus(
  input: unknown,
  expectedJobRequestId: string
): EmployerDispatchStatus {
  const record = asRecord(asRecord(input).dispatchStatus);
  const states = [
    "not_started",
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
    record.jobRequestId !== expectedJobRequestId ||
    !isString(record.jobRequestNumber) ||
    !/^JR-\d{4}-\d{6}$/.test(record.jobRequestNumber) ||
    !states.includes(String(record.dispatchState)) ||
    !nonNegativeInteger(record.requiredWorkerCount) ||
    !nonNegativeInteger(record.shortlistedCandidateCount) ||
    !nonNegativeInteger(record.preparedOfferCount) ||
    !nonNegativeInteger(record.remainingWorkerCount) ||
    (record.requiredWorkerCount as number) < 1 ||
    (record.shortlistedCandidateCount as number) > (record.requiredWorkerCount as number) ||
    (record.preparedOfferCount as number) > (record.requiredWorkerCount as number) ||
    record.remainingWorkerCount !==
      Math.max(0, (record.requiredWorkerCount as number) - (record.preparedOfferCount as number)) ||
    (record.dispatchState === "not_started"
      ? record.updatedAt !== null || record.remainingWorkerCount !== record.requiredWorkerCount
      : !validDate(record.updatedAt))
  ) {
    throw new Error("RWOS_INVALID_EMPLOYER_DISPATCH_STATUS");
  }
  return {
    jobRequestId: record.jobRequestId,
    requestNumber: record.jobRequestNumber,
    state: record.dispatchState as EmployerDispatchStatus["state"],
    requiredWorkerCount: record.requiredWorkerCount as number,
    remainingWorkerCount: record.remainingWorkerCount as number,
    updatedAt: record.updatedAt === null ? null : new Date(record.updatedAt as string).toISOString()
  };
}

export function parseEmployerRequestContext(input: {
  residences: unknown;
  departments: unknown;
  workGroups: unknown;
  roleDefinitions: unknown;
  contract?: unknown;
}): EmployerRequestContext {
  const rateByRole = contractRateMap(input.contract);
  return {
    residences: parseList(input.residences, "residences").flatMap((value) => {
      const record = asRecord(value);
      return isString(record.id) && isString(record.name)
        ? [{ id: record.id, name: record.name }]
        : [];
    }),
    departments: parseList(input.departments, "departments").flatMap((value) => {
      const record = asRecord(value);
      return isString(record.id) && isString(record.name) && isString(record.residenceId)
        ? [{ id: record.id, name: record.name, residenceId: record.residenceId }]
        : [];
    }),
    workGroups: parseList(input.workGroups, "workGroups").flatMap((value) => {
      const record = asRecord(value);
      return isString(record.id) && isString(record.slug) && isString(record.displayLabel)
        ? [{ id: record.id, slug: record.slug, displayLabel: record.displayLabel }]
        : [];
    }),
    roleDefinitions: parseList(input.roleDefinitions, "roleDefinitions").flatMap((value) => {
      const record = asRecord(value);
      if (
        !isString(record.slug) ||
        !isString(record.displayLabel) ||
        !isString(record.workGroupId)
      ) {
        return [];
      }
      const roleDefinitionId = isString(record.id) ? record.id : "";
      const rate = roleDefinitionId ? rateByRole.get(roleDefinitionId) : undefined;
      return [
        {
          slug: record.slug,
          displayLabel: record.displayLabel,
          workGroupId: record.workGroupId,
          roleDefinitionId,
          hourlyRateMinor: rate ? rate.hourlyRateMinor : null,
          currency: rate ? rate.currency : null
        }
      ];
    })
  };
}

// Reads the active contract payload ({ contract: { roleRates: [...] } }) into a
// roleDefinitionId -> governed hourly rate lookup. Empty when no active contract.
function contractRateMap(
  contract: unknown
): Map<string, { hourlyRateMinor: number; currency: string }> {
  const map = new Map<string, { hourlyRateMinor: number; currency: string }>();
  const active = asRecord(asRecord(contract).contract);
  const rates = active.roleRates;
  if (!Array.isArray(rates)) return map;
  for (const item of rates) {
    const record = asRecord(item);
    if (
      isString(record.roleDefinitionId) &&
      typeof record.hourlyRateMinor === "number" &&
      isString(record.currency)
    ) {
      map.set(record.roleDefinitionId, {
        hourlyRateMinor: record.hourlyRateMinor,
        currency: record.currency
      });
    }
  }
  return map;
}

export function parseEmployerJobRequest(input: unknown): EmployerJobRequestDraft {
  const record = asRecord(asRecord(input).jobRequest);
  if (
    !isString(record.id) ||
    !isString(record.jobRequestNumber) ||
    !isString(record.status) ||
    !isString(record.title) ||
    !(record.description === null || typeof record.description === "string") ||
    !Number.isInteger(record.numberOfWorkers) ||
    (record.numberOfWorkers as number) < 1 ||
    !["normal", "urgent", "immediate"].includes(String(record.urgency)) ||
    !["single_day", "multi_day", "recurring_intent"].includes(String(record.requestType)) ||
    !isString(record.timezone) ||
    !validDate(record.startAt) ||
    !validDate(record.endAt) ||
    !Number.isInteger(record.versionToken) ||
    (record.versionToken as number) < 0
  ) {
    throw new Error("RWOS_INVALID_JOB_REQUEST_RESPONSE");
  }
  return {
    id: record.id,
    jobRequestNumber: record.jobRequestNumber,
    status: record.status,
    title: record.title,
    versionToken: record.versionToken as number,
    description: record.description as string | null,
    numberOfWorkers: record.numberOfWorkers as number,
    urgency: record.urgency as EmployerJobRequestDraft["urgency"],
    requestType: record.requestType as EmployerJobRequestDraft["requestType"],
    timezone: record.timezone,
    startAt: new Date(record.startAt as string).toISOString(),
    endAt: new Date(record.endAt as string).toISOString(),
    informationRequestReason:
      record.status === "information_required" && isString(record.adminReviewReason)
        ? record.adminReviewReason
        : null
  };
}

export function readEmployerJobRequestUpdate(input: unknown) {
  const record = asRecord(input);
  if (
    !Number.isInteger(record.expectedVersion) ||
    (record.expectedVersion as number) < 0 ||
    !isString(record.title) ||
    record.title.trim().length < 4 ||
    record.title.trim().length > 160 ||
    !(record.description === null || typeof record.description === "string") ||
    (typeof record.description === "string" && record.description.length > 2000) ||
    !Number.isInteger(record.numberOfWorkers) ||
    (record.numberOfWorkers as number) < 1 ||
    !["normal", "urgent", "immediate"].includes(String(record.urgency))
  ) {
    return null;
  }
  return {
    expectedVersion: record.expectedVersion as number,
    title: record.title.trim(),
    description:
      typeof record.description === "string" && record.description.trim()
        ? record.description.trim()
        : null,
    numberOfWorkers: record.numberOfWorkers as number,
    urgency: record.urgency as EmployerJobRequestDraft["urgency"]
  };
}

export function readEmployerJobRequestInput(input: unknown) {
  const record = asRecord(input);
  const requiredStrings = [
    "residenceId",
    "departmentId",
    "workGroup",
    "roleDefinition",
    "title",
    "timezone",
    "startAt",
    "endAt"
  ] as const;
  if (requiredStrings.some((key) => !isString(record[key]))) return null;
  if (
    !Number.isInteger(record.numberOfWorkers) ||
    (record.numberOfWorkers as number) < 1 ||
    !["normal", "urgent", "immediate"].includes(String(record.urgency)) ||
    !["single_day", "multi_day", "recurring_intent"].includes(String(record.requestType))
  ) {
    return null;
  }
  const startAt = new Date(record.startAt as string);
  const endAt = new Date(record.endAt as string);
  if (Number.isNaN(startAt.valueOf()) || Number.isNaN(endAt.valueOf()) || endAt <= startAt) {
    return null;
  }
  return {
    residenceId: record.residenceId as string,
    departmentId: record.departmentId as string,
    workGroup: record.workGroup as string,
    roleDefinition: record.roleDefinition as string,
    title: record.title as string,
    description: isString(record.description) ? record.description : undefined,
    numberOfWorkers: record.numberOfWorkers as number,
    urgency: record.urgency as "normal" | "urgent" | "immediate",
    requestType: record.requestType as "single_day" | "multi_day" | "recurring_intent",
    timezone: record.timezone as string,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    // Employer plans: job length is forwarded only when the form sent a valid one (the API ignores it
    // unless EMPLOYER_PLANS_ENABLED is on).
    ...(record.jobLength === "short_term" || record.jobLength === "long_term"
      ? { jobLength: record.jobLength as "short_term" | "long_term" }
      : {})
  };
}

export function readEmployerCalendarProfileInput(input: unknown) {
  const record = asRecord(input);
  const qualifications = Array.isArray(record.qualifications)
    ? record.qualifications.filter((value): value is string => typeof value === "string")
    : null;
  if (
    !qualifications ||
    qualifications.length > 20 ||
    qualifications.some((value) => !validOptionalText(value, 160)) ||
    !validNullableText(record.dutiesSummary, 2000) ||
    !validNullableText(record.addressSummary, 500) ||
    !validNullableText(record.specialInstructions, 2000) ||
    !(record.expectedVersion === null || nonNegativeInteger(record.expectedVersion))
  ) {
    return null;
  }
  return {
    dutiesSummary: normalizeNullableText(record.dutiesSummary),
    qualifications: qualifications.map((value) => value.trim().replace(/\s+/g, " ")),
    addressSummary: normalizeNullableText(record.addressSummary),
    specialInstructions: normalizeNullableText(record.specialInstructions),
    expectedVersion: record.expectedVersion as number | null
  };
}

function parseList(input: unknown, key: string) {
  const value = asRecord(input)[key];
  return Array.isArray(value) ? value : [];
}

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function isString(input: unknown): input is string {
  return typeof input === "string" && input.trim().length > 0;
}

function validDate(input: unknown) {
  return typeof input === "string" && !Number.isNaN(new Date(input).valueOf());
}

function nonNegativeInteger(input: unknown) {
  return Number.isInteger(input) && (input as number) >= 0;
}

function normalizeNullableText(input: unknown) {
  return typeof input === "string" && input.trim() ? input.trim().replace(/\s+/g, " ") : null;
}

function validNullableText(input: unknown, maximum: number) {
  return input === null || input === undefined || validOptionalText(input, maximum);
}

function validOptionalText(input: unknown, maximum: number) {
  if (typeof input !== "string") return false;
  const normalized = input.trim().replace(/\s+/g, " ");
  return normalized.length > 0 && normalized.length <= maximum;
}
