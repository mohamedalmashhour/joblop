import { describe, expect, it } from "vitest";
import {
  createAuthorizationService,
  createAuthenticationService,
  createOrganizationMembershipService
} from "@rwos/auth";
import type {
  AuthorizationRoleKey,
  AuthenticationRepository,
  CreateLocalUserInput,
  CreateSessionInput,
  InviteMembershipInput,
  OrganizationMembershipRepository,
  RecordAuthenticationAuditEventInput,
  StoredOrganizationMembership,
  StoredAuthenticationSession,
  StoredAuthenticationUser,
  UpdateSessionInput
} from "@rwos/auth";
import { buildApi } from "./app";

describe("api health endpoint", () => {
  it("returns the foundation health payload", async () => {
    const app = buildApi();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: "resident-workforce-os-api",
      foundationOnly: true
    });
  });
});

describe("api authentication foundation", () => {
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
    await membershipService.activateMembership({ userId, membershipId: membership.id, actorUserId: userId });

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
    const membershipService = createOrganizationMembershipService(new ApiMemoryOrganizationMembershipRepository());
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

class ApiMemoryAuthenticationRepository implements AuthenticationRepository {
  private users = new Map<string, StoredAuthenticationUser>();
  private sessions = new Map<string, StoredAuthenticationSession>();
  private auditEvents: RecordAuthenticationAuditEventInput[] = [];
  private nextUser = 1;
  private nextSession = 1;

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
    const session = [...this.sessions.values()].find((candidate) => candidate.id === input.sessionId);

    if (!session) return null;

    if (input.status) session.status = input.status;
    if (input.lastSeenAt !== undefined) session.lastSeenAt = input.lastSeenAt;
    if (input.revokedAt !== undefined) session.revokedAt = input.revokedAt;

    return session;
  }

  async recordAuthenticationAuditEvent(input: RecordAuthenticationAuditEventInput) {
    this.auditEvents.push(input);
  }

  firstUserId() {
    const user = [...this.users.values()][0];

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

  async createMembership(input: Parameters<OrganizationMembershipRepository["createMembership"]>[0]) {
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

  async updateMembershipStatus(input: Parameters<OrganizationMembershipRepository["updateMembershipStatus"]>[0]) {
    const membership = this.memberships.get(input.membershipId);

    if (!membership) throw new Error("TEST_MEMBERSHIP_NOT_FOUND");

    membership.status = input.status;
    if (input.status === "active") membership.acceptedAt = input.now;
    if (input.status === "suspended") membership.suspendedAt = input.now;
    if (input.status === "revoked") membership.revokedAt = input.now;
    if (input.status === "expired") membership.expiredAt = input.now;

    return membership;
  }

  async replaceMembershipRoles(input: Parameters<OrganizationMembershipRepository["replaceMembershipRoles"]>[0]) {
    const membership = this.memberships.get(input.membershipId);

    if (!membership) throw new Error("TEST_MEMBERSHIP_NOT_FOUND");

    membership.membershipRoles = input.accessRoleKeys.map((roleKey) => ({ accessRole: { key: roleKey } }));

    return membership;
  }

  async recordMembershipAuditEvent() {
    return undefined;
  }
}

function testAuthOptions() {
  return {
    passwordHashOptions: {
      costFactor: 1_024,
      blockSize: 8,
      parallelization: 1,
      keyLength: 32,
      saltLength: 8
    },
    randomToken: () => "api-session-token-000000000000000000001"
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

function apiInviteInput(userId: string): InviteMembershipInput {
  return {
    organizationId: "org-api-1",
    userId,
    invitedByUserId: userId,
    accessRoleKeys: ["ORGANIZATION_OWNER"]
  };
}
