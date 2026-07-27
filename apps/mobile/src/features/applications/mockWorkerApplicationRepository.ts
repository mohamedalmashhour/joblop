import {
  canTransitionApplication,
  canTransitionConfirmation,
  canTransitionOffer,
  createShiftOfferSnapshot,
  type ApplicationStatus,
  type LocalAuditEvent,
  type ShiftDiscoveryRecord,
  type ShiftOffer,
  type ShiftOfferSnapshot,
  type SubmitApplicationInput,
  type WorkerApplication,
  type WorkerApplicationRepository,
  type WorkerApplicationSummary,
  type WorkerConfirmation
} from "@rwos/shared";
import {
  localAuditEventSchema,
  shiftOfferSchema,
  workerApplicationSchema,
  workerConfirmationSchema
} from "@rwos/validation";
import { mockShiftDiscoveryRecords } from "../../data/mock/shifts";
import { isProductionWorkerBuild } from "../../runtime/environment";
import {
  demoWorkerId,
  WorkerApplicationRepositoryError,
  type ListWorkerApplicationsFilters,
  type WorkerApplicationRepositoryState
} from "./repository";

const initialNow = "2026-07-13T13:00:00.000Z";

export class MockWorkerApplicationRepository implements WorkerApplicationRepository {
  private applications: WorkerApplication[];
  private offers: ShiftOffer[];
  private confirmations: WorkerConfirmation[];
  private auditEvents: LocalAuditEvent[];
  private sequence = 100;
  private readonly shifts: readonly ShiftDiscoveryRecord[];

  constructor(
    shifts: readonly ShiftDiscoveryRecord[] = isProductionWorkerBuild()
      ? []
      : mockShiftDiscoveryRecords,
    state: WorkerApplicationRepositoryState = isProductionWorkerBuild()
      ? { applications: [], offers: [], confirmations: [] }
      : createDefaultApplicationState(shifts)
  ) {
    this.shifts = shifts;
    this.applications = state.applications.map((item) => workerApplicationSchema.parse(item));
    this.offers = state.offers.map((item) => shiftOfferSchema.parse(item));
    this.confirmations = state.confirmations.map((item) => workerConfirmationSchema.parse(item));
    this.auditEvents = [];
  }

  reset(state: WorkerApplicationRepositoryState = createDefaultApplicationState(this.shifts)) {
    this.applications = state.applications.map((item) => workerApplicationSchema.parse(item));
    this.offers = state.offers.map((item) => shiftOfferSchema.parse(item));
    this.confirmations = state.confirmations.map((item) => workerConfirmationSchema.parse(item));
    this.auditEvents = [];
    this.sequence = 100;
  }

  async submitApplication(input: SubmitApplicationInput): Promise<WorkerApplicationSummary> {
    const now = this.now();
    const shift = this.getOpenShift(input.shiftId);

    if (Date.parse(shift.applicationDeadline) <= Date.parse(now)) {
      this.audit(
        "application.submit_blocked",
        "application",
        input.shiftId,
        "blocked",
        "deadline expired"
      );
      throw new WorkerApplicationRepositoryError(
        "This shift is past the application deadline.",
        "expired_action"
      );
    }

    if (shift.status !== "open") {
      this.audit(
        "application.submit_blocked",
        "application",
        input.shiftId,
        "blocked",
        "shift unavailable"
      );
      throw new WorkerApplicationRepositoryError(
        "This shift is not available.",
        "shift_unavailable"
      );
    }

    if (
      this.applications.some(
        (application) =>
          application.workerId === input.workerId &&
          application.shiftId === input.shiftId &&
          !["withdrawn", "rejected", "expired", "cancelled"].includes(application.status)
      )
    ) {
      this.audit(
        "application.duplicate_blocked",
        "application",
        input.shiftId,
        "blocked",
        "duplicate application"
      );
      throw new WorkerApplicationRepositoryError(
        "You already have an active application for this shift.",
        "duplicate_application"
      );
    }

    const application: WorkerApplication = workerApplicationSchema.parse({
      id: `app_${this.nextId()}`,
      rejectionReason: null,
      shiftId: input.shiftId,
      source: input.source ?? "worker_initiated",
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
      withdrawnAt: null,
      workerId: input.workerId,
      workerNote: input.workerNote?.trim() ? input.workerNote.trim() : null
    });

    this.applications = [application, ...this.applications];
    this.audit("application.submitted", "application", application.id, "success", null);
    return this.buildSummary(application);
  }

  async getApplicationById(id: string): Promise<WorkerApplicationSummary | null> {
    const application = this.applications.find((item) => item.id === id);
    return application ? this.buildSummary(application) : null;
  }

  async listWorkerApplications(
    workerId: string,
    filters: ListWorkerApplicationsFilters = {}
  ): Promise<readonly WorkerApplicationSummary[]> {
    const statusSet = new Set<ApplicationStatus>(filters.statuses ?? []);
    return this.applications
      .filter((application) => application.workerId === workerId)
      .filter((application) => statusSet.size === 0 || statusSet.has(application.status))
      .map((application) => this.buildSummary(application));
  }

  async withdrawApplication(id: string): Promise<WorkerApplicationSummary> {
    const application = this.requireApplication(id);
    const result = canTransitionApplication(application.status, "withdrawn");
    if (!result.allowed) {
      this.audit("application.withdraw_blocked", "application", id, "blocked", result.reason);
      throw new WorkerApplicationRepositoryError(
        result.reason ?? "Invalid transition.",
        "invalid_transition"
      );
    }

    const updated = this.updateApplication(id, {
      status: "withdrawn",
      updatedAt: this.now(),
      withdrawnAt: this.now()
    });
    this.audit("application.withdrawn", "application", id, "success", null);
    return this.buildSummary(updated);
  }

  async acceptOffer(offerId: string): Promise<WorkerApplicationSummary> {
    const offer = this.requireOffer(offerId);
    this.ensureNotExpired(offer.expiresAt, "offer", offerId);
    const result = canTransitionOffer(offer.status, "accepted");
    if (!result.allowed) {
      this.audit("offer.accept_blocked", "offer", offerId, "blocked", result.reason);
      throw new WorkerApplicationRepositoryError(
        result.reason ?? "Invalid transition.",
        "invalid_transition"
      );
    }

    this.offers = this.offers.map((item) =>
      item.id === offerId
        ? shiftOfferSchema.parse({
            ...item,
            respondedAt: this.now(),
            status: "accepted",
            updatedAt: this.now()
          })
        : item
    );
    this.updateApplication(offer.applicationId, { status: "accepted", updatedAt: this.now() });
    this.audit("offer.accepted", "offer", offerId, "success", null);
    return this.buildSummary(this.requireApplication(offer.applicationId));
  }

  async declineOffer(offerId: string): Promise<WorkerApplicationSummary> {
    const offer = this.requireOffer(offerId);
    this.ensureNotExpired(offer.expiresAt, "offer", offerId);
    const result = canTransitionOffer(offer.status, "declined");
    if (!result.allowed) {
      this.audit("offer.decline_blocked", "offer", offerId, "blocked", result.reason);
      throw new WorkerApplicationRepositoryError(
        result.reason ?? "Invalid transition.",
        "invalid_transition"
      );
    }

    this.offers = this.offers.map((item) =>
      item.id === offerId
        ? shiftOfferSchema.parse({
            ...item,
            respondedAt: this.now(),
            status: "declined",
            updatedAt: this.now()
          })
        : item
    );
    this.updateApplication(offer.applicationId, { status: "rejected", updatedAt: this.now() });
    this.audit("offer.declined", "offer", offerId, "success", null);
    return this.buildSummary(this.requireApplication(offer.applicationId));
  }

  async confirmShift(confirmationId: string): Promise<WorkerApplicationSummary> {
    const confirmation = this.requireConfirmation(confirmationId);
    this.ensureNotExpired(confirmation.expiresAt, "confirmation", confirmationId);
    const result = canTransitionConfirmation(confirmation.status, "confirmed");
    if (!result.allowed) {
      this.audit(
        "confirmation.confirm_blocked",
        "confirmation",
        confirmationId,
        "blocked",
        result.reason
      );
      throw new WorkerApplicationRepositoryError(
        result.reason ?? "Invalid transition.",
        "invalid_transition"
      );
    }

    const summary = this.buildSummary(this.requireApplication(confirmation.applicationId));
    this.ensureNoConfirmedOverlap(summary.shift, confirmation);

    this.confirmations = this.confirmations.map((item) =>
      item.id === confirmationId
        ? workerConfirmationSchema.parse({
            ...item,
            confirmedAt: this.now(),
            status: "confirmed",
            updatedAt: this.now()
          })
        : item
    );
    this.updateApplication(confirmation.applicationId, {
      status: "confirmed",
      updatedAt: this.now()
    });
    this.audit("confirmation.accepted", "confirmation", confirmationId, "success", null);
    return this.buildSummary(this.requireApplication(confirmation.applicationId));
  }

  async declineConfirmation(confirmationId: string): Promise<WorkerApplicationSummary> {
    const confirmation = this.requireConfirmation(confirmationId);
    this.ensureNotExpired(confirmation.expiresAt, "confirmation", confirmationId);
    const result = canTransitionConfirmation(confirmation.status, "declined");
    if (!result.allowed) {
      this.audit(
        "confirmation.decline_blocked",
        "confirmation",
        confirmationId,
        "blocked",
        result.reason
      );
      throw new WorkerApplicationRepositoryError(
        result.reason ?? "Invalid transition.",
        "invalid_transition"
      );
    }

    this.confirmations = this.confirmations.map((item) =>
      item.id === confirmationId
        ? workerConfirmationSchema.parse({
            ...item,
            declinedAt: this.now(),
            status: "declined",
            updatedAt: this.now()
          })
        : item
    );
    this.updateApplication(confirmation.applicationId, {
      status: "cancelled",
      updatedAt: this.now()
    });
    this.audit("confirmation.declined", "confirmation", confirmationId, "success", null);
    return this.buildSummary(this.requireApplication(confirmation.applicationId));
  }

  async listAuditEvents(): Promise<readonly LocalAuditEvent[]> {
    return this.auditEvents;
  }

  private buildSummary(application: WorkerApplication): WorkerApplicationSummary {
    const shift = this.getShiftSnapshot(application.shiftId);
    return {
      application,
      confirmation:
        this.confirmations.find((item) => item.applicationId === application.id) ?? null,
      offer: this.offers.find((item) => item.applicationId === application.id) ?? null,
      shift
    };
  }

  private updateApplication(id: string, patch: Partial<WorkerApplication>): WorkerApplication {
    let updated: WorkerApplication | null = null;
    this.applications = this.applications.map((application) => {
      if (application.id !== id) return application;
      updated = workerApplicationSchema.parse({ ...application, ...patch });
      return updated;
    });
    if (!updated) throw new WorkerApplicationRepositoryError("Application not found.", "not_found");
    return updated;
  }

  private requireApplication(id: string): WorkerApplication {
    const application = this.applications.find((item) => item.id === id);
    if (!application)
      throw new WorkerApplicationRepositoryError("Application not found.", "not_found");
    return application;
  }

  private requireOffer(id: string): ShiftOffer {
    const offer = this.offers.find((item) => item.id === id);
    if (!offer) throw new WorkerApplicationRepositoryError("Offer not found.", "not_found");
    return offer;
  }

  private requireConfirmation(id: string): WorkerConfirmation {
    const confirmation = this.confirmations.find((item) => item.id === id);
    if (!confirmation)
      throw new WorkerApplicationRepositoryError("Confirmation not found.", "not_found");
    return confirmation;
  }

  private getOpenShift(id: string): ShiftDiscoveryRecord {
    const shift = this.shifts.find((item) => item.id === id);
    if (!shift) throw new WorkerApplicationRepositoryError("Shift not found.", "not_found");
    return shift;
  }

  private getShiftSnapshot(id: string): ShiftOfferSnapshot {
    const offer = this.offers.find((item) => item.shiftId === id);
    if (offer) return offer.currentShiftSnapshot;
    return createShiftOfferSnapshot(this.getOpenShift(id));
  }

  private ensureNotExpired(
    expiresAt: string,
    entityType: "offer" | "confirmation",
    entityId: string
  ) {
    if (Date.parse(expiresAt) <= Date.parse(this.now())) {
      this.audit(
        `${entityType}.expired_blocked`,
        entityType,
        entityId,
        "blocked",
        "expired action"
      );
      throw new WorkerApplicationRepositoryError("This action has expired.", "expired_action");
    }
  }

  private ensureNoConfirmedOverlap(
    candidate: ShiftOfferSnapshot,
    currentConfirmation: WorkerConfirmation
  ) {
    const candidateStart = Date.parse(candidate.startAt);
    const candidateEnd = Date.parse(candidate.endAt);
    const hasConflict = this.confirmations.some((confirmation) => {
      if (confirmation.id === currentConfirmation.id || confirmation.status !== "confirmed")
        return false;
      const shift = this.getShiftSnapshot(confirmation.shiftId);
      return candidateStart < Date.parse(shift.endAt) && candidateEnd > Date.parse(shift.startAt);
    });
    if (hasConflict) {
      this.audit(
        "confirmation.conflict_blocked",
        "confirmation",
        currentConfirmation.id,
        "blocked",
        "overlapping confirmed shift"
      );
      throw new WorkerApplicationRepositoryError(
        "This confirmation conflicts with another confirmed shift.",
        "conflicting_shift"
      );
    }
  }

  private audit(
    action: string,
    entityType: "application" | "offer" | "confirmation",
    entityId: string,
    result: "success" | "blocked",
    reason: string | null
  ) {
    this.auditEvents = [
      localAuditEventSchema.parse({
        action,
        actorId: demoWorkerId,
        actorType: "worker",
        correlationId: `corr_${this.nextId()}`,
        entityId,
        entityType,
        id: `audit_${this.nextId()}`,
        reason,
        result,
        timestamp: this.now()
      }),
      ...this.auditEvents
    ];
  }

  private nextId(): string {
    this.sequence += 1;
    return this.sequence.toString().padStart(3, "0");
  }

  private now(): string {
    return initialNow;
  }
}

export function createDefaultApplicationState(
  shifts: readonly ShiftDiscoveryRecord[]
): WorkerApplicationRepositoryState {
  const chef = createShiftOfferSnapshot(requireShift(shifts, "shift_emergency_chef_001"));
  const careOriginal = createShiftOfferSnapshot(requireShift(shifts, "shift_psw_evening_002"));
  const careCurrent: ShiftOfferSnapshot = {
    ...careOriginal,
    endAt: "2026-07-16T05:00:00.000Z",
    estimatedTotal: { amountMinor: 34200, currency: "CAD" }
  };
  const housekeeping = createShiftOfferSnapshot(requireShift(shifts, "shift_housekeeping_003"));

  return {
    applications: [
      {
        id: "app_existing_chef_001",
        rejectionReason: null,
        shiftId: chef.id,
        source: "worker_initiated",
        status: "under_review",
        submittedAt: "2026-07-13T09:15:00.000Z",
        updatedAt: "2026-07-13T09:20:00.000Z",
        withdrawnAt: null,
        workerId: demoWorkerId,
        workerNote: "I can work alone in a prepared kitchen."
      },
      {
        id: "app_offer_care_002",
        rejectionReason: null,
        shiftId: careOriginal.id,
        source: "employer_invited",
        status: "offered",
        submittedAt: "2026-07-13T10:00:00.000Z",
        updatedAt: "2026-07-13T11:00:00.000Z",
        withdrawnAt: null,
        workerId: demoWorkerId,
        workerNote: "Available for evening care."
      },
      {
        id: "app_confirm_housekeeping_003",
        rejectionReason: null,
        shiftId: housekeeping.id,
        source: "worker_initiated",
        status: "accepted",
        submittedAt: "2026-07-13T10:30:00.000Z",
        updatedAt: "2026-07-13T12:00:00.000Z",
        withdrawnAt: null,
        workerId: demoWorkerId,
        workerNote: null
      }
    ],
    confirmations: [
      {
        applicationId: "app_confirm_housekeeping_003",
        confirmedAt: null,
        createdAt: "2026-07-13T12:00:00.000Z",
        declinedAt: null,
        expiresAt: "2026-07-14T12:00:00.000Z",
        id: "confirmation_housekeeping_003",
        offerId: "offer_housekeeping_003",
        requestedAt: "2026-07-13T12:00:00.000Z",
        shiftId: housekeeping.id,
        status: "pending",
        updatedAt: "2026-07-13T12:00:00.000Z",
        workerId: demoWorkerId
      }
    ],
    offers: [
      {
        applicationId: "app_offer_care_002",
        createdAt: "2026-07-13T11:00:00.000Z",
        currentShiftSnapshot: careCurrent,
        employerId: careOriginal.employerId,
        expiresAt: "2026-07-14T11:00:00.000Z",
        id: "offer_care_002",
        message: "Supervisor requests one additional hour for handoff coverage.",
        offeredAt: "2026-07-13T11:00:00.000Z",
        originalShiftSnapshot: careOriginal,
        respondedAt: null,
        shiftId: careOriginal.id,
        status: "pending",
        updatedAt: "2026-07-13T11:00:00.000Z",
        workerId: demoWorkerId
      },
      {
        applicationId: "app_confirm_housekeeping_003",
        createdAt: "2026-07-13T11:30:00.000Z",
        currentShiftSnapshot: housekeeping,
        employerId: housekeeping.employerId,
        expiresAt: "2026-07-14T12:00:00.000Z",
        id: "offer_housekeeping_003",
        message: "Please confirm final commitment.",
        offeredAt: "2026-07-13T11:30:00.000Z",
        originalShiftSnapshot: housekeeping,
        respondedAt: "2026-07-13T11:45:00.000Z",
        shiftId: housekeeping.id,
        status: "accepted",
        updatedAt: "2026-07-13T11:45:00.000Z",
        workerId: demoWorkerId
      }
    ]
  };
}

function requireShift(shifts: readonly ShiftDiscoveryRecord[], id: string): ShiftDiscoveryRecord {
  const shift = shifts.find((item) => item.id === id);
  if (!shift) throw new Error(`Missing required fixture shift: ${id}`);
  return shift;
}

export const mockWorkerApplicationRepository = new MockWorkerApplicationRepository();
