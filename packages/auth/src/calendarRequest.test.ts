import { describe, expect, it } from "vitest";
import type { SessionValidationResult } from "./index";
import {
  CalendarRequestError,
  createCalendarRequestService,
  upgradeClientStatusForCoverage,
  type CalendarRequestProfileRepository,
  type StoredCalendarRequestProfile
} from "./calendarRequest";

describe("upgradeClientStatusForCoverage", () => {
  it("lifts published → assigned once confirmed workers fill the request", () => {
    expect(upgradeClientStatusForCoverage("published", 1, { activeCount: 1, inProgress: false })).toBe("assigned");
    expect(upgradeClientStatusForCoverage("published", 2, { activeCount: 2, inProgress: false })).toBe("assigned");
  });
  it("shows in_progress once attendance is underway", () => {
    expect(upgradeClientStatusForCoverage("published", 1, { activeCount: 1, inProgress: true })).toBe("in_progress");
  });
  it("stays published when not fully staffed or no coverage", () => {
    expect(upgradeClientStatusForCoverage("published", 2, { activeCount: 1, inProgress: false })).toBe("published");
    expect(upgradeClientStatusForCoverage("published", 1, undefined)).toBe("published");
  });
  it("never overrides non-published statuses", () => {
    expect(upgradeClientStatusForCoverage("under_review", 1, { activeCount: 5, inProgress: true })).toBe("under_review");
    expect(upgradeClientStatusForCoverage("cancelled", 1, { activeCount: 1, inProgress: false })).toBe("cancelled");
    expect(upgradeClientStatusForCoverage("draft", 1, { activeCount: 1, inProgress: false })).toBe("draft");
  });
});

const now = new Date("2026-08-01T12:00:00.000Z");
const request = {
  id: "request-1",
  jobRequestNumber: "JR-2026-000001",
  organizationId: "organization-1",
  residenceId: "residence-1",
  departmentId: "department-1",
  workGroupId: "work-group-1",
  roleDefinitionId: "role-1",
  creatorUserId: "client-1",
  title: "Personal Support Worker",
  description: "Resident-care coverage",
  numberOfWorkers: 1,
  urgency: "normal" as const,
  requestType: "single_day" as const,
  timezone: "America/Toronto",
  startAt: new Date("2026-08-03T12:00:00.000Z"),
  endAt: new Date("2026-08-03T20:00:00.000Z"),
  isMultiDay: false,
  hasRecurringIntent: false,
  status: "draft" as const,
  adminReviewReason: null,
  version: 1,
  versionToken: 1,
  createdByUserId: "client-1",
  updatedByUserId: null,
  createdAt: now,
  updatedAt: now,
  submittedAt: null,
  cancelledAt: null,
  expiredAt: null,
  archivedAt: null
};

const noAllowances = {
  transportProvision: "none",
  transportAmountMinor: null,
  transportNote: null,
  mealProvision: "none",
  mealAmountMinor: null,
  mealNote: null,
  lodgingProvision: "none",
  lodgingAmountMinor: null,
  lodgingNote: null
} as const;

describe("calendar request persistence service", () => {
  it("persists calendar metadata only after organization-scoped request authorization", async () => {
    const repository = new MemoryCalendarRequestProfileRepository();
    let writeAuthorized = false;
    const service = createCalendarRequestService({
      repository,
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => {
          writeAuthorized = true;
          return request;
        },
        getForOrganization: async () => request,
        listForOrganization: async () => [request],
        getForAdmin: async () => request,
        listAdminIntake: async () => [request],
        listAdminLifecycle: async () => [request]
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });

    const profile = await service.upsertClientProfile({
      actorUserId: "client-1",
      organizationId: "organization-1",
      jobRequestId: request.id,
      dutiesSummary: "Support the scheduled resident-care routine.",
      qualifications: ["PSW certificate", "Vulnerable-sector screening"],
      addressSummary: "Sunrise of Oak Hill, Toronto",
      specialInstructions: "Report to reception.",
      expectedVersion: null
    });

    expect(profile.jobRequestId).toBe(request.id);
    expect(writeAuthorized).toBe(true);
    expect(profile.qualifications).toEqual(["PSW certificate", "Vulnerable-sector screening"]);
    expect(profile.contractVerificationState).toBe("pending");
    expect(JSON.stringify(profile)).not.toMatch(
      /workerPay|platformMargin|clientBillRate|paymentMethodToken/i
    );
  });

  it("returns separate client and admin calendar projections without cross-party economics", async () => {
    const repository = new MemoryCalendarRequestProfileRepository();
    await repository.upsert({
      jobRequestId: request.id,
      organizationId: request.organizationId,
      residenceId: request.residenceId,
      dutiesSummary: "Resident-care coverage.",
      qualifications: ["PSW certificate"],
      addressSummary: "Toronto",
      specialInstructions: null,
      ...noAllowances,
      contractVerificationState: "verified",
      paymentMethodReadinessState: "pending",
      locationVerificationState: "verified",
      expectedVersion: null,
      actorUserId: "client-1",
      now
    });
    const service = createCalendarRequestService({
      repository,
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => request,
        getForOrganization: async () => request,
        listForOrganization: async () => [request],
        getForAdmin: async () => request,
        listAdminIntake: async () => [request],
        listAdminLifecycle: async () => [request]
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });

    const client = await service.listClientCalendar({
      actorUserId: "client-1",
      organizationId: request.organizationId
    });
    const admin = await service.listAdminCalendar({
      session: authenticatedSession,
      roles: ["PLATFORM_ADMINISTRATOR"]
    });

    expect(client).toHaveLength(1);
    expect(admin).toHaveLength(1);
    expect(JSON.stringify({ client, admin })).not.toMatch(
      /workerPay|platformMargin|clientBillRate|paymentMethodToken|rawPayment/i
    );
    expect(admin[0]?.verification).toEqual({
      contract: "verified",
      location: "verified",
      paymentMethodReadiness: "pending"
    });
    expect(client[0]).not.toHaveProperty("authoritativeStatus");
    expect(client[0]).not.toHaveProperty("adminReviewReason");
    expect(admin[0]).toHaveProperty("authoritativeStatus", "draft");
  });

  it("exposes only the employer-facing information request reason", async () => {
    const informationRequired = {
      ...request,
      status: "information_required" as const,
      adminReviewReason: "Clarify the overnight supervision plan."
    };
    const service = createCalendarRequestService({
      repository: new MemoryCalendarRequestProfileRepository(),
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => informationRequired,
        getForOrganization: async () => informationRequired,
        listForOrganization: async () => [informationRequired],
        getForAdmin: async () => informationRequired,
        listAdminIntake: async () => [informationRequired],
        listAdminLifecycle: async () => [informationRequired]
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });

    const [client] = await service.listClientCalendar({
      actorUserId: "client-1",
      organizationId: request.organizationId
    });

    expect(client).toMatchObject({
      status: "under_review",
      actionRequired: "information_required",
      actionRequiredReason: "Clarify the overnight supervision plan."
    });
    expect(client).not.toHaveProperty("adminReviewReason");
  });

  it("rejects profile writes once the request leaves an editable lifecycle state", async () => {
    const service = createCalendarRequestService({
      repository: new MemoryCalendarRequestProfileRepository(),
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => ({ ...request, status: "submitted" }),
        getForOrganization: async () => ({ ...request, status: "submitted" }),
        listForOrganization: async () => [],
        getForAdmin: async () => request,
        listAdminIntake: async () => [],
        listAdminLifecycle: async () => []
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });

    await expect(
      service.upsertClientProfile({
        actorUserId: "client-1",
        organizationId: request.organizationId,
        jobRequestId: request.id,
        dutiesSummary: null,
        qualifications: [],
        addressSummary: null,
        specialInstructions: null,
        expectedVersion: null
      })
    ).rejects.toBeInstanceOf(CalendarRequestError);
  });

  it("rejects a cross-organization request returned by the write authorization boundary", async () => {
    const repository = new MemoryCalendarRequestProfileRepository();
    const service = createCalendarRequestService({
      repository,
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => ({
          ...request,
          organizationId: "organization-2"
        }),
        getForOrganization: async () => request,
        listForOrganization: async () => [],
        getForAdmin: async () => request,
        listAdminIntake: async () => [],
        listAdminLifecycle: async () => []
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });

    await expect(
      service.upsertClientProfile({
        actorUserId: "client-1",
        organizationId: request.organizationId,
        jobRequestId: request.id,
        dutiesSummary: null,
        qualifications: [],
        addressSummary: null,
        specialInstructions: null,
        expectedVersion: null
      })
    ).rejects.toMatchObject({ code: "RWOS_INVALID_CALENDAR_REQUEST" });

    expect(await repository.findByJobRequestId(request.id)).toBeNull();
  });

  it("does not project profile metadata from another organization or residence", async () => {
    const crossOrganizationProfile = profileFixture({
      organizationId: "organization-2",
      dutiesSummary: "Private Organization B duties"
    });
    const crossResidenceProfile = profileFixture({
      residenceId: "residence-2",
      dutiesSummary: "Private residence duties"
    });
    const profiles = [crossOrganizationProfile, crossResidenceProfile];
    let profileIndex = 0;
    const repository: CalendarRequestProfileRepository = {
      upsert: async () => null,
      findByJobRequestId: async () => profiles[profileIndex++] ?? null,
      findByJobRequestIds: async () => [crossOrganizationProfile],
      updateVerification: async () => null
    };
    const service = createCalendarRequestService({
      repository,
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => request,
        getForOrganization: async () => request,
        listForOrganization: async () => [request],
        getForAdmin: async () => request,
        listAdminIntake: async () => [],
        listAdminLifecycle: async () => []
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });

    const [listed] = await service.listClientCalendar({
      actorUserId: "client-1",
      organizationId: request.organizationId
    });
    const organizationMismatch = await service.getClientCalendarRequest({
      actorUserId: "client-1",
      organizationId: request.organizationId,
      jobRequestIdOrNumber: request.id
    });
    const residenceMismatch = await service.getClientCalendarRequest({
      actorUserId: "client-1",
      organizationId: request.organizationId,
      jobRequestIdOrNumber: request.id
    });

    for (const projection of [listed, organizationMismatch, residenceMismatch]) {
      expect(projection).toMatchObject({
        dutiesSummary: null,
        qualifications: [],
        addressSummary: null,
        specialInstructions: null,
        verification: {
          contract: "pending",
          paymentMethodReadiness: "pending",
          location: "pending"
        }
      });
    }
    expect(JSON.stringify([listed, organizationMismatch, residenceMismatch])).not.toContain(
      "Private"
    );
  });

  it("returns a worker-authorized offer reference without client economics", async () => {
    const service = createCalendarRequestService({
      repository: new MemoryCalendarRequestProfileRepository(),
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => request,
        getForOrganization: async () => request,
        listForOrganization: async () => [],
        getForAdmin: async () => request,
        listAdminIntake: async () => [],
        listAdminLifecycle: async () => []
      },
      workerOfferAccess: {
        workerCalendarReference: async () =>
          ({
            id: "offer-1",
            jobRequestId: request.id,
            status: "sent",
            expiresAt: new Date("2026-08-02T12:00:00.000Z"),
            currentTermsVersion: {
              workerVisibleTitle: "Personal Support Worker",
              workerVisibleSummary: "Resident-care coverage",
              startAt: request.startAt,
              endAt: request.endAt,
              timezone: request.timezone,
              compensationSummary: "$30.00 CAD / hour",
              policySummary: "Fixture offer policy"
            },
            versionToken: 1
          }) as never
      }
    });

    const reference = await service.getWorkerOfferCalendarReference({
      session: authenticatedSession,
      roles: ["WORKER_ACCESS"],
      workerOfferId: "offer-1"
    });

    expect(reference.compensationSummary).toBe("$30.00 CAD / hour");
    expect(JSON.stringify(reference)).not.toMatch(
      /clientBillRate|platformMargin|paymentMethod|internalAdminNotes/i
    );
  });

  it("reserves trusted verification transitions for authorized admin access", async () => {
    const repository = new MemoryCalendarRequestProfileRepository();
    await repository.upsert({
      jobRequestId: request.id,
      organizationId: request.organizationId,
      residenceId: request.residenceId,
      dutiesSummary: null,
      qualifications: [],
      addressSummary: null,
      specialInstructions: null,
      ...noAllowances,
      contractVerificationState: "pending",
      paymentMethodReadinessState: "pending",
      locationVerificationState: "pending",
      expectedVersion: null,
      actorUserId: "client-1",
      now
    });
    let adminRead = false;
    const service = createCalendarRequestService({
      repository,
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => request,
        getForOrganization: async () => request,
        listForOrganization: async () => [],
        getForAdmin: async () => {
          adminRead = true;
          return request;
        },
        listAdminIntake: async () => [],
        listAdminLifecycle: async () => []
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });

    const profile = await service.updateAdminVerification({
      session: authenticatedSession,
      roles: ["PLATFORM_ADMINISTRATOR"],
      jobRequestIdOrNumber: request.id,
      contractVerificationState: "verified",
      paymentMethodReadinessState: "verified",
      locationVerificationState: "verified",
      expectedVersion: 1
    });

    expect(adminRead).toBe(true);
    expect(profile.contractVerificationState).toBe("verified");

    const edited = await service.upsertClientProfile({
      actorUserId: "client-1",
      organizationId: request.organizationId,
      jobRequestId: request.id,
      dutiesSummary: "Updated duties require a fresh review.",
      qualifications: [],
      addressSummary: null,
      specialInstructions: null,
      expectedVersion: 2
    });
    expect(edited.contractVerificationState).toBe("pending");
    expect(edited.paymentMethodReadinessState).toBe("pending");
    expect(edited.locationVerificationState).toBe("pending");
  });

  it("scopes admin verification mutations to the authorized organization and residence", async () => {
    let observedUpdate:
      | Parameters<CalendarRequestProfileRepository["updateVerification"]>[0]
      | undefined;
    const repository: CalendarRequestProfileRepository = {
      upsert: async () => null,
      findByJobRequestId: async () => null,
      findByJobRequestIds: async () => [],
      updateVerification: async (input) => {
        observedUpdate = input;
        return profileFixture();
      }
    };
    const service = createCalendarRequestService({
      repository,
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => request,
        getForOrganization: async () => request,
        listForOrganization: async () => [],
        getForAdmin: async () => request,
        listAdminIntake: async () => [],
        listAdminLifecycle: async () => []
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });

    await service.updateAdminVerification({
      session: authenticatedSession,
      roles: ["PLATFORM_ADMINISTRATOR"],
      jobRequestIdOrNumber: request.id,
      contractVerificationState: "verified",
      paymentMethodReadinessState: "verified",
      locationVerificationState: "verified",
      expectedVersion: 1
    });

    expect(observedUpdate).toMatchObject({
      jobRequestId: request.id,
      organizationId: request.organizationId,
      residenceId: request.residenceId
    });
  });

  it("rejects over-limit calendar metadata instead of silently discarding it", async () => {
    const service = createCalendarRequestService({
      repository: new MemoryCalendarRequestProfileRepository(),
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => request,
        getForOrganization: async () => request,
        listForOrganization: async () => [],
        getForAdmin: async () => request,
        listAdminIntake: async () => [],
        listAdminLifecycle: async () => []
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });

    await expect(
      service.upsertClientProfile({
        actorUserId: "client-1",
        organizationId: request.organizationId,
        jobRequestId: request.id,
        dutiesSummary: "x".repeat(2001),
        qualifications: ["y".repeat(161)],
        addressSummary: null,
        specialInstructions: null,
        expectedVersion: null
      })
    ).rejects.toMatchObject({ code: "RWOS_INVALID_CALENDAR_REQUEST" });
  });

  it("rejects stale client and admin profile writes", async () => {
    const repository = new MemoryCalendarRequestProfileRepository();
    const service = createCalendarRequestService({
      repository,
      jobRequestAccess: {
        authorizeCalendarProfileUpdate: async () => request,
        getForOrganization: async () => request,
        listForOrganization: async () => [],
        getForAdmin: async () => request,
        listAdminIntake: async () => [],
        listAdminLifecycle: async () => []
      },
      workerOfferAccess: unavailableWorkerOfferAccess
    });
    await service.upsertClientProfile({
      actorUserId: "client-1",
      organizationId: request.organizationId,
      jobRequestId: request.id,
      dutiesSummary: null,
      qualifications: [],
      addressSummary: null,
      specialInstructions: null,
      expectedVersion: null
    });

    await expect(
      service.upsertClientProfile({
        actorUserId: "client-1",
        organizationId: request.organizationId,
        jobRequestId: request.id,
        dutiesSummary: "Stale update",
        qualifications: [],
        addressSummary: null,
        specialInstructions: null,
        expectedVersion: 0
      })
    ).rejects.toMatchObject({ code: "RWOS_CALENDAR_REQUEST_VERSION_CONFLICT" });
    await expect(
      service.updateAdminVerification({
        session: authenticatedSession,
        roles: ["PLATFORM_ADMINISTRATOR"],
        jobRequestIdOrNumber: request.id,
        contractVerificationState: "verified",
        paymentMethodReadinessState: "verified",
        locationVerificationState: "verified",
        expectedVersion: 0
      })
    ).rejects.toMatchObject({ code: "RWOS_CALENDAR_REQUEST_VERSION_CONFLICT" });
  });
});

const authenticatedSession = {
  authenticated: true as const,
  user: { id: "worker-1" },
  session: null
} as unknown as SessionValidationResult;

const unavailableWorkerOfferAccess = {
  workerCalendarReference: async () => {
    throw new Error("not used");
  }
};

class MemoryCalendarRequestProfileRepository implements CalendarRequestProfileRepository {
  private readonly profiles = new Map<string, StoredCalendarRequestProfile>();

  async upsert(input: Parameters<CalendarRequestProfileRepository["upsert"]>[0]) {
    const existing = this.profiles.get(input.jobRequestId);
    if (
      (existing && input.expectedVersion !== existing.version) ||
      (!existing && input.expectedVersion !== null)
    ) {
      return null;
    }
    const profile: StoredCalendarRequestProfile = {
      id: existing?.id ?? "profile-1",
      jobRequestId: input.jobRequestId,
      organizationId: input.organizationId,
      residenceId: input.residenceId,
      dutiesSummary: input.dutiesSummary,
      qualifications: [...input.qualifications],
      addressSummary: input.addressSummary,
      specialInstructions: input.specialInstructions,
      ...noAllowances,
      contractVerificationState: existing ? "pending" : input.contractVerificationState,
      paymentMethodReadinessState: existing ? "pending" : input.paymentMethodReadinessState,
      locationVerificationState: existing ? "pending" : input.locationVerificationState,
      version: (existing?.version ?? 0) + 1,
      createdByUserId: existing?.createdByUserId ?? input.actorUserId,
      updatedByUserId: input.actorUserId,
      createdAt: existing?.createdAt ?? input.now,
      updatedAt: input.now
    };
    this.profiles.set(input.jobRequestId, profile);
    return profile;
  }

  async findByJobRequestId(jobRequestId: string) {
    return this.profiles.get(jobRequestId) ?? null;
  }

  async findByJobRequestIds(jobRequestIds: readonly string[]) {
    return jobRequestIds.flatMap((id) => {
      const profile = this.profiles.get(id);
      return profile ? [profile] : [];
    });
  }

  async updateVerification(
    input: Parameters<CalendarRequestProfileRepository["updateVerification"]>[0]
  ) {
    const profile = this.profiles.get(input.jobRequestId);
    if (
      !profile ||
      profile.organizationId !== input.organizationId ||
      profile.residenceId !== input.residenceId ||
      profile.version !== input.expectedVersion
    ) {
      return null;
    }
    const updated = {
      ...profile,
      contractVerificationState: input.contractVerificationState,
      paymentMethodReadinessState: input.paymentMethodReadinessState,
      locationVerificationState: input.locationVerificationState,
      updatedByUserId: input.actorUserId,
      updatedAt: input.now,
      version: profile.version + 1
    };
    this.profiles.set(input.jobRequestId, updated);
    return updated;
  }
}

function profileFixture(
  override: Partial<StoredCalendarRequestProfile> = {}
): StoredCalendarRequestProfile {
  return {
    id: "profile-1",
    jobRequestId: request.id,
    organizationId: request.organizationId,
    residenceId: request.residenceId,
    dutiesSummary: "Fixture duties",
    qualifications: ["Fixture qualification"],
    addressSummary: "Fixture address",
    specialInstructions: "Fixture instructions",
    ...noAllowances,
    contractVerificationState: "verified",
    paymentMethodReadinessState: "verified",
    locationVerificationState: "verified",
    version: 1,
    createdByUserId: "client-1",
    updatedByUserId: "client-1",
    createdAt: now,
    updatedAt: now,
    ...override
  };
}
