export type EmployerRequestContext = Readonly<{
  residences: readonly Readonly<{ id: string; name: string }>[];
  departments: readonly Readonly<{ id: string; name: string; residenceId: string }>[];
  workGroups: readonly Readonly<{ id: string; slug: string; displayLabel: string }>[];
  roleDefinitions: readonly Readonly<{
    slug: string;
    displayLabel: string;
    workGroupId: string;
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
}): EmployerRequestContext {
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
      return isString(record.slug) && isString(record.displayLabel) && isString(record.workGroupId)
        ? [
            {
              slug: record.slug,
              displayLabel: record.displayLabel,
              workGroupId: record.workGroupId
            }
          ]
        : [];
    })
  };
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
    endAt: endAt.toISOString()
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
