import { parsePayOffered, type PayOffered } from "@rwos/shared";

export type EmployerRequestContext = Readonly<{
  // address: the employer's own site address, used to pre-fill the request's "Site address" box.
  residences: readonly Readonly<{ id: string; name: string; address: string | null }>[];
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
  // Present when the API sent them: what the "Edit draft" form needs to open fully pre-filled.
  edit?: EmployerDraftEditFields;
}>;

export type EmployerAllowanceEntry = Readonly<{
  provision: "none" | "provided" | "allowance";
  amountMinor: number | null;
  note: string | null;
}>;

export type EmployerDraftEditFields = Readonly<{
  residenceId: string | null;
  departmentId: string | null;
  workGroupId: string | null;
  roleDefinitionId: string | null;
  requiredCertificates: readonly string[];
  requiredCertificateOther: string | null;
  allowances: Readonly<{
    transport: EmployerAllowanceEntry;
    meal: EmployerAllowanceEntry;
    lodging: EmployerAllowanceEntry;
  }> | null;
  // The employer's own shift conditions, when the API sent them.
  conditions?: EmployerShiftConditions;
}>;

export type EmployerShiftConditions = Readonly<{
  breakMinutes: number | null;
  dressCode: string | null;
  equipmentToBring: string | null;
  arrivalInstructions: string | null;
  workerNotes: string | null;
}>;

/** The employer's shift conditions from an API record (unknown values dropped). */
export function parseShiftConditions(input: unknown): EmployerShiftConditions | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const c = input as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);
  const breakMinutes = Number.isInteger(c.breakMinutes) && (c.breakMinutes as number) >= 0 && (c.breakMinutes as number) <= 240 ? (c.breakMinutes as number) : null;
  return { breakMinutes, dressCode: text(c.dressCode), equipmentToBring: text(c.equipmentToBring), arrivalInstructions: text(c.arrivalInstructions), workerNotes: text(c.workerNotes) };
}

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
        ? [{ id: record.id, name: record.name, address: residenceAddress(record) }]
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

// One line for a site's address ("901 Avenue du Parc, Laval, QC H7N 0A1"), or null when none is on file.
function residenceAddress(record: Readonly<Record<string, unknown>>): string | null {
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string).trim() : "");
  const street = text("addressSummary") || [text("addressLine1"), text("addressLine2")].filter(Boolean).join(" ");
  const regionPostal = [text("province") || text("region"), text("postalCode")].filter(Boolean).join(" ");
  const parts: string[] = [];
  for (const part of [street, text("city"), regionPostal]) {
    if (part && !parts.some((existing) => existing.toLowerCase().includes(part.toLowerCase()))) parts.push(part);
  }
  const line = parts.join(", ").slice(0, 500);
  return line || null;
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
        : null,
    ...draftEditFields(record)
  };
}

function draftEditFields(record: Readonly<Record<string, unknown>>): { edit?: EmployerDraftEditFields } {
  if (!isString(record.residenceId) && !isString(record.roleDefinitionId)) return {};
  const allowances = asRecord(record.allowances);
  const hasAllowances = record.allowances !== null && typeof record.allowances === "object";
  return {
    edit: {
      residenceId: isString(record.residenceId) ? record.residenceId : null,
      departmentId: isString(record.departmentId) ? record.departmentId : null,
      workGroupId: isString(record.workGroupId) ? record.workGroupId : null,
      roleDefinitionId: isString(record.roleDefinitionId) ? record.roleDefinitionId : null,
      requiredCertificates: Array.isArray(record.requiredCertificates)
        ? record.requiredCertificates.filter((value): value is string => typeof value === "string").slice(0, 20)
        : [],
      requiredCertificateOther: isString(record.requiredCertificateOther) ? record.requiredCertificateOther : null,
      allowances: hasAllowances
        ? {
            transport: allowanceEntry(allowances.transport),
            meal: allowanceEntry(allowances.meal),
            lodging: allowanceEntry(allowances.lodging)
          }
        : null,
      ...(parseShiftConditions(record.conditions) ? { conditions: parseShiftConditions(record.conditions)! } : {})
    }
  };
}

function allowanceEntry(input: unknown): EmployerAllowanceEntry {
  const entry = asRecord(input);
  const provision = entry.provision === "provided" || entry.provision === "allowance" ? entry.provision : "none";
  const amount = entry.amountMinor;
  return {
    provision,
    amountMinor: provision === "allowance" && Number.isInteger(amount) && (amount as number) >= 0 ? (amount as number) : null,
    note: provision !== "none" && isString(entry.note) ? entry.note : null
  };
}

// Optional full-form fields an "Edit draft" save may change (location, role, dates, certificates).
// Each is forwarded only when present and well formed; the API re-checks every one of them.
function draftUpdateExtras(record: Readonly<Record<string, unknown>>) {
  const strings = ["residenceId", "departmentId", "workGroup", "roleDefinition", "timezone"] as const;
  const extras: Record<string, unknown> = {};
  for (const key of strings) {
    if (record[key] === undefined) continue;
    if (!isString(record[key]) || (record[key] as string).length > 200) return null;
    extras[key] = (record[key] as string).trim();
  }
  if (record.requestType !== undefined) {
    if (!["single_day", "multi_day"].includes(String(record.requestType))) return null;
    extras.requestType = record.requestType;
  }
  if (record.startAt !== undefined || record.endAt !== undefined) {
    if (!validDate(record.startAt) || !validDate(record.endAt)) return null;
    const startAt = new Date(record.startAt as string);
    const endAt = new Date(record.endAt as string);
    if (endAt <= startAt) return null;
    extras.startAt = startAt.toISOString();
    extras.endAt = endAt.toISOString();
  }
  if (record.requiredCertificates !== undefined) {
    if (!Array.isArray(record.requiredCertificates)) return null;
    extras.requiredCertificates = record.requiredCertificates
      .filter((value): value is string => typeof value === "string")
      .slice(0, 20);
    if (typeof record.requiredCertificateOther === "string") {
      extras.requiredCertificateOther = record.requiredCertificateOther.slice(0, 200);
    }
  }
  return extras;
}

export function readEmployerJobRequestUpdate(input: unknown) {
  const record = asRecord(input);
  const extras = draftUpdateExtras(record);
  if (
    !extras ||
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
    urgency: record.urgency as EmployerJobRequestDraft["urgency"],
    ...extras
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
      : {}),
    // Long-term only: the pay the employer offers (paid directly to the worker). Forwarded as a clean
    // { minMinor, maxMinor, unit } when valid; the API refuses a long-term job without one.
    ...(record.jobLength === "long_term" && parsePayOffered(record.payOffered)
      ? { payOffered: payOfferedBody(parsePayOffered(record.payOffered)!) }
      : {}),
    // Required certificates, forwarded as sent (the API refuses an unknown key or an empty "other").
    ...requiredCertificatesBody(record)
  };
}

function requiredCertificatesBody(record: Readonly<Record<string, unknown>>) {
  if (!Array.isArray(record.requiredCertificates) || record.requiredCertificates.length === 0) return {};
  const keys = record.requiredCertificates.filter((value): value is string => typeof value === "string").slice(0, 20);
  const other = typeof record.requiredCertificateOther === "string" ? record.requiredCertificateOther.slice(0, 200) : undefined;
  return { requiredCertificates: keys, ...(other !== undefined ? { requiredCertificateOther: other } : {}) };
}

function payOfferedBody(pay: PayOffered) {
  return { minMinor: pay.minMinor, maxMinor: pay.maxMinor, unit: pay.unit };
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
  const conditions = readShiftConditionsInput(record.conditions);
  const allowances = readAllowancesForward(record.allowances);
  if (conditions === "invalid" || allowances === "invalid") return null;
  return {
    dutiesSummary: normalizeNullableText(record.dutiesSummary),
    qualifications: qualifications.map((value) => value.trim().replace(/\s+/g, " ")),
    addressSummary: normalizeNullableText(record.addressSummary),
    specialInstructions: normalizeNullableText(record.specialInstructions),
    expectedVersion: record.expectedVersion as number | null,
    // Shift conditions and per-shift allowances are forwarded only when the form sends them. The API
    // strips HTML and re-checks every limit; this only refuses obviously wrong shapes early.
    ...(conditions ? { conditions } : {}),
    ...(allowances ? { allowances } : {})
  };
}

/** Same limits as the API (apps/api/src/shiftConditions.ts). */
export const SHIFT_CONDITION_LIMITS = { breakMinutesMax: 240, dressCode: 120, equipmentToBring: 300, arrivalInstructions: 500, workerNotes: 500 } as const;

function readShiftConditionsInput(input: unknown) {
  if (input === undefined) return null;
  if (input === null) return { breakMinutes: null, dressCode: null, equipmentToBring: null, arrivalInstructions: null, workerNotes: null };
  if (typeof input !== "object" || Array.isArray(input)) return "invalid" as const;
  const record = input as Record<string, unknown>;
  const rawBreak = record.breakMinutes;
  const breakMinutes = rawBreak === undefined || rawBreak === null || rawBreak === "" ? null : rawBreak;
  if (breakMinutes !== null && (!Number.isInteger(breakMinutes) || (breakMinutes as number) < 0 || (breakMinutes as number) > SHIFT_CONDITION_LIMITS.breakMinutesMax)) {
    return "invalid" as const;
  }
  const text = (key: "dressCode" | "equipmentToBring" | "arrivalInstructions" | "workerNotes") => {
    const value = record[key];
    if (value === undefined || value === null) return null;
    if (typeof value !== "string" || value.trim().length > SHIFT_CONDITION_LIMITS[key]) return undefined;
    return value.trim() || null;
  };
  const out = {
    breakMinutes: breakMinutes as number | null,
    dressCode: text("dressCode"),
    equipmentToBring: text("equipmentToBring"),
    arrivalInstructions: text("arrivalInstructions"),
    workerNotes: text("workerNotes")
  };
  return Object.values(out).some((value) => value === undefined) ? ("invalid" as const) : out;
}

const PROVISIONS = new Set(["none", "provided", "allowance"]);

function readAllowancesForward(input: unknown) {
  if (input === undefined || input === null) return null;
  if (typeof input !== "object" || Array.isArray(input)) return "invalid" as const;
  const record = input as Record<string, unknown>;
  const entry = (value: unknown) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "object" || Array.isArray(value)) return undefined;
    const e = value as Record<string, unknown>;
    const provision = typeof e.provision === "string" ? e.provision : "none";
    const amount = e.amountMinor === undefined || e.amountMinor === null ? null : e.amountMinor;
    const note = e.note === undefined || e.note === null ? null : e.note;
    if (!PROVISIONS.has(provision)) return undefined;
    if (amount !== null && (!Number.isInteger(amount) || (amount as number) < 0 || (amount as number) > 1_000_000)) return undefined;
    if (note !== null && (typeof note !== "string" || note.trim().length > 200)) return undefined;
    return { provision, amountMinor: amount as number | null, note: typeof note === "string" ? note.trim() || null : null };
  };
  const out = { transport: entry(record.transport), meal: entry(record.meal), lodging: entry(record.lodging) };
  return Object.values(out).some((value) => value === undefined) ? ("invalid" as const) : out;
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
