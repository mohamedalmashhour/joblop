import type {
  ListWorkerApplicationsFilters,
  ShiftOffer,
  SubmitApplicationInput,
  WorkerApplication,
  WorkerApplicationRepository,
  WorkerApplicationSummary,
  WorkerConfirmation
} from "@rwos/shared";

export const demoWorkerId = "worker_demo_001";

export class WorkerApplicationRepositoryError extends Error {
  constructor(
    message: string,
    readonly code:
      | "duplicate_application"
      | "expired_action"
      | "invalid_transition"
      | "not_found"
      | "shift_unavailable"
      | "validation_failed"
      | "conflicting_shift"
  ) {
    super(message);
    this.name = "WorkerApplicationRepositoryError";
  }
}

export type WorkerApplicationRepositoryState = Readonly<{
  applications: readonly WorkerApplication[];
  offers: readonly ShiftOffer[];
  confirmations: readonly WorkerConfirmation[];
}>;

export type {
  ListWorkerApplicationsFilters,
  ShiftOffer,
  SubmitApplicationInput,
  WorkerApplicationRepository,
  WorkerApplicationSummary,
  WorkerConfirmation
};
