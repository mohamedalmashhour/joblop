import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  AuthenticationRequiredError,
  PasswordPolicyError,
  RegistrationUnavailableError,
  authorizationDeniedCode,
  authorizationDeniedMessage,
  authorizationRoleDefinitions,
  createAuthorizationService,
  createAuthenticationService,
  hashPassword,
  hashSessionToken,
  toSafeAuthorizationResponse,
  verifyPassword
} from "./index";
import type {
  AuthorizationAuditEventInput,
  AuthenticationRepository,
  CreateLocalUserInput,
  CreateSessionInput,
  RecordAuthenticationAuditEventInput,
  StoredAuthenticationSession,
  StoredAuthenticationUser,
  UpdateSessionInput
} from "./index";

const passwordHashOptions = {
  costFactor: 1_024,
  blockSize: 8,
  parallelization: 1,
  keyLength: 32,
  saltLength: 8
};

describe("authentication password foundation", () => {
  it("hashes passwords without storing plaintext and verifies timing-safe matches", async () => {
    const password = "ValidPassword123";
    const encoded = await hashPassword(password, passwordHashOptions);

    expect(encoded).toContain("scrypt:v1");
    expect(encoded).not.toContain(password);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword123", encoded)).resolves.toBe(false);
  });

  it("rejects passwords outside the registration policy", async () => {
    await expect(hashPassword("short1", passwordHashOptions)).rejects.toBeInstanceOf(PasswordPolicyError);
  });
});

describe("authentication service foundation", () => {
  it("registers a user, creates a session, and records an audit event", async () => {
    const repository = new MemoryAuthenticationRepository();
    const service = createTestAuthenticationService(repository);

    const result = await service.register({
      email: "WORKER@Example.COM",
      password: "ValidPassword123",
      displayName: "Test Worker"
    });

    expect(result.user.emailNormalized).toBe("worker@example.com");
    expect(result.user.status).toBe("active");
    expect(result.token).toBe("session-token-000000000000000000000001");
    expect(repository.auditActions()).toContain("auth.registration");
  });

  it("blocks duplicate registration without exposing account details", async () => {
    const repository = new MemoryAuthenticationRepository();
    const service = createTestAuthenticationService(repository);

    await service.register({ email: "person@example.com", password: "ValidPassword123" });

    await expect(
      service.register({ email: "PERSON@example.com", password: "AnotherPassword123" })
    ).rejects.toBeInstanceOf(RegistrationUnavailableError);
    expect(repository.auditActions().filter((action) => action === "auth.registration")).toHaveLength(2);
  });

  it("signs in with valid credentials and does not reveal failed-login causes", async () => {
    const repository = new MemoryAuthenticationRepository();
    const service = createTestAuthenticationService(repository);
    await service.register({ email: "sign-in@example.com", password: "ValidPassword123" });

    const result = await service.signIn({ email: "sign-in@example.com", password: "ValidPassword123" });
    await expect(
      service.signIn({ email: "sign-in@example.com", password: "WrongPassword123" })
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      service.signIn({ email: "missing@example.com", password: "WrongPassword123" })
    ).rejects.toBeInstanceOf(AuthenticationError);

    expect(result.session.userId).toBe(result.user.id);
    expect(repository.auditActions()).toContain("auth.login_success");
    expect(repository.auditActions().filter((action) => action === "auth.login_failed")).toHaveLength(2);
  });

  it("blocks disabled and closed accounts with generic authentication errors", async () => {
    const repository = new MemoryAuthenticationRepository();
    const service = createTestAuthenticationService(repository);
    const disabled = await service.register({ email: "disabled@example.com", password: "ValidPassword123" });
    const closed = await service.register({ email: "closed@example.com", password: "ValidPassword123" });

    repository.setUserStatus(disabled.user.id, "disabled");
    repository.setUserStatus(closed.user.id, "closed");

    await expect(
      service.signIn({ email: "disabled@example.com", password: "ValidPassword123" })
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(service.signIn({ email: "closed@example.com", password: "ValidPassword123" })).rejects.toBeInstanceOf(
      AuthenticationError
    );

    expect(repository.auditActions()).toContain("auth.account_disabled");
    expect(repository.auditActions()).toContain("auth.account_closed");
  });

  it("validates, expires, revokes, and logs out sessions server-side", async () => {
    let currentTime = new Date("2026-07-25T05:00:00.000Z");
    const repository = new MemoryAuthenticationRepository();
    const service = createAuthenticationService(repository, {
      passwordHashOptions,
      sessionTtlSeconds: 60,
      randomToken: () => "session-token-000000000000000000000001",
      now: () => currentTime
    });
    const registration = await service.register({
      email: "session@example.com",
      password: "ValidPassword123"
    });

    await expect(service.validateSession(registration.token)).resolves.toMatchObject({ authenticated: true });

    currentTime = new Date("2026-07-25T05:02:00.000Z");
    await expect(service.validateSession(registration.token)).resolves.toMatchObject({ authenticated: false });
    expect(repository.auditActions()).toContain("auth.session_expired");

    const signIn = await service.signIn({ email: "session@example.com", password: "ValidPassword123" });
    await expect(service.revokeSession({ token: signIn.token, reason: "logout" })).resolves.toEqual({ revoked: true });
    await expect(service.validateSession(signIn.token)).resolves.toMatchObject({ authenticated: false });
    expect(repository.auditActions()).toContain("auth.logout");

    const secondSignIn = await service.signIn({ email: "session@example.com", password: "ValidPassword123" });
    await expect(service.revokeSession({ token: secondSignIn.token })).resolves.toEqual({ revoked: true });
    expect(repository.auditActions()).toContain("auth.session_revoked");
  });

  it("enforces the authentication boundary before protected work", () => {
    const repository = new MemoryAuthenticationRepository();
    const service = createTestAuthenticationService(repository);

    expect(() =>
      service.requireAuthenticatedSession({
        authenticated: false,
        user: null,
        session: null
      })
    ).toThrow(AuthenticationRequiredError);
  });
});

function createTestAuthenticationService(repository: AuthenticationRepository) {
  return createAuthenticationService(repository, {
    passwordHashOptions,
    randomToken: () => "session-token-000000000000000000000001"
  });
}

class MemoryAuthenticationRepository implements AuthenticationRepository {
  private users = new Map<string, StoredAuthenticationUser>();
  private sessions = new Map<string, StoredAuthenticationSession>();
  private auditEvents: RecordAuthenticationAuditEventInput[] = [];
  private nextUser = 1;
  private nextIdentity = 1;
  private nextSession = 1;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  setUserStatus(userId: string, status: StoredAuthenticationUser["status"]) {
    const user = [...this.users.values()].find((candidate) => candidate.id === userId);
    if (user) {
      user.status = status;
    }
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
          id: `identity-${this.nextIdentity}`,
          provider: "local_password",
          providerSubject: input.emailNormalized,
          passwordHash: input.passwordHash
        }
      ]
    };

    this.nextUser += 1;
    this.nextIdentity += 1;
    this.users.set(user.emailNormalized, user);

    return user;
  }

  async createSession(input: CreateSessionInput) {
    const user = [...this.users.values()].find((candidate) => candidate.id === input.userId);

    if (!user) {
      throw new Error("TEST_USER_NOT_FOUND");
    }

    const session: StoredAuthenticationSession = {
      id: `session-${this.nextSession}`,
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
    const session = [...this.sessions.values()].find((candidate) => candidate.id === input.sessionId);

    if (!session) {
      return null;
    }

    if (input.status) session.status = input.status;
    if (input.lastSeenAt !== undefined) session.lastSeenAt = input.lastSeenAt;
    if (input.revokedAt !== undefined) session.revokedAt = input.revokedAt;

    return session;
  }

  async recordAuthenticationAuditEvent(input: RecordAuthenticationAuditEventInput) {
    this.auditEvents.push(input);
  }
}

describe("session token hashing", () => {
  it("stores a hash instead of the bearer token", () => {
    const token = "session-token-000000000000000000000001";

    expect(hashSessionToken(token)).not.toBe(token);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });
});

describe("authorization foundation", () => {
  it("denies no role, unknown permission, and missing required context", async () => {
    const service = createAuthorizationService();
    const session = activeSession();

    await expect(
      service.decide({
        session,
        permission: "platform.supervise",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({ status: "permission_missing", allow: false, internalReason: "no_role" });

    await expect(
      service.decide({
        session,
        roles: ["PLATFORM_ADMINISTRATOR"],
        permission: "unknown.permission",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({ status: "permission_missing", allow: false, internalReason: "unknown_permission" });

    await expect(
      service.decide({
        session,
        roles: ["ORGANIZATION_OWNER"],
        permission: "organization.read"
      })
    ).resolves.toMatchObject({
      status: "context_required",
      allow: false,
      internalReason: "organization_context_required"
    });
  });

  it("denies invalid, expired, revoked, disabled, and closed sessions", async () => {
    const service = createAuthorizationService();

    await expect(
      service.decide({
        session: { authenticated: false, user: null, session: null },
        roles: ["PLATFORM_ADMINISTRATOR"],
        permission: "platform.supervise",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({ status: "session_invalid" });

    for (const status of ["disabled", "closed"] as const) {
      await expect(
        service.decide({
          session: activeSession({ userStatus: status }),
          roles: ["PLATFORM_ADMINISTRATOR"],
          permission: "platform.supervise",
          platformContext: { platform: true }
        })
      ).resolves.toMatchObject({ status: "account_inactive", internalReason: `account_${status}` });
    }
  });

  it("allows only explicit Platform Administrator for platform supervision", async () => {
    const service = createAuthorizationService();

    await expect(
      service.decide({
        session: activeSession(),
        roles: ["PLATFORM_ADMINISTRATOR"],
        permission: "platform.supervise",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({ status: "allow", allow: true });

    await expect(
      service.decide({
        session: activeSession(),
        roles: ["ORGANIZATION_OWNER"],
        permission: "platform.supervise",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({ status: "permission_missing", internalReason: "role_lacks_permission" });
  });

  it("denies worker access for organization management and keeps staff permissions limited", async () => {
    const service = createAuthorizationService();

    await expect(
      service.decide({
        session: activeSession(),
        roles: ["WORKER_ACCESS"],
        permission: "organization.update",
        resourceContext: { organizationId: "org_123" }
      })
    ).resolves.toMatchObject({ status: "permission_missing", internalReason: "role_lacks_permission" });

    expect(service.rolePermissions("ORGANIZATION_STAFF")).toEqual([
      "organization.read",
      "residence.read",
      "department.read",
      "work_group.read",
      "role_definition.read",
      "job_request.create",
      "job_request.read",
      "job_request.update_draft",
      "job_request.submit",
      "job_request.cancel"
    ]);
    expect(service.rolePermissions("ORGANIZATION_STAFF")).not.toContain("organization.update");
    expect(service.rolePermissions("ORGANIZATION_STAFF")).not.toContain("platform.supervise");
  });

  it("does not grant authority from development mode, email domain, or first-user assumptions", async () => {
    const service = createAuthorizationService();

    await expect(
      service.decide({
        session: activeSession({ emailNormalized: "founder@residentworkforce.example" }),
        roles: [],
        permission: "platform.supervise",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({ allow: false, internalReason: "no_role" });
  });

  it("keeps reserved permissions from authorizing unimplemented workflows", async () => {
    const service = createAuthorizationService();

    await expect(
      service.decide({
        session: activeSession(),
        roles: ["ORGANIZATION_OWNER"],
        permission: "job_request.create",
        resourceContext: { organizationId: "org_123" }
      })
    ).resolves.toMatchObject({
      status: "deny",
      allow: false,
      internalReason: "permission_reserved_for_future_service"
    });
  });

  it("returns safe external denial while preserving internal reason", async () => {
    const decision = await createAuthorizationService().decide({
      session: activeSession(),
      roles: ["ORGANIZATION_OWNER"],
      permission: "platform.supervise",
      platformContext: { platform: true }
    });

    expect(decision.internalReason).toBe("role_lacks_permission");
    expect(toSafeAuthorizationResponse(decision)).toEqual({
      authorized: false,
      error: authorizationDeniedCode,
      message: authorizationDeniedMessage
    });
  });

  it("records audit hooks for sensitive denial and platform supervision", async () => {
    const auditSink = new MemoryAuthorizationAuditSink();
    const service = createAuthorizationService(auditSink);

    await service.decide({
      session: activeSession(),
      roles: ["ORGANIZATION_OWNER"],
      permission: "platform.supervise",
      platformContext: { platform: true },
      correlationId: "authz-denied"
    });
    await service.decide({
      session: activeSession(),
      roles: ["PLATFORM_ADMINISTRATOR"],
      permission: "platform.supervise",
      platformContext: { platform: true },
      correlationId: "authz-allowed"
    });

    expect(auditSink.events).toEqual([
      expect.objectContaining({
        action: "authorization.denied",
        permission: "platform.supervise",
        reason: "role_lacks_permission",
        correlationId: "authz-denied"
      }),
      expect.objectContaining({
        action: "authorization.platform_supervision",
        permission: "platform.supervise",
        reason: "platform_supervision_allowed",
        correlationId: "authz-allowed"
      })
    ]);
  });

  it("declares Dispatcher without active permissions until dispatch implementation", () => {
    expect(authorizationRoleDefinitions.find((role) => role.key === "DISPATCHER")?.permissions).toEqual([]);
  });
});

class MemoryAuthorizationAuditSink {
  events: AuthorizationAuditEventInput[] = [];

  async recordAuthorizationAuditEvent(input: AuthorizationAuditEventInput) {
    this.events.push(input);
  }
}

function activeSession(input: { userStatus?: StoredAuthenticationUser["status"]; emailNormalized?: string } = {}) {
  return {
    authenticated: true,
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      publicId: "usr_test",
      emailNormalized: input.emailNormalized ?? "test@example.com",
      displayName: "Test User",
      status: input.userStatus ?? "active"
    },
    session: {
      id: "session-1",
      userId: "00000000-0000-4000-8000-000000000001",
      expiresAt: new Date("2026-07-25T08:00:00.000Z")
    }
  };
}
