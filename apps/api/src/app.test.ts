import { describe, expect, it } from "vitest";
import {
  createAuthorizationService,
  createAuthenticationService,
  createDepartmentService,
  createEmployerOrganizationService,
  createOrganizationMembershipService,
  createResidenceService,
  createRoleDefinitionService,
  createWorkGroupService
} from "@rwos/auth";
import type {
  AuthorizationRoleKey,
  AuthenticationRepository,
  CreateLocalUserInput,
  CreateSessionInput,
  DepartmentRepository,
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
  StoredDepartment,
  StoredRoleDefinition,
  StoredWorkGroup,
  RoleDefinitionRepository,
  UpdateSessionInput,
  WorkGroupRepository
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

describe("api department foundation", () => {
  it("creates, lists, reads, updates, and changes department status inside residence context", async () => {
    const { app } = buildDepartmentApi();
    const registration = await registerApiUser(app);
    const organization = await createApiOrganization(app, registration.token, "Department API Tenant");
    const residence = await createApiResidence(app, registration.token, organization.id, "Department API Residence");
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
    const firstOrganization = await createApiOrganization(app, first.token, "Department Tenant One");
    const firstResidence = await createApiResidence(app, first.token, firstOrganization.id, "Tenant One Residence");
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
    const secondOrganization = await createApiOrganization(app, second.json().token, "Department Tenant Two");
    const secondResidence = await createApiResidence(app, second.json().token, secondOrganization.id, "Tenant Two Residence");

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
    const organization = await createApiOrganization(app, registration.token, "WorkGroup API Tenant");
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
    expect(read.json().workGroup).toMatchObject({ slug: "care-nursing", displayLabel: "Care / Nursing" });

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
    const ordinaryOrganization = await createApiOrganization(app, ordinary.token, "Ordinary WorkGroup Tenant");
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
    const kitchen = all.json().workGroups.find((workGroup: { slug: string }) => workGroup.slug === "kitchen");
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
    expect(updated.json().workGroup).toMatchObject({ slug: "kitchen", displayLabel: "Kitchen Operations", displayOrder: 11 });
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
    const organization = await createApiOrganization(app, registration.token, "RoleDefinition API Tenant");
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
    const ordinaryOrganization = await createApiOrganization(app, ordinary.token, "Ordinary RoleDefinition Tenant");
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
    expect(updated.json().roleDefinition).toMatchObject({ code: "CHEF", slug: "chef", displayLabel: "Executive Chef", displayOrder: 12 });
    expect(inactive.statusCode).toBe(200);
    expect(inactive.json().roleDefinition.status).toBe("inactive");
    expect(ordinaryAfterInactive.statusCode).toBe(403);

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

class ApiMemoryDepartmentRepository implements DepartmentRepository {
  private departments = new Map<string, StoredDepartment>();
  private nextDepartment = 1;

  async findDepartmentById(departmentId: string) {
    return this.departments.get(departmentId) ?? null;
  }

  async listDepartmentsByResidence(input: Parameters<DepartmentRepository["listDepartmentsByResidence"]>[0]) {
    return [...this.departments.values()]
      .filter((department) => department.organizationId === input.organizationId && department.residenceId === input.residenceId && (!input.status || department.status === input.status))
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

  async updateDepartmentStatus(input: Parameters<DepartmentRepository["updateDepartmentStatus"]>[0]) {
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
    department.archivedAt = input.status === "closed" ? input.now : input.status === "active" ? null : department.archivedAt;
    department.updatedAt = new Date(input.now.getTime() + 1);

    return department;
  }

  async recordDepartmentAuditEvent(input: Parameters<DepartmentRepository["recordDepartmentAuditEvent"]>[0]) {
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
      .sort((left, right) => left.displayOrder - right.displayOrder || left.displayLabel.localeCompare(right.displayLabel) || left.key.localeCompare(right.key));
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

  async recordWorkGroupAuditEvent(input: Parameters<WorkGroupRepository["recordWorkGroupAuditEvent"]>[0]) {
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
    return [...this.roleDefinitions.values()].find((roleDefinition) => roleDefinition.id === roleDefinitionId) ?? null;
  }

  async findRoleDefinitionByKey(key: string) {
    return this.roleDefinitions.get(key) ?? null;
  }

  async listRoleDefinitions(input: Parameters<RoleDefinitionRepository["listRoleDefinitions"]>[0]) {
    return [...this.roleDefinitions.values()]
      .filter((roleDefinition) => input.includeInactive || roleDefinition.status === "active")
      .filter((roleDefinition) => !input.workGroupKey || roleDefinition.workGroup.key === input.workGroupKey)
      .sort(
        (left, right) =>
          left.workGroup.displayOrder - right.workGroup.displayOrder ||
          left.displayOrder - right.displayOrder ||
          left.displayLabel.localeCompare(right.displayLabel) ||
          left.key.localeCompare(right.key)
      );
  }

  async updateRoleDefinition(input: Parameters<RoleDefinitionRepository["updateRoleDefinition"]>[0]) {
    const roleDefinition = [...this.roleDefinitions.values()].find((candidate) => candidate.id === input.roleDefinitionId);
    if (!roleDefinition || roleDefinition.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return null;

    if (input.displayLabel !== undefined) roleDefinition.displayLabel = input.displayLabel;
    if (input.displayOrder !== undefined) roleDefinition.displayOrder = input.displayOrder;
    if (input.localizedLabelKey !== undefined) roleDefinition.localizedLabelKey = input.localizedLabelKey;
    if (input.qualificationSummary !== undefined) roleDefinition.qualificationSummary = input.qualificationSummary;
    if (input.safetyRequirementSummary !== undefined) roleDefinition.safetyRequirementSummary = input.safetyRequirementSummary;
    roleDefinition.updatedAt = new Date(input.now.getTime() + 1);

    return roleDefinition;
  }

  async updateRoleDefinitionStatus(input: Parameters<RoleDefinitionRepository["updateRoleDefinitionStatus"]>[0]) {
    const roleDefinition = [...this.roleDefinitions.values()].find((candidate) => candidate.id === input.roleDefinitionId);
    if (!roleDefinition || roleDefinition.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) return null;

    roleDefinition.status = input.status;
    roleDefinition.updatedAt = new Date(input.now.getTime() + 1);

    return roleDefinition;
  }

  async recordRoleDefinitionAuditEvent(input: Parameters<RoleDefinitionRepository["recordRoleDefinitionAuditEvent"]>[0]) {
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

function buildDepartmentApi() {
  const authRepository = new ApiMemoryAuthenticationRepository();
  const membershipRepository = new ApiMemoryOrganizationMembershipRepository();
  const membershipService = createOrganizationMembershipService(membershipRepository);
  const authorizationService = createAuthorizationService();
  const organizationRepository = new ApiMemoryEmployerOrganizationRepository(membershipRepository);
  const organizationService = createEmployerOrganizationService(organizationRepository, membershipService, authorizationService);
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
  const organizationService = createEmployerOrganizationService(organizationRepository, membershipService, authorizationService);
  const platformAdminUserIds = new Set<string>();
  const app = buildApi({
    authService: createAuthenticationService(authRepository, testAuthOptions()),
    membershipService,
    organizationService,
    workGroupService: createWorkGroupService(new ApiMemoryWorkGroupRepository(), authorizationService),
    resolveAuthorizationRoles: (userId) => (platformAdminUserIds.has(userId) ? ["PLATFORM_ADMINISTRATOR"] : [])
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
  const organizationService = createEmployerOrganizationService(organizationRepository, membershipService, authorizationService);
  const platformAdminUserIds = new Set<string>();
  const app = buildApi({
    authService: createAuthenticationService(authRepository, testAuthOptions()),
    membershipService,
    organizationService,
    roleDefinitionService: createRoleDefinitionService(new ApiMemoryRoleDefinitionRepository(), authorizationService),
    resolveAuthorizationRoles: (userId) => (platformAdminUserIds.has(userId) ? ["PLATFORM_ADMINISTRATOR"] : [])
  });

  return {
    app,
    authRepository,
    grantPlatformAdmin: (userId: string) => platformAdminUserIds.add(userId)
  };
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

async function createApiResidence(app: ReturnType<typeof buildApi>, token: string, organizationId: string, name: string) {
  const response = await app.inject({
    method: "POST",
    url: `/organizations/${organizationId}/residences`,
    headers: { authorization: `Bearer ${token}` },
    payload: { name }
  });

  expect(response.statusCode).toBe(201);

  return response.json().residence as { id: string; version: string };
}

function apiInviteInput(userId: string): InviteMembershipInput {
  return {
    organizationId: "org-api-1",
    userId,
    invitedByUserId: userId,
    accessRoleKeys: ["ORGANIZATION_OWNER"]
  };
}
