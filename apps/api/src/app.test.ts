import { describe, expect, it, vi } from "vitest";
import {
  AssignmentError,
  AssignmentTransactionUnavailableError,
  authorizationDeniedCode,
  authorizationDeniedMessage,
  createAuthorizationService,
  createAuthenticationService,
  createDepartmentService,
  createEmployerOrganizationService,
  createJobRequestService,
  createOrganizationMembershipService,
  createResidenceService,
  createRoleDefinitionService,
  createWorkGroupService
} from "@rwos/auth";
import type {
  AuthorizationRoleKey,
  AssignmentService,
  AttendanceService,
  AuthenticationRepository,
  CreateLocalUserInput,
  CreateSessionInput,
  DepartmentRepository,
  DispatchService,
  EmployerOrganizationRepository,
  InviteMembershipInput,
  JobRequestRepository,
  OrganizationMembershipRepository,
  RecordAuthenticationAuditEventInput,
  ResidenceRepository,
  StoredEmployerOrganization,
  StoredOrganizationMembership,
  StoredResidence,
  StoredAuthenticationSession,
  StoredAuthenticationUser,
  StoredDepartment,
  StoredRoleDefinition,
  StoredWorkGroup,
  StoredJobRequest,
  RoleDefinitionRepository,
  TimesheetService,
  UpdateSessionInput,
  WorkerOfferService,
  WorkGroupRepository
} from "@rwos/auth";
import { buildApi, createRemoteAuthenticationRateLimiter, isPublicWorkerIngressPath } from "./app";

describe("public worker ingress boundary", () => {
  it("allows only health, worker authentication and worker workflow routes", () => {
    for (const path of [
      "/health",
      "/ready",
      "/auth/sign-in",
      "/auth/session",
      "/auth/sign-out",
      "/auth/email/send-code",
      "/auth/email/verify-code",
      "/auth/password-reset/request",
      "/auth/password-reset/complete",
      "/worker/offers",
      "/worker/assignments/id?version=1"
    ]) {
      expect(isPublicWorkerIngressPath(path)).toBe(true);
    }
    for (const path of [
      "/auth/register",
      "/authz/check",
      "/memberships",
      "/organizations/current",
      "/platform/dispatches",
      "/organizations/id/invoices",
      "/workerish/offers"
    ]) {
      expect(isPublicWorkerIngressPath(path)).toBe(false);
    }
  });

  it("returns a generic 404 before blocked routes execute", async () => {
    const app = buildApi({
      publicWorkerIngressOnly: true,
      publicWorkerWebOrigin: "https://worker.staging.example.test",
      readinessProbe: async () => true,
      env: { RWOS_ENV: "staging", NODE_ENV: "production" }
    });
    const blocked = await app.inject({ method: "GET", url: "/platform/dispatches" });
    const registration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "worker@example.test", password: "SyntheticOnly123!" }
    });
    const health = await app.inject({ method: "GET", url: "/health" });

    expect(blocked.statusCode).toBe(404);
    expect(registration.statusCode).toBe(404);
    expect(blocked.json()).toEqual({
      error: "RWOS_RESOURCE_UNAVAILABLE",
      message: "Resource unavailable."
    });
    expect(health.statusCode).toBe(200);
    await app.close();
  });

  it("cannot be enabled outside staging", () => {
    expect(() =>
      buildApi({
        publicWorkerIngressOnly: true,
        publicWorkerWebOrigin: "https://worker.staging.example.test",
        env: { RWOS_ENV: "production" }
      })
    ).toThrow("RWOS_PUBLIC_WORKER_INGRESS_STAGING_ONLY");
  });

  it("allows exact-origin browser preflight and rejects other origins", async () => {
    const workerOrigin = "https://worker.staging.example.test";
    const app = buildApi({
      publicWorkerIngressOnly: true,
      publicWorkerWebOrigin: workerOrigin,
      readinessProbe: async () => true,
      env: { RWOS_ENV: "staging", NODE_ENV: "production" }
    });

    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/auth/sign-in",
      headers: {
        origin: workerOrigin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type"
      }
    });
    const denied = await app.inject({
      method: "OPTIONS",
      url: "/auth/sign-in",
      headers: {
        origin: "https://unexpected.example.test",
        "access-control-request-method": "POST"
      }
    });
    const blockedPath = await app.inject({
      method: "OPTIONS",
      url: "/platform/dispatches",
      headers: {
        origin: workerOrigin,
        "access-control-request-method": "POST"
      }
    });

    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe(workerOrigin);
    expect(allowed.headers["access-control-allow-methods"]).toBe("GET, POST, OPTIONS");
    expect(denied.statusCode).toBe(403);
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    expect(blockedPath.statusCode).toBe(403);
    await app.close();
  });

  it("fails closed when the staging worker web origin is missing or unsafe", () => {
    expect(() =>
      buildApi({ publicWorkerIngressOnly: true, env: { RWOS_ENV: "staging" } })
    ).toThrow("RWOS_PUBLIC_WORKER_WEB_ORIGIN_REQUIRED");
    expect(() =>
      buildApi({
        publicWorkerIngressOnly: true,
        publicWorkerWebOrigin: "http://worker.staging.example.test",
        env: { RWOS_ENV: "staging" }
      })
    ).toThrow("RWOS_PUBLIC_WORKER_WEB_ORIGIN_INVALID");
  });
});

describe("api health endpoints", () => {
  it("keeps liveness independent from dependency readiness", async () => {
    const app = buildApi({ readinessProbe: async () => false });
    const response = await app.inject({ method: "GET", url: "/health" });
    const readiness = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      service: "resident-workforce-os-api",
      check: "liveness"
    });
    expect(readiness.statusCode).toBe(503);
    expect(readiness.json()).toEqual({
      ready: false,
      service: "resident-workforce-os-api",
      check: "readiness"
    });
    await app.close();
  });

  it("reports ready only after the dependency probe succeeds", async () => {
    const app = buildApi({ readinessProbe: async () => true });
    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ready: true,
      service: "resident-workforce-os-api",
      check: "readiness"
    });
    await app.close();
  });
});

describe("api authentication foundation", () => {
  it("denies production mutation families before service execution", async () => {
    const dispatchService = createApiUnavailableDispatchService();
    const workerOfferService = createApiUnavailableWorkerOfferService();
    const assignmentService = createApiUnavailableAssignmentService();
    const attendanceService = createApiUnavailableAttendanceService();
    const timesheetService = createApiUnavailableTimesheetService();
    const createDispatch = vi.spyOn(dispatchService, "createDispatch");
    const searchCandidates = vi.spyOn(dispatchService, "searchCandidates");
    const acceptOffer = vi.spyOn(workerOfferService, "accept");
    const declineOffer = vi.spyOn(workerOfferService, "decline");
    const createAssignment = vi.spyOn(assignmentService, "createFromAcceptedOffer");
    const checkIn = vi.spyOn(attendanceService, "workerCheckIn");
    const checkOut = vi.spyOn(attendanceService, "workerCheckOut");
    const calculate = vi.spyOn(timesheetService, "calculate");
    const approve = vi.spyOn(timesheetService, "approve");
    const confirm = vi.spyOn(timesheetService, "workerConfirm");
    const dispute = vi.spyOn(timesheetService, "workerDispute");
    const app = buildApi({
      authService: createAuthenticationService(
        new ApiMemoryAuthenticationRepository(),
        testAuthOptions()
      ),
      dispatchService,
      workerOfferService,
      assignmentService,
      attendanceService,
      timesheetService,
      env: productionEnv()
    });

    for (const url of [
      "/platform/dispatches",
      "/platform/worker-offers",
      "/worker/offers/offer-1/accept",
      "/worker/offers/offer-1/decline",
      "/platform/assignments",
      "/worker/assignments/assignment-1/acknowledge",
      "/platform/attendance",
      "/worker/attendance/attendance-1/check-in",
      "/worker/attendance/attendance-1/check-out",
      "/platform/timesheets",
      "/platform/timesheets/timesheet-1/calculate",
      "/platform/timesheets/timesheet-1/approve",
      "/worker/timesheets/timesheet-1/confirm",
      "/worker/timesheets/timesheet-1/dispute"
    ]) {
      const response = await app.inject({ method: "POST", url, payload: {} });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: "RWOS_RESOURCE_UNAVAILABLE",
        message: "Resource unavailable."
      });
    }
    expect(createDispatch).not.toHaveBeenCalled();
    const candidateSearch = await app.inject({
      method: "GET",
      url: "/platform/dispatches/00000000-0000-4000-8000-000000000001/candidates/search"
    });
    expect(candidateSearch.statusCode).toBe(404);
    expect(searchCandidates).not.toHaveBeenCalled();
    for (const method of [
      acceptOffer,
      declineOffer,
      createAssignment,
      checkIn,
      checkOut,
      calculate,
      approve,
      confirm,
      dispute
    ]) {
      expect(method).not.toHaveBeenCalled();
    }
    const calendarRead = await app.inject({
      method: "GET",
      url: "/platform/calendar/requests"
    });
    expect(calendarRead.statusCode).toBe(403);
    expect(calendarRead.json()).toMatchObject({ error: "RWOS_AUTHORIZATION_DENIED" });
    await app.close();
  });

  it("disables production registration and adds security headers", async () => {
    const app = buildApi({
      authService: createAuthenticationService(
        new ApiMemoryAuthenticationRepository(),
        testAuthOptions()
      ),
      env: productionEnv()
    });
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "person@example.com", password: "ValidPassword123" }
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "RWOS_RESOURCE_UNAVAILABLE",
      message: "Resource unavailable."
    });
    expect(response.headers).toMatchObject({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin"
    });
    expect(response.headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains"
    );
    const httpsResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      headers: { "x-forwarded-proto": "https" },
      payload: { email: "person@example.com", password: "ValidPassword123" }
    });
    expect(httpsResponse.headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains"
    );
    await app.close();
  });

  it("registers, validates, signs out, and revokes sessions without operational APIs", async () => {
    const repository = new ApiMemoryAuthenticationRepository();
    const app = buildApi({
      authService: createAuthenticationService(repository, {
        passwordHashOptions: {
          costFactor: 1_024,
          blockSize: 8,
          parallelization: 1,
          keyLength: 32,
          saltLength: 8
        },
        randomToken: () => "api-session-token-000000000000000000001"
      })
    });

    const registration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "Employer@Example.com",
        password: "ValidPassword123",
        displayName: "Example Employer"
      }
    });

    expect(registration.statusCode).toBe(201);
    expect(registration.json()).toMatchObject({
      user: {
        emailNormalized: "employer@example.com",
        status: "active"
      },
      token: "api-session-token-000000000000000000001"
    });

    const session = await app.inject({
      method: "GET",
      url: "/auth/session",
      headers: {
        authorization: `Bearer ${registration.json().token}`
      }
    });

    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({
      authenticated: true,
      user: {
        emailNormalized: "employer@example.com"
      }
    });

    const protectedWorkflow = await app.inject({ method: "GET", url: "/organizations" });
    expect(protectedWorkflow.statusCode).toBe(404);

    const signOut = await app.inject({
      method: "POST",
      url: "/auth/sign-out",
      headers: {
        authorization: `Bearer ${registration.json().token}`
      }
    });
    expect(signOut.statusCode).toBe(204);

    const afterLogout = await app.inject({
      method: "GET",
      url: "/auth/session",
      headers: {
        authorization: `Bearer ${registration.json().token}`
      }
    });
    expect(afterLogout.statusCode).toBe(401);
    expect(repository.auditActions()).toContain("auth.logout");

    await app.close();
  });

  it("keeps email verification authenticated, rate-limited, and response-bounded", async () => {
    const repository = new ApiMemoryAuthenticationRepository();
    const issue = vi.fn(async () => ({ status: "accepted" as const, code: "123456" }));
    const verify = vi
      .fn()
      .mockResolvedValueOnce({
        status: "verification_failed" as const,
        message: "Verification could not be completed."
      })
      .mockResolvedValueOnce({ status: "verified" as const });
    const consume = vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60 }));
    const app = buildApi({
      authService: createAuthenticationService(repository, testAuthOptions()),
      emailVerificationService: { issue, verify },
      authRateLimiter: { consume }
    });
    const registration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "verify@example.test",
        password: "ValidPassword123",
        displayName: "Synthetic User"
      }
    });
    const token = registration.json().token as string;

    const anonymous = await app.inject({ method: "POST", url: "/auth/email/send-code" });
    expect(anonymous.statusCode).toBe(401);
    expect(issue).not.toHaveBeenCalled();

    const issued = await app.inject({
      method: "POST",
      url: "/auth/email/send-code",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(issued.statusCode).toBe(202);
    expect(issued.json()).toEqual({ status: "accepted", code: "123456" });
    expect(issue).toHaveBeenCalledWith({
      userId: repository.firstUserId(),
      emailNormalized: "verify@example.test"
    });
    expect(consume).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: "email_verify_send",
        email: "verify@example.test"
      })
    );

    const malformed = await app.inject({
      method: "POST",
      url: "/auth/email/verify-code",
      headers: { authorization: `Bearer ${token}` },
      payload: { code: "12345" }
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({
      status: "verification_failed",
      message: "Verification could not be completed."
    });
    expect(verify).not.toHaveBeenCalled();

    const rejected = await app.inject({
      method: "POST",
      url: "/auth/email/verify-code",
      headers: { authorization: `Bearer ${token}` },
      payload: { code: "000000" }
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json()).toEqual(malformed.json());

    const accepted = await app.inject({
      method: "POST",
      url: "/auth/email/verify-code",
      headers: { authorization: `Bearer ${token}` },
      payload: { code: "123456" }
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toEqual({ status: "verified" });
    await app.close();
  });

  it("keeps password-reset requests generic and completion response-bounded", async () => {
    const request = vi.fn(
      async () =>
        ({
          status: "accepted",
          message: "If an account matches that email, password reset instructions will be sent."
        }) as const
    );
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ status: "reset" as const })
      .mockResolvedValueOnce({
        status: "reset_failed" as const,
        message: "Password reset could not be completed. Request a new link and try again."
      });
    const consume = vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60 }));
    const app = buildApi({
      authService: createAuthenticationService(
        new ApiMemoryAuthenticationRepository(),
        testAuthOptions()
      ),
      passwordResetService: { request, complete },
      authRateLimiter: { consume },
      env: {
        RWOS_ENV: "test",
        PASSWORD_RESET_PUBLIC_ORIGIN: "http://127.0.0.1:3100"
      }
    });

    const requested = await app.inject({
      method: "POST",
      url: "/auth/password-reset/request",
      payload: { email: "synthetic@example.test" }
    });
    expect(requested.statusCode).toBe(202);
    expect(requested.json()).toEqual({
      status: "accepted",
      message: "If an account matches that email, password reset instructions will be sent."
    });
    expect(request).toHaveBeenCalledWith({
      email: "synthetic@example.test",
      resetBaseUrl: "http://127.0.0.1:3100"
    });
    expect(consume).toHaveBeenCalledWith(
      expect.objectContaining({ action: "password_reset_request" })
    );

    const reset = await app.inject({
      method: "POST",
      url: "/auth/password-reset/complete",
      payload: { token: "a".repeat(43), newPassword: "ReplacementPassword123" }
    });
    expect(reset.statusCode).toBe(200);
    const replay = await app.inject({
      method: "POST",
      url: "/auth/password-reset/complete",
      payload: { token: "a".repeat(43), newPassword: "ReplacementPassword123" }
    });
    expect(replay.statusCode).toBe(400);
    expect(replay.json()).toEqual({
      status: "reset_failed",
      message: "Password reset could not be completed. Request a new link and try again."
    });
    await app.close();
  });

  it("fails email verification closed until its durable repository is available", async () => {
    const repository = new ApiMemoryAuthenticationRepository();
    const app = buildApi({
      authService: createAuthenticationService(repository, testAuthOptions())
    });
    const registration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "verify-disabled@example.test",
        password: "ValidPassword123"
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/auth/email/send-code",
      headers: { authorization: `Bearer ${registration.json().token}` }
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: "RWOS_AUTH_UNAVAILABLE",
      message: "Authentication is temporarily unavailable. Try again later."
    });
    await app.close();
  });

  it("uses safe authentication errors without account enumeration", async () => {
    const app = buildApi({
      authService: createAuthenticationService(new ApiMemoryAuthenticationRepository(), {
        passwordHashOptions: {
          costFactor: 1_024,
          blockSize: 8,
          parallelization: 1,
          keyLength: 32,
          saltLength: 8
        }
      })
    });

    const missing = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: {
        email: "missing@example.com",
        password: "WrongPassword123"
      }
    });
    const malformed = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: {}
    });

    expect(missing.statusCode).toBe(401);
    expect(malformed.statusCode).toBe(401);
    expect(missing.json()).toEqual(malformed.json());

    await app.close();
  });

  it("rate-limits repeated sign-in attempts with a fail-closed 429", async () => {
    const app = buildApi({
      authService: createAuthenticationService(new ApiMemoryAuthenticationRepository(), {
        passwordHashOptions: {
          costFactor: 1_024,
          blockSize: 8,
          parallelization: 1,
          keyLength: 32,
          saltLength: 8
        }
      })
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/auth/sign-in",
        payload: {
          email: "rate-limit@example.com",
          password: "WrongPassword123"
        }
      });

      expect(response.statusCode).toBe(401);
    }

    const limited = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: {
        email: "rate-limit@example.com",
        password: "WrongPassword123"
      }
    });

    expect(limited.statusCode).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
    expect(limited.json()).toEqual({
      error: "RWOS_AUTH_RATE_LIMITED",
      message: "Too many authentication attempts. Try again later."
    });

    await app.close();
  });

  it("fails authentication closed when the limiter cannot make a decision", async () => {
    const app = buildApi({
      authRateLimiter: {
        async consume() {
          throw new Error("remote unavailable");
        }
      },
      authService: createAuthenticationService(
        new ApiMemoryAuthenticationRepository(),
        testAuthOptions()
      )
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: {
        email: "person@example.com",
        password: "ValidPassword123"
      }
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers["retry-after"]).toBe("5");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual({
      error: "RWOS_AUTH_UNAVAILABLE",
      message: "Authentication is temporarily unavailable. Try again later."
    });
    await app.close();
  });

  it("sends only HMAC-derived subjects to the remote atomic limiter", async () => {
    const remoteFetch = vi.fn().mockResolvedValue({
      ok: true,
      async json() {
        return { allowed: true, retryAfterSeconds: 60 };
      }
    });
    const limiter = createRemoteAuthenticationRateLimiter({
      origin: "https://rate-limit.example.test",
      token: "remote-token-that-is-at-least-32-characters",
      keySecret: "key-secret-that-is-at-least-32-characters",
      keyId: "key-current",
      namespace: "rwos:authrl:test:v1",
      trustedIdentityHeaders: async () => ({
        authorization: "Bearer synthetic-google-token",
        "x-rwos-service-id": "api",
        "x-rwos-operation": "auth-rate-limit:consume",
        "x-rwos-environment": "staging",
        "x-rwos-release-sha": "a31fa96f52247bb684032c6a8d3d379c098c2603"
      }),
      fetch: remoteFetch as unknown as typeof fetch
    });

    expect(limiter.check).toBeDefined();
    await expect(limiter.check?.()).resolves.toBe(true);
    expect(remoteFetch.mock.calls[0]?.[0]).toBe("https://rate-limit.example.test/ready");

    await limiter.consume({
      action: "sign_in",
      ip: "203.0.113.10",
      email: "Person@Example.com"
    });

    const [, init] = remoteFetch.mock.calls[1]!;
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer synthetic-google-token");
    expect(headers.get("x-rwos-app-authorization")).toBe(
      "Bearer remote-token-that-is-at-least-32-characters"
    );
    const serialized = String(init?.body);
    expect(serialized).not.toContain("Person@Example.com");
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).not.toContain("203.0.113.10");
    expect(JSON.parse(serialized)).toMatchObject({
      action: "sign_in",
      keyId: "key-current",
      policy: {
        accountMaxAttempts: 5,
        networkMaxAttempts: 30,
        windowSeconds: 60
      }
    });
  });

  it.each([
    ["non-success", async () => new Response(null, { status: 503 })],
    [
      "malformed",
      async () =>
        new Response(JSON.stringify({ allowed: "yes", retryAfterSeconds: "later" }), {
          status: 200
        })
    ],
    [
      "timeout",
      async (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("timeout")));
        })
    ]
  ])("fails closed for remote limiter %s", async (_label, remoteFetch) => {
    const limiter = createRemoteAuthenticationRateLimiter({
      origin: "https://rate-limit.example.test",
      token: "remote-token-that-is-at-least-32-characters",
      keySecret: "key-secret-that-is-at-least-32-characters",
      keyId: "key-current",
      namespace: "rwos:authrl:test:v1",
      timeoutMs: 5,
      fetch: remoteFetch
    });

    await expect(
      limiter.consume({
        action: "sign_in",
        ip: "203.0.113.10",
        email: "person@example.com"
      })
    ).rejects.toThrow();
  });

  it("rejects insecure or incomplete direct remote limiter configuration", () => {
    expect(() =>
      createRemoteAuthenticationRateLimiter({
        origin: "http://rate-limit.example.test",
        token: "remote-token-that-is-at-least-32-characters",
        keySecret: "key-secret-that-is-at-least-32-characters",
        keyId: "key-current",
        namespace: "rwos:authrl:test:v1"
      })
    ).toThrow("RWOS_AUTH_RATE_LIMITER_CONFIGURATION_INVALID");
    expect(() =>
      createRemoteAuthenticationRateLimiter({
        origin: "https://rate-limit.example.test",
        token: "short",
        keySecret: "key-secret-that-is-at-least-32-characters",
        keyId: "key-current",
        namespace: "rwos:authrl:test:v1"
      })
    ).toThrow("RWOS_AUTH_RATE_LIMITER_CONFIGURATION_INVALID");
    const shared = "shared-secret-that-is-at-least-32-characters";
    expect(() =>
      createRemoteAuthenticationRateLimiter({
        origin: "https://rate-limit.example.test",
        token: shared,
        keySecret: shared,
        keyId: "key-current",
        namespace: "rwos:authrl:test:v1"
      })
    ).toThrow("RWOS_AUTH_RATE_LIMITER_CONFIGURATION_INVALID");
  });
});

describe("api authorization foundation", () => {
  it("keeps authorization responses safe and deny-by-default", async () => {
    const repository = new ApiMemoryAuthenticationRepository();
    const app = buildApi({
      authService: createAuthenticationService(repository, testAuthOptions())
    });
    const registration = await registerApiUser(app);

    const denied = await app.inject({
      method: "POST",
      url: "/authz/platform-admin/probe",
      headers: {
        authorization: `Bearer ${registration.token}`
      }
    });

    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toEqual({
      authorized: false,
      error: "RWOS_AUTHORIZATION_DENIED",
      message: "Access denied."
    });

    await app.close();
  });

  it("allows explicit platform administrator to pass the platform supervision probe", async () => {
    const repository = new ApiMemoryAuthenticationRepository();
    const app = buildApi({
      authService: createAuthenticationService(repository, testAuthOptions()),
      authorizationService: createAuthorizationService(),
      resolveAuthorizationRoles: () => ["PLATFORM_ADMINISTRATOR"]
    });
    const registration = await registerApiUser(app);

    const allowed = await app.inject({
      method: "POST",
      url: "/authz/platform-admin/probe",
      headers: {
        authorization: `Bearer ${registration.token}`
      }
    });

    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toEqual({ authorized: true });

    const sessionCapability = await app.inject({
      method: "GET",
      url: "/authz/platform-admin/session",
      headers: {
        authorization: `Bearer ${registration.token}`
      }
    });
    expect(sessionCapability.statusCode).toBe(200);
    expect(sessionCapability.json()).toEqual({ authorized: true });

    await app.close();
  });

  it("checks permissions without exposing internal denial diagnostics", async () => {
    const repository = new ApiMemoryAuthenticationRepository();
    const roles: AuthorizationRoleKey[] = ["ORGANIZATION_OWNER"];
    const app = buildApi({
      authService: createAuthenticationService(repository, testAuthOptions()),
      resolveAuthorizationRoles: () => roles
    });
    const registration = await registerApiUser(app);

    const check = await app.inject({
      method: "POST",
      url: "/authz/check",
      headers: {
        authorization: `Bearer ${registration.token}`
      },
      payload: {
        permission: "platform.supervise",
        platform: true
      }
    });

    expect(check.statusCode).toBe(403);
    expect(check.json()).toEqual({
      authorized: false,
      error: "RWOS_AUTHORIZATION_DENIED",
      message: "Access denied."
    });

    await app.close();
  });
});

describe("api organization membership foundation", () => {
  it("lists memberships and selects explicit organization context", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
    const membershipService = createOrganizationMembershipService(membershipRepository);
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      membershipService
    });
    const registration = await registerApiUser(app);
    const userId = authRepository.firstUserId();
    const membership = await membershipService.inviteMembership(apiInviteInput(userId));
    await membershipService.activateMembership({
      userId,
      membershipId: membership.id,
      actorUserId: userId
    });

    const list = await app.inject({
      method: "GET",
      url: "/memberships",
      headers: { authorization: `Bearer ${registration.token}` }
    });
    const selected = await app.inject({
      method: "POST",
      url: "/memberships/context/select",
      headers: { authorization: `Bearer ${registration.token}` },
      payload: { organizationId: membership.organizationId }
    });

    expect(list.statusCode).toBe(200);
    expect(list.json().memberships).toHaveLength(1);
    expect(selected.statusCode).toBe(200);
    expect(selected.json()).toMatchObject({
      organizationContext: {
        organizationId: membership.organizationId,
        roles: ["ORGANIZATION_OWNER"]
      }
    });

    await app.close();
  });

  it("denies missing organization context and wrong membership access safely", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const membershipService = createOrganizationMembershipService(
      new ApiMemoryOrganizationMembershipRepository()
    );
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      membershipService
    });
    const registration = await registerApiUser(app);

    const missingContext = await app.inject({
      method: "POST",
      url: "/memberships/context/select",
      headers: { authorization: `Bearer ${registration.token}` },
      payload: {}
    });
    const missingMembership = await app.inject({
      method: "GET",
      url: "/memberships/missing-membership",
      headers: { authorization: `Bearer ${registration.token}` }
    });

    expect(missingContext.statusCode).toBe(403);
    expect(missingContext.json()).toEqual({
      error: "RWOS_AUTHORIZATION_DENIED",
      message: "Access denied."
    });
    expect(missingMembership.statusCode).toBe(403);
    expect(missingMembership.json()).toEqual({
      error: "RWOS_AUTHORIZATION_DENIED",
      message: "Access denied."
    });

    await app.close();
  });

  it("activates, suspends, and revokes membership without changing account state", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
    const membershipService = createOrganizationMembershipService(membershipRepository);
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      membershipService
    });
    const registration = await registerApiUser(app);
    const userId = authRepository.firstUserId();
    const membership = await membershipService.inviteMembership(apiInviteInput(userId));

    for (const action of ["activate", "suspend", "revoke"]) {
      const response = await app.inject({
        method: "POST",
        url: `/memberships/${membership.id}/${action}`,
        headers: { authorization: `Bearer ${registration.token}` }
      });
      expect(response.statusCode).toBe(200);
    }

    const session = await app.inject({
      method: "GET",
      url: "/auth/session",
      headers: { authorization: `Bearer ${registration.token}` }
    });

    expect(session.statusCode).toBe(200);
    expect(session.json().user.status).toBe("active");

    await app.close();
  });
});

describe("api employer organization foundation", () => {
  it("creates an employer organization with owner membership context", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
    const membershipService = createOrganizationMembershipService(membershipRepository);
    const organizationRepository = new ApiMemoryEmployerOrganizationRepository(
      membershipRepository
    );
    const organizationService = createEmployerOrganizationService(
      organizationRepository,
      membershipService,
      createAuthorizationService()
    );
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      membershipService,
      organizationService
    });
    const registration = await registerApiUser(app);

    const created = await app.inject({
      method: "POST",
      url: "/organizations",
      headers: { authorization: `Bearer ${registration.token}` },
      payload: {
        legalName: "Sunrise Residence Group",
        displayName: "Sunrise Residence"
      }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      organization: {
        legalName: "Sunrise Residence Group",
        displayName: "Sunrise Residence",
        status: "active"
      },
      membership: {
        status: "active",
        roleKeys: ["ORGANIZATION_OWNER"]
      },
      organizationContext: {
        roles: ["ORGANIZATION_OWNER"]
      }
    });
    const capability = await app.inject({
      method: "GET",
      url: `/authz/employer-calendar/session?organizationId=${created.json().organization.id}`,
      headers: { authorization: `Bearer ${registration.token}` }
    });
    expect(capability.statusCode).toBe(200);
    expect(capability.json()).toEqual({
      authorized: true,
      capability: "employer_calendar_read",
      organization: {
        id: created.json().organization.id,
        publicId: created.json().organization.publicId,
        displayName: "Sunrise Residence"
      }
    });
    for (const organizationId of ["not-a-uuid", "api-org-1", ""]) {
      const invalidCapability = await app.inject({
        method: "GET",
        url: `/authz/employer-calendar/session?organizationId=${encodeURIComponent(organizationId)}`,
        headers: { authorization: `Bearer ${registration.token}` }
      });
      expect(invalidCapability.statusCode).toBe(400);
      expect(invalidCapability.json()).toEqual({
        error: "RWOS_INVALID_ORGANIZATION_CONTEXT",
        message: "Invalid organization context."
      });
    }

    await app.close();
  });

  it("reads, updates, and reports status only within explicit organization context", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
    const membershipService = createOrganizationMembershipService(membershipRepository);
    const organizationRepository = new ApiMemoryEmployerOrganizationRepository(
      membershipRepository
    );
    const organizationService = createEmployerOrganizationService(
      organizationRepository,
      membershipService,
      createAuthorizationService()
    );
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      membershipService,
      organizationService
    });
    const registration = await registerApiUser(app);
    const created = await app.inject({
      method: "POST",
      url: "/organizations",
      headers: { authorization: `Bearer ${registration.token}` },
      payload: {
        legalName: "Tenant API",
        displayName: "Tenant API"
      }
    });
    const organization = created.json().organization;

    const current = await app.inject({
      method: "GET",
      url: `/organizations/current?organizationId=${organization.id}`,
      headers: { authorization: `Bearer ${registration.token}` }
    });
    const updated = await app.inject({
      method: "PATCH",
      url: `/organizations/${organization.id}`,
      headers: { authorization: `Bearer ${registration.token}` },
      payload: {
        expectedVersion: organization.version,
        displayName: "Tenant API Updated"
      }
    });
    const status = await app.inject({
      method: "GET",
      url: `/organizations/${organization.id}/status`,
      headers: { authorization: `Bearer ${registration.token}` }
    });

    expect(current.statusCode).toBe(200);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().organization.displayName).toBe("Tenant API Updated");
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      organizationId: organization.id,
      status: "active"
    });

    await app.close();
  });

  it("denies anonymous, wrong tenant, and stale organization access safely", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
    const membershipService = createOrganizationMembershipService(membershipRepository);
    const organizationService = createEmployerOrganizationService(
      new ApiMemoryEmployerOrganizationRepository(membershipRepository),
      membershipService,
      createAuthorizationService()
    );
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      membershipService,
      organizationService
    });
    const first = await registerApiUser(app);
    const firstOrganizationResponse = await app.inject({
      method: "POST",
      url: "/organizations",
      headers: { authorization: `Bearer ${first.token}` },
      payload: {
        legalName: "Tenant First",
        displayName: "Tenant First"
      }
    });
    const second = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "second@example.com",
        password: "ValidPassword123",
        displayName: "Second Employer"
      }
    });
    const secondOrganizationResponse = await app.inject({
      method: "POST",
      url: "/organizations",
      headers: { authorization: `Bearer ${second.json().token}` },
      payload: {
        legalName: "Tenant Second",
        displayName: "Tenant Second"
      }
    });
    const firstOrganization = firstOrganizationResponse.json().organization;
    const secondOrganization = secondOrganizationResponse.json().organization;

    const anonymous = await app.inject({
      method: "POST",
      url: "/organizations",
      payload: { legalName: "No Session", displayName: "No Session" }
    });
    const crossTenant = await app.inject({
      method: "GET",
      url: `/organizations/${secondOrganization.id}`,
      headers: { authorization: `Bearer ${first.token}` }
    });
    const stale = await app.inject({
      method: "PATCH",
      url: `/organizations/${firstOrganization.id}`,
      headers: { authorization: `Bearer ${first.token}` },
      payload: {
        expectedVersion: "2020-01-01T00:00:00.000Z",
        displayName: "Stale"
      }
    });

    expect(anonymous.statusCode).toBe(403);
    expect(crossTenant.statusCode).toBe(403);
    expect(stale.statusCode).toBe(403);
    expect(crossTenant.json()).toEqual({
      error: "RWOS_AUTHORIZATION_DENIED",
      message: "Access denied."
    });

    await app.close();
  });
});

describe("api residence foundation", () => {
  it("creates, lists, reads, updates, and changes residence status inside organization context", async () => {
    const { app, authRepository } = buildResidenceApi();
    const registration = await registerApiUser(app);
    const organization = await createApiOrganization(
      app,
      registration.token,
      "Residence API Tenant"
    );
    const created = await app.inject({
      method: "POST",
      url: `/organizations/${organization.id}/residences`,
      headers: { authorization: `Bearer ${registration.token}` },
      payload: {
        name: "Sunrise Laval",
        addressSummary: "100 Main Street",
        city: "Laval",
        region: "QC",
        country: "CA"
      }
    });
    const residence = created.json().residence;
    const listed = await app.inject({
      method: "GET",
      url: `/organizations/${organization.id}/residences`,
      headers: { authorization: `Bearer ${registration.token}` }
    });
    const read = await app.inject({
      method: "GET",
      url: `/organizations/${organization.id}/residences/${residence.id}`,
      headers: { authorization: `Bearer ${registration.token}` }
    });
    const updated = await app.inject({
      method: "PATCH",
      url: `/organizations/${organization.id}/residences/${residence.id}`,
      headers: { authorization: `Bearer ${registration.token}` },
      payload: {
        expectedVersion: residence.version,
        name: "Sunrise Laval Updated"
      }
    });
    const inactive = await app.inject({
      method: "POST",
      url: `/organizations/${organization.id}/residences/${residence.id}/status`,
      headers: { authorization: `Bearer ${registration.token}` },
      payload: {
        expectedVersion: updated.json().residence.version,
        status: "inactive",
        reason: "temporary pause"
      }
    });

    expect(authRepository.firstUserId()).toBeTruthy();
    expect(created.statusCode).toBe(201);
    expect(listed.statusCode).toBe(200);
    expect(listed.json().residences).toHaveLength(1);
    expect(read.statusCode).toBe(200);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().residence.name).toBe("Sunrise Laval Updated");
    expect(inactive.statusCode).toBe(200);
    expect(inactive.json().residence.status).toBe("inactive");

    await app.close();
  });

  it("denies anonymous, cross-tenant, guessed residence, and stale update access safely", async () => {
    const { app } = buildResidenceApi();
    const first = await registerApiUser(app);
    const firstOrganization = await createApiOrganization(app, first.token, "Residence Tenant One");
    const residence = (
      await app.inject({
        method: "POST",
        url: `/organizations/${firstOrganization.id}/residences`,
        headers: { authorization: `Bearer ${first.token}` },
        payload: { name: "Tenant One Residence" }
      })
    ).json().residence;
    const second = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "residence-second@example.com",
        password: "ValidPassword123",
        displayName: "Second Residence Employer"
      }
    });
    const secondOrganization = await createApiOrganization(
      app,
      second.json().token,
      "Residence Tenant Two"
    );

    const anonymous = await app.inject({
      method: "POST",
      url: `/organizations/${firstOrganization.id}/residences`,
      payload: { name: "Anonymous Residence" }
    });
    const crossTenantRead = await app.inject({
      method: "GET",
      url: `/organizations/${secondOrganization.id}/residences/${residence.id}`,
      headers: { authorization: `Bearer ${first.token}` }
    });
    const guessed = await app.inject({
      method: "GET",
      url: `/organizations/${firstOrganization.id}/residences/missing-residence`,
      headers: { authorization: `Bearer ${first.token}` }
    });
    const stale = await app.inject({
      method: "PATCH",
      url: `/organizations/${firstOrganization.id}/residences/${residence.id}`,
      headers: { authorization: `Bearer ${first.token}` },
      payload: {
        expectedVersion: "2020-01-01T00:00:00.000Z",
        name: "Stale Residence"
      }
    });

    expect(anonymous.statusCode).toBe(403);
    expect(crossTenantRead.statusCode).toBe(403);
    expect(guessed.statusCode).toBe(403);
    expect(stale.statusCode).toBe(403);
    expect(crossTenantRead.json()).toEqual({
      error: "RWOS_AUTHORIZATION_DENIED",
      message: "Access denied."
    });

    await app.close();
  });
});

describe("api department foundation", () => {
  it("creates, lists, reads, updates, and changes department status inside residence context", async () => {
    const { app } = buildDepartmentApi();
    const registration = await registerApiUser(app);
    const organization = await createApiOrganization(
      app,
      registration.token,
      "Department API Tenant"
    );
    const residence = await createApiResidence(
      app,
      registration.token,
      organization.id,
      "Department API Residence"
    );
    const created = await app.inject({
      method: "POST",
      url: `/organizations/${organization.id}/residences/${residence.id}/departments`,
      headers: { authorization: `Bearer ${registration.token}` },
      payload: { name: "Care Services" }
    });
    const department = created.json().department;
    const listed = await app.inject({
      method: "GET",
      url: `/organizations/${organization.id}/residences/${residence.id}/departments`,
      headers: { authorization: `Bearer ${registration.token}` }
    });
    const read = await app.inject({
      method: "GET",
      url: `/organizations/${organization.id}/residences/${residence.id}/departments/${department.id}`,
      headers: { authorization: `Bearer ${registration.token}` }
    });
    const updated = await app.inject({
      method: "PATCH",
      url: `/organizations/${organization.id}/residences/${residence.id}/departments/${department.id}`,
      headers: { authorization: `Bearer ${registration.token}` },
      payload: {
        expectedVersion: department.version,
        name: "Care and Nursing"
      }
    });
    const inactive = await app.inject({
      method: "POST",
      url: `/organizations/${organization.id}/residences/${residence.id}/departments/${department.id}/status`,
      headers: { authorization: `Bearer ${registration.token}` },
      payload: {
        expectedVersion: updated.json().department.version,
        status: "inactive",
        reason: "temporary pause"
      }
    });

    expect(created.statusCode).toBe(201);
    expect(listed.statusCode).toBe(200);
    expect(listed.json().departments).toHaveLength(1);
    expect(read.statusCode).toBe(200);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().department.name).toBe("Care and Nursing");
    expect(inactive.statusCode).toBe(200);
    expect(inactive.json().department.status).toBe("inactive");

    await app.close();
  });

  it("denies anonymous, cross-tenant, guessed department, and stale update access safely", async () => {
    const { app } = buildDepartmentApi();
    const first = await registerApiUser(app);
    const firstOrganization = await createApiOrganization(
      app,
      first.token,
      "Department Tenant One"
    );
    const firstResidence = await createApiResidence(
      app,
      first.token,
      firstOrganization.id,
      "Tenant One Residence"
    );
    const department = (
      await app.inject({
        method: "POST",
        url: `/organizations/${firstOrganization.id}/residences/${firstResidence.id}/departments`,
        headers: { authorization: `Bearer ${first.token}` },
        payload: { name: "Tenant One Department" }
      })
    ).json().department;
    const second = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "department-second@example.com",
        password: "ValidPassword123",
        displayName: "Second Department Employer"
      }
    });
    const secondOrganization = await createApiOrganization(
      app,
      second.json().token,
      "Department Tenant Two"
    );
    const secondResidence = await createApiResidence(
      app,
      second.json().token,
      secondOrganization.id,
      "Tenant Two Residence"
    );

    const anonymous = await app.inject({
      method: "POST",
      url: `/organizations/${firstOrganization.id}/residences/${firstResidence.id}/departments`,
      payload: { name: "Anonymous Department" }
    });
    const crossTenantRead = await app.inject({
      method: "GET",
      url: `/organizations/${secondOrganization.id}/residences/${secondResidence.id}/departments/${department.id}`,
      headers: { authorization: `Bearer ${first.token}` }
    });
    const guessed = await app.inject({
      method: "GET",
      url: `/organizations/${firstOrganization.id}/residences/${firstResidence.id}/departments/missing-department`,
      headers: { authorization: `Bearer ${first.token}` }
    });
    const stale = await app.inject({
      method: "PATCH",
      url: `/organizations/${firstOrganization.id}/residences/${firstResidence.id}/departments/${department.id}`,
      headers: { authorization: `Bearer ${first.token}` },
      payload: {
        expectedVersion: "2020-01-01T00:00:00.000Z",
        name: "Stale Department"
      }
    });

    expect(anonymous.statusCode).toBe(403);
    expect(crossTenantRead.statusCode).toBe(403);
    expect(guessed.statusCode).toBe(403);
    expect(stale.statusCode).toBe(403);
    expect(crossTenantRead.json()).toEqual({
      error: "RWOS_AUTHORIZATION_DENIED",
      message: "Access denied."
    });

    await app.close();
  });
});

describe("api work groups foundation", () => {
  it("allows ordinary organization users to list and read active WorkGroups", async () => {
    const { app } = buildWorkGroupApi();
    const registration = await registerApiUser(app);
    const organization = await createApiOrganization(
      app,
      registration.token,
      "WorkGroup API Tenant"
    );
    const listed = await app.inject({
      method: "GET",
      url: `/work-groups?organizationId=${organization.id}`,
      headers: { authorization: `Bearer ${registration.token}` }
    });
    const read = await app.inject({
      method: "GET",
      url: `/work-groups/care-nursing?organizationId=${organization.id}`,
      headers: { authorization: `Bearer ${registration.token}` }
    });

    expect(listed.statusCode).toBe(200);
    expect(listed.json().workGroups.map((workGroup: { slug: string }) => workGroup.slug)).toEqual([
      "kitchen",
      "care-nursing",
      "housekeeping-support",
      "maintenance"
    ]);
    expect(read.statusCode).toBe(200);
    expect(read.json().workGroup).toMatchObject({
      slug: "care-nursing",
      displayLabel: "Care / Nursing"
    });

    await app.close();
  });

  it("allows only platform administrators to manage the global catalogue", async () => {
    const { app, authRepository, grantPlatformAdmin } = buildWorkGroupApi();
    const ordinary = await registerApiUser(app);
    const platform = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "platform-workgroup@example.com",
        password: "ValidPassword123",
        displayName: "Platform WorkGroup Admin"
      }
    });
    grantPlatformAdmin(authRepository.lastUserId());
    const ordinaryOrganization = await createApiOrganization(
      app,
      ordinary.token,
      "Ordinary WorkGroup Tenant"
    );
    const denied = await app.inject({
      method: "PATCH",
      url: "/platform/work-groups/kitchen",
      headers: { authorization: `Bearer ${ordinary.token}` },
      payload: {
        expectedVersion: "2026-07-25T08:00:00.000Z",
        displayLabel: "Denied Kitchen"
      }
    });
    const all = await app.inject({
      method: "GET",
      url: "/platform/work-groups",
      headers: { authorization: `Bearer ${platform.json().token}` }
    });
    const kitchen = all
      .json()
      .workGroups.find((workGroup: { slug: string }) => workGroup.slug === "kitchen");
    const updated = await app.inject({
      method: "PATCH",
      url: "/platform/work-groups/kitchen",
      headers: { authorization: `Bearer ${platform.json().token}` },
      payload: {
        expectedVersion: kitchen.version,
        displayLabel: "Kitchen Operations",
        displayOrder: 11
      }
    });
    const inactive = await app.inject({
      method: "POST",
      url: "/platform/work-groups/kitchen/status",
      headers: { authorization: `Bearer ${platform.json().token}` },
      payload: {
        expectedVersion: updated.json().workGroup.version,
        status: "inactive",
        reason: "catalogue pause"
      }
    });
    const ordinaryAfterInactive = await app.inject({
      method: "GET",
      url: `/work-groups/kitchen?organizationId=${ordinaryOrganization.id}`,
      headers: { authorization: `Bearer ${ordinary.token}` }
    });

    expect(denied.statusCode).toBe(403);
    expect(all.statusCode).toBe(200);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().workGroup).toMatchObject({
      slug: "kitchen",
      displayLabel: "Kitchen Operations",
      displayOrder: 11
    });
    expect(inactive.statusCode).toBe(200);
    expect(inactive.json().workGroup.status).toBe("inactive");
    expect(ordinaryAfterInactive.statusCode).toBe(403);

    await app.close();
  });
});

describe("api role definitions foundation", () => {
  it("allows ordinary organization users to list, filter, and read active RoleDefinitions", async () => {
    const { app } = buildRoleDefinitionApi();
    const registration = await registerApiUser(app);
    const organization = await createApiOrganization(
      app,
      registration.token,
      "RoleDefinition API Tenant"
    );
    const listed = await app.inject({
      method: "GET",
      url: `/role-definitions?organizationId=${organization.id}`,
      headers: { authorization: `Bearer ${registration.token}` }
    });
    const kitchen = await app.inject({
      method: "GET",
      url: `/role-definitions?organizationId=${organization.id}&workGroup=kitchen`,
      headers: { authorization: `Bearer ${registration.token}` }
    });
    const read = await app.inject({
      method: "GET",
      url: `/role-definitions/personal-support-worker?organizationId=${organization.id}`,
      headers: { authorization: `Bearer ${registration.token}` }
    });

    expect(listed.statusCode).toBe(200);
    expect(listed.json().roleDefinitions.map((role: { slug: string }) => role.slug)).toEqual([
      "chef",
      "sous-chef",
      "cook",
      "kitchen-helper",
      "dishwasher",
      "nurse",
      "licensed-practical-nurse",
      "personal-support-worker",
      "care-aide"
    ]);
    expect(kitchen.json().roleDefinitions.map((role: { slug: string }) => role.slug)).toEqual([
      "chef",
      "sous-chef",
      "cook",
      "kitchen-helper",
      "dishwasher"
    ]);
    expect(read.statusCode).toBe(200);
    expect(read.json().roleDefinition).toMatchObject({
      code: "PERSONAL_SUPPORT_WORKER",
      slug: "personal-support-worker",
      workGroupSlug: "care-nursing"
    });

    await app.close();
  });

  it("allows only platform administrators to manage the global RoleDefinition catalogue", async () => {
    const { app, authRepository, grantPlatformAdmin } = buildRoleDefinitionApi();
    const ordinary = await registerApiUser(app);
    const platform = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "platform-roledefinition@example.com",
        password: "ValidPassword123",
        displayName: "Platform RoleDefinition Admin"
      }
    });
    grantPlatformAdmin(authRepository.lastUserId());
    const ordinaryOrganization = await createApiOrganization(
      app,
      ordinary.token,
      "Ordinary RoleDefinition Tenant"
    );
    const denied = await app.inject({
      method: "PATCH",
      url: "/platform/role-definitions/chef",
      headers: { authorization: `Bearer ${ordinary.token}` },
      payload: {
        expectedVersion: "2026-07-25T08:00:00.000Z",
        displayLabel: "Denied Chef"
      }
    });
    const all = await app.inject({
      method: "GET",
      url: "/platform/role-definitions?workGroup=kitchen",
      headers: { authorization: `Bearer ${platform.json().token}` }
    });
    const chef = all.json().roleDefinitions.find((role: { slug: string }) => role.slug === "chef");
    const updated = await app.inject({
      method: "PATCH",
      url: "/platform/role-definitions/chef",
      headers: { authorization: `Bearer ${platform.json().token}` },
      payload: {
        expectedVersion: chef.version,
        displayLabel: "Executive Chef",
        displayOrder: 12
      }
    });
    const inactive = await app.inject({
      method: "POST",
      url: "/platform/role-definitions/chef/status",
      headers: { authorization: `Bearer ${platform.json().token}` },
      payload: {
        expectedVersion: updated.json().roleDefinition.version,
        status: "inactive",
        reason: "catalogue pause"
      }
    });
    const ordinaryAfterInactive = await app.inject({
      method: "GET",
      url: `/role-definitions/chef?organizationId=${ordinaryOrganization.id}`,
      headers: { authorization: `Bearer ${ordinary.token}` }
    });

    expect(denied.statusCode).toBe(403);
    expect(all.statusCode).toBe(200);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().roleDefinition).toMatchObject({
      code: "CHEF",
      slug: "chef",
      displayLabel: "Executive Chef",
      displayOrder: 12
    });
    expect(inactive.statusCode).toBe(200);
    expect(inactive.json().roleDefinition.status).toBe("inactive");
    expect(ordinaryAfterInactive.statusCode).toBe(403);

    await app.close();
  });
});

describe("api job request foundation", () => {
  it("connects employer draft and submit APIs to platform intake without dispatch execution", async () => {
    const { app, authRepository, grantPlatformAdmin } = buildJobRequestApi();
    const employer = await registerApiUser(app);
    const organization = await createApiOrganization(app, employer.token, "Job Request API Tenant");
    const residence = await createApiResidence(
      app,
      employer.token,
      organization.id,
      "Job Request API Residence"
    );
    const department = await createApiDepartment(
      app,
      employer.token,
      organization.id,
      residence.id,
      "Kitchen"
    );
    const created = await app.inject({
      method: "POST",
      url: `/organizations/${organization.id}/job-requests`,
      headers: { authorization: `Bearer ${employer.token}` },
      payload: {
        residenceId: residence.id,
        departmentId: department.id,
        workGroup: "kitchen",
        roleDefinition: "chef",
        title: "Dinner Chef Coverage",
        description: "Fixture-backed API validation only.",
        numberOfWorkers: 1,
        urgency: "urgent",
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt: "2026-08-10T20:00:00.000Z",
        endAt: "2026-08-11T02:00:00.000Z"
      }
    });
    const createdDraft = created.json().jobRequest as {
      id: string;
      jobRequestNumber: string;
      versionToken: number;
    };
    const patched = await app.inject({
      method: "PATCH",
      url: `/organizations/${organization.id}/job-requests/${createdDraft.id}`,
      headers: { authorization: `Bearer ${employer.token}` },
      payload: {
        expectedVersion: createdDraft.versionToken,
        title: "Updated Dinner Chef Coverage"
      }
    });
    const draft = patched.json().jobRequest as {
      id: string;
      jobRequestNumber: string;
      versionToken: number;
    };
    const stalePatch = await app.inject({
      method: "PATCH",
      url: `/organizations/${organization.id}/job-requests/${createdDraft.id}`,
      headers: { authorization: `Bearer ${employer.token}` },
      payload: {
        expectedVersion: createdDraft.versionToken,
        title: "Stale Dinner Chef Coverage"
      }
    });
    const listed = await app.inject({
      method: "GET",
      url: `/organizations/${organization.id}/job-requests`,
      headers: { authorization: `Bearer ${employer.token}` }
    });
    const submitted = await app.inject({
      method: "POST",
      url: `/organizations/${organization.id}/job-requests/${draft.id}/submit`,
      headers: { authorization: `Bearer ${employer.token}` },
      payload: { expectedVersion: draft.versionToken }
    });
    const platform = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "platform-job-request@example.com",
        password: "ValidPassword123",
        displayName: "Platform Job Request Admin"
      }
    });
    grantPlatformAdmin(authRepository.lastUserId());
    const intake = await app.inject({
      method: "GET",
      url: "/platform/job-requests/intake",
      headers: { authorization: `Bearer ${platform.json().token}` }
    });
    const adminReview = await app.inject({
      method: "POST",
      url: `/platform/job-requests/intake/${draft.id}/admin-review`,
      headers: { authorization: `Bearer ${platform.json().token}` },
      payload: { expectedVersion: submitted.json().jobRequest.versionToken }
    });
    const informationRequired = await app.inject({
      method: "POST",
      url: `/platform/job-requests/intake/${draft.id}/request-information`,
      headers: { authorization: `Bearer ${platform.json().token}` },
      payload: {
        expectedVersion: adminReview.json().jobRequest.versionToken,
        reason: "Clarify the overnight supervision plan."
      }
    });
    const corrected = await app.inject({
      method: "PATCH",
      url: `/organizations/${organization.id}/job-requests/${draft.id}`,
      headers: { authorization: `Bearer ${employer.token}` },
      payload: {
        expectedVersion: informationRequired.json().jobRequest.versionToken,
        description: "Overnight supervision will be provided by the residence manager."
      }
    });
    const resubmitted = await app.inject({
      method: "POST",
      url: `/organizations/${organization.id}/job-requests/${draft.id}/submit`,
      headers: { authorization: `Bearer ${employer.token}` },
      payload: { expectedVersion: corrected.json().jobRequest.versionToken }
    });
    const secondAdminReview = await app.inject({
      method: "POST",
      url: `/platform/job-requests/intake/${draft.id}/admin-review`,
      headers: { authorization: `Bearer ${platform.json().token}` },
      payload: { expectedVersion: resubmitted.json().jobRequest.versionToken }
    });
    const approved = await app.inject({
      method: "POST",
      url: `/platform/job-requests/intake/${draft.id}/approve-for-dispatch`,
      headers: { authorization: `Bearer ${platform.json().token}` },
      payload: { expectedVersion: secondAdminReview.json().jobRequest.versionToken }
    });

    expect(created.statusCode).toBe(201);
    expect(patched.statusCode).toBe(200);
    expect(stalePatch.statusCode).toBe(409);
    expect(stalePatch.json()).toEqual({
      error: "RWOS_JOB_REQUEST_CHANGED",
      message: "Job request changed. Refresh before trying again."
    });
    expect(draft.jobRequestNumber).toBe("JR-2026-000001");
    expect(listed.statusCode).toBe(200);
    expect(listed.json().jobRequests).toHaveLength(1);
    expect(submitted.statusCode).toBe(200);
    expect(submitted.json().jobRequest.status).toBe("submitted");
    expect(adminReview.json().jobRequest.status).toBe("admin_review");
    expect(informationRequired.json().jobRequest).toMatchObject({
      status: "information_required",
      adminReviewReason: "Clarify the overnight supervision plan."
    });
    expect(corrected.statusCode).toBe(200);
    expect(resubmitted.json().jobRequest).toMatchObject({
      status: "submitted",
      adminReviewReason: null
    });
    expect(secondAdminReview.json().jobRequest.status).toBe("admin_review");
    expect(intake.statusCode).toBe(200);
    expect(intake.json().jobRequests.map((jobRequest: { id: string }) => jobRequest.id)).toContain(
      draft.id
    );
    expect(approved.statusCode).toBe(200);
    expect(approved.json().jobRequest.status).toBe("approved_for_dispatch");

    await app.close();
  });
});

describe("api dispatch foundation", () => {
  it("routes platform dispatch creation through authorized dispatcher boundary", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const platformUserIds = new Set<string>();
    const dispatchCalls: string[] = [];
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      dispatchService: {
        ...createApiUnavailableDispatchService(),
        async createDispatch(input) {
          dispatchCalls.push(input.jobRequestIdOrNumber);
          return apiDispatchReview();
        }
      },
      resolveAuthorizationRoles: (userId) => (platformUserIds.has(userId) ? ["DISPATCHER"] : [])
    });
    const dispatcher = await registerApiUser(app);
    platformUserIds.add(authRepository.lastUserId());

    const response = await app.inject({
      method: "POST",
      url: "/platform/dispatches",
      headers: { authorization: `Bearer ${dispatcher.token}` },
      payload: {
        jobRequestIdOrNumber: "JR-2026-000001",
        priority: "urgent"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().dispatchReview).toMatchObject({
      id: "dispatch-api-1",
      state: "candidate_review",
      requiredWorkerCount: 2,
      remainingWorkerCount: 2
    });
    expect(dispatchCalls).toEqual(["JR-2026-000001"]);
    await app.close();
  });

  it("returns employer dispatch status without candidate or internal details", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      dispatchService: {
        ...createApiUnavailableDispatchService(),
        async getEmployerDispatchStatus() {
          return {
            jobRequestId: "job-request-api-1",
            jobRequestNumber: "JR-2026-000001",
            dispatchState: "candidate_review",
            requiredWorkerCount: 2,
            shortlistedCandidateCount: 1,
            preparedOfferCount: 0,
            remainingWorkerCount: 2,
            updatedAt: new Date("2026-07-25T14:00:00.000Z")
          };
        }
      }
    });
    const employer = await registerApiUser(app);

    const response = await app.inject({
      method: "GET",
      url: "/organizations/org-api-1/job-requests/JR-2026-000001/dispatch-status",
      headers: { authorization: `Bearer ${employer.token}` }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().dispatchStatus).toEqual({
      jobRequestId: "job-request-api-1",
      jobRequestNumber: "JR-2026-000001",
      dispatchState: "candidate_review",
      requiredWorkerCount: 2,
      shortlistedCandidateCount: 1,
      preparedOfferCount: 0,
      remainingWorkerCount: 2,
      updatedAt: "2026-07-25T14:00:00.000Z"
    });
    expect(JSON.stringify(response.json())).not.toContain("candidateSourceReference");
    await app.close();
  });
});

describe("api worker offer foundation", () => {
  it("routes platform offer creation and worker response without creating Assignment", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const workerOffer = apiWorkerOffer();
    const calls: string[] = [];
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      workerOfferService: {
        ...createApiUnavailableWorkerOfferService(),
        async createOffer(input) {
          calls.push(`create:${input.dispatchReviewId}:${input.workerIdentityId}`);
          return workerOffer;
        },
        async accept(input) {
          calls.push(`accept:${input.expectedTermsVersionId}`);
          return { ...workerOffer, status: "accepted", version: 3, versionToken: 3 };
        },
        async listWorkerOffers() {
          calls.push("list-worker-owned");
          return [workerOffer];
        }
      },
      resolveAuthorizationRoles: async () => ["DISPATCHER", "WORKER_ACCESS"]
    });
    const user = await registerApiUser(app);
    const created = await app.inject({
      method: "POST",
      url: "/platform/worker-offers",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        dispatchReviewId: "dispatch-api-1",
        workerIdentityId: "worker-identity-api-1",
        expiresAt: "2026-08-12T10:00:00.000Z"
      }
    });
    const accepted = await app.inject({
      method: "POST",
      url: `/worker/offers/${workerOffer.id}/accept`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        expectedVersion: workerOffer.versionToken,
        expectedTermsVersionId: workerOffer.currentTermsVersion!.id
      }
    });
    const discovered = await app.inject({
      method: "GET",
      url: "/worker/offers",
      headers: { authorization: `Bearer ${user.token}` }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().workerOffer).toMatchObject({
      status: "draft",
      currentTermsVersion: { workerVisibleTitle: "Dinner Chef Coverage" }
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().workerOffer.status).toBe("accepted");
    expect(discovered.statusCode).toBe(200);
    expect(discovered.json().workerOffers).toHaveLength(1);
    expect(JSON.stringify(discovered.json())).not.toMatch(
      /organizationId|residenceId|departmentId|workerIdentityId|createdByUserId|approvedByUserId/u
    );
    expect(calls).toEqual([
      "create:dispatch-api-1:worker-identity-api-1",
      `accept:${workerOffer.currentTermsVersion!.id}`,
      "list-worker-owned"
    ]);
    await app.close();
  });
});

describe("api assignment foundation", () => {
  it("routes Assignment creation, worker acknowledgement, employer read-only status, and attendance handoff", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const assignment = apiAssignment();
    const calls: string[] = [];
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      assignmentService: {
        ...createApiUnavailableAssignmentService(),
        async createFromAcceptedOffer(input) {
          calls.push(`create:${input.workerOfferId}`);
          return assignment;
        },
        async acknowledge(input) {
          calls.push(`ack:${input.assignmentId}`);
          return { ...assignment, status: "worker_acknowledged", version: 1, versionToken: 1 };
        },
        async listAssignments(input) {
          calls.push(`list:${input.organizationId ?? "none"}`);
          return [assignment];
        },
        async listWorkerAssignments() {
          calls.push("list-worker-assignments");
          return [assignment];
        },
        async attendanceHandoff(input) {
          calls.push(`handoff:${input.assignmentId}`);
          return {
            ...assignment,
            status: "attendance_handoff",
            attendanceHandoffAt: new Date("2026-07-25T15:00:00.000Z"),
            attendanceBoundary: "handoff_completed",
            version: 2,
            versionToken: 2
          };
        }
      },
      resolveAuthorizationRoles: async () => ["DISPATCHER", "ORGANIZATION_OWNER", "WORKER_ACCESS"]
    });
    const user = await registerApiUser(app);

    const created = await app.inject({
      method: "POST",
      url: "/platform/assignments",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        workerOfferId: "00000000-0000-4000-8000-000000000101",
        dispatchReviewId: "00000000-0000-4000-8000-000000000102",
        expectedOfferVersion: 1
      }
    });
    const acknowledged = await app.inject({
      method: "POST",
      url: `/worker/assignments/${assignment.id}/acknowledge`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: { expectedVersion: assignment.versionToken }
    });
    const employerVisible = await app.inject({
      method: "GET",
      url: `/organizations/${assignment.organizationId}/assignments`,
      headers: { authorization: `Bearer ${user.token}` }
    });
    const workerVisible = await app.inject({
      method: "GET",
      url: "/worker/assignments",
      headers: { authorization: `Bearer ${user.token}` }
    });
    const handoff = await app.inject({
      method: "POST",
      url: `/platform/assignments/${assignment.id}/attendance-handoff`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: { expectedVersion: 1 }
    });
    const timesheet = await app.inject({
      method: "GET",
      url: "/platform/payroll",
      headers: { authorization: `Bearer ${user.token}` }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().assignment).toMatchObject({
      status: "confirmed",
      workerOfferId: "worker-offer-api-1",
      attendanceBoundary: "not_started"
    });
    expect(acknowledged.statusCode).toBe(200);
    expect(acknowledged.json().assignment.status).toBe("worker_acknowledged");
    expect(JSON.stringify(acknowledged.json())).not.toMatch(
      /organizationId|residenceId|departmentId|workerIdentityId|validationSnapshot|createdByUserId/u
    );
    expect(employerVisible.statusCode).toBe(200);
    expect(employerVisible.json().assignments).toHaveLength(1);
    expect(employerVisible.json().assignments[0]).toMatchObject({
      audience: "employer",
      assignmentId: assignment.id,
      visibility: "employer_authorized_assignment"
    });
    expect(JSON.stringify(employerVisible.json())).not.toMatch(
      /workerIdentityId|validationSnapshot|createdByUserId|confirmedCompensationSummary|compensationSummary/u
    );
    expect(workerVisible.statusCode).toBe(200);
    expect(workerVisible.json().assignments).toHaveLength(1);
    expect(JSON.stringify(workerVisible.json())).not.toMatch(
      /organizationId|residenceId|departmentId|workerIdentityId|validationSnapshot|createdByUserId/u
    );
    expect(handoff.statusCode).toBe(200);
    expect(handoff.json().assignment.status).toBe("attendance_handoff");
    expect(timesheet.statusCode).toBe(404);
    expect(calls).toEqual([
      "create:00000000-0000-4000-8000-000000000101",
      "ack:assignment-api-1",
      "list:org-api-1",
      "list-worker-assignments",
      "handoff:assignment-api-1"
    ]);
    await app.close();
  });

  it("maps Assignment conflicts without exposing capacity or worker details", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      assignmentService: {
        ...createApiUnavailableAssignmentService(),
        async createFromAcceptedOffer() {
          throw new AssignmentError({
            status: "capacity_exceeded",
            allow: false,
            assignment: null,
            roles: ["DISPATCHER"],
            internalReason: "job_capacity_reached:worker-private-id",
            externalCode: authorizationDeniedCode,
            externalMessage: authorizationDeniedMessage
          });
        }
      },
      resolveAuthorizationRoles: async () => ["DISPATCHER"]
    });
    const user = await registerApiUser(app);

    const response = await app.inject({
      method: "POST",
      url: "/platform/assignments",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        workerOfferId: "00000000-0000-4000-8000-000000000101",
        dispatchReviewId: "00000000-0000-4000-8000-000000000102",
        expectedOfferVersion: 1
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "RWOS_ASSIGNMENT_CONFLICT",
      message: "Assignment could not be created from the current offer state."
    });
    expect(JSON.stringify(response.json())).not.toContain("worker-private-id");
    await app.close();
  });

  it("maps missing or mismatched Assignment sources to one privacy-safe response", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      assignmentService: {
        ...createApiUnavailableAssignmentService(),
        async createFromAcceptedOffer() {
          throw new AssignmentError({
            status: "not_found",
            allow: false,
            assignment: null,
            roles: ["DISPATCHER"],
            internalReason: "source_chain_mismatch:worker-private-id",
            externalCode: authorizationDeniedCode,
            externalMessage: authorizationDeniedMessage
          });
        }
      },
      resolveAuthorizationRoles: async () => ["DISPATCHER"]
    });
    const user = await registerApiUser(app);

    const response = await app.inject({
      method: "POST",
      url: "/platform/assignments",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        workerOfferId: "00000000-0000-4000-8000-000000000101",
        dispatchReviewId: "00000000-0000-4000-8000-000000000102",
        expectedOfferVersion: 1
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "RWOS_ASSIGNMENT_SOURCE_UNAVAILABLE",
      message: "Assignment source is unavailable."
    });
    expect(JSON.stringify(response.json())).not.toContain("worker-private-id");
    await app.close();
  });

  it("returns bounded retry guidance when Assignment serialization retries are exhausted", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      assignmentService: {
        ...createApiUnavailableAssignmentService(),
        async createFromAcceptedOffer() {
          throw new AssignmentTransactionUnavailableError();
        }
      },
      resolveAuthorizationRoles: async () => ["DISPATCHER"]
    });
    const user = await registerApiUser(app);

    const response = await app.inject({
      method: "POST",
      url: "/platform/assignments",
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        workerOfferId: "00000000-0000-4000-8000-000000000101",
        dispatchReviewId: "00000000-0000-4000-8000-000000000102",
        expectedOfferVersion: 1
      }
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers["retry-after"]).toBe("2");
    expect(response.json()).toEqual({
      error: "RWOS_ASSIGNMENT_TEMPORARILY_UNAVAILABLE",
      message: "Assignment processing is temporarily unavailable."
    });
    await app.close();
  });
});

describe("api attendance foundation", () => {
  it("routes Attendance creation, worker check-in/out, employer read-only status, and Timesheet boundary", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const attendanceRecord = apiAttendanceRecord();
    const calls: string[] = [];
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      attendanceService: {
        ...createApiUnavailableAttendanceService(),
        async createFromAssignment(input) {
          calls.push(`create:${input.assignmentId}`);
          return attendanceRecord;
        },
        async workerCheckIn(input) {
          calls.push(`check-in:${input.attendanceRecordId}`);
          return {
            ...attendanceRecord,
            status: "checked_in",
            checkInAt: new Date("2026-08-12T12:03:00.000Z"),
            checkInMethod: input.method ?? "none",
            checkInEvidenceSummary: input.evidenceSummary ?? null,
            checkInLocationPolicyResult: input.locationPolicyResult ?? null,
            version: 1,
            versionToken: 1
          };
        },
        async workerCheckOut(input) {
          calls.push(`check-out:${input.attendanceRecordId}`);
          return {
            ...attendanceRecord,
            status: "checked_out",
            checkInAt: new Date("2026-08-12T12:03:00.000Z"),
            checkOutAt: new Date("2026-08-12T20:01:00.000Z"),
            checkOutMethod: input.method ?? "none",
            checkOutEvidenceSummary: input.evidenceSummary ?? null,
            checkOutLocationPolicyResult: input.locationPolicyResult ?? null,
            version: 2,
            versionToken: 2
          };
        },
        async listAttendance(input) {
          calls.push(`list:${input.organizationId ?? "none"}`);
          return [attendanceRecord];
        },
        async markCompleted(input) {
          calls.push(`complete:${input.attendanceRecordId}`);
          return {
            ...attendanceRecord,
            status: "completed",
            completedAt: new Date("2026-08-12T20:05:00.000Z"),
            timesheetBoundary: "handoff_ready",
            version: 3,
            versionToken: 3
          };
        }
      },
      resolveAuthorizationRoles: async () => ["DISPATCHER", "ORGANIZATION_OWNER", "WORKER_ACCESS"]
    });
    const user = await registerApiUser(app);

    const created = await app.inject({
      method: "POST",
      url: "/platform/attendance",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { assignmentId: "assignment-api-1", verificationMethod: "qr_code" }
    });
    const checkedIn = await app.inject({
      method: "POST",
      url: `/worker/attendance/${attendanceRecord.id}/check-in`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        expectedVersion: attendanceRecord.versionToken,
        method: "secure_pin",
        evidenceSummary: "Worker-owned evidence only.",
        locationPolicyResult: "not_required"
      }
    });
    const employerVisible = await app.inject({
      method: "GET",
      url: `/organizations/${attendanceRecord.organizationId}/attendance`,
      headers: { authorization: `Bearer ${user.token}` }
    });
    const checkedOut = await app.inject({
      method: "POST",
      url: `/worker/attendance/${attendanceRecord.id}/check-out`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: {
        expectedVersion: 1,
        method: "secure_pin",
        evidenceSummary: "Worker-owned departure evidence only.",
        locationPolicyResult: "not_required"
      }
    });
    const completed = await app.inject({
      method: "POST",
      url: `/platform/attendance/${attendanceRecord.id}/complete`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: { expectedVersion: 2 }
    });
    const timesheet = await app.inject({
      method: "GET",
      url: "/platform/payroll",
      headers: { authorization: `Bearer ${user.token}` }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().attendanceRecord).toMatchObject({
      status: "pending_start",
      assignmentId: "assignment-api-1",
      verificationBoundary: "provider_neutral",
      timesheetBoundary: "not_started"
    });
    expect(checkedIn.statusCode).toBe(200);
    expect(checkedIn.json().attendanceRecord.status).toBe("checked_in");
    expect(checkedIn.json().attendanceRecord.checkInMethod).toBe("secure_pin");
    expect(employerVisible.statusCode).toBe(200);
    expect(employerVisible.json().attendanceRecords).toHaveLength(1);
    expect(checkedOut.statusCode).toBe(200);
    expect(checkedOut.json().attendanceRecord.status).toBe("checked_out");
    expect(completed.statusCode).toBe(200);
    expect(completed.json().attendanceRecord.timesheetBoundary).toBe("handoff_ready");
    expect(timesheet.statusCode).toBe(404);
    expect(calls).toEqual([
      "create:assignment-api-1",
      "check-in:attendance-api-1",
      "list:org-api-1",
      "check-out:attendance-api-1",
      "complete:attendance-api-1"
    ]);
    await app.close();
  });
});

describe("api timesheet foundation", () => {
  it("routes Timesheet lifecycle without exposing payroll or finance execution", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const timesheet = apiTimesheet();
    const calls: string[] = [];
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      timesheetService: {
        ...createApiUnavailableTimesheetService(),
        async createFromAttendance(input) {
          calls.push(`create:${input.attendanceRecordId}`);
          return timesheet;
        },
        async calculate(input) {
          calls.push(`calculate:${input.timesheetId}`);
          return {
            ...timesheet,
            status: "worker_review",
            actualCheckInAt: new Date("2026-08-12T12:00:00.000Z"),
            actualCheckOutAt: new Date("2026-08-12T20:00:00.000Z"),
            rawElapsedMinutes: 480,
            payableMinutes: 480,
            billableMinutes: 480,
            version: 1,
            versionToken: 1
          };
        },
        async workerConfirm(input) {
          calls.push(`worker-confirm:${input.timesheetId}`);
          return {
            ...timesheet,
            status: "employer_review",
            workerReviewStatus: "confirmed",
            workerReviewedAt: new Date("2026-08-12T20:10:00.000Z"),
            version: 2,
            versionToken: 2
          };
        },
        async employerConfirm(input) {
          calls.push(`employer-confirm:${input.timesheetId}`);
          return {
            ...timesheet,
            status: "platform_review",
            workerReviewStatus: "confirmed",
            employerReviewStatus: "confirmed",
            employerReviewedAt: new Date("2026-08-12T20:20:00.000Z"),
            version: 3,
            versionToken: 3
          };
        },
        async approve(input) {
          calls.push(`approve:${input.timesheetId}`);
          return {
            ...timesheet,
            status: "approved",
            workerReviewStatus: "confirmed",
            employerReviewStatus: "confirmed",
            platformReviewStatus: "approved",
            approvedAt: new Date("2026-08-12T20:30:00.000Z"),
            version: 4,
            versionToken: 4
          };
        },
        async lock(input) {
          calls.push(`lock:${input.timesheetId}`);
          return {
            ...timesheet,
            status: "locked",
            workerReviewStatus: "confirmed",
            employerReviewStatus: "confirmed",
            platformReviewStatus: "approved",
            lockedAt: new Date("2026-08-12T20:35:00.000Z"),
            payrollBoundary: "handoff_ready",
            financeBoundary: "handoff_ready",
            version: 5,
            versionToken: 5
          };
        },
        async listTimesheets(input) {
          calls.push(`list:${input.organizationId ?? "platform"}`);
          return [timesheet];
        },
        async readTimesheet(input) {
          calls.push(`read:${input.timesheetId}`);
          return timesheet;
        },
        async readAuditSummary(input) {
          calls.push(`audit:${input.timesheetId}`);
          return {
            timesheetId: input.timesheetId,
            attendanceRecordId: timesheet.attendanceRecordId,
            assignmentId: timesheet.assignmentId,
            status: timesheet.status,
            calculationSnapshots: 1,
            message: "Timesheet audit is available through governed audit records."
          };
        }
      },
      resolveAuthorizationRoles: async () => [
        "TIMESHEET_REVIEWER",
        "WORKER_ACCESS",
        "ORGANIZATION_OWNER"
      ]
    });
    const user = await registerApiUser(app);

    const created = await app.inject({
      method: "POST",
      url: "/platform/timesheets",
      headers: { authorization: `Bearer ${user.token}` },
      payload: { attendanceRecordId: "attendance-api-1" }
    });
    const calculated = await app.inject({
      method: "POST",
      url: `/platform/timesheets/${timesheet.id}/calculate`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: { expectedVersion: 0 }
    });
    const workerConfirmed = await app.inject({
      method: "POST",
      url: `/worker/timesheets/${timesheet.id}/confirm`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: { expectedVersion: 1 }
    });
    const employerConfirmed = await app.inject({
      method: "POST",
      url: `/organizations/${timesheet.organizationId}/timesheets/${timesheet.id}/confirm`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: { expectedVersion: 2 }
    });
    const approved = await app.inject({
      method: "POST",
      url: `/platform/timesheets/${timesheet.id}/approve`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: { expectedVersion: 3 }
    });
    const locked = await app.inject({
      method: "POST",
      url: `/platform/timesheets/${timesheet.id}/lock`,
      headers: { authorization: `Bearer ${user.token}` },
      payload: { expectedVersion: 4 }
    });
    const platformList = await app.inject({
      method: "GET",
      url: "/platform/timesheets",
      headers: { authorization: `Bearer ${user.token}` }
    });
    const audit = await app.inject({
      method: "GET",
      url: `/platform/timesheets/${timesheet.id}/audit`,
      headers: { authorization: `Bearer ${user.token}` }
    });
    const payroll = await app.inject({
      method: "GET",
      url: "/platform/payroll",
      headers: { authorization: `Bearer ${user.token}` }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().timesheet).toMatchObject({
      status: "draft",
      attendanceBoundary: "preserved",
      calculationBoundary: "time_only_no_money",
      payrollBoundary: "not_started"
    });
    expect(calculated.statusCode).toBe(200);
    expect(calculated.json().timesheet).toMatchObject({
      status: "worker_review",
      rawElapsedMinutes: 480,
      payableMinutes: 480,
      billableMinutes: 480
    });
    expect(workerConfirmed.json().timesheet.status).toBe("employer_review");
    expect(employerConfirmed.json().timesheet.status).toBe("platform_review");
    expect(approved.json().timesheet.status).toBe("approved");
    expect(locked.json().timesheet).toMatchObject({
      status: "locked",
      payrollBoundary: "handoff_ready",
      financeBoundary: "handoff_ready"
    });
    expect(platformList.statusCode).toBe(200);
    expect(platformList.json().timesheets).toHaveLength(1);
    expect(audit.statusCode).toBe(200);
    expect(audit.json().audit.calculationSnapshots).toBe(1);
    expect(payroll.statusCode).toBe(404);
    expect(calls).toEqual([
      "create:attendance-api-1",
      "calculate:timesheet-api-1",
      "worker-confirm:timesheet-api-1",
      "list:org-api-1",
      "employer-confirm:timesheet-api-1",
      "approve:timesheet-api-1",
      "lock:timesheet-api-1",
      "list:platform",
      "audit:timesheet-api-1"
    ]);
    await app.close();
  });

  it("fails closed when organization-scoped services return records from another organization", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const otherOrganizationId = "org-api-other";
    const otherAssignment = { ...apiAssignment(), organizationId: otherOrganizationId };
    const otherAttendance = { ...apiAttendanceRecord(), organizationId: otherOrganizationId };
    const otherTimesheet = { ...apiTimesheet(), organizationId: otherOrganizationId };
    let employerConfirmCalled = false;
    let employerDisputeCalled = false;
    const app = buildApi({
      authService: createAuthenticationService(authRepository, testAuthOptions()),
      assignmentService: {
        ...createApiUnavailableAssignmentService(),
        async listAssignments() {
          return [otherAssignment];
        }
      },
      attendanceService: {
        ...createApiUnavailableAttendanceService(),
        async listAttendance() {
          return [otherAttendance];
        }
      },
      timesheetService: {
        ...createApiUnavailableTimesheetService(),
        async listTimesheets() {
          return [otherTimesheet];
        },
        async employerConfirm() {
          employerConfirmCalled = true;
          return otherTimesheet;
        },
        async employerDispute() {
          employerDisputeCalled = true;
          return otherTimesheet;
        }
      },
      resolveAuthorizationRoles: async () => ["ORGANIZATION_OWNER"]
    });
    const user = await registerApiUser(app);
    const headers = { authorization: `Bearer ${user.token}` };

    const assignments = await app.inject({
      method: "GET",
      url: "/organizations/org-api-1/assignments",
      headers
    });
    const attendance = await app.inject({
      method: "GET",
      url: "/organizations/org-api-1/attendance",
      headers
    });
    const timesheets = await app.inject({
      method: "GET",
      url: "/organizations/org-api-1/timesheets",
      headers
    });
    const confirm = await app.inject({
      method: "POST",
      url: `/organizations/org-api-1/timesheets/${otherTimesheet.id}/confirm`,
      headers,
      payload: { expectedVersion: otherTimesheet.versionToken }
    });
    const dispute = await app.inject({
      method: "POST",
      url: `/organizations/org-api-1/timesheets/${otherTimesheet.id}/dispute`,
      headers,
      payload: {
        expectedVersion: otherTimesheet.versionToken,
        reason: "Synthetic dispute reason."
      }
    });

    for (const response of [assignments, attendance, timesheets, confirm, dispute]) {
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: "RWOS_AUTHORIZATION_DENIED",
        message: "Access denied."
      });
      expect(response.body).not.toContain(otherOrganizationId);
    }
    expect(employerConfirmCalled).toBe(false);
    expect(employerDisputeCalled).toBe(false);
    await app.close();
  });
});

function createApiUnavailableDispatchService(): DispatchService {
  const unavailable = async () => {
    throw new Error("dispatch service unavailable in this API test");
  };

  return {
    createDispatch: unavailable,
    listDispatches: unavailable,
    getDispatch: unavailable,
    assignOperationalOwner: unavailable,
    startCandidateReview: unavailable,
    getCandidateSourceStatus: unavailable,
    searchCandidates: unavailable,
    evaluateCandidate: unavailable,
    addCandidateToShortlist: unavailable,
    removeCandidateFromShortlist: unavailable,
    reorderShortlist: unavailable,
    markShortlistReady: unavailable,
    moveToOfferPreparation: unavailable,
    pause: unavailable,
    resume: unavailable,
    cancel: unavailable,
    close: unavailable,
    readAuditSummary: unavailable,
    getEmployerDispatchStatus: unavailable
  } as DispatchService;
}

function createApiUnavailableWorkerOfferService(): WorkerOfferService {
  const unavailable = async () => {
    throw new Error("worker offer service unavailable in this API test");
  };

  return {
    ensureWorkerIdentity: unavailable,
    createOffer: unavailable,
    listOffers: unavailable,
    readOffer: unavailable,
    approve: unavailable,
    send: unavailable,
    retryDelivery: unavailable,
    workerRead: unavailable,
    listWorkerOffers: unavailable,
    workerCalendarReference: unavailable,
    accept: unavailable,
    decline: unavailable,
    withdraw: unavailable,
    cancel: unavailable,
    readAuditSummary: unavailable
  } as WorkerOfferService;
}

function createApiUnavailableAssignmentService(): AssignmentService {
  const unavailable = async () => {
    throw new Error("assignment service unavailable in this API test");
  };

  return {
    createFromAcceptedOffer: unavailable,
    listAssignments: unavailable,
    readAssignment: unavailable,
    workerRead: unavailable,
    listWorkerAssignments: unavailable,
    acknowledge: unavailable,
    workerWithdraw: unavailable,
    markReadyForAttendance: unavailable,
    startAttendanceWindow: unavailable,
    attendanceHandoff: unavailable,
    cancel: unavailable,
    markReplacementRequired: unavailable,
    readAuditSummary: unavailable
  } as AssignmentService;
}

function createApiUnavailableAttendanceService(): AttendanceService {
  const unavailable = async () => {
    throw new Error("attendance service unavailable in this API test");
  };

  return {
    createFromAssignment: unavailable,
    listAttendance: unavailable,
    readAttendance: unavailable,
    workerRead: unavailable,
    workerCheckIn: unavailable,
    workerCheckOut: unavailable,
    markCompleted: unavailable,
    markMissed: unavailable,
    markException: unavailable,
    cancel: unavailable,
    readAuditSummary: unavailable
  } as AttendanceService;
}

function createApiUnavailableTimesheetService(): TimesheetService {
  const unavailable = async () => {
    throw new Error("timesheet service unavailable in this API test");
  };

  return {
    createFromAttendance: unavailable,
    calculate: unavailable,
    listTimesheets: unavailable,
    readTimesheet: unavailable,
    workerRead: unavailable,
    workerConfirm: unavailable,
    workerDispute: unavailable,
    employerConfirm: unavailable,
    employerDispute: unavailable,
    requestCorrection: unavailable,
    approve: unavailable,
    reject: unavailable,
    lock: unavailable,
    readAuditSummary: unavailable
  } as TimesheetService;
}

function apiDispatchReview(): Awaited<ReturnType<DispatchService["createDispatch"]>> {
  const now = new Date("2026-07-25T14:00:00.000Z");
  return {
    id: "dispatch-api-1",
    jobRequestId: "job-request-api-1",
    organizationId: "org-api-1",
    residenceId: "residence-api-1",
    departmentId: "department-api-1",
    workGroupId: "work-group-kitchen",
    roleDefinitionId: "role-chef",
    dispatchType: "initial",
    state: "candidate_review",
    operationalOwnerUserId: "dispatcher-api-1",
    priority: "urgent",
    urgency: "urgent",
    requiredWorkerCount: 2,
    shortlistedCandidateCount: 0,
    preparedOfferCount: 0,
    remainingWorkerCount: 2,
    startedAt: now,
    pausedAt: null,
    cancelledAt: null,
    closedAt: null,
    createdByUserId: "dispatcher-api-1",
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 0,
    versionToken: 0
  };
}

function apiWorkerOffer(): Awaited<ReturnType<WorkerOfferService["createOffer"]>> {
  const now = new Date("2026-07-25T14:00:00.000Z");
  return {
    id: "worker-offer-api-1",
    dispatchReviewId: "dispatch-api-1",
    jobRequestId: "job-request-api-1",
    organizationId: "org-api-1",
    residenceId: "residence-api-1",
    departmentId: "department-api-1",
    workerIdentityId: "worker-identity-api-1",
    currentTermsVersionId: "worker-offer-terms-api-1",
    status: "draft",
    expiresAt: new Date("2026-08-12T10:00:00.000Z"),
    approvedAt: null,
    sentAt: null,
    deliveredAt: null,
    viewedAt: null,
    respondedAt: null,
    withdrawnAt: null,
    cancelledAt: null,
    createdByUserId: "admin-api-1",
    updatedByUserId: null,
    approvedByUserId: null,
    sentByUserId: null,
    withdrawnByUserId: null,
    cancelledByUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 2,
    currentTermsVersion: {
      id: "worker-offer-terms-api-1",
      workerOfferId: "worker-offer-api-1",
      versionNumber: 1,
      workerVisibleTitle: "Dinner Chef Coverage",
      workerVisibleSummary: "Worker-visible fixture summary.",
      timezone: "America/Toronto",
      startAt: new Date("2026-08-12T12:00:00.000Z"),
      endAt: new Date("2026-08-12T20:00:00.000Z"),
      workGroupId: "work-group-kitchen",
      roleDefinitionId: "role-chef",
      compensationSummary: "Informational only.",
      policySummary: "No Assignment created.",
      createdByUserId: "admin-api-1",
      createdAt: now
    },
    versionToken: 2
  };
}

function apiAssignment(): Awaited<ReturnType<AssignmentService["createFromAcceptedOffer"]>> {
  const now = new Date("2026-07-25T14:00:00.000Z");
  return {
    id: "assignment-api-1",
    jobRequestId: "job-request-api-1",
    dispatchReviewId: "dispatch-api-1",
    workerOfferId: "worker-offer-api-1",
    workerOfferTermsVersionId: "worker-offer-terms-api-1",
    workerIdentityId: "worker-identity-api-1",
    organizationId: "org-api-1",
    residenceId: "residence-api-1",
    departmentId: "department-api-1",
    workGroupId: "work-group-kitchen",
    roleDefinitionId: "role-chef",
    status: "confirmed",
    confirmedStartAt: new Date("2026-08-12T12:00:00.000Z"),
    confirmedEndAt: new Date("2026-08-12T20:00:00.000Z"),
    timezone: "America/Toronto",
    confirmedTitle: "Dinner Chef Coverage",
    confirmedRoleSummary: "Chef",
    confirmedWorksiteSummary: "Residence operational summary",
    confirmedDepartmentSummary: "Kitchen",
    confirmedResponsibilitySummary: "Worker-visible responsibilities only.",
    confirmedPolicySummary: "Assignment only; Attendance deferred.",
    confirmedCompensationSummary: "Informational worker-facing summary.",
    validationSnapshot: {
      policyVersion: "assignment-foundation-v1",
      attendanceCreated: false,
      workerCalendarCreated: false
    },
    capacityCheckedAt: now,
    conflictCheckedAt: now,
    confirmedAt: now,
    workerAcknowledgedAt: null,
    readyForAttendanceAt: null,
    attendanceWindowStartedAt: null,
    attendanceHandoffAt: null,
    workerWithdrawnAt: null,
    cancelledAt: null,
    replacementRequiredAt: null,
    closedAt: null,
    cancellationReasonCategory: null,
    createdByUserId: "admin-api-1",
    updatedByUserId: null,
    confirmedByUserId: "admin-api-1",
    cancelledByUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 0,
    versionToken: 0,
    attendanceBoundary: "not_started"
  };
}

function apiAttendanceRecord(): Awaited<ReturnType<AttendanceService["createFromAssignment"]>> {
  const now = new Date("2026-07-25T14:00:00.000Z");
  return {
    id: "attendance-api-1",
    assignmentId: "assignment-api-1",
    jobRequestId: "job-request-api-1",
    workerIdentityId: "worker-identity-api-1",
    organizationId: "org-api-1",
    residenceId: "residence-api-1",
    departmentId: "department-api-1",
    workGroupId: "work-group-kitchen",
    roleDefinitionId: "role-chef",
    status: "pending_start",
    scheduledStartAt: new Date("2026-08-12T12:00:00.000Z"),
    scheduledEndAt: new Date("2026-08-12T20:00:00.000Z"),
    timezone: "America/Toronto",
    assignmentStatusSnapshot: "attendance_handoff",
    verificationMethod: "provider_neutral_fixture",
    checkInAt: null,
    checkInMethod: null,
    checkInEvidenceSummary: null,
    checkInLocationPolicyResult: null,
    checkOutAt: null,
    checkOutMethod: null,
    checkOutEvidenceSummary: null,
    checkOutLocationPolicyResult: null,
    exceptionCategory: null,
    supervisorNote: null,
    createdByUserId: "admin-api-1",
    updatedByUserId: null,
    checkedInByUserId: null,
    checkedOutByUserId: null,
    cancelledByUserId: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    cancelledAt: null,
    version: 0,
    versionToken: 0,
    timesheetBoundary: "not_started",
    verificationBoundary: "provider_neutral"
  };
}

function apiTimesheet(): Awaited<ReturnType<TimesheetService["createFromAttendance"]>> {
  const now = new Date("2026-08-12T20:05:00.000Z");
  return {
    id: "timesheet-api-1",
    assignmentId: "assignment-api-1",
    attendanceRecordId: "attendance-api-1",
    jobRequestId: "job-request-api-1",
    workerIdentityId: "worker-identity-api-1",
    organizationId: "org-api-1",
    residenceId: "residence-api-1",
    departmentId: "department-api-1",
    workGroupId: "work-group-kitchen",
    roleDefinitionId: "role-chef",
    status: "draft",
    attendanceVersionSnapshot: 3,
    assignmentVersionSnapshot: 2,
    scheduledStartAt: new Date("2026-08-12T12:00:00.000Z"),
    scheduledEndAt: new Date("2026-08-12T20:00:00.000Z"),
    actualCheckInAt: null,
    actualCheckOutAt: null,
    timezone: "America/Toronto",
    rawElapsedMinutes: null,
    payableMinutes: null,
    billableMinutes: null,
    excludedMinutes: 0,
    breakMinutes: 0,
    premiumCandidateMinutes: 0,
    overtimeCandidateMinutes: 0,
    roundingAdjustmentMinutes: 0,
    exceptionSummary: null,
    workerReviewStatus: "not_started",
    workerReviewedAt: null,
    employerReviewStatus: "not_started",
    employerReviewedAt: null,
    platformReviewStatus: "not_started",
    platformReviewedAt: null,
    approvedAt: null,
    lockedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    correctionReason: null,
    createdByUserId: "admin-api-1",
    updatedByUserId: null,
    workerReviewedByUserId: null,
    employerReviewedByUserId: null,
    platformReviewedByUserId: null,
    lockedByUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 0,
    versionToken: 0,
    attendanceBoundary: "preserved",
    payrollBoundary: "not_started",
    financeBoundary: "not_started",
    calculationBoundary: "time_only_no_money"
  };
}

class ApiMemoryAuthenticationRepository implements AuthenticationRepository {
  private users = new Map<string, StoredAuthenticationUser>();
  private sessions = new Map<string, StoredAuthenticationSession>();
  private emailVerificationCodes = new Map<
    string,
    Awaited<ReturnType<AuthenticationRepository["createEmailVerificationCode"]>>
  >();
  private auditEvents: RecordAuthenticationAuditEventInput[] = [];
  private nextUser = 1;
  private nextSession = 1;
  private nextEmailVerification = 1;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  async findUserByEmailNormalized(emailNormalized: string) {
    return this.users.get(emailNormalized) ?? null;
  }

  async createLocalUser(input: CreateLocalUserInput) {
    const user: StoredAuthenticationUser = {
      id: `00000000-0000-4000-8000-${String(this.nextUser).padStart(12, "0")}`,
      publicId: input.publicId,
      emailNormalized: input.emailNormalized,
      displayName: input.displayName,
      status: "active",
      identities: [
        {
          id: `api-identity-${this.nextUser}`,
          provider: "local_password",
          providerSubject: input.emailNormalized,
          passwordHash: input.passwordHash
        }
      ]
    };

    this.nextUser += 1;
    this.users.set(user.emailNormalized, user);

    return user;
  }

  async createSession(input: CreateSessionInput) {
    const user = [...this.users.values()].find((candidate) => candidate.id === input.userId);

    if (!user) {
      throw new Error("TEST_USER_NOT_FOUND");
    }

    const session: StoredAuthenticationSession = {
      id: `api-session-${this.nextSession}`,
      userId: input.userId,
      sessionHash: input.sessionHash,
      status: "active",
      expiresAt: input.expiresAt,
      lastSeenAt: null,
      revokedAt: null,
      user
    };

    this.nextSession += 1;
    this.sessions.set(session.sessionHash, session);

    return session;
  }

  async findSessionByHash(sessionHash: string) {
    return this.sessions.get(sessionHash) ?? null;
  }

  async updateSession(input: UpdateSessionInput) {
    const session = [...this.sessions.values()].find(
      (candidate) => candidate.id === input.sessionId
    );

    if (!session) return null;

    if (input.status) session.status = input.status;
    if (input.lastSeenAt !== undefined) session.lastSeenAt = input.lastSeenAt;
    if (input.revokedAt !== undefined) session.revokedAt = input.revokedAt;

    return session;
  }

  async createEmailVerificationCode(
    input: Parameters<AuthenticationRepository["createEmailVerificationCode"]>[0]
  ) {
    for (const verification of this.emailVerificationCodes.values()) {
      if (verification.userId === input.userId && verification.consumedAt === null) {
        verification.consumedAt = input.now;
      }
    }
    const verification = {
      id: `api-email-verification-${this.nextEmailVerification++}`,
      userId: input.userId,
      codeHash: input.codeHash,
      attempts: 0,
      expiresAt: input.expiresAt,
      consumedAt: null,
      createdAt: input.now
    };
    this.emailVerificationCodes.set(verification.id, verification);
    return verification;
  }

  async findActiveEmailVerificationCode(userId: string) {
    return (
      [...this.emailVerificationCodes.values()]
        .filter((verification) => verification.userId === userId && !verification.consumedAt)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null
    );
  }

  async incrementEmailVerificationAttempts(
    input: Parameters<AuthenticationRepository["incrementEmailVerificationAttempts"]>[0]
  ) {
    const verification = this.emailVerificationCodes.get(input.verificationId);
    if (
      !verification ||
      verification.consumedAt ||
      verification.attempts !== input.expectedAttempts
    ) {
      return null;
    }
    verification.attempts += 1;
    return verification;
  }

  async consumeEmailVerificationCode(
    input: Parameters<AuthenticationRepository["consumeEmailVerificationCode"]>[0]
  ) {
    const verification = this.emailVerificationCodes.get(input.verificationId);
    if (
      !verification ||
      verification.consumedAt ||
      verification.attempts !== input.expectedAttempts
    ) {
      return null;
    }
    verification.consumedAt = input.now;
    return verification;
  }

  async markEmailVerified(input: Parameters<AuthenticationRepository["markEmailVerified"]>[0]) {
    const user = [...this.users.values()].find((candidate) => candidate.id === input.userId);
    return user ?? null;
  }

  async recordAuthenticationAuditEvent(input: RecordAuthenticationAuditEventInput) {
    this.auditEvents.push(input);
  }

  firstUserId() {
    const user = [...this.users.values()][0];

    if (!user) throw new Error("TEST_USER_NOT_FOUND");

    return user.id;
  }

  lastUserId() {
    const user = [...this.users.values()].at(-1);

    if (!user) throw new Error("TEST_USER_NOT_FOUND");

    return user.id;
  }
}

class ApiMemoryOrganizationMembershipRepository implements OrganizationMembershipRepository {
  private memberships = new Map<string, StoredOrganizationMembership>();
  private nextMembership = 1;

  async listMembershipsForUser(userId: string) {
    return [...this.memberships.values()].filter((membership) => membership.userId === userId);
  }

  async findMembershipById(membershipId: string) {
    return this.memberships.get(membershipId) ?? null;
  }

  async findMembershipForUserByOrganization(userId: string, organizationId: string) {
    return (
      [...this.memberships.values()].find(
        (membership) => membership.userId === userId && membership.organizationId === organizationId
      ) ?? null
    );
  }

  async createMembership(
    input: Parameters<OrganizationMembershipRepository["createMembership"]>[0]
  ) {
    const membership: StoredOrganizationMembership = {
      id: `api-membership-${this.nextMembership}`,
      organizationId: input.organizationId,
      userId: input.userId,
      status: "invited",
      invitedByUserId: input.invitedByUserId,
      createdAt: input.now,
      acceptedAt: null,
      suspendedAt: null,
      revokedAt: null,
      expiredAt: input.expiresAt,
      organization: {
        id: input.organizationId,
        publicId: `org_${input.organizationId}`,
        displayName: "Test Organization",
        status: "active"
      },
      membershipRoles: input.accessRoleKeys.map((roleKey) => ({
        accessRole: { key: roleKey }
      }))
    };

    this.nextMembership += 1;
    this.memberships.set(membership.id, membership);

    return membership;
  }

  async updateMembershipStatus(
    input: Parameters<OrganizationMembershipRepository["updateMembershipStatus"]>[0]
  ) {
    const membership = this.memberships.get(input.membershipId);

    if (!membership) throw new Error("TEST_MEMBERSHIP_NOT_FOUND");

    membership.status = input.status;
    if (input.status === "active") membership.acceptedAt = input.now;
    if (input.status === "suspended") membership.suspendedAt = input.now;
    if (input.status === "revoked") membership.revokedAt = input.now;
    if (input.status === "expired") membership.expiredAt = input.now;

    return membership;
  }

  async replaceMembershipRoles(
    input: Parameters<OrganizationMembershipRepository["replaceMembershipRoles"]>[0]
  ) {
    const membership = this.memberships.get(input.membershipId);

    if (!membership) throw new Error("TEST_MEMBERSHIP_NOT_FOUND");

    membership.membershipRoles = input.accessRoleKeys.map((roleKey) => ({
      accessRole: { key: roleKey }
    }));

    return membership;
  }

  async recordMembershipAuditEvent() {
    return undefined;
  }
}

class ApiMemoryEmployerOrganizationRepository implements EmployerOrganizationRepository {
  private organizations = new Map<string, StoredEmployerOrganization>();
  private organizationAuditEvents: Parameters<
    EmployerOrganizationRepository["recordOrganizationAuditEvent"]
  >[0][] = [];
  private nextOrganization = 1;

  constructor(private readonly membershipRepository: ApiMemoryOrganizationMembershipRepository) {}

  auditEvents() {
    return this.organizationAuditEvents;
  }

  async findOrganizationById(organizationId: string) {
    return this.organizations.get(organizationId) ?? null;
  }

  async findOrganizationByPublicId(publicId: string) {
    return (
      [...this.organizations.values()].find((organization) => organization.publicId === publicId) ??
      null
    );
  }

  async createOrganizationWithOwnerMembership(
    input: Parameters<EmployerOrganizationRepository["createOrganizationWithOwnerMembership"]>[0]
  ) {
    if (
      [...this.organizations.values()].some(
        (organization) => organization.legalName === input.legalName
      )
    ) {
      throw new Error("RWOS_ORGANIZATION_DUPLICATE");
    }

    const organization: StoredEmployerOrganization = {
      id: `00000000-0000-4000-8000-${String(this.nextOrganization).padStart(12, "0")}`,
      publicId: input.publicId,
      legalName: input.legalName,
      displayName: input.displayName,
      status: "active",
      createdByUserId: input.actorUserId,
      reviewedByUserId: null,
      createdAt: input.now,
      updatedAt: input.now,
      restrictedAt: null,
      suspendedAt: null,
      closedAt: null
    };

    this.nextOrganization += 1;
    this.organizations.set(organization.id, organization);

    try {
      const membership = await this.membershipRepository.createMembership({
        organizationId: organization.id,
        userId: input.actorUserId,
        invitedByUserId: input.actorUserId,
        accessRoleKeys: [input.ownerRoleKey],
        expiresAt: null,
        now: input.now
      });
      await this.membershipRepository.updateMembershipStatus({
        membershipId: membership.id,
        status: "active",
        actorUserId: input.actorUserId,
        now: input.now
      });
      const activeMembership = await this.membershipRepository.findMembershipById(membership.id);

      return { organization, membership: activeMembership ?? membership };
    } catch (error) {
      this.organizations.delete(organization.id);
      throw error;
    }
  }

  async updateOrganization(
    input: Parameters<EmployerOrganizationRepository["updateOrganization"]>[0]
  ) {
    const organization = this.organizations.get(input.organizationId);

    if (!organization || organization.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      return null;
    }

    if (input.legalName !== undefined) organization.legalName = input.legalName;
    if (input.displayName !== undefined) organization.displayName = input.displayName;
    organization.updatedAt = new Date(input.now.getTime() + 1);

    return organization;
  }

  async updateOrganizationStatus(
    input: Parameters<EmployerOrganizationRepository["updateOrganizationStatus"]>[0]
  ) {
    const organization = this.organizations.get(input.organizationId);

    if (!organization || organization.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      return null;
    }

    organization.status = input.status;
    organization.updatedAt = new Date(input.now.getTime() + 1);
    if (input.status === "active") organization.suspendedAt = null;
    if (input.status === "suspended") organization.suspendedAt = input.now;
    if (input.status === "closed") organization.closedAt = input.now;

    return organization;
  }

  async recordOrganizationAuditEvent(
    input: Parameters<EmployerOrganizationRepository["recordOrganizationAuditEvent"]>[0]
  ) {
    this.organizationAuditEvents.push(input);
  }
}

class ApiMemoryResidenceRepository implements ResidenceRepository {
  private residences = new Map<string, StoredResidence>();
  private nextResidence = 1;

  async findResidenceById(residenceId: string) {
    return this.residences.get(residenceId) ?? null;
  }

  async listResidencesByOrganization(
    input: Parameters<ResidenceRepository["listResidencesByOrganization"]>[0]
  ) {
    return [...this.residences.values()]
      .filter(
        (residence) =>
          residence.organizationId === input.organizationId &&
          (!input.status || residence.status === input.status)
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async createResidence(input: Parameters<ResidenceRepository["createResidence"]>[0]) {
    const residence: StoredResidence = {
      id: `api-residence-${this.nextResidence}`,
      publicId: input.publicId,
      organizationId: input.organizationId,
      name: input.name,
      status: "active",
      addressSummary: input.addressSummary,
      city: input.city,
      region: input.region,
      country: input.country,
      createdByUserId: input.actorUserId,
      createdAt: input.now,
      updatedAt: input.now,
      archivedAt: null
    };

    this.nextResidence += 1;
    this.residences.set(residence.id, residence);
    await this.recordResidenceAuditEvent({
      action: "residence.created",
      organizationId: residence.organizationId,
      residenceId: residence.id,
      actorUserId: input.actorUserId,
      priorState: null,
      newState: residence.status,
      reason: null,
      correlationId: input.correlationId,
      createdAt: input.now
    });

    return residence;
  }

  async updateResidence(input: Parameters<ResidenceRepository["updateResidence"]>[0]) {
    const residence = this.residences.get(input.residenceId);

    if (
      !residence ||
      residence.organizationId !== input.organizationId ||
      residence.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
    ) {
      return null;
    }

    if (input.name !== undefined) residence.name = input.name;
    if (input.addressSummary !== undefined) residence.addressSummary = input.addressSummary;
    if (input.city !== undefined) residence.city = input.city;
    if (input.region !== undefined) residence.region = input.region;
    if (input.country !== undefined) residence.country = input.country;
    residence.updatedAt = new Date(input.now.getTime() + 1);

    return residence;
  }

  async updateResidenceStatus(input: Parameters<ResidenceRepository["updateResidenceStatus"]>[0]) {
    const residence = this.residences.get(input.residenceId);

    if (
      !residence ||
      residence.organizationId !== input.organizationId ||
      residence.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
    ) {
      return null;
    }

    residence.status = input.status;
    residence.archivedAt =
      input.status === "closed"
        ? input.now
        : input.status === "active"
          ? null
          : residence.archivedAt;
    residence.updatedAt = new Date(input.now.getTime() + 1);

    return residence;
  }

  async recordResidenceAuditEvent(
    input: Parameters<ResidenceRepository["recordResidenceAuditEvent"]>[0]
  ) {
    void input;

    return undefined;
  }
}

class ApiMemoryDepartmentRepository implements DepartmentRepository {
  private departments = new Map<string, StoredDepartment>();
  private nextDepartment = 1;

  async findDepartmentById(departmentId: string) {
    return this.departments.get(departmentId) ?? null;
  }

  async listDepartmentsByResidence(
    input: Parameters<DepartmentRepository["listDepartmentsByResidence"]>[0]
  ) {
    return [...this.departments.values()]
      .filter(
        (department) =>
          department.organizationId === input.organizationId &&
          department.residenceId === input.residenceId &&
          (!input.status || department.status === input.status)
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async createDepartment(input: Parameters<DepartmentRepository["createDepartment"]>[0]) {
    const department: StoredDepartment = {
      id: `api-department-${this.nextDepartment}`,
      publicId: input.publicId,
      organizationId: input.organizationId,
      residenceId: input.residenceId,
      name: input.name,
      status: "active",
      createdByUserId: input.actorUserId,
      createdAt: input.now,
      updatedAt: input.now,
      archivedAt: null
    };

    this.nextDepartment += 1;
    this.departments.set(department.id, department);
    await this.recordDepartmentAuditEvent({
      action: "department.created",
      organizationId: department.organizationId,
      residenceId: department.residenceId,
      departmentId: department.id,
      actorUserId: input.actorUserId,
      priorState: null,
      newState: department.status,
      reason: null,
      correlationId: input.correlationId,
      createdAt: input.now
    });

    return department;
  }

  async updateDepartment(input: Parameters<DepartmentRepository["updateDepartment"]>[0]) {
    const department = this.departments.get(input.departmentId);

    if (
      !department ||
      department.organizationId !== input.organizationId ||
      department.residenceId !== input.residenceId ||
      department.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
    ) {
      return null;
    }

    if (input.name !== undefined) department.name = input.name;
    department.updatedAt = new Date(input.now.getTime() + 1);

    return department;
  }

  async updateDepartmentStatus(
    input: Parameters<DepartmentRepository["updateDepartmentStatus"]>[0]
  ) {
    const department = this.departments.get(input.departmentId);

    if (
      !department ||
      department.organizationId !== input.organizationId ||
      department.residenceId !== input.residenceId ||
      department.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
    ) {
      return null;
    }

    department.status = input.status;
    department.archivedAt =
      input.status === "closed"
        ? input.now
        : input.status === "active"
          ? null
          : department.archivedAt;
    department.updatedAt = new Date(input.now.getTime() + 1);

    return department;
  }

  async recordDepartmentAuditEvent(
    input: Parameters<DepartmentRepository["recordDepartmentAuditEvent"]>[0]
  ) {
    void input;

    return undefined;
  }
}

class ApiMemoryWorkGroupRepository implements WorkGroupRepository {
  private workGroups = new Map<string, StoredWorkGroup>();

  constructor() {
    const createdAt = new Date("2026-07-25T08:00:00.000Z");
    for (const workGroup of [
      ["api-work-group-1", "kitchen", "Kitchen", 10, "utensils"],
      ["api-work-group-2", "care_nursing", "Care / Nursing", 20, "heart-pulse"],
      ["api-work-group-3", "housekeeping_support", "Housekeeping / Support", 30, "sparkles"],
      ["api-work-group-4", "maintenance", "Maintenance", 40, "wrench"]
    ] as const) {
      this.workGroups.set(workGroup[0], {
        id: workGroup[0],
        key: workGroup[1],
        displayLabel: workGroup[2],
        status: "active",
        displayOrder: workGroup[3],
        iconKey: workGroup[4],
        qualificationSummary: null,
        safetyRequirementSummary: null,
        defaultTemplateKey: null,
        createdAt,
        updatedAt: createdAt
      });
    }
  }

  async findWorkGroupById(workGroupId: string) {
    return this.workGroups.get(workGroupId) ?? null;
  }

  async findWorkGroupByKey(key: string) {
    return [...this.workGroups.values()].find((workGroup) => workGroup.key === key) ?? null;
  }

  async listWorkGroups(input: Parameters<WorkGroupRepository["listWorkGroups"]>[0]) {
    return [...this.workGroups.values()]
      .filter((workGroup) => input.includeInactive || workGroup.status === "active")
      .sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.displayLabel.localeCompare(right.displayLabel) ||
          left.key.localeCompare(right.key)
      );
  }

  async updateWorkGroup(input: Parameters<WorkGroupRepository["updateWorkGroup"]>[0]) {
    const workGroup = this.workGroups.get(input.workGroupId);

    if (!workGroup || workGroup.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      return null;
    }

    if (input.displayLabel !== undefined) workGroup.displayLabel = input.displayLabel;
    if (input.displayOrder !== undefined) workGroup.displayOrder = input.displayOrder;
    if (input.iconKey !== undefined) workGroup.iconKey = input.iconKey;
    workGroup.updatedAt = new Date(input.now.getTime() + 1);

    return workGroup;
  }

  async updateWorkGroupStatus(input: Parameters<WorkGroupRepository["updateWorkGroupStatus"]>[0]) {
    const workGroup = this.workGroups.get(input.workGroupId);

    if (!workGroup || workGroup.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      return null;
    }

    workGroup.status = input.status;
    workGroup.updatedAt = new Date(input.now.getTime() + 1);

    return workGroup;
  }

  async recordWorkGroupAuditEvent(
    input: Parameters<WorkGroupRepository["recordWorkGroupAuditEvent"]>[0]
  ) {
    void input;

    return undefined;
  }
}

class ApiMemoryRoleDefinitionRepository implements RoleDefinitionRepository {
  private workGroups = new Map<string, StoredWorkGroup>();
  private roleDefinitions = new Map<string, StoredRoleDefinition>();

  constructor() {
    const createdAt = new Date("2026-07-25T08:00:00.000Z");
    for (const workGroup of [
      ["api-work-group-1", "kitchen", "Kitchen", 10],
      ["api-work-group-2", "care_nursing", "Care / Nursing", 20]
    ] as const) {
      this.workGroups.set(workGroup[1], {
        id: workGroup[0],
        key: workGroup[1],
        displayLabel: workGroup[2],
        status: "active",
        displayOrder: workGroup[3],
        iconKey: null,
        qualificationSummary: null,
        safetyRequirementSummary: null,
        defaultTemplateKey: null,
        createdAt,
        updatedAt: createdAt
      });
    }

    for (const role of [
      ["api-role-1", "kitchen", "chef", "Chef", 10],
      ["api-role-2", "kitchen", "sous_chef", "Sous-chef", 20],
      ["api-role-3", "kitchen", "cook", "Cook", 30],
      ["api-role-4", "kitchen", "kitchen_helper", "Kitchen helper", 40],
      ["api-role-5", "kitchen", "dishwasher", "Dishwasher", 50],
      ["api-role-6", "care_nursing", "nurse", "Nurse", 10],
      ["api-role-7", "care_nursing", "licensed_practical_nurse", "Licensed practical nurse", 20],
      ["api-role-8", "care_nursing", "personal_support_worker", "Personal support worker", 30],
      ["api-role-9", "care_nursing", "care_aide", "Care aide", 40]
    ] as const) {
      const workGroup = this.workGroups.get(role[1]);
      if (!workGroup) throw new Error("TEST_WORK_GROUP_NOT_FOUND");

      this.roleDefinitions.set(role[2], {
        id: role[0],
        workGroupId: workGroup.id,
        key: role[2],
        displayLabel: role[3],
        status: "active",
        displayOrder: role[4],
        localizedLabelKey: `role.${role[2]}`,
        qualificationSummary: null,
        safetyRequirementSummary: null,
        adminConfigurable: false,
        createdAt,
        updatedAt: createdAt,
        workGroup
      });
    }
  }

  async findRoleDefinitionById(roleDefinitionId: string) {
    return (
      [...this.roleDefinitions.values()].find(
        (roleDefinition) => roleDefinition.id === roleDefinitionId
      ) ?? null
    );
  }

  async findRoleDefinitionByKey(key: string) {
    return this.roleDefinitions.get(key) ?? null;
  }

  async listRoleDefinitions(input: Parameters<RoleDefinitionRepository["listRoleDefinitions"]>[0]) {
    return [...this.roleDefinitions.values()]
      .filter((roleDefinition) => input.includeInactive || roleDefinition.status === "active")
      .filter(
        (roleDefinition) =>
          !input.workGroupKey || roleDefinition.workGroup.key === input.workGroupKey
      )
      .sort(
        (left, right) =>
          left.workGroup.displayOrder - right.workGroup.displayOrder ||
          left.displayOrder - right.displayOrder ||
          left.displayLabel.localeCompare(right.displayLabel) ||
          left.key.localeCompare(right.key)
      );
  }

  async updateRoleDefinition(
    input: Parameters<RoleDefinitionRepository["updateRoleDefinition"]>[0]
  ) {
    const roleDefinition = [...this.roleDefinitions.values()].find(
      (candidate) => candidate.id === input.roleDefinitionId
    );
    if (!roleDefinition || roleDefinition.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
      return null;

    if (input.displayLabel !== undefined) roleDefinition.displayLabel = input.displayLabel;
    if (input.displayOrder !== undefined) roleDefinition.displayOrder = input.displayOrder;
    if (input.localizedLabelKey !== undefined)
      roleDefinition.localizedLabelKey = input.localizedLabelKey;
    if (input.qualificationSummary !== undefined)
      roleDefinition.qualificationSummary = input.qualificationSummary;
    if (input.safetyRequirementSummary !== undefined)
      roleDefinition.safetyRequirementSummary = input.safetyRequirementSummary;
    roleDefinition.updatedAt = new Date(input.now.getTime() + 1);

    return roleDefinition;
  }

  async updateRoleDefinitionStatus(
    input: Parameters<RoleDefinitionRepository["updateRoleDefinitionStatus"]>[0]
  ) {
    const roleDefinition = [...this.roleDefinitions.values()].find(
      (candidate) => candidate.id === input.roleDefinitionId
    );
    if (!roleDefinition || roleDefinition.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
      return null;

    roleDefinition.status = input.status;
    roleDefinition.updatedAt = new Date(input.now.getTime() + 1);

    return roleDefinition;
  }

  async recordRoleDefinitionAuditEvent(
    input: Parameters<RoleDefinitionRepository["recordRoleDefinitionAuditEvent"]>[0]
  ) {
    void input;

    return undefined;
  }
}

class ApiMemoryJobRequestRepository implements JobRequestRepository {
  private jobRequests = new Map<string, StoredJobRequest>();
  private sequences = new Map<number, number>();
  private nextJobRequest = 1;

  async createDraft(input: Parameters<JobRequestRepository["createDraft"]>[0]) {
    const year = input.now.getUTCFullYear();
    const nextSequence = (this.sequences.get(year) ?? 0) + 1;
    this.sequences.set(year, nextSequence);
    const jobRequest: StoredJobRequest = {
      id: `job-request-api-${this.nextJobRequest}`,
      jobRequestNumber: `JR-${year}-${String(nextSequence).padStart(6, "0")}`,
      organizationId: input.organizationId,
      residenceId: input.residenceId,
      departmentId: input.departmentId,
      workGroupId: input.workGroupId,
      roleDefinitionId: input.roleDefinitionId,
      creatorUserId: input.actorUserId,
      title: input.title,
      description: input.description,
      numberOfWorkers: input.numberOfWorkers,
      urgency: input.urgency,
      requestType: input.requestType,
      timezone: input.timezone,
      startAt: input.startAt,
      endAt: input.endAt,
      isMultiDay: input.isMultiDay,
      hasRecurringIntent: input.hasRecurringIntent,
      status: "draft",
      adminReviewReason: null,
      version: 0,
      createdByUserId: input.actorUserId,
      updatedByUserId: null,
      createdAt: input.now,
      updatedAt: input.now,
      submittedAt: null,
      cancelledAt: null,
      expiredAt: null,
      archivedAt: null
    };

    this.nextJobRequest += 1;
    this.jobRequests.set(jobRequest.id, jobRequest);
    await this.recordJobRequestAuditEvent({
      action: "job_request.created",
      organizationId: jobRequest.organizationId,
      jobRequestId: jobRequest.id,
      jobRequestNumber: jobRequest.jobRequestNumber,
      actorUserId: input.actorUserId,
      priorState: null,
      newState: jobRequest.status,
      reason: null,
      correlationId: input.correlationId,
      createdAt: input.now
    });

    return jobRequest;
  }

  async findJobRequestById(jobRequestId: string) {
    return this.jobRequests.get(jobRequestId) ?? null;
  }

  async findJobRequestByNumber(jobRequestNumber: string) {
    return (
      [...this.jobRequests.values()].find(
        (jobRequest) => jobRequest.jobRequestNumber === jobRequestNumber
      ) ?? null
    );
  }

  async listJobRequests(input: Parameters<JobRequestRepository["listJobRequests"]>[0]) {
    return [...this.jobRequests.values()]
      .filter(
        (jobRequest) => !input.organizationId || jobRequest.organizationId === input.organizationId
      )
      .filter((jobRequest) => !input.residenceId || jobRequest.residenceId === input.residenceId)
      .filter((jobRequest) => !input.departmentId || jobRequest.departmentId === input.departmentId)
      .filter((jobRequest) => !input.statuses || input.statuses.includes(jobRequest.status))
      .sort(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() ||
          right.jobRequestNumber.localeCompare(left.jobRequestNumber)
      );
  }

  async updateDraft(input: Parameters<JobRequestRepository["updateDraft"]>[0]) {
    const jobRequest = this.jobRequests.get(input.jobRequestId);
    if (!jobRequest || jobRequest.version !== input.expectedVersion) return null;

    if (input.residenceId !== undefined) jobRequest.residenceId = input.residenceId;
    if (input.departmentId !== undefined) jobRequest.departmentId = input.departmentId;
    if (input.workGroupId !== undefined) jobRequest.workGroupId = input.workGroupId;
    if (input.roleDefinitionId !== undefined) jobRequest.roleDefinitionId = input.roleDefinitionId;
    if (input.title !== undefined) jobRequest.title = input.title;
    if (input.description !== undefined) jobRequest.description = input.description;
    if (input.numberOfWorkers !== undefined) jobRequest.numberOfWorkers = input.numberOfWorkers;
    if (input.urgency !== undefined) jobRequest.urgency = input.urgency;
    if (input.requestType !== undefined) jobRequest.requestType = input.requestType;
    if (input.timezone !== undefined) jobRequest.timezone = input.timezone;
    if (input.startAt !== undefined) jobRequest.startAt = input.startAt;
    if (input.endAt !== undefined) jobRequest.endAt = input.endAt;
    if (input.isMultiDay !== undefined) jobRequest.isMultiDay = input.isMultiDay;
    if (input.hasRecurringIntent !== undefined)
      jobRequest.hasRecurringIntent = input.hasRecurringIntent;
    jobRequest.updatedByUserId = input.actorUserId;
    jobRequest.updatedAt = input.now;
    jobRequest.version += 1;

    return jobRequest;
  }

  async transitionJobRequest(input: Parameters<JobRequestRepository["transitionJobRequest"]>[0]) {
    const jobRequest = this.jobRequests.get(input.jobRequestId);
    if (!jobRequest || jobRequest.version !== input.expectedVersion) return null;

    jobRequest.status = input.status;
    if (input.adminReviewReason !== undefined)
      jobRequest.adminReviewReason = input.adminReviewReason;
    jobRequest.updatedByUserId = input.actorUserId;
    jobRequest.updatedAt = input.now;
    if (input.status === "submitted") jobRequest.submittedAt = input.now;
    if (input.status === "cancelled") jobRequest.cancelledAt = input.now;
    if (input.status === "expired") jobRequest.expiredAt = input.now;
    if (input.status === "archived") jobRequest.archivedAt = input.now;
    jobRequest.version += 1;

    return jobRequest;
  }

  async recordJobRequestAuditEvent(
    input: Parameters<JobRequestRepository["recordJobRequestAuditEvent"]>[0]
  ) {
    void input;
  }
}

function testAuthOptions() {
  let nextToken = 1;

  return {
    passwordHashOptions: {
      costFactor: 1_024,
      blockSize: 8,
      parallelization: 1,
      keyLength: 32,
      saltLength: 8
    },
    randomToken: () => `api-session-token-${String(nextToken++).padStart(21, "0")}`
  };
}

function productionEnv() {
  return {
    RWOS_ENV: "production",
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://database.example.test/rwos",
    INTERNAL_API_ORIGIN: "https://api.example.test",
    AUTH_RATE_LIMITER_ORIGIN: "https://rate-limit.example.test",
    AUTH_RATE_LIMITER_TOKEN: "test-rate-limiter-token-at-least-32-characters",
    AUTH_RATE_LIMITER_KEY_SECRET: "test-key-secret-that-is-at-least-32-characters",
    AUTH_RATE_LIMITER_KEY_ID: "key-current",
    AUTH_RATE_LIMITER_NAMESPACE: "rwos:authrl:production:v1"
  };
}

async function registerApiUser(app: ReturnType<typeof buildApi>) {
  const response = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      email: "Employer@Example.com",
      password: "ValidPassword123",
      displayName: "Example Employer"
    }
  });

  return response.json() as { token: string };
}

function buildResidenceApi() {
  const authRepository = new ApiMemoryAuthenticationRepository();
  const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
  const membershipService = createOrganizationMembershipService(membershipRepository);
  const authorizationService = createAuthorizationService();
  const organizationRepository = new ApiMemoryEmployerOrganizationRepository(membershipRepository);
  const organizationService = createEmployerOrganizationService(
    organizationRepository,
    membershipService,
    authorizationService
  );
  const residenceService = createResidenceService(
    new ApiMemoryResidenceRepository(),
    organizationRepository,
    membershipService,
    authorizationService
  );
  const app = buildApi({
    authService: createAuthenticationService(authRepository, testAuthOptions()),
    membershipService,
    organizationService,
    residenceService
  });

  return { app, authRepository };
}

function buildDepartmentApi() {
  const authRepository = new ApiMemoryAuthenticationRepository();
  const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
  const membershipService = createOrganizationMembershipService(membershipRepository);
  const authorizationService = createAuthorizationService();
  const organizationRepository = new ApiMemoryEmployerOrganizationRepository(membershipRepository);
  const organizationService = createEmployerOrganizationService(
    organizationRepository,
    membershipService,
    authorizationService
  );
  const residenceRepository = new ApiMemoryResidenceRepository();
  const residenceService = createResidenceService(
    residenceRepository,
    organizationRepository,
    membershipService,
    authorizationService
  );
  const departmentService = createDepartmentService(
    new ApiMemoryDepartmentRepository(),
    residenceRepository,
    organizationRepository,
    membershipService,
    authorizationService
  );
  const app = buildApi({
    authService: createAuthenticationService(authRepository, testAuthOptions()),
    membershipService,
    organizationService,
    residenceService,
    departmentService
  });

  return { app, authRepository };
}

function buildWorkGroupApi() {
  const authRepository = new ApiMemoryAuthenticationRepository();
  const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
  const membershipService = createOrganizationMembershipService(membershipRepository);
  const authorizationService = createAuthorizationService();
  const organizationRepository = new ApiMemoryEmployerOrganizationRepository(membershipRepository);
  const organizationService = createEmployerOrganizationService(
    organizationRepository,
    membershipService,
    authorizationService
  );
  const platformAdminUserIds = new Set<string>();
  const app = buildApi({
    authService: createAuthenticationService(authRepository, testAuthOptions()),
    membershipService,
    organizationService,
    workGroupService: createWorkGroupService(
      new ApiMemoryWorkGroupRepository(),
      authorizationService
    ),
    resolveAuthorizationRoles: (userId) =>
      platformAdminUserIds.has(userId) ? ["PLATFORM_ADMINISTRATOR"] : []
  });

  return {
    app,
    authRepository,
    grantPlatformAdmin: (userId: string) => platformAdminUserIds.add(userId)
  };
}

function buildRoleDefinitionApi() {
  const authRepository = new ApiMemoryAuthenticationRepository();
  const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
  const membershipService = createOrganizationMembershipService(membershipRepository);
  const authorizationService = createAuthorizationService();
  const organizationRepository = new ApiMemoryEmployerOrganizationRepository(membershipRepository);
  const organizationService = createEmployerOrganizationService(
    organizationRepository,
    membershipService,
    authorizationService
  );
  const platformAdminUserIds = new Set<string>();
  const app = buildApi({
    authService: createAuthenticationService(authRepository, testAuthOptions()),
    membershipService,
    organizationService,
    roleDefinitionService: createRoleDefinitionService(
      new ApiMemoryRoleDefinitionRepository(),
      authorizationService
    ),
    resolveAuthorizationRoles: (userId) =>
      platformAdminUserIds.has(userId) ? ["PLATFORM_ADMINISTRATOR"] : []
  });

  return {
    app,
    authRepository,
    grantPlatformAdmin: (userId: string) => platformAdminUserIds.add(userId)
  };
}

function buildJobRequestApi() {
  const authRepository = new ApiMemoryAuthenticationRepository();
  const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
  const membershipService = createOrganizationMembershipService(membershipRepository);
  const authorizationService = createAuthorizationService();
  const organizationRepository = new ApiMemoryEmployerOrganizationRepository(membershipRepository);
  const residenceRepository = new ApiMemoryResidenceRepository();
  const departmentRepository = new ApiMemoryDepartmentRepository();
  const platformAdminUserIds = new Set<string>();
  const organizationService = createEmployerOrganizationService(
    organizationRepository,
    membershipService,
    authorizationService
  );
  const residenceService = createResidenceService(
    residenceRepository,
    organizationRepository,
    membershipService,
    authorizationService
  );
  const departmentService = createDepartmentService(
    departmentRepository,
    residenceRepository,
    organizationRepository,
    membershipService,
    authorizationService
  );
  const jobRequestService = createJobRequestService(
    new ApiMemoryJobRequestRepository(),
    organizationRepository,
    residenceRepository,
    departmentRepository,
    new ApiMemoryWorkGroupRepository(),
    new ApiMemoryRoleDefinitionRepository(),
    membershipService,
    authorizationService
  );
  const app = buildApi({
    authService: createAuthenticationService(authRepository, testAuthOptions()),
    membershipService,
    organizationService,
    residenceService,
    departmentService,
    jobRequestService,
    resolveAuthorizationRoles: (userId) =>
      platformAdminUserIds.has(userId) ? ["PLATFORM_ADMINISTRATOR"] : []
  });

  return {
    app,
    authRepository,
    grantPlatformAdmin: (userId: string) => platformAdminUserIds.add(userId)
  };
}

async function createApiOrganization(
  app: ReturnType<typeof buildApi>,
  token: string,
  legalName: string
) {
  const response = await app.inject({
    method: "POST",
    url: "/organizations",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      legalName,
      displayName: legalName
    }
  });

  expect(response.statusCode).toBe(201);

  return response.json().organization as { id: string; version: string };
}

async function createApiResidence(
  app: ReturnType<typeof buildApi>,
  token: string,
  organizationId: string,
  name: string
) {
  const response = await app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/residences`,
    headers: { authorization: `Bearer ${token}` },
    payload: { name }
  });

  expect(response.statusCode).toBe(201);

  return response.json().residence as { id: string; version: string };
}

async function createApiDepartment(
  app: ReturnType<typeof buildApi>,
  token: string,
  organizationId: string,
  residenceId: string,
  name: string
) {
  const response = await app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/residences/${residenceId}/departments`,
    headers: { authorization: `Bearer ${token}` },
    payload: { name }
  });

  expect(response.statusCode).toBe(201);

  return response.json().department as { id: string; version: string };
}

function apiInviteInput(userId: string): InviteMembershipInput {
  return {
    organizationId: "org-api-1",
    userId,
    invitedByUserId: userId,
    accessRoleKeys: ["ORGANIZATION_OWNER"]
  };
}
