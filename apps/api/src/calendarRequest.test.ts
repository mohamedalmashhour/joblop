import { describe, expect, it } from "vitest";
import type {
  AuthenticationService,
  CalendarRequestService,
  CalendarVerificationState
} from "@rwos/auth";
import { AuthorizationDeniedError, CalendarRequestError } from "@rwos/auth";
import { buildApi } from "./app";
import type { AdminRequestSummary } from "./adminRequestSummary";

describe("calendar request persistence API", () => {
  it("requires authentication for client, admin, and worker calendar routes", async () => {
    const app = buildApi({
      authService: authenticationService(false),
      calendarRequestService: calendarService()
    });

    for (const url of [
      "/organizations/org-1/calendar/requests",
      "/platform/calendar/requests",
      "/worker/calendar/offers/offer-1"
    ]) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(403);
    }

    await app.close();
  });

  it("writes only calendar profile metadata through the organization-scoped endpoint", async () => {
    let receivedProfile: Record<string, unknown> | null = null;
    const service = calendarService({
      upsertClientProfile: async (input) => {
        receivedProfile = input;
        return calendarProfile;
      }
    });
    const app = buildApi({
      authService: authenticationService(true),
      calendarRequestService: service
    });

    const response = await app.inject({
      method: "PUT",
      url: "/organizations/org-1/calendar/requests/request-1/profile",
      headers: { authorization: "Bearer session-token" },
      payload: {
        dutiesSummary: "Resident-care coverage.",
        qualifications: ["PSW certificate"],
        addressSummary: "Toronto",
        specialInstructions: "Report to reception.",
        contractVerificationState: "verified",
        paymentMethodReadinessState: "pending",
        locationVerificationState: "verified"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(receivedProfile).toMatchObject({
      actorUserId: "user-1",
      organizationId: "org-1",
      jobRequestId: "request-1"
    });
    expect(receivedProfile).not.toHaveProperty("contractVerificationState");
    expect(receivedProfile).not.toHaveProperty("paymentMethodReadinessState");
    expect(receivedProfile).not.toHaveProperty("locationVerificationState");
    expect(JSON.stringify(response.json())).not.toMatch(
      /workerPay|platformMargin|clientBillRate|paymentMethodToken/i
    );

    await app.close();
  });

  it("keeps trusted verification changes on the platform-admin route", async () => {
    let receivedVerification: Record<string, unknown> | null = null;
    const app = buildApi({
      authService: authenticationService(true),
      calendarRequestService: calendarService({
        updateAdminVerification: async (input) => {
          receivedVerification = input;
          return { ...calendarProfile, contractVerificationState: "verified" };
        }
      }),
      resolveAuthorizationRoles: () => ["PLATFORM_ADMINISTRATOR"]
    });

    const response = await app.inject({
      method: "PUT",
      url: "/platform/calendar/requests/request-1/verification",
      headers: { authorization: "Bearer session-token" },
      payload: {
        contractVerificationState: "verified",
        paymentMethodReadinessState: "verified",
        locationVerificationState: "verified",
        expectedVersion: 1
      }
    });

    expect(response.statusCode).toBe(200);
    expect(receivedVerification).toMatchObject({
      jobRequestIdOrNumber: "request-1",
      roles: ["PLATFORM_ADMINISTRATOR"]
    });

    await app.close();
  });

  it("rejects malformed calendar profile payloads", async () => {
    const app = buildApi({
      authService: authenticationService(true),
      calendarRequestService: calendarService()
    });

    const response = await app.inject({
      method: "PUT",
      url: "/organizations/org-1/calendar/requests/request-1/profile",
      headers: { authorization: "Bearer session-token" },
      payload: { qualifications: "PSW certificate" }
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("returns a stable conflict response for stale profile versions", async () => {
    const app = buildApi({
      authService: authenticationService(true),
      calendarRequestService: calendarService({
        upsertClientProfile: async () => {
          throw new CalendarRequestError("RWOS_CALENDAR_REQUEST_VERSION_CONFLICT");
        }
      })
    });

    const response = await app.inject({
      method: "PUT",
      url: "/organizations/org-1/calendar/requests/request-1/profile",
      headers: { authorization: "Bearer session-token" },
      payload: { qualifications: [], expectedVersion: 1 }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "RWOS_CALENDAR_REQUEST_VERSION_CONFLICT",
      message: "Calendar request operation was denied."
    });
    await app.close();
  });

  it("serves client, admin, and worker projections from distinct role-scoped routes", async () => {
    const app = buildApi({
      authService: authenticationService(true),
      calendarRequestService: calendarService(),
      resolveAuthorizationRoles: () => ["PLATFORM_ADMINISTRATOR"]
    });

    const client = await app.inject({
      method: "GET",
      url: "/organizations/org-1/calendar/requests",
      headers: { authorization: "Bearer session-token" }
    });
    const admin = await app.inject({
      method: "GET",
      url: "/platform/calendar/requests",
      headers: { authorization: "Bearer session-token" }
    });
    const worker = await app.inject({
      method: "GET",
      url: "/worker/calendar/offers/offer-1",
      headers: { authorization: "Bearer session-token" }
    });

    expect(client.statusCode).toBe(200);
    expect(admin.statusCode).toBe(200);
    expect(worker.statusCode).toBe(200);
    expect(client.json().requests[0].audience).toBe("client");
    expect(admin.json().requests[0].audience).toBe("admin");
    expect(worker.json().offer.visibility).toBe("worker_authorized_offer_reference");
    expect(JSON.stringify(worker.json())).not.toMatch(
      /clientBillRate|platformMargin|paymentMethod|internalAdminNotes/i
    );

    await app.close();
  });
});

describe("staff-only request summary on the platform calendar", () => {
  const summary = {
    companyName: "Ferme Laval",
    locationName: "Main barn",
    locationCity: "Laval",
    roleLabel: "Farm worker",
    workGroupLabel: "Farming / Agriculture",
    urgency: "normal",
    numberOfWorkers: 2,
    hoursPerWorker: 8,
    totalHours: 16,
    requiredCertificates: [],
    requiredCertificateOther: null,
    allowances: [],
    pricing: null,
    pricingProblem: "no_role_rate",
    openClaim: false,
    confirmedWorkerCount: 0,
    publicJobUrl: null
  } satisfies AdminRequestSummary;

  it("adds the summary and list cards only after the admin calendar authorization passed", async () => {
    const reads: string[] = [];
    const app = buildApi({
      authService: authenticationService(true),
      calendarRequestService: calendarService(),
      resolveAuthorizationRoles: () => ["PLATFORM_ADMINISTRATOR"],
      adminRequestSummaryReader: {
        cards: async (ids) => {
          reads.push(`cards:${ids.join(",")}`);
          return { "request-1": summary };
        },
        summary: async (id) => {
          reads.push(`summary:${id}`);
          return summary;
        }
      }
    });

    const detail = await app.inject({
      method: "GET",
      url: "/platform/calendar/requests/JR-2026-000001",
      headers: { authorization: "Bearer session-token" }
    });
    const list = await app.inject({
      method: "GET",
      url: "/platform/calendar/requests",
      headers: { authorization: "Bearer session-token" }
    });

    expect(detail.statusCode).toBe(200);
    expect(detail.json().summary).toMatchObject({ companyName: "Ferme Laval", roleLabel: "Farm worker" });
    expect(list.statusCode).toBe(200);
    expect(list.json().cards["request-1"].companyName).toBe("Ferme Laval");
    // The summary is looked up by the authorized record's id, not the raw route value.
    expect(reads).toEqual(["summary:request-1", "cards:request-1"]);
    await app.close();
  });

  it("never reads the summary when the admin calendar check denies the caller", async () => {
    let called = false;
    const app = buildApi({
      authService: authenticationService(true),
      calendarRequestService: calendarService({
        getAdminCalendarRequest: async () => {
          throw new AuthorizationDeniedError({ allowed: false } as never);
        },
        listAdminCalendar: async () => {
          throw new AuthorizationDeniedError({ allowed: false } as never);
        }
      }),
      resolveAuthorizationRoles: () => [],
      adminRequestSummaryReader: {
        cards: async () => {
          called = true;
          return {};
        },
        summary: async () => {
          called = true;
          return summary;
        }
      }
    });

    for (const url of ["/platform/calendar/requests/request-1", "/platform/calendar/requests"]) {
      const response = await app.inject({ method: "GET", url, headers: { authorization: "Bearer session-token" } });
      expect(response.statusCode).not.toBe(200);
      expect(response.body).not.toContain("Ferme Laval");
    }
    expect(called).toBe(false);
    await app.close();
  });

  it("keeps the calendar working when the summary read fails", async () => {
    const app = buildApi({
      authService: authenticationService(true),
      calendarRequestService: calendarService(),
      resolveAuthorizationRoles: () => ["PLATFORM_ADMINISTRATOR"],
      adminRequestSummaryReader: {
        cards: async () => {
          throw new Error("db down");
        },
        summary: async () => {
          throw new Error("db down");
        }
      }
    });
    const detail = await app.inject({
      method: "GET",
      url: "/platform/calendar/requests/request-1",
      headers: { authorization: "Bearer session-token" }
    });
    const list = await app.inject({
      method: "GET",
      url: "/platform/calendar/requests",
      headers: { authorization: "Bearer session-token" }
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().summary).toBeNull();
    expect(list.statusCode).toBe(200);
    expect(list.json().cards).toEqual({});
    await app.close();
  });
});

function authenticationService(authenticated: boolean) {
  return {
    validateSession: async () =>
      authenticated
        ? {
            authenticated: true,
            user: { id: "user-1" }
          }
        : {
            authenticated: false,
            user: null
          }
  } as unknown as AuthenticationService;
}

function calendarService(overrides: Partial<CalendarRequestService> = {}): CalendarRequestService {
  return {
    upsertClientProfile: async () => calendarProfile,
    updateAdminVerification: async () => calendarProfile,
    listClientCalendar: async () => [{ ...calendarRequest, audience: "client" as const }],
    getClientCalendarRequest: async () => ({
      ...calendarRequest,
      audience: "client" as const
    }),
    listAdminCalendar: async () => [{ ...calendarRequest, audience: "admin" as const }],
    getAdminCalendarRequest: async () => ({
      ...calendarRequest,
      audience: "admin" as const
    }),
    getWorkerOfferCalendarReference: async () => workerReference,
    ...overrides
  } as CalendarRequestService;
}

const timestamp = new Date("2026-08-01T12:00:00.000Z");
const verification: {
  contract: CalendarVerificationState;
  location: CalendarVerificationState;
  paymentMethodReadiness: CalendarVerificationState;
} = {
  contract: "verified",
  location: "verified",
  paymentMethodReadiness: "pending"
};

const calendarProfile = {
  id: "profile-1",
  jobRequestId: "request-1",
  organizationId: "org-1",
  residenceId: "residence-1",
  dutiesSummary: "Resident-care coverage.",
  qualifications: ["PSW certificate"],
  addressSummary: "Toronto",
  specialInstructions: "Report to reception.",
  transportProvision: "none" as const,
  transportAmountMinor: null,
  transportNote: null,
  mealProvision: "none" as const,
  mealAmountMinor: null,
  mealNote: null,
  lodgingProvision: "none" as const,
  lodgingAmountMinor: null,
  lodgingNote: null,
  contractVerificationState: "verified" as const,
  paymentMethodReadinessState: "pending" as const,
  locationVerificationState: "verified" as const,
  version: 1,
  createdByUserId: "user-1",
  updatedByUserId: "user-1",
  createdAt: timestamp,
  updatedAt: timestamp
};

const calendarRequest = {
  id: "request-1",
  requestNumber: "JR-2026-000001",
  organizationId: "org-1",
  residenceId: "residence-1",
  departmentId: "department-1",
  title: "Personal Support Worker",
  description: "Resident-care coverage.",
  numberOfWorkers: 1,
  urgency: "normal" as const,
  requestType: "single_day" as const,
  timezone: "America/Toronto",
  startAt: new Date("2026-08-03T12:00:00.000Z"),
  endAt: new Date("2026-08-03T20:00:00.000Z"),
  status: "draft" as const,
  authoritativeStatus: "draft" as const,
  adminReviewReason: null,
  dutiesSummary: "Resident-care coverage.",
  qualifications: ["PSW certificate"],
  addressSummary: "Toronto",
  specialInstructions: "Report to reception.",
  verification,
  versionToken: 1,
  createdAt: timestamp,
  updatedAt: timestamp
};

const workerReference = {
  workerOfferId: "offer-1",
  jobRequestId: "request-1",
  status: "sent",
  expiresAt: new Date("2026-08-02T12:00:00.000Z"),
  title: "Personal Support Worker",
  summary: "Resident-care coverage.",
  startAt: new Date("2026-08-03T12:00:00.000Z"),
  endAt: new Date("2026-08-03T20:00:00.000Z"),
  timezone: "America/Toronto",
  compensationSummary: "$30.00 CAD / hour",
  policySummary: "Worker-visible policy",
  versionToken: 1,
  visibility: "worker_authorized_offer_reference" as const
};
