import type {
  AuthorizationRoleKey,
  JobRequestService,
  SessionValidationResult,
  WorkerOfferService
} from "./index";

export type CalendarVerificationState = "pending" | "verified" | "failed" | "unavailable";

export interface StoredCalendarRequestProfile {
  id: string;
  jobRequestId: string;
  organizationId: string;
  residenceId: string;
  dutiesSummary: string | null;
  qualifications: readonly string[];
  addressSummary: string | null;
  specialInstructions: string | null;
  contractVerificationState: CalendarVerificationState;
  paymentMethodReadinessState: CalendarVerificationState;
  locationVerificationState: CalendarVerificationState;
  version: number;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarRequestProfileRepository {
  upsert(input: {
    jobRequestId: string;
    organizationId: string;
    residenceId: string;
    dutiesSummary: string | null;
    qualifications: readonly string[];
    addressSummary: string | null;
    specialInstructions: string | null;
    contractVerificationState: CalendarVerificationState;
    paymentMethodReadinessState: CalendarVerificationState;
    locationVerificationState: CalendarVerificationState;
    expectedVersion: number | null;
    actorUserId: string;
    now: Date;
  }): Promise<StoredCalendarRequestProfile | null>;
  findByJobRequestId(jobRequestId: string): Promise<StoredCalendarRequestProfile | null>;
  findByJobRequestIds(
    jobRequestIds: readonly string[]
  ): Promise<readonly StoredCalendarRequestProfile[]>;
  updateVerification(input: {
    jobRequestId: string;
    contractVerificationState: CalendarVerificationState;
    paymentMethodReadinessState: CalendarVerificationState;
    locationVerificationState: CalendarVerificationState;
    expectedVersion: number;
    actorUserId: string;
    now: Date;
  }): Promise<StoredCalendarRequestProfile | null>;
}

type CalendarJobRequest = Awaited<ReturnType<JobRequestService["getForOrganization"]>>;
type CalendarSession = SessionValidationResult;
type CalendarJobRequestAccess = Pick<
  JobRequestService,
  | "authorizeCalendarProfileUpdate"
  | "getForOrganization"
  | "listForOrganization"
  | "getForAdmin"
  | "listAdminIntake"
>;
type WorkerOfferCalendarAccess = Pick<WorkerOfferService, "workerCalendarReference">;

export class CalendarRequestError extends Error {
  readonly code:
    | "RWOS_CALENDAR_REQUEST_NOT_EDITABLE"
    | "RWOS_CALENDAR_REQUEST_VERSION_CONFLICT"
    | "RWOS_INVALID_CALENDAR_REQUEST";

  constructor(
    code:
      | "RWOS_CALENDAR_REQUEST_NOT_EDITABLE"
      | "RWOS_CALENDAR_REQUEST_VERSION_CONFLICT"
      | "RWOS_INVALID_CALENDAR_REQUEST"
  ) {
    super("Calendar request operation was denied.");
    this.name = "CalendarRequestError";
    this.code = code;
  }
}

export function createCalendarRequestService(input: {
  repository: CalendarRequestProfileRepository;
  jobRequestAccess: CalendarJobRequestAccess;
  workerOfferAccess: WorkerOfferCalendarAccess;
  now?: () => Date;
}) {
  const currentTime = input.now ?? (() => new Date());

  return {
    async upsertClientProfile(profileInput: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      dutiesSummary: string | null;
      qualifications: readonly string[];
      addressSummary: string | null;
      specialInstructions: string | null;
      expectedVersion: number | null;
    }) {
      const jobRequest = await input.jobRequestAccess.authorizeCalendarProfileUpdate({
        actorUserId: profileInput.actorUserId,
        organizationId: profileInput.organizationId,
        jobRequestIdOrNumber: profileInput.jobRequestId
      });

      if (jobRequest.status !== "draft" && jobRequest.status !== "information_required") {
        throw new CalendarRequestError("RWOS_CALENDAR_REQUEST_NOT_EDITABLE");
      }

      const normalized = normalizeCalendarProfile(profileInput);
      if (!normalized) {
        throw new CalendarRequestError("RWOS_INVALID_CALENDAR_REQUEST");
      }

      const profile = await input.repository.upsert({
        ...normalized,
        jobRequestId: jobRequest.id,
        organizationId: jobRequest.organizationId,
        residenceId: jobRequest.residenceId,
        contractVerificationState: "pending",
        paymentMethodReadinessState: "pending",
        locationVerificationState: "pending",
        expectedVersion: profileInput.expectedVersion,
        actorUserId: profileInput.actorUserId,
        now: currentTime()
      });
      if (!profile) {
        throw new CalendarRequestError("RWOS_CALENDAR_REQUEST_VERSION_CONFLICT");
      }
      return profile;
    },

    async updateAdminVerification(verificationInput: {
      session: CalendarSession;
      roles: readonly AuthorizationRoleKey[];
      jobRequestIdOrNumber: string;
      contractVerificationState: CalendarVerificationState;
      paymentMethodReadinessState: CalendarVerificationState;
      locationVerificationState: CalendarVerificationState;
      expectedVersion: number;
    }) {
      const jobRequest = await input.jobRequestAccess.getForAdmin({
        session: verificationInput.session,
        roles: verificationInput.roles,
        jobRequestIdOrNumber: verificationInput.jobRequestIdOrNumber
      });
      const profile = await input.repository.updateVerification({
        jobRequestId: jobRequest.id,
        contractVerificationState: verificationInput.contractVerificationState,
        paymentMethodReadinessState: verificationInput.paymentMethodReadinessState,
        locationVerificationState: verificationInput.locationVerificationState,
        expectedVersion: verificationInput.expectedVersion,
        actorUserId: verificationInput.session.user?.id ?? "",
        now: currentTime()
      });
      if (!profile) {
        throw new CalendarRequestError("RWOS_CALENDAR_REQUEST_VERSION_CONFLICT");
      }
      return profile;
    },

    async listClientCalendar(listInput: {
      actorUserId: string;
      organizationId: string;
      residenceId?: string | null;
      departmentId?: string | null;
    }) {
      const jobRequests = await input.jobRequestAccess.listForOrganization(listInput);
      const profiles = await input.repository.findByJobRequestIds(
        jobRequests.map((jobRequest) => jobRequest.id)
      );
      return projectCalendarRequests(jobRequests, profiles, "client");
    },

    async getClientCalendarRequest(getInput: {
      actorUserId: string;
      organizationId: string;
      jobRequestIdOrNumber: string;
    }) {
      const jobRequest = await input.jobRequestAccess.getForOrganization(getInput);
      const profile = await input.repository.findByJobRequestId(jobRequest.id);
      return projectCalendarRequest(jobRequest, profile, "client");
    },

    async listAdminCalendar(listInput: {
      session: CalendarSession;
      roles: readonly AuthorizationRoleKey[];
    }) {
      const jobRequests = await input.jobRequestAccess.listAdminIntake(listInput);
      const profiles = await input.repository.findByJobRequestIds(
        jobRequests.map((jobRequest) => jobRequest.id)
      );
      return projectCalendarRequests(jobRequests, profiles, "admin");
    },

    async getAdminCalendarRequest(getInput: {
      session: CalendarSession;
      roles: readonly AuthorizationRoleKey[];
      jobRequestIdOrNumber: string;
    }) {
      const jobRequest = await input.jobRequestAccess.getForAdmin(getInput);
      const profile = await input.repository.findByJobRequestId(jobRequest.id);
      return projectCalendarRequest(jobRequest, profile, "admin");
    },

    async getWorkerOfferCalendarReference(workerInput: {
      session: CalendarSession;
      roles: readonly AuthorizationRoleKey[];
      workerOfferId: string;
    }) {
      const workerOffer = await input.workerOfferAccess.workerCalendarReference(workerInput);
      const terms = workerOffer.currentTermsVersion;

      return {
        workerOfferId: workerOffer.id,
        jobRequestId: workerOffer.jobRequestId,
        status: workerOffer.status,
        expiresAt: workerOffer.expiresAt,
        title: terms?.workerVisibleTitle ?? null,
        summary: terms?.workerVisibleSummary ?? null,
        startAt: terms?.startAt ?? null,
        endAt: terms?.endAt ?? null,
        timezone: terms?.timezone ?? null,
        compensationSummary: terms?.compensationSummary ?? null,
        policySummary: terms?.policySummary ?? null,
        versionToken: workerOffer.versionToken,
        visibility: "worker_authorized_offer_reference" as const
      };
    }
  };
}

export type CalendarRequestService = ReturnType<typeof createCalendarRequestService>;

export function createPrismaCalendarRequestProfileRepository(
  prismaClient: unknown
): CalendarRequestProfileRepository {
  const prisma = prismaClient as {
    staffingRequestCalendarProfile: {
      create(args: unknown): Promise<PrismaCalendarRequestProfile>;
      findUnique(args: unknown): Promise<PrismaCalendarRequestProfile | null>;
      findMany(args: unknown): Promise<readonly PrismaCalendarRequestProfile[]>;
      updateMany(args: unknown): Promise<{ count: number }>;
    };
  };

  return {
    async upsert(profileInput) {
      const existing = await prisma.staffingRequestCalendarProfile.findUnique({
        where: { jobRequestId: profileInput.jobRequestId }
      });

      if (!existing) {
        if (profileInput.expectedVersion !== null) return null;
        try {
          const created = await prisma.staffingRequestCalendarProfile.create({
            data: {
              jobRequestId: profileInput.jobRequestId,
              organizationId: profileInput.organizationId,
              residenceId: profileInput.residenceId,
              dutiesSummary: profileInput.dutiesSummary,
              qualifications: [...profileInput.qualifications],
              addressSummary: profileInput.addressSummary,
              specialInstructions: profileInput.specialInstructions,
              contractVerificationState: profileInput.contractVerificationState,
              paymentMethodReadinessState: profileInput.paymentMethodReadinessState,
              locationVerificationState: profileInput.locationVerificationState,
              createdByUserId: profileInput.actorUserId,
              updatedByUserId: profileInput.actorUserId,
              createdAt: profileInput.now,
              updatedAt: profileInput.now
            }
          });
          return fromPrismaProfile(created);
        } catch (error) {
          if (isPrismaUniqueConflict(error)) return null;
          throw error;
        }
      }

      if (profileInput.expectedVersion !== existing.version) return null;
      const result = await prisma.staffingRequestCalendarProfile.updateMany({
        where: { jobRequestId: profileInput.jobRequestId, version: profileInput.expectedVersion },
        data: {
          dutiesSummary: profileInput.dutiesSummary,
          qualifications: [...profileInput.qualifications],
          addressSummary: profileInput.addressSummary,
          specialInstructions: profileInput.specialInstructions,
          contractVerificationState: "pending",
          paymentMethodReadinessState: "pending",
          locationVerificationState: "pending",
          updatedByUserId: profileInput.actorUserId,
          updatedAt: profileInput.now,
          version: { increment: 1 }
        }
      });
      if (result.count !== 1) return null;
      const profile = await prisma.staffingRequestCalendarProfile.findUnique({
        where: { jobRequestId: profileInput.jobRequestId }
      });
      if (!profile) return null;
      return fromPrismaProfile(profile);
    },

    async findByJobRequestId(jobRequestId) {
      const profile = await prisma.staffingRequestCalendarProfile.findUnique({
        where: { jobRequestId }
      });
      return profile ? fromPrismaProfile(profile) : null;
    },

    async findByJobRequestIds(jobRequestIds) {
      if (jobRequestIds.length === 0) return [];
      const profiles = await prisma.staffingRequestCalendarProfile.findMany({
        where: { jobRequestId: { in: [...jobRequestIds] } }
      });
      return profiles.map(fromPrismaProfile);
    },

    async updateVerification(verificationInput) {
      const result = await prisma.staffingRequestCalendarProfile.updateMany({
        where: {
          jobRequestId: verificationInput.jobRequestId,
          version: verificationInput.expectedVersion
        },
        data: {
          contractVerificationState: verificationInput.contractVerificationState,
          paymentMethodReadinessState: verificationInput.paymentMethodReadinessState,
          locationVerificationState: verificationInput.locationVerificationState,
          updatedByUserId: verificationInput.actorUserId,
          updatedAt: verificationInput.now,
          version: { increment: 1 }
        }
      });
      if (result.count !== 1) return null;
      const profile = await prisma.staffingRequestCalendarProfile.findUnique({
        where: { jobRequestId: verificationInput.jobRequestId }
      });
      return profile ? fromPrismaProfile(profile) : null;
    }
  };
}

interface PrismaCalendarRequestProfile extends Omit<
  StoredCalendarRequestProfile,
  "qualifications"
> {
  qualifications: unknown;
}

function fromPrismaProfile(profile: PrismaCalendarRequestProfile): StoredCalendarRequestProfile {
  return {
    ...profile,
    qualifications: Array.isArray(profile.qualifications)
      ? profile.qualifications.filter((value): value is string => typeof value === "string")
      : []
  };
}

function normalizeCalendarProfile(input: {
  dutiesSummary: string | null;
  qualifications: readonly string[];
  addressSummary: string | null;
  specialInstructions: string | null;
}) {
  if (
    hasInvalidText(input.dutiesSummary, 2000) ||
    hasInvalidText(input.addressSummary, 500) ||
    hasInvalidText(input.specialInstructions, 2000) ||
    input.qualifications.some((qualification) => hasInvalidText(qualification, 160))
  ) {
    return null;
  }

  const qualifications = input.qualifications.map((qualification) =>
    normalizeText(qualification, 160)!
  );

  if (qualifications.length > 20) return null;

  return {
    dutiesSummary: normalizeText(input.dutiesSummary, 2000),
    qualifications,
    addressSummary: normalizeText(input.addressSummary, 500),
    specialInstructions: normalizeText(input.specialInstructions, 2000)
  };
}

function hasInvalidText(value: string | null, maximumLength: number) {
  if (value == null) return false;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length === 0 || normalized.length > maximumLength;
}

function isPrismaUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function normalizeText(value: string | null, maximumLength: number) {
  if (value == null) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maximumLength) return null;
  return normalized;
}

function projectCalendarRequests(
  jobRequests: readonly CalendarJobRequest[],
  profiles: readonly StoredCalendarRequestProfile[],
  audience: "client" | "admin"
) {
  const profilesByRequestId = new Map(profiles.map((profile) => [profile.jobRequestId, profile]));
  return jobRequests.map((jobRequest) =>
    projectCalendarRequest(jobRequest, profilesByRequestId.get(jobRequest.id) ?? null, audience)
  );
}

function projectCalendarRequest(
  jobRequest: CalendarJobRequest,
  profile: StoredCalendarRequestProfile | null,
  audience: "client" | "admin"
) {
  return {
    id: jobRequest.id,
    requestNumber: jobRequest.jobRequestNumber,
    organizationId: jobRequest.organizationId,
    residenceId: jobRequest.residenceId,
    departmentId: jobRequest.departmentId,
    title: jobRequest.title,
    description: jobRequest.description,
    numberOfWorkers: jobRequest.numberOfWorkers,
    urgency: jobRequest.urgency,
    requestType: jobRequest.requestType,
    timezone: jobRequest.timezone,
    startAt: jobRequest.startAt,
    endAt: jobRequest.endAt,
    status: toCalendarStatus(jobRequest.status),
    ...(audience === "admin"
      ? {
          authoritativeStatus: jobRequest.status,
          adminReviewReason: jobRequest.adminReviewReason
        }
      : {}),
    dutiesSummary: profile?.dutiesSummary ?? null,
    qualifications: profile?.qualifications ?? [],
    addressSummary: profile?.addressSummary ?? null,
    specialInstructions: profile?.specialInstructions ?? null,
    verification: {
      contract: profile?.contractVerificationState ?? "pending",
      paymentMethodReadiness: profile?.paymentMethodReadinessState ?? "pending",
      location: profile?.locationVerificationState ?? "pending"
    },
    versionToken: jobRequest.versionToken,
    createdAt: jobRequest.createdAt,
    updatedAt: jobRequest.updatedAt,
    audience
  };
}

function toCalendarStatus(status: CalendarJobRequest["status"]) {
  switch (status) {
    case "admin_review":
    case "information_required":
      return "under_review" as const;
    case "approved_for_dispatch":
      return "published" as const;
    case "expired":
      return "cancelled" as const;
    case "archived":
      return "completed" as const;
    default:
      return status;
  }
}
