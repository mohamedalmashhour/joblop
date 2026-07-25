import { describe, expect, it } from "vitest";
import {
  createAuthorizationService,
  createAuthenticationService,
  createEmployerOrganizationService,
  createOrganizationMembershipService,
  createResidenceService
} from "@rwos/auth";
import type {
  AuthorizationRoleKey,
  AuthenticationRepository,
  CreateLocalUserInput,
  CreateSessionInput,
  EmployerOrganizationRepository,
  InviteMembershipInput,
  OrganizationMembershipRepository,
  RecordAuthenticationAuditEventInput,
  ResidenceRepository,
  StoredEmployerOrganization,
  StoredOrganizationMembership,
  StoredResidence,
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

describe("api employer organization foundation", () => {
  it("creates an employer organization with owner membership context", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
    const membershipService = createOrganizationMembershipService(membershipRepository);
    const organizationRepository = new ApiMemoryEmployerOrganizationRepository(membershipRepository);
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

    await app.close();
  });

  it("reads, updates, and reports status only within explicit organization context", async () => {
    const authRepository = new ApiMemoryAuthenticationRepository();
    const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
    const membershipService = createOrganizationMembershipService(membershipRepository);
    const organizationRepository = new ApiMemoryEmployerOrganizationRepository(membershipRepository);
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
    const organization = await createApiOrganization(app, registration.token, "Residence API Tenant");
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
    const secondOrganization = await createApiOrganization(app, second.json().token, "Residence Tenant Two");

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

class ApiMemoryEmployerOrganizationRepository implements EmployerOrganizationRepository {
  private organizations = new Map<string, StoredEmployerOrganization>();
  private organizationAuditEvents: Parameters<EmployerOrganizationRepository["recordOrganizationAuditEvent"]>[0][] = [];
  private nextOrganization = 1;

  constructor(private readonly membershipRepository: ApiMemoryOrganizationMembershipRepository) {}

  auditEvents() {
    return this.organizationAuditEvents;
  }

  async findOrganizationById(organizationId: string) {
    return this.organizations.get(organizationId) ?? null;
  }

  async findOrganizationByPublicId(publicId: string) {
    return [...this.organizations.values()].find((organization) => organization.publicId === publicId) ?? null;
  }

  async createOrganizationWithOwnerMembership(input: Parameters<EmployerOrganizationRepository["createOrganizationWithOwnerMembership"]>[0]) {
    if ([...this.organizations.values()].some((organization) => organization.legalName === input.legalName)) {
      throw new Error("RWOS_ORGANIZATION_DUPLICATE");
    }

    const organization: StoredEmployerOrganization = {
      id: `api-org-${this.nextOrganization}`,
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

  async updateOrganization(input: Parameters<EmployerOrganizationRepository["updateOrganization"]>[0]) {
    const organization = this.organizations.get(input.organizationId);

    if (!organization || organization.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      return null;
    }

    if (input.legalName !== undefined) organization.legalName = input.legalName;
    if (input.displayName !== undefined) organization.displayName = input.displayName;
    organization.updatedAt = new Date(input.now.getTime() + 1);

    return organization;
  }

  async updateOrganizationStatus(input: Parameters<EmployerOrganizationRepository["updateOrganizationStatus"]>[0]) {
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

  async recordOrganizationAuditEvent(input: Parameters<EmployerOrganizationRepository["recordOrganizationAuditEvent"]>[0]) {
    this.organizationAuditEvents.push(input);
  }
}

class ApiMemoryResidenceRepository implements ResidenceRepository {
  private residences = new Map<string, StoredResidence>();
  private nextResidence = 1;

  async findResidenceById(residenceId: string) {
    return this.residences.get(residenceId) ?? null;
  }

  async listResidencesByOrganization(input: Parameters<ResidenceRepository["listResidencesByOrganization"]>[0]) {
    return [...this.residences.values()]
      .filter((residence) => residence.organizationId === input.organizationId && (!input.status || residence.status === input.status))
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

    if (!residence || residence.organizationId !== input.organizationId || residence.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
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

    if (!residence || residence.organizationId !== input.organizationId || residence.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      return null;
    }

    residence.status = input.status;
    residence.archivedAt = input.status === "closed" ? input.now : input.status === "active" ? null : residence.archivedAt;
    residence.updatedAt = new Date(input.now.getTime() + 1);

    return residence;
  }

  async recordResidenceAuditEvent(input: Parameters<ResidenceRepository["recordResidenceAuditEvent"]>[0]) {
    void input;

    return undefined;
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
  const organizationService = createEmployerOrganizationService(organizationRepository, membershipService, authorizationService);
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

async function createApiOrganization(app: ReturnType<typeof buildApi>, token: string, legalName: string) {
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

function apiInviteInput(userId: string): InviteMembershipInput {
  return {
    organizationId: "org-api-1",
    userId,
    invitedByUserId: userId,
    accessRoleKeys: ["ORGANIZATION_OWNER"]
  };
}
