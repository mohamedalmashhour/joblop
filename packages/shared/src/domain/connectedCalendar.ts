import type { ContractMoney } from "./moneyEngine";

export type CalendarWindow = Readonly<{
  startsAt: string;
  endsAt: string;
  timezone: string;
}>;

export type ClientCalendarEvent = Readonly<
  CalendarWindow & {
    audience: "client";
    eventType: "client_request";
    requestId: string;
    organizationId: string;
    roleLabel: string;
    requestedWorkerCount: number;
    locationSummary: string;
    status: "assigned";
    clientEconomics: {
      billRate: ContractMoney;
      termsVersion: string;
    };
  }
>;

export type AdminCalendarEvent = Readonly<
  CalendarWindow & {
    audience: "admin";
    eventType: "admin_review";
    requestId: string;
    organizationId: string;
    clientDisplayName: string;
    roleLabel: string;
    requestedWorkerCount: number;
    locationSummary: string;
    dutiesSummary: string;
    qualifications: readonly string[];
    reviewStatus: "approved";
    publicationStatus: "published_to_workers";
    workerResponseStatus: "accepted";
    assignmentStatus: "confirmed";
    contractReadiness: "confirmed";
    paymentMethodReadiness: "verified";
    internalAdminNotes: string;
    clientEconomics: {
      billRate: ContractMoney;
      termsVersion: string;
    };
    workerOfferEconomics: {
      hourlyRate: ContractMoney;
      transportationCompensation: ContractMoney;
      termsVersion: string;
    };
  }
>;

export type WorkerOfferCalendarEvent = Readonly<
  CalendarWindow & {
    audience: "worker";
    eventType: "published_offer";
    offerId: string;
    requestId: string;
    roleLabel: string;
    clientDisplayName: string;
    locationSummary: string;
    dutiesSummary: string;
    qualifications: readonly string[];
    status: "accepted";
    publishedAt: string;
    respondedAt: string;
    workerEconomics: {
      hourlyRate: ContractMoney;
      transportationCompensation: ContractMoney;
      termsVersion: string;
    };
  }
>;

export type WorkerConfirmedCalendarEvent = Readonly<
  CalendarWindow & {
    audience: "worker";
    eventType: "confirmed_assignment";
    assignmentId: string;
    requestId: string;
    workerId: string;
    roleLabel: string;
    clientDisplayName: string;
    locationSummary: string;
    status: "confirmed";
  }
>;

export type AssignmentCalendarVisibility = Readonly<{
  audience: "client";
  eventType: "assignment_visibility";
  assignmentId: string;
  requestId: string;
  status: "confirmed";
  assignedWorker: {
    displayName: string;
    roleLabel: string;
  };
}>;

export type AttendanceHandoffState = Readonly<{
  eventType: "attendance_handoff";
  assignmentId: string;
  eligibility: "ready";
  authority: "handoff_only";
  attendanceExecution: "not_started";
}>;

export type ConnectedCalendarFixture = Readonly<{
  request: Readonly<
    CalendarWindow & {
      id: string;
      organizationId: string;
      clientDisplayName: string;
      roleLabel: string;
      requestedWorkerCount: number;
      locationSummary: string;
      dutiesSummary: string;
      qualifications: readonly string[];
      status: "submitted";
    }
  >;
  adminReview: Readonly<{
    status: "approved";
    contractReadiness: "confirmed";
    paymentMethodReadiness: "verified";
    internalAdminNotes: string;
  }>;
  publication: Readonly<{
    offerId: string;
    status: "published_to_workers";
    publishedAt: string;
    clientEconomics: {
      billRate: ContractMoney;
      termsVersion: string;
    };
    workerOfferEconomics: {
      hourlyRate: ContractMoney;
      transportationCompensation: ContractMoney;
      termsVersion: string;
    };
  }>;
  workerResponse: Readonly<{
    workerId: string;
    status: "accepted";
    respondedAt: string;
  }>;
  assignment: Readonly<{
    id: string;
    status: "confirmed";
    assignedWorker: {
      id: string;
      clientSafeDisplayName: string;
      privateEmail: string;
      privatePhone: string;
      privateAddress: string;
    };
  }>;
}>;

export type ConnectedCalendarViews = Readonly<{
  client: ClientCalendarEvent;
  admin: AdminCalendarEvent;
  workerOffer: WorkerOfferCalendarEvent;
  workerConfirmed: WorkerConfirmedCalendarEvent;
  assignmentVisibility: AssignmentCalendarVisibility;
  attendanceHandoff: AttendanceHandoffState;
}>;

export function createConnectedCalendarViews(
  fixture: ConnectedCalendarFixture
): ConnectedCalendarViews {
  const window = {
    startsAt: fixture.request.startsAt,
    endsAt: fixture.request.endsAt,
    timezone: fixture.request.timezone
  };
  const clientEconomics = {
    billRate: { ...fixture.publication.clientEconomics.billRate },
    termsVersion: fixture.publication.clientEconomics.termsVersion
  };
  const workerOfferEconomics = {
    hourlyRate: { ...fixture.publication.workerOfferEconomics.hourlyRate },
    transportationCompensation: {
      ...fixture.publication.workerOfferEconomics.transportationCompensation
    },
    termsVersion: fixture.publication.workerOfferEconomics.termsVersion
  };

  return {
    client: {
      ...window,
      audience: "client",
      eventType: "client_request",
      requestId: fixture.request.id,
      organizationId: fixture.request.organizationId,
      roleLabel: fixture.request.roleLabel,
      requestedWorkerCount: fixture.request.requestedWorkerCount,
      locationSummary: fixture.request.locationSummary,
      status: "assigned",
      clientEconomics
    },
    admin: {
      ...window,
      audience: "admin",
      eventType: "admin_review",
      requestId: fixture.request.id,
      organizationId: fixture.request.organizationId,
      clientDisplayName: fixture.request.clientDisplayName,
      roleLabel: fixture.request.roleLabel,
      requestedWorkerCount: fixture.request.requestedWorkerCount,
      locationSummary: fixture.request.locationSummary,
      dutiesSummary: fixture.request.dutiesSummary,
      qualifications: [...fixture.request.qualifications],
      reviewStatus: fixture.adminReview.status,
      publicationStatus: fixture.publication.status,
      workerResponseStatus: fixture.workerResponse.status,
      assignmentStatus: fixture.assignment.status,
      contractReadiness: fixture.adminReview.contractReadiness,
      paymentMethodReadiness: fixture.adminReview.paymentMethodReadiness,
      internalAdminNotes: fixture.adminReview.internalAdminNotes,
      clientEconomics,
      workerOfferEconomics
    },
    workerOffer: {
      ...window,
      audience: "worker",
      eventType: "published_offer",
      offerId: fixture.publication.offerId,
      requestId: fixture.request.id,
      roleLabel: fixture.request.roleLabel,
      clientDisplayName: fixture.request.clientDisplayName,
      locationSummary: fixture.request.locationSummary,
      dutiesSummary: fixture.request.dutiesSummary,
      qualifications: [...fixture.request.qualifications],
      status: fixture.workerResponse.status,
      publishedAt: fixture.publication.publishedAt,
      respondedAt: fixture.workerResponse.respondedAt,
      workerEconomics: workerOfferEconomics
    },
    workerConfirmed: {
      ...window,
      audience: "worker",
      eventType: "confirmed_assignment",
      assignmentId: fixture.assignment.id,
      requestId: fixture.request.id,
      workerId: fixture.workerResponse.workerId,
      roleLabel: fixture.request.roleLabel,
      clientDisplayName: fixture.request.clientDisplayName,
      locationSummary: fixture.request.locationSummary,
      status: fixture.assignment.status
    },
    assignmentVisibility: {
      audience: "client",
      eventType: "assignment_visibility",
      assignmentId: fixture.assignment.id,
      requestId: fixture.request.id,
      status: fixture.assignment.status,
      assignedWorker: {
        displayName: fixture.assignment.assignedWorker.clientSafeDisplayName,
        roleLabel: fixture.request.roleLabel
      }
    },
    attendanceHandoff: {
      eventType: "attendance_handoff",
      assignmentId: fixture.assignment.id,
      eligibility: "ready",
      authority: "handoff_only",
      attendanceExecution: "not_started"
    }
  };
}
