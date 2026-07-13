import type { ShiftDiscoveryRecord } from "./shift";

export const applicationStatuses = [
  "draft",
  "submitted",
  "under_review",
  "offered",
  "accepted",
  "confirmed",
  "withdrawn",
  "rejected",
  "expired",
  "cancelled"
] as const;

export const applicationSources = [
  "worker_initiated",
  "employer_invited",
  "system_suggested"
] as const;

export const offerStatuses = ["pending", "accepted", "declined", "expired", "cancelled"] as const;

export const confirmationStatuses = [
  "pending",
  "confirmed",
  "declined",
  "expired",
  "cancelled"
] as const;

export const auditActorTypes = ["worker", "system"] as const;
export const auditEntityTypes = ["application", "offer", "confirmation"] as const;
export const auditResults = ["success", "blocked"] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];
export type ApplicationSource = (typeof applicationSources)[number];
export type OfferStatus = (typeof offerStatuses)[number];
export type ConfirmationStatus = (typeof confirmationStatuses)[number];
export type AuditActorType = (typeof auditActorTypes)[number];
export type AuditEntityType = (typeof auditEntityTypes)[number];
export type AuditResult = (typeof auditResults)[number];

export type ShiftOfferSnapshot = Readonly<
  Pick<
    ShiftDiscoveryRecord,
    | "id"
    | "employerId"
    | "employerName"
    | "title"
    | "category"
    | "city"
    | "province"
    | "country"
    | "addressSummary"
    | "startAt"
    | "endAt"
    | "hourlyRate"
    | "currency"
    | "estimatedTotal"
    | "requiredExperienceYears"
    | "requiredCertifications"
    | "requiredLanguages"
    | "dressCode"
    | "breakPolicy"
    | "cancellationPolicy"
    | "applicationDeadline"
    | "status"
    | "urgency"
  >
>;

export type WorkerApplication = Readonly<{
  id: string;
  workerId: string;
  shiftId: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  updatedAt: string;
  withdrawnAt: string | null;
  rejectionReason: string | null;
  source: ApplicationSource;
  workerNote: string | null;
}>;

export type ShiftOffer = Readonly<{
  id: string;
  applicationId: string;
  workerId: string;
  shiftId: string;
  employerId: string;
  status: OfferStatus;
  offeredAt: string;
  expiresAt: string;
  respondedAt: string | null;
  message: string | null;
  originalShiftSnapshot: ShiftOfferSnapshot;
  currentShiftSnapshot: ShiftOfferSnapshot;
  createdAt: string;
  updatedAt: string;
}>;

export type WorkerConfirmation = Readonly<{
  id: string;
  workerId: string;
  shiftId: string;
  applicationId: string;
  offerId: string;
  status: ConfirmationStatus;
  requestedAt: string;
  confirmedAt: string | null;
  declinedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}>;

export type LocalAuditEvent = Readonly<{
  id: string;
  timestamp: string;
  actorType: AuditActorType;
  actorId: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  result: AuditResult;
  reason: string | null;
  correlationId: string;
}>;

export type SubmitApplicationInput = Readonly<{
  workerId: string;
  shiftId: string;
  workerNote?: string | null;
  source?: ApplicationSource;
}>;

export type ListWorkerApplicationsFilters = Readonly<{
  statuses?: readonly ApplicationStatus[];
}>;

export type WorkerApplicationSummary = Readonly<{
  application: WorkerApplication;
  shift: ShiftOfferSnapshot;
  offer: ShiftOffer | null;
  confirmation: WorkerConfirmation | null;
}>;

export type WorkerApplicationRepository = Readonly<{
  submitApplication(input: SubmitApplicationInput): Promise<WorkerApplicationSummary>;
  getApplicationById(id: string): Promise<WorkerApplicationSummary | null>;
  listWorkerApplications(
    workerId: string,
    filters?: ListWorkerApplicationsFilters
  ): Promise<readonly WorkerApplicationSummary[]>;
  withdrawApplication(id: string): Promise<WorkerApplicationSummary>;
  acceptOffer(offerId: string): Promise<WorkerApplicationSummary>;
  declineOffer(offerId: string): Promise<WorkerApplicationSummary>;
  confirmShift(confirmationId: string): Promise<WorkerApplicationSummary>;
  declineConfirmation(confirmationId: string): Promise<WorkerApplicationSummary>;
  listAuditEvents(): Promise<readonly LocalAuditEvent[]>;
}>;

export type TransitionResult<TStatus extends string> = Readonly<{
  allowed: boolean;
  from: TStatus;
  to: TStatus;
  reason: string | null;
}>;

const applicationTransitions: Readonly<Record<ApplicationStatus, readonly ApplicationStatus[]>> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "withdrawn", "expired", "cancelled"],
  under_review: ["offered", "withdrawn", "rejected", "expired", "cancelled"],
  offered: ["accepted", "withdrawn", "rejected", "expired", "cancelled"],
  accepted: ["confirmed", "cancelled"],
  confirmed: [],
  withdrawn: [],
  rejected: [],
  expired: [],
  cancelled: []
};

const offerTransitions: Readonly<Record<OfferStatus, readonly OfferStatus[]>> = {
  pending: ["accepted", "declined", "expired", "cancelled"],
  accepted: [],
  declined: [],
  expired: [],
  cancelled: []
};

const confirmationTransitions: Readonly<Record<ConfirmationStatus, readonly ConfirmationStatus[]>> =
  {
    pending: ["confirmed", "declined", "expired", "cancelled"],
    confirmed: [],
    declined: [],
    expired: [],
    cancelled: []
  };

export function canTransitionApplication(
  from: ApplicationStatus,
  to: ApplicationStatus
): TransitionResult<ApplicationStatus> {
  return buildTransitionResult(from, to, applicationTransitions[from]);
}

export function canTransitionOffer(
  from: OfferStatus,
  to: OfferStatus
): TransitionResult<OfferStatus> {
  return buildTransitionResult(from, to, offerTransitions[from]);
}

export function canTransitionConfirmation(
  from: ConfirmationStatus,
  to: ConfirmationStatus
): TransitionResult<ConfirmationStatus> {
  return buildTransitionResult(from, to, confirmationTransitions[from]);
}

function buildTransitionResult<TStatus extends string>(
  from: TStatus,
  to: TStatus,
  allowedTargets: readonly TStatus[]
): TransitionResult<TStatus> {
  if (allowedTargets.includes(to)) {
    return { allowed: true, from, reason: null, to };
  }

  return {
    allowed: false,
    from,
    reason: `Invalid transition from ${from} to ${to}`,
    to
  };
}

export function createShiftOfferSnapshot(shift: ShiftDiscoveryRecord): ShiftOfferSnapshot {
  return {
    addressSummary: shift.addressSummary,
    applicationDeadline: shift.applicationDeadline,
    breakPolicy: shift.breakPolicy,
    cancellationPolicy: shift.cancellationPolicy,
    category: shift.category,
    city: shift.city,
    country: shift.country,
    currency: shift.currency,
    dressCode: shift.dressCode,
    employerId: shift.employerId,
    employerName: shift.employerName,
    endAt: shift.endAt,
    estimatedTotal: shift.estimatedTotal,
    hourlyRate: shift.hourlyRate,
    id: shift.id,
    province: shift.province,
    requiredCertifications: shift.requiredCertifications,
    requiredExperienceYears: shift.requiredExperienceYears,
    requiredLanguages: shift.requiredLanguages,
    startAt: shift.startAt,
    status: shift.status,
    title: shift.title,
    urgency: shift.urgency
  };
}
