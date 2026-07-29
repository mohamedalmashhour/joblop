import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  AuthenticationRequiredError,
  AssignmentTransactionUnavailableError,
  PasswordPolicyError,
  RegistrationUnavailableError,
  authorizationDeniedCode,
  authorizationDeniedMessage,
  authorizationRoleDefinitions,
  createAssignmentService,
  createAttendanceService,
  createAuthorizationService,
  createAuthenticationService,
  createDepartmentService,
  createDispatchService,
  createEmployerOrganizationService,
  createJobRequestService,
  createOrganizationMembershipService,
  createPrismaAssignmentRepository,
  createResidenceService,
  createRoleDefinitionService,
  createTimesheetService,
  createWorkerOfferService,
  createWorkGroupService,
  hashPassword,
  hashSessionToken,
  toSafeAuthorizationResponse,
  verifyPassword
} from "./index";
import type {
  AuthorizationAuditEventInput,
  AtomicAssignmentCreateFailure,
  AssignmentRepository,
  AttendanceRepository,
  EmployerOrganizationRepository,
  InviteMembershipInput,
  AuthenticationRepository,
  CreateLocalUserInput,
  CreateSessionInput,
  DepartmentRepository,
  DispatchCandidateSource,
  DispatchRepository,
  OrganizationMembershipRepository,
  RecordAuthenticationAuditEventInput,
  ResidenceRepository,
  StoredEmployerOrganization,
  StoredOrganizationMembership,
  StoredResidence,
  StoredAuthenticationSession,
  StoredAssignment,
  StoredAttendanceRecord,
  StoredAuthenticationUser,
  StoredDepartment,
  StoredDispatchCandidate,
  StoredDispatchReview,
  StoredWorkerIdentity,
  StoredWorkerOffer,
  StoredWorkerOfferDeliveryAttempt,
  StoredWorkerOfferResponse,
  StoredWorkerOfferTermsVersion,
  StoredRoleDefinition,
  StoredWorkGroup,
  RoleDefinitionRepository,
  JobRequestRepository,
  UpdateSessionInput,
  WorkerOfferRepository,
  WorkerOfferDeliveryProvider,
  WorkGroupRepository,
  StoredJobRequest,
  StoredTimesheet,
  StoredTimesheetCalculationSnapshot,
  TimesheetRepository
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
    await expect(hashPassword("short1", passwordHashOptions)).rejects.toBeInstanceOf(
      PasswordPolicyError
    );
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
    expect(
      repository.auditActions().filter((action) => action === "auth.registration")
    ).toHaveLength(2);
  });

  it("signs in with valid credentials and does not reveal failed-login causes", async () => {
    const repository = new MemoryAuthenticationRepository();
    const service = createTestAuthenticationService(repository);
    await service.register({ email: "sign-in@example.com", password: "ValidPassword123" });

    const result = await service.signIn({
      email: "sign-in@example.com",
      password: "ValidPassword123"
    });
    await expect(
      service.signIn({ email: "sign-in@example.com", password: "WrongPassword123" })
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      service.signIn({ email: "missing@example.com", password: "WrongPassword123" })
    ).rejects.toBeInstanceOf(AuthenticationError);

    expect(result.session.userId).toBe(result.user.id);
    expect(repository.auditActions()).toContain("auth.login_success");
    expect(
      repository.auditActions().filter((action) => action === "auth.login_failed")
    ).toHaveLength(2);
  });

  it("blocks disabled and closed accounts with generic authentication errors", async () => {
    const repository = new MemoryAuthenticationRepository();
    const service = createTestAuthenticationService(repository);
    const disabled = await service.register({
      email: "disabled@example.com",
      password: "ValidPassword123"
    });
    const closed = await service.register({
      email: "closed@example.com",
      password: "ValidPassword123"
    });

    repository.setUserStatus(disabled.user.id, "disabled");
    repository.setUserStatus(closed.user.id, "closed");

    await expect(
      service.signIn({ email: "disabled@example.com", password: "ValidPassword123" })
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      service.signIn({ email: "closed@example.com", password: "ValidPassword123" })
    ).rejects.toBeInstanceOf(AuthenticationError);

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

    await expect(service.validateSession(registration.token)).resolves.toMatchObject({
      authenticated: true
    });

    currentTime = new Date("2026-07-25T05:02:00.000Z");
    await expect(service.validateSession(registration.token)).resolves.toMatchObject({
      authenticated: false
    });
    expect(repository.auditActions()).toContain("auth.session_expired");

    const signIn = await service.signIn({
      email: "session@example.com",
      password: "ValidPassword123"
    });
    await expect(service.revokeSession({ token: signIn.token, reason: "logout" })).resolves.toEqual(
      { revoked: true }
    );
    await expect(service.validateSession(signIn.token)).resolves.toMatchObject({
      authenticated: false
    });
    expect(repository.auditActions()).toContain("auth.logout");

    const secondSignIn = await service.signIn({
      email: "session@example.com",
      password: "ValidPassword123"
    });
    await expect(service.revokeSession({ token: secondSignIn.token })).resolves.toEqual({
      revoked: true
    });
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
    const session = [...this.sessions.values()].find(
      (candidate) => candidate.id === input.sessionId
    );

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
    ).resolves.toMatchObject({
      status: "permission_missing",
      allow: false,
      internalReason: "no_role"
    });

    await expect(
      service.decide({
        session,
        roles: ["PLATFORM_ADMINISTRATOR"],
        permission: "unknown.permission",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({
      status: "permission_missing",
      allow: false,
      internalReason: "unknown_permission"
    });

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
    ).resolves.toMatchObject({
      status: "permission_missing",
      internalReason: "role_lacks_permission"
    });
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
    ).resolves.toMatchObject({
      status: "permission_missing",
      internalReason: "role_lacks_permission"
    });

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
      "job_request.cancel",
      "assignment.read",
      "attendance.read",
      "timesheet.employer_read",
      "timesheet.employer_confirm",
      "timesheet.employer_dispute"
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

  it("grants Dispatcher only approved dispatch authority", async () => {
    const service = createAuthorizationService();

    expect(service.rolePermissions("DISPATCHER")).toEqual([
      "dispatch.create",
      "dispatch.read",
      "dispatch.review_candidates",
      "dispatch.manage_shortlist",
      "dispatch.pause",
      "dispatch.resume",
      "dispatch.cancel",
      "dispatch.close",
      "dispatch.prepare_offer",
      "dispatch.audit_read",
      "worker_offer.create",
      "worker_offer.read",
      "worker_offer.approve",
      "worker_offer.send",
      "worker_offer.withdraw",
      "worker_offer.cancel",
      "worker_offer.audit_read",
      "assignment.create",
      "assignment.read",
      "assignment.cancel",
      "assignment.withdraw",
      "assignment.mark_replacement_required",
      "assignment.attendance_handoff",
      "assignment.audit_read",
      "attendance.create",
      "attendance.read",
      "attendance.check_in",
      "attendance.check_out",
      "attendance.override",
      "attendance.cancel",
      "attendance.audit_read",
      "timesheet.read"
    ]);
    expect(service.rolePermissions("WORKER_ACCESS")).toEqual([
      "worker_offer.respond",
      "assignment.worker_read",
      "assignment.worker_acknowledge",
      "assignment.worker_withdraw",
      "attendance.worker_read",
      "attendance.worker_check_in",
      "attendance.worker_check_out",
      "timesheet.worker_read",
      "timesheet.worker_confirm",
      "timesheet.worker_dispute"
    ]);
    await expect(
      service.decide({
        session: activeSession(),
        roles: ["DISPATCHER"],
        permission: "dispatch.read",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({
      status: "allow",
      allow: true
    });
    await expect(
      service.decide({
        session: activeSession(),
        roles: ["DISPATCHER"],
        permission: "platform.supervise",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({
      status: "permission_missing",
      allow: false,
      internalReason: "role_lacks_permission"
    });

    await expect(
      service.decide({
        session: activeSession(),
        roles: ["DISPATCHER"],
        permission: "dispatch.supervise",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({
      status: "permission_missing",
      allow: false,
      internalReason: "role_lacks_permission"
    });

    await expect(
      service.decide({
        session: activeSession(),
        roles: ["DISPATCHER"],
        permission: "worker_offer.supervise",
        platformContext: { platform: true }
      })
    ).resolves.toMatchObject({
      status: "permission_missing",
      allow: false,
      internalReason: "role_lacks_permission"
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

  it("declares Dispatcher without reserved supervision authority", () => {
    expect(
      authorizationRoleDefinitions.find((role) => role.key === "DISPATCHER")?.permissions
    ).not.toContain("dispatch.supervise");
  });
});

describe("organization membership foundation", () => {
  it("invites, activates, suspends, revokes, and audits membership lifecycle", async () => {
    const repository = new MemoryOrganizationMembershipRepository();
    const service = createOrganizationMembershipService(repository, {
      now: () => new Date("2026-07-25T10:00:00.000Z")
    });
    const invited = await service.inviteMembership(inviteInput());

    expect(invited.status).toBe("invited");
    expect(invited.roleKeys).toEqual(["ORGANIZATION_OWNER"]);

    const active = await service.activateMembership({
      userId: invited.userId,
      membershipId: invited.id,
      actorUserId: invited.userId
    });
    expect(active.status).toBe("active");
    expect(active.activatedAt?.toISOString()).toBe("2026-07-25T10:00:00.000Z");

    const suspended = await service.suspendMembership({
      userId: invited.userId,
      membershipId: invited.id,
      actorUserId: invited.userId
    });
    expect(suspended.status).toBe("suspended");

    const revoked = await service.revokeMembership({
      userId: invited.userId,
      membershipId: invited.id,
      actorUserId: invited.userId
    });
    expect(revoked.status).toBe("revoked");
    expect(repository.auditActions()).toEqual([
      "membership.invited",
      "membership.activated",
      "membership.suspended",
      "membership.revoked"
    ]);
  });

  it("does not authorize invited, suspended, revoked, expired, or missing membership contexts", async () => {
    const repository = new MemoryOrganizationMembershipRepository();
    let currentTime = new Date("2026-07-25T10:00:00.000Z");
    const service = createOrganizationMembershipService(repository, { now: () => currentTime });
    const invited = await service.inviteMembership({
      ...inviteInput(),
      expiresAt: new Date("2026-07-25T11:00:00.000Z")
    });

    await expect(
      service.selectOrganizationContext({
        userId: invited.userId,
        organizationId: invited.organizationId
      })
    ).resolves.toMatchObject({
      allow: false,
      status: "membership_inactive",
      internalReason: "membership_invited"
    });

    await service.activateMembership({
      userId: invited.userId,
      membershipId: invited.id,
      actorUserId: invited.userId
    });
    await expect(
      service.selectOrganizationContext({
        userId: invited.userId,
        organizationId: invited.organizationId
      })
    ).resolves.toMatchObject({ allow: true, roles: ["ORGANIZATION_OWNER"] });

    currentTime = new Date("2026-07-25T11:01:00.000Z");
    await expect(
      service.selectOrganizationContext({
        userId: invited.userId,
        organizationId: invited.organizationId
      })
    ).resolves.toMatchObject({
      allow: false,
      status: "membership_expired",
      internalReason: "membership_expired"
    });

    await expect(
      service.selectOrganizationContext({ userId: invited.userId, organizationId: "org-missing" })
    ).resolves.toMatchObject({ allow: false, status: "membership_missing" });
  });

  it("requires explicit organization context and never infers from one or many memberships", async () => {
    const repository = new MemoryOrganizationMembershipRepository();
    const service = createOrganizationMembershipService(repository);
    const first = await service.inviteMembership(inviteInput());
    await service.activateMembership({
      userId: first.userId,
      membershipId: first.id,
      actorUserId: first.userId
    });

    await expect(
      service.selectOrganizationContext({ userId: first.userId })
    ).resolves.toMatchObject({
      allow: false,
      status: "context_required"
    });

    const second = await service.inviteMembership({
      ...inviteInput(),
      organizationId: "org-2",
      accessRoleKeys: ["ORGANIZATION_STAFF"]
    });
    await service.activateMembership({
      userId: second.userId,
      membershipId: second.id,
      actorUserId: second.userId
    });

    await expect(
      service.selectOrganizationContext({ userId: first.userId })
    ).resolves.toMatchObject({
      allow: false,
      status: "context_required"
    });
    await expect(
      service.selectOrganizationContext({ userId: first.userId, organizationId: "org-2" })
    ).resolves.toMatchObject({
      allow: true,
      roles: ["ORGANIZATION_STAFF"]
    });
  });

  it("prevents duplicate memberships and isolates cross-organization access", async () => {
    const repository = new MemoryOrganizationMembershipRepository();
    const service = createOrganizationMembershipService(repository);
    const membership = await service.inviteMembership(inviteInput());

    await expect(service.inviteMembership(inviteInput())).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "duplicate_membership" })
    });
    await expect(service.getMembership("different-user", membership.id)).resolves.toBeNull();
  });

  it("changes access roles without implementing role assignment workflows beyond membership", async () => {
    const repository = new MemoryOrganizationMembershipRepository();
    const service = createOrganizationMembershipService(repository);
    const membership = await service.inviteMembership(inviteInput());

    const changed = await service.changeMembershipRoles({
      userId: membership.userId,
      membershipId: membership.id,
      actorUserId: membership.userId,
      accessRoleKeys: ["ORGANIZATION_STAFF"]
    });

    expect(changed.roleKeys).toEqual(["ORGANIZATION_STAFF"]);
    expect(repository.auditActions()).toContain("membership.access_role_changed");
  });
});

describe("employer organization foundation", () => {
  it("creates an organization with active owner membership and audit records", async () => {
    const membershipRepository = new MemoryOrganizationMembershipRepository();
    const organizationRepository = new MemoryEmployerOrganizationRepository(membershipRepository);
    const membershipService = createOrganizationMembershipService(membershipRepository);
    const service = createEmployerOrganizationService(
      organizationRepository,
      membershipService,
      createAuthorizationService(),
      { now: () => new Date("2026-07-25T12:00:00.000Z") }
    );

    const created = await service.createOrganization({
      actorUserId: "00000000-0000-4000-8000-000000000001",
      legalName: "  Sunrise Residence Group  ",
      displayName: "Sunrise Residence",
      correlationId: "org-create-test"
    });

    expect(created.organization).toMatchObject({
      legalName: "Sunrise Residence Group",
      displayName: "Sunrise Residence",
      status: "active",
      createdByUserId: "00000000-0000-4000-8000-000000000001"
    });
    expect(created.membership).toMatchObject({
      userId: "00000000-0000-4000-8000-000000000001",
      status: "active",
      roleKeys: ["ORGANIZATION_OWNER"]
    });
    expect(organizationRepository.auditActions()).toContain("organization.created");
    expect(membershipRepository.auditActions()).toEqual([
      "membership.activated",
      "membership.access_role_changed"
    ]);
  });

  it("requires active membership and organization permission for read and update", async () => {
    const membershipRepository = new MemoryOrganizationMembershipRepository();
    const organizationRepository = new MemoryEmployerOrganizationRepository(membershipRepository);
    const membershipService = createOrganizationMembershipService(membershipRepository);
    const service = createEmployerOrganizationService(
      organizationRepository,
      membershipService,
      createAuthorizationService()
    );
    const created = await service.createOrganization({
      actorUserId: "00000000-0000-4000-8000-000000000001",
      legalName: "Tenant A",
      displayName: "Tenant A"
    });

    await expect(
      service.getOrganization({
        actorUserId: "00000000-0000-4000-8000-000000000002",
        organizationId: created.organization.id
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "membership_denied" }) });

    const staff = await membershipService.inviteMembership({
      organizationId: created.organization.id,
      userId: "00000000-0000-4000-8000-000000000003",
      invitedByUserId: "00000000-0000-4000-8000-000000000001",
      accessRoleKeys: ["ORGANIZATION_STAFF"]
    });
    await membershipService.activateMembership({
      userId: staff.userId,
      membershipId: staff.id,
      actorUserId: "00000000-0000-4000-8000-000000000001"
    });

    await expect(
      service.getOrganization({
        actorUserId: staff.userId,
        organizationId: created.organization.id
      })
    ).resolves.toMatchObject({ id: created.organization.id });
    await expect(
      service.updateOrganization({
        actorUserId: staff.userId,
        organizationId: created.organization.id,
        expectedVersion: created.organization.version,
        displayName: "Staff Update"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "permission_denied" }) });
  });

  it("keeps tenants isolated and does not treat platform supervision as ownership", async () => {
    const membershipRepository = new MemoryOrganizationMembershipRepository();
    const organizationRepository = new MemoryEmployerOrganizationRepository(membershipRepository);
    const service = createEmployerOrganizationService(
      organizationRepository,
      createOrganizationMembershipService(membershipRepository),
      createAuthorizationService()
    );
    const tenantA = await service.createOrganization({
      actorUserId: "00000000-0000-4000-8000-000000000001",
      legalName: "Tenant A",
      displayName: "Tenant A"
    });
    const tenantB = await service.createOrganization({
      actorUserId: "00000000-0000-4000-8000-000000000002",
      legalName: "Tenant B",
      displayName: "Tenant B"
    });
    await membershipRepository.createMembership({
      organizationId: tenantA.organization.id,
      userId: "00000000-0000-4000-8000-000000000004",
      invitedByUserId: null,
      accessRoleKeys: ["PLATFORM_ADMINISTRATOR"],
      expiresAt: null,
      now: new Date("2026-07-25T12:00:00.000Z")
    });
    const platformMembership = await membershipRepository.findMembershipForUserByOrganization(
      "00000000-0000-4000-8000-000000000004",
      tenantA.organization.id
    );
    await membershipRepository.updateMembershipStatus({
      membershipId: platformMembership!.id,
      status: "active",
      actorUserId: null,
      now: new Date("2026-07-25T12:00:00.000Z")
    });

    await expect(
      service.getOrganization({
        actorUserId: tenantA.membership.userId,
        organizationId: tenantB.organization.id
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "membership_denied" }) });
    await expect(
      service.getOrganization({
        actorUserId: "00000000-0000-4000-8000-000000000004",
        organizationId: tenantA.organization.id
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "permission_denied" }) });
  });

  it("uses optimistic concurrency and blocks suspended or closed organizations without changing user state", async () => {
    const membershipRepository = new MemoryOrganizationMembershipRepository();
    const organizationRepository = new MemoryEmployerOrganizationRepository(membershipRepository);
    const service = createEmployerOrganizationService(
      organizationRepository,
      createOrganizationMembershipService(membershipRepository),
      createAuthorizationService()
    );
    const created = await service.createOrganization({
      actorUserId: "00000000-0000-4000-8000-000000000001",
      legalName: "Tenant Concurrency",
      displayName: "Tenant Concurrency"
    });
    const updated = await service.updateOrganization({
      actorUserId: created.membership.userId,
      organizationId: created.organization.id,
      expectedVersion: created.organization.version,
      displayName: "Tenant Updated"
    });

    await expect(
      service.updateOrganization({
        actorUserId: created.membership.userId,
        organizationId: created.organization.id,
        expectedVersion: created.organization.version,
        displayName: "Stale Update"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "version_conflict" }) });

    const suspended = await service.updateOrganizationStatus({
      actorUserId: created.membership.userId,
      organizationId: created.organization.id,
      expectedVersion: updated.version,
      status: "suspended"
    });
    await expect(
      service.getOrganization({
        actorUserId: created.membership.userId,
        organizationId: created.organization.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({
        status: "organization_inactive",
        internalReason: "organization_suspended"
      })
    });

    const reactivated = await service.updateOrganizationStatus({
      actorUserId: created.membership.userId,
      organizationId: created.organization.id,
      expectedVersion: suspended.version,
      status: "active"
    });
    const closed = await service.updateOrganizationStatus({
      actorUserId: created.membership.userId,
      organizationId: created.organization.id,
      expectedVersion: reactivated.version,
      status: "closed"
    });

    expect(closed.status).toBe("closed");
    expect(created.membership.status).toBe("active");
    expect(organizationRepository.auditActions()).toEqual(
      expect.arrayContaining([
        "organization.updated",
        "organization.suspended",
        "organization.reactivated",
        "organization.closed"
      ])
    );
  });

  it("rolls back organization creation when owner membership bootstrap fails", async () => {
    const membershipRepository = new MemoryOrganizationMembershipRepository();
    const organizationRepository = new MemoryEmployerOrganizationRepository(membershipRepository);
    organizationRepository.failOwnerMembershipBootstrap = true;
    const service = createEmployerOrganizationService(
      organizationRepository,
      createOrganizationMembershipService(membershipRepository),
      createAuthorizationService()
    );

    await expect(
      service.createOrganization({
        actorUserId: "00000000-0000-4000-8000-000000000001",
        legalName: "Rollback Tenant",
        displayName: "Rollback Tenant"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "bootstrap_failed" }) });
    expect(organizationRepository.organizationCount()).toBe(0);
    expect(
      await membershipRepository.listMembershipsForUser("00000000-0000-4000-8000-000000000001")
    ).toHaveLength(0);
  });
});

describe("residence foundation", () => {
  it("creates, reads, lists, updates, and audits organization residences", async () => {
    const { organizationService, residenceService, residenceRepository } =
      createResidenceTestServices();
    const ownerId = "00000000-0000-4000-8000-000000000001";
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Residence Tenant",
      displayName: "Residence Tenant"
    });

    const created = await residenceService.createResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      name: "Sunrise Pointe",
      addressSummary: "100 Main Street",
      city: "Montreal",
      region: "QC",
      country: "CA"
    });
    const read = await residenceService.getResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: created.id
    });
    const listed = await residenceService.listResidences({
      actorUserId: ownerId,
      organizationId: organization.organization.id
    });
    const updated = await residenceService.updateResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: created.id,
      expectedVersion: created.version,
      name: "Sunrise Pointe Updated",
      city: "Laval"
    });

    expect(read.id).toBe(created.id);
    expect(listed).toHaveLength(1);
    expect(updated).toMatchObject({
      name: "Sunrise Pointe Updated",
      city: "Laval"
    });
    expect(residenceRepository.auditActions()).toEqual(["residence.created", "residence.updated"]);
  });

  it("enforces tenant isolation, membership state, and residence permissions", async () => {
    const { organizationService, residenceService, membershipService } =
      createResidenceTestServices();
    const ownerA = "00000000-0000-4000-8000-000000000001";
    const ownerB = "00000000-0000-4000-8000-000000000002";
    const organizationA = await organizationService.createOrganization({
      actorUserId: ownerA,
      legalName: "Tenant A",
      displayName: "Tenant A"
    });
    const organizationB = await organizationService.createOrganization({
      actorUserId: ownerB,
      legalName: "Tenant B",
      displayName: "Tenant B"
    });
    const residenceB = await residenceService.createResidence({
      actorUserId: ownerB,
      organizationId: organizationB.organization.id,
      name: "Tenant B Residence"
    });
    const staff = await membershipService.inviteMembership({
      organizationId: organizationA.organization.id,
      userId: "00000000-0000-4000-8000-000000000003",
      invitedByUserId: ownerA,
      accessRoleKeys: ["ORGANIZATION_STAFF"]
    });

    await expect(
      residenceService.getResidence({
        actorUserId: ownerA,
        organizationId: organizationB.organization.id,
        residenceId: residenceB.id
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "membership_denied" }) });
    await expect(
      residenceService.listResidences({
        actorUserId: ownerA,
        organizationId: organizationB.organization.id
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "membership_denied" }) });
    await expect(
      residenceService.createResidence({
        actorUserId: staff.userId,
        organizationId: organizationA.organization.id,
        name: "Invited Staff Residence"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "membership_denied" }) });

    await membershipService.activateMembership({
      userId: staff.userId,
      membershipId: staff.id,
      actorUserId: ownerA
    });
    await expect(
      residenceService.updateResidence({
        actorUserId: staff.userId,
        organizationId: organizationA.organization.id,
        residenceId: residenceB.id,
        expectedVersion: residenceB.version,
        name: "Wrong Tenant"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "permission_denied" }) });
  });

  it("handles stale versions and approved active inactive closed transitions", async () => {
    const { organizationService, residenceService } = createResidenceTestServices();
    const ownerId = "00000000-0000-4000-8000-000000000001";
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Lifecycle Tenant",
      displayName: "Lifecycle Tenant"
    });
    const residence = await residenceService.createResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      name: "Lifecycle Residence"
    });
    const updated = await residenceService.updateResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      expectedVersion: residence.version,
      name: "Lifecycle Residence Updated"
    });

    await expect(
      residenceService.updateResidence({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id,
        expectedVersion: residence.version,
        name: "Stale"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "version_conflict" }) });

    const inactive = await residenceService.updateResidenceStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      expectedVersion: updated.version,
      status: "inactive",
      reason: "temporary closure"
    });
    const reactivated = await residenceService.updateResidenceStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      expectedVersion: inactive.version,
      status: "active",
      reason: "ready"
    });
    const closed = await residenceService.updateResidenceStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      expectedVersion: reactivated.version,
      status: "closed",
      reason: "permanent closure"
    });

    await expect(
      residenceService.updateResidenceStatus({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id,
        expectedVersion: closed.version,
        status: "active",
        reason: "not allowed"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "invalid_transition" })
    });
    await expect(
      residenceService.updateResidence({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id,
        expectedVersion: closed.version,
        name: "Closed Update"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "residence_inactive" })
    });
    await expect(
      residenceService.getResidence({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id
      })
    ).resolves.toMatchObject({ status: "closed" });
  });

  it("blocks residence management when employer organization is suspended or closed", async () => {
    const { organizationService, residenceService } = createResidenceTestServices();
    const ownerId = "00000000-0000-4000-8000-000000000001";
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Blocked Tenant",
      displayName: "Blocked Tenant"
    });
    const suspended = await organizationService.updateOrganizationStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      expectedVersion: organization.organization.version,
      status: "suspended"
    });

    await expect(
      residenceService.createResidence({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        name: "Blocked Residence"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "organization_inactive" })
    });

    await expect(
      organizationService.updateOrganizationStatus({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        expectedVersion: suspended.version,
        status: "closed"
      })
    ).resolves.toMatchObject({ status: "closed" });
  });

  it("rolls back residence creation if transactional audit fails", async () => {
    const { organizationService, residenceService, residenceRepository } =
      createResidenceTestServices();
    const ownerId = "00000000-0000-4000-8000-000000000001";
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Rollback Residence",
      displayName: "Rollback Residence"
    });
    residenceRepository.failCreateAudit = true;

    await expect(
      residenceService.createResidence({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        name: "Rollback Residence Site"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "audit_failed" }) });
    expect(residenceRepository.residenceCount()).toBe(0);
  });
});

describe("department foundation", () => {
  it("creates, reads, lists, updates, and audits departments under one residence", async () => {
    const { organizationService, residenceService, departmentService, departmentRepository } =
      createDepartmentTestServices();
    const ownerId = "00000000-0000-4000-8000-000000000001";
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Department Tenant",
      displayName: "Department Tenant"
    });
    const residence = await residenceService.createResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      name: "Department Residence"
    });
    const created = await departmentService.createDepartment({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      name: "Dining Services"
    });
    const read = await departmentService.getDepartment({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      departmentId: created.id
    });
    const listed = await departmentService.listDepartments({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id
    });
    const updated = await departmentService.updateDepartment({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      departmentId: created.id,
      expectedVersion: created.version,
      name: "Dining and Kitchen"
    });

    expect(read.id).toBe(created.id);
    expect(listed).toHaveLength(1);
    expect(updated.name).toBe("Dining and Kitchen");
    expect(departmentRepository.auditActions()).toEqual([
      "department.created",
      "department.updated"
    ]);
  });

  it("enforces tenant isolation, residence ownership, membership state, and permissions", async () => {
    const { organizationService, residenceService, departmentService, membershipService } =
      createDepartmentTestServices();
    const ownerA = "00000000-0000-4000-8000-000000000001";
    const ownerB = "00000000-0000-4000-8000-000000000002";
    const organizationA = await organizationService.createOrganization({
      actorUserId: ownerA,
      legalName: "Department Tenant A",
      displayName: "Department Tenant A"
    });
    const organizationB = await organizationService.createOrganization({
      actorUserId: ownerB,
      legalName: "Department Tenant B",
      displayName: "Department Tenant B"
    });
    const residenceA = await residenceService.createResidence({
      actorUserId: ownerA,
      organizationId: organizationA.organization.id,
      name: "Residence A"
    });
    const residenceB = await residenceService.createResidence({
      actorUserId: ownerB,
      organizationId: organizationB.organization.id,
      name: "Residence B"
    });
    const departmentB = await departmentService.createDepartment({
      actorUserId: ownerB,
      organizationId: organizationB.organization.id,
      residenceId: residenceB.id,
      name: "Tenant B Department"
    });
    const staff = await membershipService.inviteMembership({
      organizationId: organizationA.organization.id,
      userId: "00000000-0000-4000-8000-000000000003",
      invitedByUserId: ownerA,
      accessRoleKeys: ["ORGANIZATION_STAFF"]
    });

    await expect(
      departmentService.getDepartment({
        actorUserId: ownerA,
        organizationId: organizationB.organization.id,
        residenceId: residenceB.id,
        departmentId: departmentB.id
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "membership_denied" }) });
    await expect(
      departmentService.getDepartment({
        actorUserId: ownerA,
        organizationId: organizationA.organization.id,
        residenceId: residenceA.id,
        departmentId: departmentB.id
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "not_found" }) });
    await expect(
      departmentService.createDepartment({
        actorUserId: staff.userId,
        organizationId: organizationA.organization.id,
        residenceId: residenceA.id,
        name: "Invited Staff Department"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "membership_denied" }) });

    await membershipService.activateMembership({
      userId: staff.userId,
      membershipId: staff.id,
      actorUserId: ownerA
    });
    await expect(
      departmentService.updateDepartment({
        actorUserId: staff.userId,
        organizationId: organizationA.organization.id,
        residenceId: residenceA.id,
        departmentId: departmentB.id,
        expectedVersion: departmentB.version,
        name: "Wrong Tenant"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "permission_denied" }) });
  });

  it("handles stale versions and approved active inactive closed transitions", async () => {
    const { organizationService, residenceService, departmentService } =
      createDepartmentTestServices();
    const ownerId = "00000000-0000-4000-8000-000000000001";
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Department Lifecycle",
      displayName: "Department Lifecycle"
    });
    const residence = await residenceService.createResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      name: "Lifecycle Residence"
    });
    const department = await departmentService.createDepartment({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      name: "Lifecycle Department"
    });
    const updated = await departmentService.updateDepartment({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      departmentId: department.id,
      expectedVersion: department.version,
      name: "Lifecycle Department Updated"
    });

    await expect(
      departmentService.updateDepartment({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id,
        departmentId: department.id,
        expectedVersion: department.version,
        name: "Stale"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "version_conflict" }) });

    const inactive = await departmentService.updateDepartmentStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      departmentId: department.id,
      expectedVersion: updated.version,
      status: "inactive",
      reason: "temporary pause"
    });
    const reactivated = await departmentService.updateDepartmentStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      departmentId: department.id,
      expectedVersion: inactive.version,
      status: "active",
      reason: "ready"
    });
    const closed = await departmentService.updateDepartmentStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      departmentId: department.id,
      expectedVersion: reactivated.version,
      status: "closed",
      reason: "permanent closure"
    });

    await expect(
      departmentService.updateDepartmentStatus({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id,
        departmentId: department.id,
        expectedVersion: closed.version,
        status: "active",
        reason: "not allowed"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "invalid_transition" })
    });
    await expect(
      departmentService.updateDepartment({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id,
        departmentId: department.id,
        expectedVersion: closed.version,
        name: "Closed Update"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "department_inactive" })
    });
    await expect(
      departmentService.getDepartment({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id,
        departmentId: department.id
      })
    ).resolves.toMatchObject({ status: "closed" });
  });

  it("blocks department management when employer organization or residence is inactive", async () => {
    const { organizationService, residenceService, departmentService } =
      createDepartmentTestServices();
    const ownerId = "00000000-0000-4000-8000-000000000001";
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Department Blocked",
      displayName: "Department Blocked"
    });
    const residence = await residenceService.createResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      name: "Blocked Residence"
    });
    const inactiveResidence = await residenceService.updateResidenceStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      expectedVersion: residence.version,
      status: "inactive",
      reason: "paused"
    });

    await expect(
      departmentService.createDepartment({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: inactiveResidence.id,
        name: "Blocked Department"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "residence_inactive" })
    });

    const reactivated = await residenceService.updateResidenceStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      expectedVersion: inactiveResidence.version,
      status: "active",
      reason: "ready"
    });
    const suspended = await organizationService.updateOrganizationStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      expectedVersion: organization.organization.version,
      status: "suspended"
    });

    expect(reactivated.status).toBe("active");
    expect(suspended.status).toBe("suspended");
    await expect(
      departmentService.createDepartment({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id,
        name: "Org Blocked Department"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "organization_inactive" })
    });
  });

  it("rolls back department creation if transactional audit fails", async () => {
    const { organizationService, residenceService, departmentService, departmentRepository } =
      createDepartmentTestServices();
    const ownerId = "00000000-0000-4000-8000-000000000001";
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Department Rollback",
      displayName: "Department Rollback"
    });
    const residence = await residenceService.createResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      name: "Rollback Residence"
    });
    departmentRepository.failCreateAudit = true;

    await expect(
      departmentService.createDepartment({
        actorUserId: ownerId,
        organizationId: organization.organization.id,
        residenceId: residence.id,
        name: "Rollback Department"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "audit_failed" }) });
    expect(departmentRepository.departmentCount()).toBe(0);
  });
});

describe("work groups foundation", () => {
  it("lists active WorkGroups in deterministic order with stable public slugs", async () => {
    const { workGroupService } = createWorkGroupTestServices();
    const workGroups = await workGroupService.listActiveWorkGroups({
      session: activeSession(),
      roles: ["ORGANIZATION_OWNER"]
    });

    expect(workGroups.map((workGroup) => workGroup.slug)).toEqual([
      "kitchen",
      "care-nursing",
      "housekeeping-support",
      "maintenance"
    ]);
    expect(workGroups.map((workGroup) => workGroup.displayOrder)).toEqual([10, 20, 30, 40]);
  });

  it("allows ordinary catalogue reads but denies ordinary catalogue management", async () => {
    const { workGroupService } = createWorkGroupTestServices();
    const session = activeSession();
    const kitchen = await workGroupService.getActiveWorkGroup({
      session,
      roles: ["ORGANIZATION_OWNER"],
      slug: "kitchen"
    });

    await expect(
      workGroupService.updateWorkGroup({
        session,
        roles: ["ORGANIZATION_OWNER"],
        slug: "kitchen",
        expectedVersion: kitchen.version,
        displayLabel: "Kitchen Updated"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "permission_denied" }) });
  });

  it("allows platform administrators to update presentation fields and lifecycle", async () => {
    const { workGroupService, workGroupRepository } = createWorkGroupTestServices();
    const session = activeSession();
    const kitchen = await workGroupService.getWorkGroupForManagement({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      slug: "kitchen"
    });
    const updated = await workGroupService.updateWorkGroup({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      slug: "kitchen",
      expectedVersion: kitchen.version,
      displayLabel: "Kitchen Operations",
      displayOrder: 11,
      iconKey: "chef-hat"
    });
    const inactive = await workGroupService.updateWorkGroupStatus({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      slug: "kitchen",
      expectedVersion: updated.version,
      status: "inactive",
      reason: "catalogue pause"
    });
    const reactivated = await workGroupService.updateWorkGroupStatus({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      slug: "kitchen",
      expectedVersion: inactive.version,
      status: "active",
      reason: "catalogue ready"
    });

    expect(updated).toMatchObject({
      slug: "kitchen",
      displayLabel: "Kitchen Operations",
      displayOrder: 11,
      iconKey: "chef-hat"
    });
    expect(inactive.status).toBe("inactive");
    expect(reactivated.status).toBe("active");
    expect(workGroupRepository.auditActions()).toEqual([
      "work_group.updated",
      "work_group.deactivated",
      "work_group.activated"
    ]);
  });

  it("hides inactive WorkGroups from ordinary reads while platform admins can see them", async () => {
    const { workGroupService } = createWorkGroupTestServices();
    const session = activeSession();
    const kitchen = await workGroupService.getWorkGroupForManagement({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      slug: "kitchen"
    });
    await workGroupService.updateWorkGroupStatus({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      slug: "kitchen",
      expectedVersion: kitchen.version,
      status: "inactive",
      reason: "catalogue pause"
    });

    await expect(
      workGroupService.getActiveWorkGroup({
        session,
        roles: ["ORGANIZATION_OWNER"],
        slug: "kitchen"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "not_found" }) });
    await expect(
      workGroupService.listAllWorkGroups({
        session,
        roles: ["PLATFORM_ADMINISTRATOR"]
      })
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: "kitchen", status: "inactive" })])
    );
  });

  it("rejects stale updates, unknown slugs, anonymous reads, and invalid lifecycle transitions safely", async () => {
    const { workGroupService } = createWorkGroupTestServices();
    const session = activeSession();
    const kitchen = await workGroupService.getWorkGroupForManagement({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      slug: "kitchen"
    });
    const inactive = await workGroupService.updateWorkGroupStatus({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      slug: "kitchen",
      expectedVersion: kitchen.version,
      status: "inactive",
      reason: "catalogue pause"
    });

    await expect(
      workGroupService.updateWorkGroup({
        session,
        roles: ["PLATFORM_ADMINISTRATOR"],
        slug: "kitchen",
        expectedVersion: kitchen.version,
        displayLabel: "Stale Kitchen"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "version_conflict" }) });
    await expect(
      workGroupService.getActiveWorkGroup({
        session,
        roles: ["ORGANIZATION_OWNER"],
        slug: "unknown"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "not_found" }) });
    await expect(
      workGroupService.listActiveWorkGroups({
        session: { authenticated: false, user: null, session: null },
        roles: ["ORGANIZATION_OWNER"]
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "permission_denied" }) });
    await expect(
      workGroupService.updateWorkGroupStatus({
        session,
        roles: ["PLATFORM_ADMINISTRATOR"],
        slug: "kitchen",
        expectedVersion: inactive.version,
        status: "inactive",
        reason: "already inactive"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "invalid_transition" })
    });
  });
});

describe("role definitions foundation", () => {
  it("lists active RoleDefinitions in deterministic WorkGroup and role order with stable codes and slugs", async () => {
    const { roleDefinitionService } = createRoleDefinitionTestServices();
    const roles = await roleDefinitionService.listActiveRoleDefinitions({
      session: activeSession(),
      roles: ["ORGANIZATION_OWNER"]
    });

    expect(roles.map((role) => role.code)).toEqual([
      "CHEF",
      "SOUS_CHEF",
      "COOK",
      "KITCHEN_HELPER",
      "DISHWASHER",
      "NURSE",
      "LICENSED_PRACTICAL_NURSE",
      "PERSONAL_SUPPORT_WORKER",
      "CARE_AIDE"
    ]);
    expect(roles.map((role) => role.slug)).toEqual([
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
  });

  it("filters by WorkGroup and reads active RoleDefinitions by code or slug", async () => {
    const { roleDefinitionService } = createRoleDefinitionTestServices();
    const session = activeSession();
    const kitchenRoles = await roleDefinitionService.listActiveRoleDefinitions({
      session,
      roles: ["ORGANIZATION_OWNER"],
      workGroupSlug: "kitchen"
    });
    const byCode = await roleDefinitionService.getActiveRoleDefinition({
      session,
      roles: ["ORGANIZATION_OWNER"],
      identifier: "LICENSED_PRACTICAL_NURSE"
    });
    const bySlug = await roleDefinitionService.getActiveRoleDefinition({
      session,
      roles: ["ORGANIZATION_OWNER"],
      identifier: "personal-support-worker"
    });

    expect(kitchenRoles.map((role) => role.slug)).toEqual([
      "chef",
      "sous-chef",
      "cook",
      "kitchen-helper",
      "dishwasher"
    ]);
    expect(byCode).toMatchObject({
      code: "LICENSED_PRACTICAL_NURSE",
      slug: "licensed-practical-nurse",
      workGroupSlug: "care-nursing"
    });
    expect(bySlug).toMatchObject({
      code: "PERSONAL_SUPPORT_WORKER",
      slug: "personal-support-worker"
    });
  });

  it("allows ordinary catalogue reads but denies organization owner management", async () => {
    const { roleDefinitionService } = createRoleDefinitionTestServices();
    const session = activeSession();
    const chef = await roleDefinitionService.getActiveRoleDefinition({
      session,
      roles: ["ORGANIZATION_OWNER"],
      identifier: "chef"
    });

    await expect(
      roleDefinitionService.updateRoleDefinition({
        session,
        roles: ["ORGANIZATION_OWNER"],
        identifier: "chef",
        expectedVersion: chef.version,
        displayLabel: "Denied Chef"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "permission_denied" }) });
  });

  it("allows platform administrators to update presentation and lifecycle without changing code slug or WorkGroup", async () => {
    const { roleDefinitionService, roleDefinitionRepository } = createRoleDefinitionTestServices();
    const session = activeSession();
    const chef = await roleDefinitionService.getRoleDefinitionForManagement({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      identifier: "chef"
    });
    const updated = await roleDefinitionService.updateRoleDefinition({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      identifier: "chef",
      expectedVersion: chef.version,
      displayLabel: "Executive Chef",
      displayOrder: 12,
      qualificationSummary: "Updated presentation summary"
    });
    const inactive = await roleDefinitionService.updateRoleDefinitionStatus({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      identifier: "chef",
      expectedVersion: updated.version,
      status: "inactive",
      reason: "catalogue pause"
    });
    const reactivated = await roleDefinitionService.updateRoleDefinitionStatus({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      identifier: "chef",
      expectedVersion: inactive.version,
      status: "active",
      reason: "catalogue ready"
    });

    expect(updated).toMatchObject({
      code: "CHEF",
      slug: "chef",
      workGroupSlug: "kitchen",
      displayLabel: "Executive Chef",
      displayOrder: 12
    });
    expect(inactive.status).toBe("inactive");
    expect(reactivated.status).toBe("active");
    expect(roleDefinitionRepository.auditActions()).toEqual([
      "role_definition.updated",
      "role_definition.deactivated",
      "role_definition.activated"
    ]);
  });

  it("hides inactive roles and roles under inactive WorkGroups from ordinary reads", async () => {
    const { roleDefinitionService, roleDefinitionRepository } = createRoleDefinitionTestServices();
    const session = activeSession();
    roleDefinitionRepository.setWorkGroupStatus("kitchen", "inactive");

    await expect(
      roleDefinitionService.getActiveRoleDefinition({
        session,
        roles: ["ORGANIZATION_OWNER"],
        identifier: "chef"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "not_found" }) });
    await expect(
      roleDefinitionService.listAllRoleDefinitions({
        session,
        roles: ["PLATFORM_ADMINISTRATOR"],
        workGroupSlug: "kitchen"
      })
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: "chef", workGroupSlug: "kitchen" })])
    );
  });

  it("rejects stale updates, unknown identifiers, anonymous reads, and invalid lifecycle transitions safely", async () => {
    const { roleDefinitionService } = createRoleDefinitionTestServices();
    const session = activeSession();
    const chef = await roleDefinitionService.getRoleDefinitionForManagement({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      identifier: "chef"
    });
    const inactive = await roleDefinitionService.updateRoleDefinitionStatus({
      session,
      roles: ["PLATFORM_ADMINISTRATOR"],
      identifier: "chef",
      expectedVersion: chef.version,
      status: "inactive",
      reason: "catalogue pause"
    });

    await expect(
      roleDefinitionService.updateRoleDefinition({
        session,
        roles: ["PLATFORM_ADMINISTRATOR"],
        identifier: "chef",
        expectedVersion: chef.version,
        displayLabel: "Stale Chef"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "version_conflict" }) });
    await expect(
      roleDefinitionService.getActiveRoleDefinition({
        session,
        roles: ["ORGANIZATION_OWNER"],
        identifier: "unknown-role"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "not_found" }) });
    await expect(
      roleDefinitionService.listActiveRoleDefinitions({
        session: { authenticated: false, user: null, session: null },
        roles: ["ORGANIZATION_OWNER"]
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "permission_denied" }) });
    await expect(
      roleDefinitionService.updateRoleDefinitionStatus({
        session,
        roles: ["PLATFORM_ADMINISTRATOR"],
        identifier: "chef",
        expectedVersion: inactive.version,
        status: "inactive",
        reason: "already inactive"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "invalid_transition" })
    });
  });
});

describe("job request foundation", () => {
  it("creates immutable human-readable numbers and submits through the employer boundary", async () => {
    const {
      organizationService,
      residenceService,
      departmentService,
      jobRequestService,
      jobRequestRepository
    } = createJobRequestTestServices();
    const ownerId = "owner-job-request";
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Job Request Org",
      displayName: "Job Request Org"
    });
    const residence = await residenceService.createResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      name: "Job Request Residence"
    });
    const department = await departmentService.createDepartment({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      name: "Kitchen"
    });

    const draft = await jobRequestService.createDraft({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      departmentId: department.id,
      workGroupSlug: "kitchen",
      roleDefinitionIdentifier: "chef",
      title: "Evening Chef Coverage",
      description: "Resident dinner service coverage",
      numberOfWorkers: 2,
      urgency: "urgent",
      requestType: "single_day",
      timezone: "America/Toronto",
      startAt: new Date("2026-08-01T20:00:00.000Z"),
      endAt: new Date("2026-08-02T02:00:00.000Z")
    });
    const secondDraft = await jobRequestService.createDraft({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      departmentId: department.id,
      workGroupSlug: "care-nursing",
      roleDefinitionIdentifier: "personal-support-worker",
      title: "PSW Morning Support",
      description: null,
      numberOfWorkers: 1,
      urgency: "normal",
      requestType: "single_day",
      timezone: "America/Toronto",
      startAt: new Date("2026-08-03T12:00:00.000Z"),
      endAt: new Date("2026-08-03T18:00:00.000Z")
    });

    expect(draft.jobRequestNumber).toBe("JR-2026-000001");
    expect(secondDraft.jobRequestNumber).toBe("JR-2026-000002");
    expect(draft.status).toBe("draft");
    expect(draft.versionToken).toBe(0);

    const submitted = await jobRequestService.submit({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      jobRequestId: draft.id,
      expectedVersion: draft.versionToken
    });

    expect(submitted.status).toBe("submitted");
    expect(submitted.versionToken).toBe(1);
    expect(submitted.jobRequestNumber).toBe(draft.jobRequestNumber);
    expect(jobRequestRepository.auditActions()).toEqual([
      "job_request.created",
      "job_request.created",
      "job_request.submitted"
    ]);
  });

  it("enforces parent ownership, tenant isolation, state transitions, and optimistic concurrency", async () => {
    const {
      organizationService,
      residenceService,
      departmentService,
      jobRequestService,
      jobRequestRepository
    } = createJobRequestTestServices();
    const ownerA = "owner-job-request-a";
    const ownerB = "owner-job-request-b";
    const organizationA = await organizationService.createOrganization({
      actorUserId: ownerA,
      legalName: "Tenant A",
      displayName: "Tenant A"
    });
    const organizationB = await organizationService.createOrganization({
      actorUserId: ownerB,
      legalName: "Tenant B",
      displayName: "Tenant B"
    });
    const residenceA = await residenceService.createResidence({
      actorUserId: ownerA,
      organizationId: organizationA.organization.id,
      name: "Residence A"
    });
    const residenceB = await residenceService.createResidence({
      actorUserId: ownerB,
      organizationId: organizationB.organization.id,
      name: "Residence B"
    });
    const departmentA = await departmentService.createDepartment({
      actorUserId: ownerA,
      organizationId: organizationA.organization.id,
      residenceId: residenceA.id,
      name: "Kitchen A"
    });
    const departmentB = await departmentService.createDepartment({
      actorUserId: ownerB,
      organizationId: organizationB.organization.id,
      residenceId: residenceB.id,
      name: "Kitchen B"
    });

    await expect(
      jobRequestService.createDraft({
        actorUserId: ownerA,
        organizationId: organizationA.organization.id,
        residenceId: residenceA.id,
        departmentId: departmentB.id,
        workGroupSlug: "kitchen",
        roleDefinitionIdentifier: "chef",
        title: "Invalid Parent Chain",
        numberOfWorkers: 1,
        urgency: "normal",
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt: new Date("2026-08-01T12:00:00.000Z"),
        endAt: new Date("2026-08-01T18:00:00.000Z")
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "parent_mismatch" }) });

    const draft = await jobRequestService.createDraft({
      actorUserId: ownerA,
      organizationId: organizationA.organization.id,
      residenceId: residenceA.id,
      departmentId: departmentA.id,
      workGroupSlug: "kitchen",
      roleDefinitionIdentifier: "chef",
      title: "Tenant A Chef",
      numberOfWorkers: 1,
      urgency: "normal",
      requestType: "single_day",
      timezone: "America/Toronto",
      startAt: new Date("2026-08-02T12:00:00.000Z"),
      endAt: new Date("2026-08-02T18:00:00.000Z")
    });

    await expect(
      jobRequestService.getForOrganization({
        actorUserId: ownerB,
        organizationId: organizationB.organization.id,
        jobRequestIdOrNumber: draft.id
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "not_found" }) });

    await expect(
      jobRequestService.updateDraft({
        actorUserId: ownerA,
        organizationId: organizationA.organization.id,
        jobRequestId: draft.id,
        expectedVersion: draft.versionToken + 1,
        title: "Stale Update"
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "version_conflict" }) });

    const submitted = await jobRequestService.submit({
      actorUserId: ownerA,
      organizationId: organizationA.organization.id,
      jobRequestId: draft.id,
      expectedVersion: draft.versionToken
    });

    await expect(
      jobRequestService.updateDraft({
        actorUserId: ownerA,
        organizationId: organizationA.organization.id,
        jobRequestId: draft.id,
        expectedVersion: submitted.versionToken,
        title: "Cannot Edit Submitted"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "invalid_transition" })
    });
    expect(jobRequestRepository.auditActions()).toEqual([
      "job_request.created",
      "job_request.submitted"
    ]);
  });

  it("supports admin intake review, information requests, resubmission, and dispatch-boundary approval", async () => {
    const {
      organizationService,
      residenceService,
      departmentService,
      jobRequestService,
      jobRequestRepository
    } = createJobRequestTestServices();
    const ownerId = "owner-admin-intake";
    const adminSession = activeSession({ emailNormalized: "admin@example.com" });
    const organization = await organizationService.createOrganization({
      actorUserId: ownerId,
      legalName: "Admin Intake Org",
      displayName: "Admin Intake Org"
    });
    const residence = await residenceService.createResidence({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      name: "Admin Intake Residence"
    });
    const department = await departmentService.createDepartment({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      name: "Care"
    });
    const draft = await jobRequestService.createDraft({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      residenceId: residence.id,
      departmentId: department.id,
      workGroupSlug: "care-nursing",
      roleDefinitionIdentifier: "personal-support-worker",
      title: "PSW Weekend Coverage",
      numberOfWorkers: 3,
      urgency: "urgent",
      requestType: "multi_day",
      timezone: "America/Toronto",
      startAt: new Date("2026-08-07T12:00:00.000Z"),
      endAt: new Date("2026-08-09T18:00:00.000Z")
    });
    const submitted = await jobRequestService.submit({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      jobRequestId: draft.id,
      expectedVersion: draft.versionToken
    });

    await expect(
      jobRequestService.startAdminReview({
        session: adminSession,
        roles: ["ORGANIZATION_OWNER"],
        jobRequestId: submitted.id,
        expectedVersion: submitted.versionToken
      })
    ).rejects.toMatchObject({ decision: expect.objectContaining({ status: "permission_denied" }) });

    const adminReview = await jobRequestService.startAdminReview({
      session: adminSession,
      roles: ["PLATFORM_ADMINISTRATOR"],
      jobRequestId: submitted.id,
      expectedVersion: submitted.versionToken
    });
    const informationRequired = await jobRequestService.requestInformation({
      session: adminSession,
      roles: ["PLATFORM_ADMINISTRATOR"],
      jobRequestId: adminReview.id,
      expectedVersion: adminReview.versionToken,
      reason: "Confirm the exact weekend meal support window."
    });
    const resubmitted = await jobRequestService.submit({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      jobRequestId: informationRequired.id,
      expectedVersion: informationRequired.versionToken
    });
    const secondAdminReview = await jobRequestService.startAdminReview({
      session: adminSession,
      roles: ["PLATFORM_ADMINISTRATOR"],
      jobRequestId: resubmitted.id,
      expectedVersion: resubmitted.versionToken
    });
    const approved = await jobRequestService.approveForDispatch({
      session: adminSession,
      roles: ["PLATFORM_ADMINISTRATOR"],
      jobRequestId: secondAdminReview.id,
      expectedVersion: secondAdminReview.versionToken
    });

    expect(approved.status).toBe("approved_for_dispatch");
    expect(
      (
        await jobRequestService.listAdminIntake({
          session: adminSession,
          roles: ["PLATFORM_ADMINISTRATOR"]
        })
      ).map((jobRequest) => jobRequest.id)
    ).not.toContain(approved.id);
    expect(jobRequestRepository.auditActions()).toEqual([
      "job_request.created",
      "job_request.submitted",
      "job_request.access_denied",
      "job_request.admin_review_started",
      "job_request.information_requested",
      "job_request.resubmitted",
      "job_request.admin_review_started",
      "job_request.approved_for_dispatch"
    ]);
  });
});

describe("dispatch foundation", () => {
  it("creates one active dispatch review only from an approved Job Request", async () => {
    const { dispatchService, dispatchRepository, approvedJobRequest, adminSession } =
      await createApprovedDispatchContext();

    const dispatchReview = await dispatchService.createDispatch({
      session: adminSession,
      roles: ["DISPATCHER"],
      jobRequestIdOrNumber: approvedJobRequest.jobRequestNumber
    });

    expect(dispatchReview.state).toBe("draft");
    expect(dispatchReview.requiredWorkerCount).toBe(approvedJobRequest.numberOfWorkers);
    expect(dispatchReview.remainingWorkerCount).toBe(approvedJobRequest.numberOfWorkers);
    await expect(
      dispatchService.createDispatch({
        session: adminSession,
        roles: ["DISPATCHER"],
        jobRequestIdOrNumber: approvedJobRequest.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({
        status: "invalid_transition",
        internalReason: "non_terminal_dispatch_already_exists"
      })
    });
    expect(dispatchRepository.auditActions()).toEqual(["dispatch.created"]);
  });

  it("maps the database uniqueness race to one governed conflict and one audit", async () => {
    const { dispatchService, dispatchRepository, approvedJobRequest, adminSession } =
      await createApprovedDispatchContext();
    const createPersisted =
      dispatchRepository.createDispatchReviewWithAudit.bind(dispatchRepository);
    let createAttempts = 0;
    dispatchRepository.createDispatchReviewWithAudit = async (input) => {
      createAttempts += 1;
      if (createAttempts === 2) {
        throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      }
      return createPersisted(input);
    };

    const results = await Promise.allSettled([
      dispatchService.createDispatch({
        session: adminSession,
        roles: ["DISPATCHER"],
        jobRequestIdOrNumber: approvedJobRequest.id
      }),
      dispatchService.createDispatch({
        session: adminSession,
        roles: ["DISPATCHER"],
        jobRequestIdOrNumber: approvedJobRequest.id
      })
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const conflict = results.find((result) => result.status === "rejected");
    expect(conflict).toMatchObject({
      status: "rejected",
      reason: {
        decision: expect.objectContaining({
          status: "invalid_transition",
          internalReason: "non_terminal_dispatch_already_exists"
        })
      }
    });
    expect(
      await dispatchRepository.findActiveDispatchReviewForJobRequest(approvedJobRequest.id)
    ).not.toBeNull();
    expect(dispatchRepository.auditActions()).toEqual(["dispatch.created"]);
  });

  it("does not misclassify an unrelated unique error when no active review exists", async () => {
    const { dispatchService, dispatchRepository, approvedJobRequest, adminSession } =
      await createApprovedDispatchContext();
    dispatchRepository.createDispatchReviewWithAudit = async () => {
      throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    };

    await expect(
      dispatchService.createDispatch({
        session: adminSession,
        roles: ["DISPATCHER"],
        jobRequestIdOrNumber: approvedJobRequest.id
      })
    ).rejects.toMatchObject({ code: "P2002" });
    expect(dispatchRepository.auditActions()).toEqual([]);
  });

  it("keeps candidate source unavailable explicit and does not fabricate candidates", async () => {
    const { dispatchService, dispatchRepository, approvedJobRequest, adminSession } =
      await createApprovedDispatchContext();
    const dispatchReview = await dispatchService.createDispatch({
      session: adminSession,
      roles: ["DISPATCHER"],
      jobRequestIdOrNumber: approvedJobRequest.id
    });
    const reviewing = await dispatchService.startCandidateReview({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: dispatchReview.id,
      expectedVersion: dispatchReview.versionToken
    });
    const auditBeforeStatus = dispatchRepository.auditActions();
    const sourceStatus = await dispatchService.getCandidateSourceStatus({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: reviewing.id
    });

    const search = await dispatchService.searchCandidates({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: reviewing.id
    });
    const evaluation = await dispatchService.evaluateCandidate({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: reviewing.id,
      candidateSourceReference: "candidate-1"
    });

    expect(sourceStatus).toEqual({ status: "candidate_source_unavailable" });
    expect(auditBeforeStatus).toEqual(["dispatch.created", "dispatch.candidate_review_started"]);
    expect(search).toEqual({ status: "candidate_source_unavailable", candidates: [] });
    expect(evaluation).toEqual({ status: "candidate_source_unavailable", candidate: null });
    expect(await dispatchRepository.listCandidates(reviewing.id)).toEqual([]);
    expect(dispatchRepository.auditActions()).toContain("dispatch.candidate_source_unavailable");
  });

  it("supports human shortlist and offer-preparation boundary without creating assignments", async () => {
    const { dispatchService, dispatchRepository, approvedJobRequest, adminSession } =
      await createApprovedDispatchContext({
        candidateSource: new FixtureDispatchCandidateSource()
      });
    const dispatchReview = await dispatchService.createDispatch({
      session: adminSession,
      roles: ["DISPATCHER"],
      jobRequestIdOrNumber: approvedJobRequest.id
    });
    const reviewing = await dispatchService.startCandidateReview({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: dispatchReview.id,
      expectedVersion: dispatchReview.versionToken
    });
    const evaluation = await dispatchService.evaluateCandidate({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: reviewing.id,
      candidateSourceReference: "worker-alpha"
    });

    expect(evaluation.status).toBe("available");
    expect(evaluation.candidate).toMatchObject({
      candidateSourceReference: "worker-alpha",
      approvedDisplayName: "Approved Worker Alpha",
      recommendationState: "recommended"
    });
    expect(JSON.stringify(evaluation.candidate)).not.toContain("homeAddress");
    expect(JSON.stringify(evaluation.candidate)).not.toContain("bank");
    const shortlisted = await dispatchService.addCandidateToShortlist({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: reviewing.id,
      candidateSourceReference: "worker-alpha"
    });
    expect(shortlisted.shortlistState).toBe("shortlisted");
    const latest = await dispatchService.getDispatch({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: reviewing.id
    });

    const ready = await dispatchService.markShortlistReady({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: latest.dispatchReview.id,
      expectedVersion: latest.dispatchReview.versionToken
    });
    const offerPreparation = await dispatchService.moveToOfferPreparation({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: ready.id,
      expectedVersion: ready.versionToken
    });

    expect(offerPreparation.state).toBe("offer_preparation");
    expect(offerPreparation.preparedOfferCount).toBe(1);
    expect(offerPreparation.remainingWorkerCount).toBe(approvedJobRequest.numberOfWorkers - 1);
    expect(dispatchRepository.createdAssignments).toBe(0);
    expect(dispatchRepository.createdWorkerOffers).toBe(0);
  });

  it("returns employer dispatch status without candidate details", async () => {
    const { dispatchService, approvedJobRequest, adminSession, ownerId, organization } =
      await createApprovedDispatchContext({
        candidateSource: new FixtureDispatchCandidateSource()
      });
    const dispatchReview = await dispatchService.createDispatch({
      session: adminSession,
      roles: ["DISPATCHER"],
      jobRequestIdOrNumber: approvedJobRequest.id
    });

    const status = await dispatchService.getEmployerDispatchStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      jobRequestIdOrNumber: approvedJobRequest.id
    });

    expect(status).toMatchObject({
      jobRequestId: approvedJobRequest.id,
      dispatchState: dispatchReview.state,
      requiredWorkerCount: approvedJobRequest.numberOfWorkers
    });
    expect(JSON.stringify(status)).not.toContain("candidate");
  });

  it("keeps terminal dispatch status visible and prefers a later active review", async () => {
    const { dispatchService, approvedJobRequest, adminSession, ownerId, organization } =
      await createApprovedDispatchContext();
    const firstDispatch = await dispatchService.createDispatch({
      session: adminSession,
      roles: ["DISPATCHER"],
      jobRequestIdOrNumber: approvedJobRequest.id
    });
    const cancelledDispatch = await dispatchService.cancel({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: firstDispatch.id,
      expectedVersion: firstDispatch.versionToken,
      reason: "Employer coverage plan changed."
    });

    const terminalStatus = await dispatchService.getEmployerDispatchStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      jobRequestIdOrNumber: approvedJobRequest.id
    });

    expect(terminalStatus.dispatchState).toBe("cancelled");
    expect(terminalStatus.updatedAt).toEqual(cancelledDispatch.updatedAt);

    const replacementDispatch = await dispatchService.createDispatch({
      session: adminSession,
      roles: ["DISPATCHER"],
      jobRequestIdOrNumber: approvedJobRequest.id
    });
    const activeStatus = await dispatchService.getEmployerDispatchStatus({
      actorUserId: ownerId,
      organizationId: organization.organization.id,
      jobRequestIdOrNumber: approvedJobRequest.id
    });

    expect(activeStatus.dispatchState).toBe("draft");
    expect(activeStatus.updatedAt).toEqual(replacementDispatch.updatedAt);
  });

  it("denies organization and worker roles from dispatch authority", async () => {
    const { dispatchService, approvedJobRequest, adminSession } =
      await createApprovedDispatchContext();

    await expect(
      dispatchService.createDispatch({
        session: adminSession,
        roles: ["ORGANIZATION_OWNER"],
        jobRequestIdOrNumber: approvedJobRequest.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "permission_denied" })
    });
    await expect(
      dispatchService.createDispatch({
        session: adminSession,
        roles: ["WORKER_ACCESS"],
        jobRequestIdOrNumber: approvedJobRequest.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "permission_denied" })
    });
  });
});

describe("worker offer foundation", () => {
  it("allows only one atomic winner for a final offer-capacity slot", async () => {
    const { workerOfferRepository, dispatchReview, approvedJobRequest, workerOne } =
      await createWorkerOfferContext();
    const workerTwo = await workerOfferRepository.findWorkerIdentityByUserId(
      "00000000-0000-4000-8000-000000000002"
    );
    expect(workerTwo).not.toBeNull();
    const input = {
      dispatchReview,
      jobRequest: approvedJobRequest,
      expiresAt: new Date("2026-08-12T10:00:00.000Z"),
      workerVisibleTitle: approvedJobRequest.title,
      workerVisibleSummary: null,
      compensationSummary: null,
      policySummary: null,
      actorUserId: "00000000-0000-4000-8000-000000000099",
      capacityLimit: 1,
      now: new Date("2026-08-11T10:00:00.000Z")
    };
    const results = await Promise.all([
      workerOfferRepository.createWorkerOffer({ ...input, workerIdentity: workerOne }),
      workerOfferRepository.createWorkerOffer({ ...input, workerIdentity: workerTwo! })
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    await expect(
      workerOfferRepository.countCapacityOffersForDispatch(dispatchReview.id)
    ).resolves.toBe(1);
  });

  it("creates offers only from offer-preparation dispatch and enforces remaining-worker capacity", async () => {
    const { workerOfferService, workerOfferRepository, dispatchReview, adminSession, workerOne } =
      await createWorkerOfferContext();
    const unshortlistedWorker = await workerOfferRepository.findWorkerIdentityByUserId(
      "00000000-0000-4000-8000-000000000002"
    );
    expect(unshortlistedWorker).not.toBeNull();
    await expect(
      workerOfferService.createOffer({
        session: adminSession,
        roles: ["DISPATCHER"],
        dispatchReviewId: dispatchReview.id,
        workerIdentityId: unshortlistedWorker!.id,
        expiresAt: new Date("2026-08-12T10:00:00.000Z")
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({
        status: "invalid_input",
        internalReason: "worker_not_linked_to_shortlisted_candidate"
      })
    });
    const offer = await workerOfferService.createOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: dispatchReview.id,
      workerIdentityId: workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z"),
      compensationSummary: "Informational worker-facing summary only."
    });

    expect(offer.status).toBe("draft");
    expect(offer.currentTermsVersion).toMatchObject({
      versionNumber: 1,
      workerVisibleTitle: "Dispatch Chef Coverage"
    });
    expect(JSON.stringify(offer)).not.toContain("bank");
    expect(JSON.stringify(offer)).not.toContain("payroll");
    await expect(
      workerOfferService.createOffer({
        session: adminSession,
        roles: ["DISPATCHER"],
        dispatchReviewId: dispatchReview.id,
        workerIdentityId: workerOne.id,
        expiresAt: new Date("2026-08-12T10:00:00.000Z")
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "capacity_exceeded" })
    });
    expect(workerOfferRepository.auditActions()).toEqual([
      "worker_offer.created",
      "worker_offer.terms_version_created"
    ]);
  });

  it("approves, sends, views, and accepts without creating Assignment", async () => {
    const {
      workerOfferService,
      workerOfferRepository,
      dispatchRepository,
      dispatchReview,
      adminSession,
      workerOne,
      workerSession
    } = await createWorkerOfferContext();
    const draft = await workerOfferService.createOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: dispatchReview.id,
      workerIdentityId: workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z")
    });
    const approved = await workerOfferService.approve({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: draft.id,
      expectedVersion: draft.versionToken
    });
    const sent = await workerOfferService.send({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: approved.id,
      expectedVersion: approved.versionToken
    });
    const viewed = await workerOfferService.workerRead({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      workerOfferId: sent.id
    });
    const accepted = await workerOfferService.accept({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      workerOfferId: viewed.id,
      expectedVersion: viewed.versionToken,
      expectedTermsVersionId: viewed.currentTermsVersion!.id
    });

    expect(approved.status).toBe("approved");
    expect(sent.status).toBe("sent");
    expect(viewed.status).toBe("sent");
    expect(accepted.status).toBe("accepted");
    expect(dispatchRepository.createdAssignments).toBe(0);
    expect(dispatchRepository.createdWorkerOffers).toBe(0);
    expect(workerOfferRepository.auditActions()).toEqual(
      expect.arrayContaining([
        "worker_offer.approved",
        "worker_offer.sent",
        "worker_offer.accepted"
      ])
    );
  });

  it("records truthful delivery and reuses one idempotency key for retries", async () => {
    const idempotencyKeys: string[] = [];
    let attempt = 0;
    const context = await createWorkerOfferContext({
      deliveryProvider: {
        async deliver(input) {
          idempotencyKeys.push(input.idempotencyKey);
          attempt += 1;
          return attempt === 1
            ? { status: "failed", providerReference: null, retryable: true }
            : { status: "delivered", providerReference: "provider-accepted", retryable: false };
        }
      }
    });
    const draft = await context.workerOfferService.createOffer({
      session: context.adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: context.dispatchReview.id,
      workerIdentityId: context.workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z")
    });
    const approved = await context.workerOfferService.approve({
      session: context.adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: draft.id,
      expectedVersion: draft.versionToken
    });
    const sent = await context.workerOfferService.send({
      session: context.adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: approved.id,
      expectedVersion: approved.versionToken
    });
    const delivered = await context.workerOfferService.retryDelivery({
      session: context.adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: sent.id,
      expectedVersion: sent.versionToken
    });

    expect(sent.status).toBe("approved");
    expect(delivered.status).toBe("delivered");
    expect(idempotencyKeys).toHaveLength(2);
    expect(new Set(idempotencyKeys).size).toBe(1);
    expect(context.workerOfferRepository.auditActions()).toEqual(
      expect.arrayContaining(["worker_offer.delivery_failed", "worker_offer.delivery_succeeded"])
    );
  });

  it("does not retry delivery before approval", async () => {
    const context = await createWorkerOfferContext();
    const draft = await context.workerOfferService.createOffer({
      session: context.adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: context.dispatchReview.id,
      workerIdentityId: context.workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z")
    });

    await expect(
      context.workerOfferService.retryDelivery({
        session: context.adminSession,
        roles: ["DISPATCHER"],
        workerOfferId: draft.id,
        expectedVersion: draft.versionToken
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "invalid_transition" })
    });
  });

  it("surfaces provider acceptance that loses the persistence race for reconciliation", async () => {
    const context = await createWorkerOfferContext({
      deliveryProvider: {
        async deliver() {
          return { status: "delivered", providerReference: "accepted", retryable: false };
        }
      }
    });
    const draft = await context.workerOfferService.createOffer({
      session: context.adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: context.dispatchReview.id,
      workerIdentityId: context.workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z")
    });
    const approved = await context.workerOfferService.approve({
      session: context.adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: draft.id,
      expectedVersion: draft.versionToken
    });
    context.workerOfferRepository.failNextDeliveryFinalization = true;

    await expect(
      context.workerOfferService.send({
        session: context.adminSession,
        roles: ["DISPATCHER"],
        workerOfferId: approved.id,
        expectedVersion: approved.versionToken
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({
        status: "version_conflict",
        internalReason: "worker_offer_delivery_indeterminate_requires_reconciliation"
      })
    });
    expect(context.workerOfferRepository.auditActions()).not.toContain(
      "worker_offer.delivery_succeeded"
    );
  });

  it("reads a worker calendar offer reference without changing offer lifecycle state", async () => {
    const {
      workerOfferService,
      workerOfferRepository,
      dispatchReview,
      adminSession,
      workerOne,
      workerSession,
      otherWorkerSession
    } = await createWorkerOfferContext();
    const draft = await workerOfferService.createOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: dispatchReview.id,
      workerIdentityId: workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z")
    });
    const approved = await workerOfferService.approve({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: draft.id,
      expectedVersion: draft.versionToken
    });
    const sent = await workerOfferService.send({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: approved.id,
      expectedVersion: approved.versionToken
    });
    const auditBeforeRead = workerOfferRepository.auditActions();

    const reference = await workerOfferService.workerCalendarReference({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      workerOfferId: sent.id
    });

    expect(reference.status).toBe("sent");
    expect(reference.versionToken).toBe(sent.versionToken);
    expect(workerOfferRepository.auditActions()).toEqual(auditBeforeRead);
    await expect(
      workerOfferService.workerCalendarReference({
        session: otherWorkerSession,
        roles: ["WORKER_ACCESS"],
        workerOfferId: sent.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "permission_denied" })
    });
  });

  it("discovers only worker-owned visible offers without mutating lifecycle state", async () => {
    const {
      workerOfferService,
      workerOfferRepository,
      dispatchReview,
      adminSession,
      workerOne,
      workerSession,
      otherWorkerSession
    } = await createWorkerOfferContext();
    const draft = await workerOfferService.createOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: dispatchReview.id,
      workerIdentityId: workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z")
    });
    const approved = await workerOfferService.approve({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: draft.id,
      expectedVersion: draft.versionToken
    });
    const sent = await workerOfferService.send({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: approved.id,
      expectedVersion: approved.versionToken
    });
    const auditBeforeDiscovery = workerOfferRepository.auditActions();

    const owned = await workerOfferService.listWorkerOffers({
      session: workerSession,
      roles: ["WORKER_ACCESS"]
    });
    const otherWorker = await workerOfferService.listWorkerOffers({
      session: otherWorkerSession,
      roles: ["WORKER_ACCESS"]
    });

    expect(owned.map((offer) => offer.id)).toEqual([sent.id]);
    expect(owned[0]?.status).toBe("sent");
    expect(otherWorker).toEqual([]);
    expect(workerOfferRepository.auditActions()).toEqual(auditBeforeDiscovery);
  });

  it("rejects worker responses for stale terms, expired offers, and non-owned offers", async () => {
    const {
      workerOfferService,
      workerOfferRepository,
      dispatchReview,
      adminSession,
      workerOne,
      otherWorkerSession
    } = await createWorkerOfferContext();
    const draft = await workerOfferService.createOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: dispatchReview.id,
      workerIdentityId: workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z")
    });
    const approved = await workerOfferService.approve({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: draft.id,
      expectedVersion: draft.versionToken
    });
    const sent = await workerOfferService.send({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: approved.id,
      expectedVersion: approved.versionToken
    });

    await expect(
      workerOfferService.accept({
        session: otherWorkerSession,
        roles: ["WORKER_ACCESS"],
        workerOfferId: sent.id,
        expectedVersion: sent.versionToken,
        expectedTermsVersionId: sent.currentTermsVersion!.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "permission_denied" })
    });
    await expect(
      workerOfferService.accept({
        session: activeSession({ emailNormalized: "worker-one@example.com" }),
        roles: ["WORKER_ACCESS"],
        workerOfferId: sent.id,
        expectedVersion: sent.versionToken,
        expectedTermsVersionId: "stale-terms-version"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "stale_terms" })
    });
    expect(workerOfferRepository.auditActions()).toContain("worker_offer.response_rejected");
  });

  it("commits exactly one response and matching offer status under a response race", async () => {
    const {
      workerOfferService,
      workerOfferRepository,
      dispatchReview,
      adminSession,
      workerOne,
      workerSession
    } = await createWorkerOfferContext();
    const draft = await workerOfferService.createOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: dispatchReview.id,
      workerIdentityId: workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z")
    });
    const approved = await workerOfferService.approve({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: draft.id,
      expectedVersion: draft.versionToken
    });
    const sent = await workerOfferService.send({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: approved.id,
      expectedVersion: approved.versionToken
    });
    const responseInput = {
      session: workerSession,
      roles: ["WORKER_ACCESS"] as const,
      workerOfferId: sent.id,
      expectedVersion: sent.versionToken,
      expectedTermsVersionId: sent.currentTermsVersion!.id
    };

    const results = await Promise.allSettled([
      workerOfferService.accept(responseInput),
      workerOfferService.decline(responseInput)
    ]);
    const persisted = await workerOfferRepository.findWorkerOfferById(sent.id);
    const response = await workerOfferRepository.findResponseByOfferId(sent.id);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(persisted?.status).toBe(response?.responseType);
    expect(persisted?.respondedAt).not.toBeNull();
  });
});

describe("assignment foundation", () => {
  it("creates Assignment only from an accepted Worker Offer and preserves downstream boundaries", async () => {
    const {
      assignmentService,
      assignmentRepository,
      acceptedOffer,
      adminSession,
      approvedJobRequest
    } = await createAcceptedAssignmentContext();

    const assignment = await assignmentService.createFromAcceptedOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: acceptedOffer.id,
      expectedDispatchReviewId: acceptedOffer.dispatchReviewId,
      expectedOfferVersion: acceptedOffer.version
    });

    expect(assignment.status).toBe("confirmed");
    expect(assignment.workerOfferId).toBe(acceptedOffer.id);
    expect(assignment.workerOfferTermsVersionId).toBe(acceptedOffer.currentTermsVersion!.id);
    expect(assignment.jobRequestId).toBe(approvedJobRequest.id);
    expect(assignment.attendanceBoundary).toBe("not_started");
    expect(assignment.validationSnapshot).toMatchObject({
      policyVersion: "assignment-foundation-v2",
      workerOfferStatus: "accepted",
      attendanceCreated: false,
      workerCalendarCreated: false,
      payrollCreated: false
    });
    expect(assignmentRepository.createdAttendanceRecords).toBe(0);
    expect(assignmentRepository.createdWorkerCalendarEntries).toBe(0);
    expect(assignmentRepository.createdTimesheets).toBe(0);
    expect(assignmentRepository.createdPayrollRecords).toBe(0);
    expect(assignmentRepository.createdNotificationProviderMessages).toBe(0);
    expect(assignmentRepository.auditActions()).toEqual(
      expect.arrayContaining(["assignment.validation_passed", "assignment.confirmed"])
    );
  });

  it("serializes concurrent creation for the same accepted offer", async () => {
    const { assignmentService, assignmentRepository, acceptedOffer, adminSession } =
      await createAcceptedAssignmentContext();

    const results = await Promise.allSettled([
      assignmentService.createFromAcceptedOffer({
        session: adminSession,
        roles: ["DISPATCHER"],
        workerOfferId: acceptedOffer.id,
        expectedDispatchReviewId: acceptedOffer.dispatchReviewId,
        expectedOfferVersion: acceptedOffer.version
      }),
      assignmentService.createFromAcceptedOffer({
        session: adminSession,
        roles: ["DISPATCHER"],
        workerOfferId: acceptedOffer.id,
        expectedDispatchReviewId: acceptedOffer.dispatchReviewId,
        expectedOfferVersion: acceptedOffer.version
      })
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(
      await assignmentRepository.findAssignmentByWorkerOfferId(acceptedOffer.id)
    ).not.toBeNull();
  });

  it("binds Assignment creation to the reviewed dispatch and exact accepted-offer version", async () => {
    const { assignmentService, assignmentRepository, acceptedOffer, adminSession } =
      await createAcceptedAssignmentContext();

    await expect(
      assignmentService.createFromAcceptedOffer({
        session: adminSession,
        roles: ["DISPATCHER"],
        workerOfferId: acceptedOffer.id,
        expectedDispatchReviewId: "00000000-0000-4000-8000-000000000099",
        expectedOfferVersion: acceptedOffer.version
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "not_found" })
    });
    await expect(
      assignmentService.createFromAcceptedOffer({
        session: adminSession,
        roles: ["DISPATCHER"],
        workerOfferId: acceptedOffer.id,
        expectedDispatchReviewId: acceptedOffer.dispatchReviewId,
        expectedOfferVersion: acceptedOffer.version + 1
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "version_conflict" })
    });
    await expect(
      assignmentRepository.findAssignmentByWorkerOfferId(acceptedOffer.id)
    ).resolves.toBeNull();
  });

  it("bounds retries for serializable Assignment transaction conflicts", async () => {
    let attempts = 0;
    const repository = createPrismaAssignmentRepository({
      async $transaction() {
        attempts += 1;
        throw Object.assign(new Error("serialization conflict"), { code: "P2034" });
      }
    });

    await expect(
      repository.createAssignmentFromAcceptedOfferAtomically({
        workerOfferId: "00000000-0000-4000-8000-000000000001",
        expectedDispatchReviewId: "00000000-0000-4000-8000-000000000003",
        expectedOfferVersion: 1,
        actorUserId: "00000000-0000-4000-8000-000000000002",
        correlationId: "assignment_retry_test",
        now: new Date("2026-07-27T12:00:00.000Z")
      })
    ).rejects.toBeInstanceOf(AssignmentTransactionUnavailableError);
    expect(attempts).toBe(3);
  });

  it("rejects non-accepted offers, duplicate assignments, capacity overflow, and conflicts", async () => {
    const { assignmentService, assignmentRepository, acceptedOffer, adminSession } =
      await createAcceptedAssignmentContext();
    const draftContext = await createWorkerOfferContext();
    const draftAssignmentRepository = new MemoryAssignmentRepository();
    const draftJobRequestRepository = new MemoryJobRequestRepositoryWithSeed(
      draftContext.approvedJobRequest
    );
    draftAssignmentRepository.configureSources({
      workerOffers: draftContext.workerOfferRepository,
      dispatches: draftContext.dispatchRepository,
      jobRequests: draftJobRequestRepository
    });
    const draftAssignmentService = createAssignmentService(
      draftAssignmentRepository,
      draftContext.workerOfferRepository,
      draftContext.dispatchRepository,
      draftJobRequestRepository,
      createAuthorizationService()
    );
    const draftOffer = await draftContext.workerOfferService.createOffer({
      session: draftContext.adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: draftContext.dispatchReview.id,
      workerIdentityId: draftContext.workerOne.id,
      expiresAt: new Date("2026-08-12T10:00:00.000Z")
    });

    await expect(
      draftAssignmentService.createFromAcceptedOffer({
        session: draftContext.adminSession,
        roles: ["DISPATCHER"],
        workerOfferId: draftOffer.id,
        expectedDispatchReviewId: draftOffer.dispatchReviewId,
        expectedOfferVersion: draftOffer.version
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "worker_offer_not_accepted" })
    });

    const assignment = await assignmentService.createFromAcceptedOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: acceptedOffer.id,
      expectedDispatchReviewId: acceptedOffer.dispatchReviewId,
      expectedOfferVersion: acceptedOffer.version
    });

    await expect(
      assignmentService.createFromAcceptedOffer({
        session: adminSession,
        roles: ["DISPATCHER"],
        workerOfferId: acceptedOffer.id,
        expectedDispatchReviewId: acceptedOffer.dispatchReviewId,
        expectedOfferVersion: acceptedOffer.version
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "assignment_exists" })
    });

    expect(
      await assignmentRepository.countActiveAssignmentsForJobRequest(assignment.jobRequestId)
    ).toBe(1);
    expect(
      await assignmentRepository.countConflictingAssignments({
        workerIdentityId: assignment.workerIdentityId,
        startAt: assignment.confirmedStartAt,
        endAt: assignment.confirmedEndAt
      })
    ).toBe(1);
  });

  it("keeps worker acknowledgement separate from creation and stops at attendance handoff", async () => {
    const { assignmentService, assignmentRepository, acceptedOffer, adminSession, workerSession } =
      await createAcceptedAssignmentContext();
    const confirmed = await assignmentService.createFromAcceptedOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: acceptedOffer.id,
      expectedDispatchReviewId: acceptedOffer.dispatchReviewId,
      expectedOfferVersion: acceptedOffer.version
    });
    const acknowledged = await assignmentService.acknowledge({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      assignmentId: confirmed.id,
      expectedVersion: confirmed.versionToken
    });
    const ready = await assignmentService.markReadyForAttendance({
      session: adminSession,
      roles: ["DISPATCHER"],
      assignmentId: acknowledged.id,
      expectedVersion: acknowledged.versionToken
    });
    const windowStarted = await assignmentService.startAttendanceWindow({
      session: adminSession,
      roles: ["DISPATCHER"],
      assignmentId: ready.id,
      expectedVersion: ready.versionToken
    });
    const handoff = await assignmentService.attendanceHandoff({
      session: adminSession,
      roles: ["DISPATCHER"],
      assignmentId: windowStarted.id,
      expectedVersion: windowStarted.versionToken
    });

    expect(acknowledged.status).toBe("worker_acknowledged");
    expect(ready.status).toBe("ready_for_attendance");
    expect(windowStarted.status).toBe("in_attendance_window");
    expect(handoff.status).toBe("attendance_handoff");
    expect(handoff.attendanceBoundary).toBe("handoff_completed");
    expect(assignmentRepository.createdAttendanceRecords).toBe(0);
    expect(assignmentRepository.auditActions()).toEqual(
      expect.arrayContaining([
        "assignment.worker_acknowledged",
        "assignment.ready_for_attendance",
        "assignment.attendance_window_started",
        "assignment.attendance_handoff"
      ])
    );
  });

  it("allows employer read-only status and prevents workers from reading another worker assignment", async () => {
    const { assignmentService, acceptedOffer, adminSession, workerSession, otherWorkerSession } =
      await createAcceptedAssignmentContext();
    const assignment = await assignmentService.createFromAcceptedOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: acceptedOffer.id,
      expectedDispatchReviewId: acceptedOffer.dispatchReviewId,
      expectedOfferVersion: acceptedOffer.version
    });

    const employerVisible = await assignmentService.listAssignments({
      session: activeSession(),
      roles: ["ORGANIZATION_OWNER"],
      organizationId: assignment.organizationId
    });
    const workerVisible = await assignmentService.workerRead({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      assignmentId: assignment.id
    });

    expect(employerVisible).toHaveLength(1);
    expect(employerVisible.at(0)?.status).toBe("confirmed");
    expect(workerVisible.id).toBe(assignment.id);
    await expect(
      assignmentService.workerRead({
        session: otherWorkerSession,
        roles: ["WORKER_ACCESS"],
        assignmentId: assignment.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "permission_denied" })
    });
  });

  it("records neutral withdrawal and replacement boundary without executing replacement", async () => {
    const { assignmentService, assignmentRepository, acceptedOffer, adminSession, workerSession } =
      await createAcceptedAssignmentContext();
    const assignment = await assignmentService.createFromAcceptedOffer({
      session: adminSession,
      roles: ["DISPATCHER"],
      workerOfferId: acceptedOffer.id,
      expectedDispatchReviewId: acceptedOffer.dispatchReviewId,
      expectedOfferVersion: acceptedOffer.version
    });
    const withdrawn = await assignmentService.workerWithdraw({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      assignmentId: assignment.id,
      expectedVersion: assignment.versionToken,
      reason: "worker_requested_withdrawal"
    });
    const replacement = await assignmentService.markReplacementRequired({
      session: adminSession,
      roles: ["DISPATCHER"],
      assignmentId: withdrawn.id,
      expectedVersion: withdrawn.versionToken,
      reason: "worker_withdrawn"
    });

    expect(withdrawn.status).toBe("worker_withdrawn");
    expect(replacement.status).toBe("replacement_required");
    expect(assignmentRepository.createdNotificationProviderMessages).toBe(0);
    expect(assignmentRepository.auditActions()).toEqual(
      expect.arrayContaining(["assignment.worker_withdrawn", "assignment.replacement_required"])
    );
  });
});

describe("attendance foundation", () => {
  it("creates AttendanceRecord only from an attendance-ready Assignment", async () => {
    const { attendanceService, attendanceRepository, assignment, adminSession } =
      await createAttendanceContext();

    const attendanceRecord = await attendanceService.createFromAssignment({
      session: adminSession,
      roles: ["DISPATCHER"],
      assignmentId: assignment.id,
      verificationMethod: "qr_code"
    });

    expect(attendanceRecord.status).toBe("pending_start");
    expect(attendanceRecord.assignmentId).toBe(assignment.id);
    expect(attendanceRecord.assignmentStatusSnapshot).toBe("attendance_handoff");
    expect(attendanceRecord.verificationMethod).toBe("qr_code");
    expect(attendanceRecord.verificationBoundary).toBe("provider_neutral");
    expect(attendanceRecord.timesheetBoundary).toBe("not_started");
    expect(attendanceRepository.modifiedAssignments).toBe(0);
    expect(attendanceRepository.createdTimesheets).toBe(0);
    expect(attendanceRepository.createdPayrollRecords).toBe(0);
    expect(attendanceRepository.createdFinanceRecords).toBe(0);
    expect(attendanceRepository.createdInvoices).toBe(0);
    expect(attendanceRepository.createdGpsProviderRecords).toBe(0);
    expect(attendanceRepository.createdOfflineSyncRecords).toBe(0);
    expect(attendanceRepository.createdNotificationProviderMessages).toBe(0);
    expect(attendanceRepository.createdAnalyticsEvents).toBe(0);
    expect(attendanceRepository.createdAiActions).toBe(0);
    expect(attendanceRepository.auditActions()).toEqual(
      expect.arrayContaining(["attendance.creation_attempted", "attendance.created"])
    );
  });

  it("rejects non-ready Assignments and duplicate AttendanceRecords", async () => {
    const { attendanceService, attendanceRepository, assignment, adminSession } =
      await createAttendanceContext({ assignmentReady: false });

    await expect(
      attendanceService.createFromAssignment({
        session: adminSession,
        roles: ["DISPATCHER"],
        assignmentId: assignment.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "assignment_not_ready" })
    });

    const readyContext = await createAttendanceContext();
    const created = await readyContext.attendanceService.createFromAssignment({
      session: readyContext.adminSession,
      roles: ["DISPATCHER"],
      assignmentId: readyContext.assignment.id
    });

    await expect(
      readyContext.attendanceService.createFromAssignment({
        session: readyContext.adminSession,
        roles: ["DISPATCHER"],
        assignmentId: readyContext.assignment.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "attendance_exists" })
    });
    expect(created.status).toBe("pending_start");
    expect(attendanceRepository.auditActions()).toContain("attendance.validation_failed");
  });

  it("allows worker check-in and check-out without calculating timesheets or payroll", async () => {
    const { attendanceService, attendanceRepository, assignment, adminSession, workerSession } =
      await createAttendanceContext();
    const attendanceRecord = await attendanceService.createFromAssignment({
      session: adminSession,
      roles: ["DISPATCHER"],
      assignmentId: assignment.id,
      verificationMethod: "none"
    });

    const checkedIn = await attendanceService.workerCheckIn({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      attendanceRecordId: attendanceRecord.id,
      expectedVersion: attendanceRecord.versionToken,
      method: "secure_pin",
      evidenceSummary: "Worker submitted secure PIN.",
      locationPolicyResult: "not_required"
    });
    const checkedOut = await attendanceService.workerCheckOut({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      attendanceRecordId: checkedIn.id,
      expectedVersion: checkedIn.versionToken,
      method: "secure_pin",
      evidenceSummary: "Worker submitted secure PIN at departure.",
      locationPolicyResult: "not_required"
    });
    const completed = await attendanceService.markCompleted({
      session: adminSession,
      roles: ["DISPATCHER"],
      attendanceRecordId: checkedOut.id,
      expectedVersion: checkedOut.versionToken
    });

    expect(checkedIn.status).toBe("checked_in");
    expect(checkedIn.checkInMethod).toBe("secure_pin");
    expect(checkedOut.status).toBe("checked_out");
    expect(completed.status).toBe("completed");
    expect(completed.timesheetBoundary).toBe("handoff_ready");
    expect(attendanceRepository.createdTimesheets).toBe(0);
    expect(attendanceRepository.createdPayrollRecords).toBe(0);
    expect(attendanceRepository.createdFinanceRecords).toBe(0);
    expect(attendanceRepository.createdGpsProviderRecords).toBe(0);
    expect(attendanceRepository.auditActions()).toEqual(
      expect.arrayContaining([
        "attendance.check_in_attempted",
        "attendance.checked_in",
        "attendance.check_out_attempted",
        "attendance.checked_out",
        "attendance.completed"
      ])
    );
  });

  it("prevents duplicate check-in/check-out and workers from reading another worker attendance", async () => {
    const { attendanceService, assignment, adminSession, workerSession, otherWorkerSession } =
      await createAttendanceContext();
    const attendanceRecord = await attendanceService.createFromAssignment({
      session: adminSession,
      roles: ["DISPATCHER"],
      assignmentId: assignment.id
    });
    const checkedIn = await attendanceService.workerCheckIn({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      attendanceRecordId: attendanceRecord.id,
      expectedVersion: attendanceRecord.versionToken,
      method: "none"
    });

    await expect(
      attendanceService.workerCheckIn({
        session: workerSession,
        roles: ["WORKER_ACCESS"],
        attendanceRecordId: checkedIn.id,
        expectedVersion: checkedIn.versionToken,
        method: "none"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "duplicate_check_in" })
    });
    await expect(
      attendanceService.workerRead({
        session: otherWorkerSession,
        roles: ["WORKER_ACCESS"],
        attendanceRecordId: checkedIn.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "permission_denied" })
    });
    const checkedOut = await attendanceService.workerCheckOut({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      attendanceRecordId: checkedIn.id,
      expectedVersion: checkedIn.versionToken,
      method: "none"
    });
    await expect(
      attendanceService.workerCheckOut({
        session: workerSession,
        roles: ["WORKER_ACCESS"],
        attendanceRecordId: checkedOut.id,
        expectedVersion: checkedOut.versionToken,
        method: "none"
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "duplicate_check_out" })
    });
  });

  it("supports employer read-only status and neutral exception/cancel states", async () => {
    const { attendanceService, attendanceRepository, assignment, adminSession } =
      await createAttendanceContext();
    const attendanceRecord = await attendanceService.createFromAssignment({
      session: adminSession,
      roles: ["DISPATCHER"],
      assignmentId: assignment.id
    });

    const employerVisible = await attendanceService.listAttendance({
      session: activeSession(),
      roles: ["ORGANIZATION_OWNER"],
      organizationId: attendanceRecord.organizationId
    });
    const exception = await attendanceService.markException({
      session: adminSession,
      roles: ["DISPATCHER"],
      attendanceRecordId: attendanceRecord.id,
      expectedVersion: attendanceRecord.versionToken,
      reason: "invalid_location",
      note: "Review required; no fault assigned."
    });

    expect(employerVisible).toHaveLength(1);
    expect(employerVisible.at(0)?.status).toBe("pending_start");
    expect(exception.status).toBe("exception");
    expect(exception.exceptionCategory).toBe("invalid_location");
    expect(exception.supervisorNote).toBe("Review required; no fault assigned.");
    expect(attendanceRepository.createdAnalyticsEvents).toBe(0);
    expect(attendanceRepository.createdAiActions).toBe(0);
    expect(attendanceRepository.auditActions()).toContain("attendance.exception");
  });
});

describe("timesheet foundation", () => {
  it("creates a Timesheet only from completed Attendance and preserves upstream evidence", async () => {
    const { timesheetService, timesheetRepository, attendanceRecord, assignment, adminSession } =
      await createTimesheetContext();
    const originalCheckIn = attendanceRecord.checkInAt?.toISOString();

    const timesheet = await timesheetService.createFromAttendance({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      attendanceRecordId: attendanceRecord.id
    });

    expect(timesheet.status).toBe("draft");
    expect(timesheet.attendanceRecordId).toBe(attendanceRecord.id);
    expect(timesheet.attendanceVersionSnapshot).toBe(attendanceRecord.version);
    expect(timesheet.assignmentVersionSnapshot).toBe(assignment.version);
    expect(timesheet.attendanceBoundary).toBe("preserved");
    expect(timesheet.calculationBoundary).toBe("time_only_no_money");
    expect(attendanceRecord.checkInAt?.toISOString()).toBe(originalCheckIn);
    expect(timesheetRepository.modifiedAttendanceRecords).toBe(0);
    expect(timesheetRepository.createdPayrollRecords).toBe(0);
    expect(timesheetRepository.createdFinanceRecords).toBe(0);
    expect(timesheetRepository.createdInvoices).toBe(0);
    expect(timesheetRepository.createdPayments).toBe(0);
    expect(timesheetRepository.auditActions()).toEqual(
      expect.arrayContaining(["timesheet.creation_attempted", "timesheet.created"])
    );
  });

  it("calculates governed time-only values and records calculation snapshots", async () => {
    const { timesheetService, timesheetRepository, attendanceRecord, adminSession } =
      await createTimesheetContext();
    const draft = await timesheetService.createFromAttendance({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      attendanceRecordId: attendanceRecord.id
    });
    const calculated = await timesheetService.calculate({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      timesheetId: draft.id,
      expectedVersion: draft.versionToken
    });

    expect(calculated.rawElapsedMinutes).toBe(480);
    expect(calculated.payableMinutes).toBe(480);
    expect(calculated.billableMinutes).toBe(480);
    expect(calculated.payrollBoundary).toBe("not_started");
    expect(calculated.financeBoundary).toBe("not_started");
    expect(calculated.status).toBe("worker_review");
    expect(timesheetRepository.snapshotCount()).toBe(1);
    expect(timesheetRepository.createdPayrollRecords).toBe(0);
    expect(timesheetRepository.createdFinanceRecords).toBe(0);
  });

  it("requires explicit worker and employer review before platform approval and lock", async () => {
    const { timesheetService, attendanceRecord, adminSession, workerSession } =
      await createTimesheetContext();
    const draft = await timesheetService.createFromAttendance({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      attendanceRecordId: attendanceRecord.id
    });
    const calculated = await timesheetService.calculate({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      timesheetId: draft.id,
      expectedVersion: draft.versionToken
    });

    await expect(
      timesheetService.approve({
        session: adminSession,
        roles: ["TIMESHEET_REVIEWER"],
        timesheetId: calculated.id,
        expectedVersion: calculated.versionToken
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "worker_review_required" })
    });

    const workerConfirmed = await timesheetService.workerConfirm({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      timesheetId: calculated.id,
      expectedVersion: calculated.versionToken
    });
    const employerConfirmed = await timesheetService.employerConfirm({
      session: activeSession(),
      roles: ["ORGANIZATION_OWNER"],
      timesheetId: workerConfirmed.id,
      expectedVersion: workerConfirmed.versionToken
    });
    const approved = await timesheetService.approve({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      timesheetId: employerConfirmed.id,
      expectedVersion: employerConfirmed.versionToken
    });
    const locked = await timesheetService.lock({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      timesheetId: approved.id,
      expectedVersion: approved.versionToken
    });

    expect(workerConfirmed.status).toBe("employer_review");
    expect(employerConfirmed.status).toBe("platform_review");
    expect(approved.status).toBe("approved");
    expect(locked.status).toBe("locked");
    expect(locked.payrollBoundary).toBe("handoff_ready");
    expect(locked.financeBoundary).toBe("handoff_ready");
  });

  it("keeps disputes and corrections separate from Attendance evidence", async () => {
    const { timesheetService, timesheetRepository, attendanceRecord, adminSession, workerSession } =
      await createTimesheetContext();
    const draft = await timesheetService.createFromAttendance({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      attendanceRecordId: attendanceRecord.id
    });
    const calculated = await timesheetService.calculate({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      timesheetId: draft.id,
      expectedVersion: draft.versionToken
    });
    const disputed = await timesheetService.workerDispute({
      session: workerSession,
      roles: ["WORKER_ACCESS"],
      timesheetId: calculated.id,
      expectedVersion: calculated.versionToken,
      reason: "Check-out requires review."
    });

    expect(disputed.status).toBe("correction_required");
    expect(disputed.workerReviewStatus).toBe("disputed");
    expect(disputed.correctionReason).toBe("Check-out requires review.");
    expect(attendanceRecord.status).toBe("completed");
    expect(attendanceRecord.checkOutAt?.toISOString()).toBe("2026-08-12T20:00:00.000Z");
    expect(timesheetRepository.modifiedAttendanceRecords).toBe(0);
  });

  it("rejects duplicate timesheets, stale writes, and dispatcher approval", async () => {
    const { timesheetService, attendanceRecord, adminSession } = await createTimesheetContext();
    const draft = await timesheetService.createFromAttendance({
      session: adminSession,
      roles: ["TIMESHEET_REVIEWER"],
      attendanceRecordId: attendanceRecord.id
    });

    await expect(
      timesheetService.createFromAttendance({
        session: adminSession,
        roles: ["TIMESHEET_REVIEWER"],
        attendanceRecordId: attendanceRecord.id
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "timesheet_exists" })
    });

    await expect(
      timesheetService.calculate({
        session: adminSession,
        roles: ["TIMESHEET_REVIEWER"],
        timesheetId: draft.id,
        expectedVersion: draft.versionToken + 1
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "version_conflict" })
    });

    await expect(
      timesheetService.approve({
        session: adminSession,
        roles: ["DISPATCHER"],
        timesheetId: draft.id,
        expectedVersion: draft.versionToken
      })
    ).rejects.toMatchObject({
      decision: expect.objectContaining({ status: "permission_denied" })
    });
  });
});

class MemoryAuthorizationAuditSink {
  events: AuthorizationAuditEventInput[] = [];

  async recordAuthorizationAuditEvent(input: AuthorizationAuditEventInput) {
    this.events.push(input);
  }
}

class MemoryOrganizationMembershipRepository implements OrganizationMembershipRepository {
  private memberships = new Map<string, StoredOrganizationMembership>();
  private auditEvents: Parameters<
    OrganizationMembershipRepository["recordMembershipAuditEvent"]
  >[0][] = [];
  private nextMembership = 1;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

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
      id: `membership-${this.nextMembership}`,
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
        displayName: `Organization ${input.organizationId}`,
        status: "active"
      },
      membershipRoles: input.accessRoleKeys.map((roleKey) => ({
        accessRole: {
          key: roleKey
        }
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
      accessRole: {
        key: roleKey
      }
    }));

    return membership;
  }

  async recordMembershipAuditEvent(
    input: Parameters<OrganizationMembershipRepository["recordMembershipAuditEvent"]>[0]
  ) {
    this.auditEvents.push(input);
  }
}

class MemoryEmployerOrganizationRepository implements EmployerOrganizationRepository {
  failOwnerMembershipBootstrap = false;
  private organizations = new Map<string, StoredEmployerOrganization>();
  private auditEvents: Parameters<
    EmployerOrganizationRepository["recordOrganizationAuditEvent"]
  >[0][] = [];
  private nextOrganization = 1;

  constructor(private readonly membershipRepository: MemoryOrganizationMembershipRepository) {}

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  organizationCount() {
    return this.organizations.size;
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
      id: `org-${this.nextOrganization}`,
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
      if (this.failOwnerMembershipBootstrap) {
        throw new Error("TEST_OWNER_MEMBERSHIP_BOOTSTRAP_FAILED");
      }

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
      await this.recordOrganizationAuditEvent({
        action: "organization.created",
        organizationId: organization.id,
        actorUserId: input.actorUserId,
        priorState: null,
        newState: organization.status,
        reason: null,
        correlationId: input.correlationId,
        createdAt: input.now
      });
      await this.membershipRepository.recordMembershipAuditEvent({
        action: "membership.activated",
        membershipId: membership.id,
        organizationId: organization.id,
        userId: input.actorUserId,
        actorUserId: input.actorUserId,
        reason: "owner_membership_bootstrap",
        priorState: null,
        newState: "active",
        correlationId: input.correlationId,
        createdAt: input.now
      });
      await this.membershipRepository.recordMembershipAuditEvent({
        action: "membership.access_role_changed",
        membershipId: membership.id,
        organizationId: organization.id,
        userId: input.actorUserId,
        actorUserId: input.actorUserId,
        reason: "organization_owner_bootstrap",
        priorState: null,
        newState: input.ownerRoleKey,
        correlationId: input.correlationId,
        createdAt: input.now
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
    if (input.status === "active") {
      organization.restrictedAt = null;
      organization.suspendedAt = null;
    }
    if (input.status === "suspended") organization.suspendedAt = input.now;
    if (input.status === "closed") organization.closedAt = input.now;

    return organization;
  }

  async recordOrganizationAuditEvent(
    input: Parameters<EmployerOrganizationRepository["recordOrganizationAuditEvent"]>[0]
  ) {
    this.auditEvents.push(input);
  }
}

class MemoryResidenceRepository implements ResidenceRepository {
  failCreateAudit = false;
  private residences = new Map<string, StoredResidence>();
  private auditEvents: Parameters<ResidenceRepository["recordResidenceAuditEvent"]>[0][] = [];
  private nextResidence = 1;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  residenceCount() {
    return this.residences.size;
  }

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
      id: `residence-${this.nextResidence}`,
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

    try {
      if (this.failCreateAudit) {
        throw new Error("TEST_RESIDENCE_AUDIT_FAILED");
      }

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
    } catch (error) {
      this.residences.delete(residence.id);
      throw error;
    }
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
    this.auditEvents.push(input);
  }
}

class MemoryDepartmentRepository implements DepartmentRepository {
  failCreateAudit = false;
  private departments = new Map<string, StoredDepartment>();
  private auditEvents: Parameters<DepartmentRepository["recordDepartmentAuditEvent"]>[0][] = [];
  private nextDepartment = 1;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  departmentCount() {
    return this.departments.size;
  }

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
      id: `department-${this.nextDepartment}`,
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

    try {
      if (this.failCreateAudit) {
        throw new Error("TEST_DEPARTMENT_AUDIT_FAILED");
      }

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
    } catch (error) {
      this.departments.delete(department.id);
      throw error;
    }
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
    this.auditEvents.push(input);
  }
}

class MemoryWorkGroupRepository implements WorkGroupRepository {
  private workGroups = new Map<string, StoredWorkGroup>();
  private auditEvents: Parameters<WorkGroupRepository["recordWorkGroupAuditEvent"]>[0][] = [];

  constructor() {
    const createdAt = new Date("2026-07-25T08:00:00.000Z");
    for (const workGroup of [
      ["work-group-1", "kitchen", "Kitchen", 10, "utensils"],
      ["work-group-2", "care_nursing", "Care / Nursing", 20, "heart-pulse"],
      ["work-group-3", "housekeeping_support", "Housekeeping / Support", 30, "sparkles"],
      ["work-group-4", "maintenance", "Maintenance", 40, "wrench"]
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

  auditActions() {
    return this.auditEvents.map((event) => event.action);
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
    this.auditEvents.push(input);
  }
}

class MemoryRoleDefinitionRepository implements RoleDefinitionRepository {
  private workGroups = new Map<string, StoredWorkGroup>();
  private roleDefinitions = new Map<string, StoredRoleDefinition>();
  private auditEvents: Parameters<RoleDefinitionRepository["recordRoleDefinitionAuditEvent"]>[0][] =
    [];

  constructor() {
    const createdAt = new Date("2026-07-25T08:00:00.000Z");
    for (const workGroup of [
      ["work-group-1", "kitchen", "Kitchen", 10],
      ["work-group-2", "care_nursing", "Care / Nursing", 20]
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
      ["role-1", "kitchen", "chef", "Chef", 10],
      ["role-2", "kitchen", "sous_chef", "Sous-chef", 20],
      ["role-3", "kitchen", "cook", "Cook", 30],
      ["role-4", "kitchen", "kitchen_helper", "Kitchen helper", 40],
      ["role-5", "kitchen", "dishwasher", "Dishwasher", 50],
      ["role-6", "care_nursing", "nurse", "Nurse", 10],
      ["role-7", "care_nursing", "licensed_practical_nurse", "Licensed practical nurse", 20],
      ["role-8", "care_nursing", "personal_support_worker", "Personal support worker", 30],
      ["role-9", "care_nursing", "care_aide", "Care aide", 40]
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
        qualificationSummary: "Fixture qualification summary",
        safetyRequirementSummary: "Fixture safety summary",
        adminConfigurable: false,
        createdAt,
        updatedAt: createdAt,
        workGroup
      });
    }
  }

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  setWorkGroupStatus(workGroupKey: string, status: StoredWorkGroup["status"]) {
    const workGroup = this.workGroups.get(workGroupKey);
    if (!workGroup) throw new Error("TEST_WORK_GROUP_NOT_FOUND");
    workGroup.status = status;
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
    this.auditEvents.push(input);
  }
}

class MemoryJobRequestRepository implements JobRequestRepository {
  private jobRequests = new Map<string, StoredJobRequest>();
  private sequences = new Map<number, number>();
  private auditEvents: Parameters<JobRequestRepository["recordJobRequestAuditEvent"]>[0][] = [];
  private nextJobRequest = 1;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  async createDraft(input: Parameters<JobRequestRepository["createDraft"]>[0]) {
    const year = input.now.getUTCFullYear();
    const nextSequence = (this.sequences.get(year) ?? 0) + 1;
    this.sequences.set(year, nextSequence);
    const jobRequest: StoredJobRequest = {
      id: `job-request-${this.nextJobRequest}`,
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
    this.auditEvents.push(input);
  }
}

class MemoryDispatchRepository implements DispatchRepository {
  private dispatchReviews = new Map<string, StoredDispatchReview>();
  private candidates = new Map<string, StoredDispatchCandidate>();
  private auditEvents: Parameters<DispatchRepository["recordDispatchAuditEvent"]>[0][] = [];
  private nextDispatch = 1;
  private nextCandidate = 1;
  createdAssignments = 0;
  createdWorkerOffers = 0;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  async createDispatchReviewWithAudit(
    input: Parameters<DispatchRepository["createDispatchReviewWithAudit"]>[0]
  ) {
    const dispatchReview: StoredDispatchReview = {
      id: `dispatch-${this.nextDispatch}`,
      jobRequestId: input.jobRequest.id,
      organizationId: input.jobRequest.organizationId,
      residenceId: input.jobRequest.residenceId,
      departmentId: input.jobRequest.departmentId,
      workGroupId: input.jobRequest.workGroupId,
      roleDefinitionId: input.jobRequest.roleDefinitionId,
      dispatchType: "initial",
      state: "draft",
      operationalOwnerUserId: input.operationalOwnerUserId,
      priority: input.priority,
      urgency: input.jobRequest.urgency,
      requiredWorkerCount: input.jobRequest.numberOfWorkers,
      shortlistedCandidateCount: 0,
      preparedOfferCount: 0,
      startedAt: null,
      pausedAt: null,
      cancelledAt: null,
      closedAt: null,
      createdByUserId: input.actorUserId,
      updatedByUserId: null,
      createdAt: input.now,
      updatedAt: input.now,
      version: 1
    };
    this.nextDispatch += 1;
    this.dispatchReviews.set(dispatchReview.id, dispatchReview);
    this.auditEvents.push({
      action: "dispatch.created",
      organizationId: dispatchReview.organizationId,
      dispatchReviewId: dispatchReview.id,
      jobRequestId: dispatchReview.jobRequestId,
      actorUserId: input.actorUserId,
      priorState: null,
      newState: dispatchReview.state,
      reason: null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return dispatchReview;
  }

  async findDispatchReviewById(dispatchReviewId: string) {
    return this.dispatchReviews.get(dispatchReviewId) ?? null;
  }

  async findActiveDispatchReviewForJobRequest(jobRequestId: string) {
    return (
      [...this.dispatchReviews.values()].find(
        (dispatchReview) =>
          dispatchReview.jobRequestId === jobRequestId &&
          !["cancelled", "closed"].includes(dispatchReview.state)
      ) ?? null
    );
  }

  async findCurrentDispatchReviewForJobRequest(jobRequestId: string) {
    return (
      (await this.findActiveDispatchReviewForJobRequest(jobRequestId)) ??
      [...this.dispatchReviews.values()]
        .filter((dispatchReview) => dispatchReview.jobRequestId === jobRequestId)
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ??
      null
    );
  }

  async listDispatchReviews(input: Parameters<DispatchRepository["listDispatchReviews"]>[0]) {
    return [...this.dispatchReviews.values()]
      .filter(
        (dispatchReview) =>
          !input.organizationId || dispatchReview.organizationId === input.organizationId
      )
      .filter((dispatchReview) => !input.states || input.states.includes(dispatchReview.state))
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() ||
          right.createdAt.getTime() - left.createdAt.getTime()
      );
  }

  async updateDispatchReview(input: Parameters<DispatchRepository["updateDispatchReview"]>[0]) {
    const dispatchReview = this.dispatchReviews.get(input.dispatchReviewId);
    if (!dispatchReview || dispatchReview.version !== input.expectedVersion) return null;

    if (input.state !== undefined) dispatchReview.state = input.state;
    if (input.operationalOwnerUserId !== undefined)
      dispatchReview.operationalOwnerUserId = input.operationalOwnerUserId;
    if (input.shortlistedCandidateCount !== undefined)
      dispatchReview.shortlistedCandidateCount = input.shortlistedCandidateCount;
    if (input.preparedOfferCount !== undefined)
      dispatchReview.preparedOfferCount = input.preparedOfferCount;
    if (input.startedAt !== undefined) dispatchReview.startedAt = input.startedAt;
    if (input.pausedAt !== undefined) dispatchReview.pausedAt = input.pausedAt;
    if (input.cancelledAt !== undefined) dispatchReview.cancelledAt = input.cancelledAt;
    if (input.closedAt !== undefined) dispatchReview.closedAt = input.closedAt;
    dispatchReview.updatedByUserId = input.actorUserId;
    dispatchReview.updatedAt = input.now;
    dispatchReview.version += 1;

    return dispatchReview;
  }

  async listCandidates(dispatchReviewId: string) {
    return [...this.candidates.values()]
      .filter((candidate) => candidate.dispatchReviewId === dispatchReviewId)
      .sort(
        (left, right) =>
          (left.shortlistOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.shortlistOrder ?? Number.MAX_SAFE_INTEGER) ||
          right.updatedAt.getTime() - left.updatedAt.getTime()
      );
  }

  async findShortlistedCandidateByWorkerIdentity(
    dispatchReviewId: string,
    workerIdentityId: string
  ) {
    return (
      [...this.candidates.values()].find(
        (candidate) =>
          candidate.dispatchReviewId === dispatchReviewId &&
          candidate.workerIdentityId === workerIdentityId &&
          candidate.shortlistState === "shortlisted"
      ) ?? null
    );
  }

  async upsertCandidate(input: Parameters<DispatchRepository["upsertCandidate"]>[0]) {
    const existing = [...this.candidates.values()].find(
      (candidate) =>
        candidate.dispatchReviewId === input.dispatchReviewId &&
        candidate.candidateSourceReference === input.candidate.candidateSourceReference
    );
    if (existing) {
      Object.assign(existing, input.candidate, {
        updatedAt: input.now,
        version: existing.version + 1
      });
      return existing;
    }

    const candidate: StoredDispatchCandidate = {
      id: `dispatch-candidate-${this.nextCandidate}`,
      dispatchReviewId: input.dispatchReviewId,
      ...input.candidate,
      shortlistState: "not_shortlisted",
      shortlistOrder: null,
      addedByUserId: null,
      removedByUserId: null,
      createdAt: input.now,
      updatedAt: input.now,
      version: 0
    };
    this.nextCandidate += 1;
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  async updateCandidateShortlist(
    input: Parameters<DispatchRepository["updateCandidateShortlist"]>[0]
  ) {
    const candidate = [...this.candidates.values()].find(
      (item) =>
        item.dispatchReviewId === input.dispatchReviewId &&
        item.candidateSourceReference === input.candidateSourceReference
    );
    if (!candidate) return null;

    candidate.shortlistState = input.shortlistState;
    candidate.shortlistOrder = input.shortlistOrder;
    if (input.shortlistState === "shortlisted") {
      candidate.addedByUserId = input.actorUserId;
      candidate.removedByUserId = null;
    } else {
      candidate.removedByUserId = input.actorUserId;
    }
    candidate.updatedAt = input.now;
    candidate.version += 1;
    return candidate;
  }

  async reorderShortlist(input: Parameters<DispatchRepository["reorderShortlist"]>[0]) {
    input.candidateSourceReferences.forEach((candidateSourceReference, index) => {
      const candidate = [...this.candidates.values()].find(
        (item) =>
          item.dispatchReviewId === input.dispatchReviewId &&
          item.candidateSourceReference === candidateSourceReference
      );
      if (!candidate) return;
      candidate.shortlistState = "shortlisted";
      candidate.shortlistOrder = index + 1;
      candidate.updatedAt = input.now;
      candidate.version += 1;
    });

    return this.listCandidates(input.dispatchReviewId);
  }

  async recordDispatchAuditEvent(
    input: Parameters<DispatchRepository["recordDispatchAuditEvent"]>[0]
  ) {
    this.auditEvents.push(input);
  }
}

class MemoryWorkerOfferRepository implements WorkerOfferRepository {
  private workerIdentities = new Map<string, StoredWorkerIdentity>();
  private workerOffers = new Map<string, StoredWorkerOffer>();
  private termsVersions = new Map<string, StoredWorkerOfferTermsVersion>();
  private deliveryAttempts = new Map<string, StoredWorkerOfferDeliveryAttempt>();
  private responses = new Map<string, StoredWorkerOfferResponse>();
  private offerCapacityLocks = new Map<string, Promise<void>>();
  private auditEvents: Parameters<WorkerOfferRepository["recordWorkerOfferAuditEvent"]>[0][] = [];
  private nextWorkerIdentity = 1;
  private nextOffer = 1;
  private nextTerms = 1;
  private nextDelivery = 1;
  private nextResponse = 1;
  failNextDeliveryFinalization = false;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  async findWorkerIdentityById(workerIdentityId: string) {
    return this.workerIdentities.get(workerIdentityId) ?? null;
  }

  async findWorkerIdentityByUserId(userId: string) {
    return (
      [...this.workerIdentities.values()].find((identity) => identity.userId === userId) ?? null
    );
  }

  async createWorkerIdentity(input: Parameters<WorkerOfferRepository["createWorkerIdentity"]>[0]) {
    const identity: StoredWorkerIdentity = {
      id: `worker-identity-${this.nextWorkerIdentity}`,
      userId: input.userId,
      displayName: input.displayName ?? null,
      preferredLanguage: input.preferredLanguage ?? null,
      status: "active",
      createdAt: input.now,
      updatedAt: input.now,
      version: 0
    };
    this.nextWorkerIdentity += 1;
    this.workerIdentities.set(identity.id, identity);
    return identity;
  }

  async createWorkerOffer(input: Parameters<WorkerOfferRepository["createWorkerOffer"]>[0]) {
    const previousLock = this.offerCapacityLocks.get(input.dispatchReview.id) ?? Promise.resolve();
    let releaseLock!: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.offerCapacityLocks.set(
      input.dispatchReview.id,
      previousLock.then(() => currentLock)
    );
    await previousLock;
    const activeOfferCount = [...this.workerOffers.values()].filter(
      (offer) =>
        offer.dispatchReviewId === input.dispatchReview.id &&
        ["draft", "approved", "sent", "delivered", "viewed", "accepted"].includes(offer.status)
    ).length;
    if (activeOfferCount >= input.capacityLimit) {
      releaseLock();
      return null;
    }
    const offer: StoredWorkerOffer = {
      id: `worker-offer-${this.nextOffer}`,
      dispatchReviewId: input.dispatchReview.id,
      jobRequestId: input.jobRequest.id,
      organizationId: input.dispatchReview.organizationId,
      residenceId: input.dispatchReview.residenceId,
      departmentId: input.dispatchReview.departmentId,
      workerIdentityId: input.workerIdentity.id,
      currentTermsVersionId: null,
      status: "draft",
      expiresAt: input.expiresAt,
      approvedAt: null,
      sentAt: null,
      deliveredAt: null,
      viewedAt: null,
      respondedAt: null,
      withdrawnAt: null,
      cancelledAt: null,
      createdByUserId: input.actorUserId,
      updatedByUserId: null,
      approvedByUserId: null,
      sentByUserId: null,
      withdrawnByUserId: null,
      cancelledByUserId: null,
      createdAt: input.now,
      updatedAt: input.now,
      version: 0
    };
    this.nextOffer += 1;
    this.workerOffers.set(offer.id, offer);

    const termsVersion: StoredWorkerOfferTermsVersion = {
      id: `worker-offer-terms-${this.nextTerms}`,
      workerOfferId: offer.id,
      versionNumber: 1,
      workerVisibleTitle: input.workerVisibleTitle,
      workerVisibleSummary: input.workerVisibleSummary,
      timezone: input.jobRequest.timezone,
      startAt: input.jobRequest.startAt,
      endAt: input.jobRequest.endAt,
      workGroupId: input.jobRequest.workGroupId,
      roleDefinitionId: input.jobRequest.roleDefinitionId,
      compensationSummary: input.compensationSummary,
      policySummary: input.policySummary,
      createdByUserId: input.actorUserId,
      createdAt: input.now
    };
    this.nextTerms += 1;
    this.termsVersions.set(termsVersion.id, termsVersion);
    offer.currentTermsVersionId = termsVersion.id;
    offer.updatedByUserId = input.actorUserId;
    releaseLock();
    return { offer, termsVersion };
  }

  async findWorkerOfferById(workerOfferId: string) {
    return this.workerOffers.get(workerOfferId) ?? null;
  }

  async findCurrentTermsVersion(workerOfferId: string) {
    return (
      [...this.termsVersions.values()]
        .filter((terms) => terms.workerOfferId === workerOfferId)
        .sort((left, right) => right.versionNumber - left.versionNumber)[0] ?? null
    );
  }

  async listWorkerOffers(input: Parameters<WorkerOfferRepository["listWorkerOffers"]>[0]) {
    return [...this.workerOffers.values()]
      .filter(
        (offer) => !input.dispatchReviewId || offer.dispatchReviewId === input.dispatchReviewId
      )
      .filter((offer) => !input.organizationId || offer.organizationId === input.organizationId)
      .filter(
        (offer) => !input.workerIdentityId || offer.workerIdentityId === input.workerIdentityId
      )
      .filter((offer) => !input.statuses || input.statuses.includes(offer.status))
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() ||
          right.createdAt.getTime() - left.createdAt.getTime()
      );
  }

  async countCapacityOffersForDispatch(dispatchReviewId: string) {
    return [...this.workerOffers.values()].filter(
      (offer) =>
        offer.dispatchReviewId === dispatchReviewId &&
        ["draft", "approved", "sent", "delivered", "viewed", "accepted"].includes(offer.status)
    ).length;
  }

  async updateWorkerOffer(input: Parameters<WorkerOfferRepository["updateWorkerOffer"]>[0]) {
    const offer = this.workerOffers.get(input.workerOfferId);
    if (!offer || offer.version !== input.expectedVersion) return null;

    if (input.status !== undefined) offer.status = input.status;
    if (input.approvedAt !== undefined) {
      offer.approvedAt = input.approvedAt;
      offer.approvedByUserId = input.actorUserId;
    }
    if (input.sentAt !== undefined) {
      offer.sentAt = input.sentAt;
      offer.sentByUserId = input.actorUserId;
    }
    if (input.deliveredAt !== undefined) offer.deliveredAt = input.deliveredAt;
    if (input.viewedAt !== undefined) offer.viewedAt = input.viewedAt;
    if (input.respondedAt !== undefined) offer.respondedAt = input.respondedAt;
    if (input.withdrawnAt !== undefined) {
      offer.withdrawnAt = input.withdrawnAt;
      offer.withdrawnByUserId = input.actorUserId;
    }
    if (input.cancelledAt !== undefined) {
      offer.cancelledAt = input.cancelledAt;
      offer.cancelledByUserId = input.actorUserId;
    }
    offer.updatedByUserId = input.actorUserId;
    offer.updatedAt = input.now;
    offer.version += 1;
    return offer;
  }

  async createDeliveryAttempt(
    input: Parameters<WorkerOfferRepository["createDeliveryAttempt"]>[0]
  ) {
    const delivery: StoredWorkerOfferDeliveryAttempt = {
      id: `worker-offer-delivery-${this.nextDelivery}`,
      workerOfferId: input.workerOfferId,
      status: input.status,
      providerBoundary: input.providerBoundary,
      reason: input.reason,
      attemptedAt: input.status === "attempted" ? input.now : null,
      deliveredAt: input.status === "delivered" ? input.now : null,
      failedAt: input.status === "failed" ? input.now : null,
      createdByUserId: input.actorUserId,
      createdAt: input.now
    };
    this.nextDelivery += 1;
    this.deliveryAttempts.set(delivery.id, delivery);
    return delivery;
  }

  async finalizeAcceptedDelivery(
    input: Parameters<WorkerOfferRepository["finalizeAcceptedDelivery"]>[0]
  ) {
    if (this.failNextDeliveryFinalization) {
      this.failNextDeliveryFinalization = false;
      return null;
    }
    const updated = await this.updateWorkerOffer({
      workerOfferId: input.workerOfferId,
      expectedVersion: input.expectedVersion,
      actorUserId: input.actorUserId,
      status: input.nextStatus,
      sentAt: input.now,
      deliveredAt: input.nextStatus === "delivered" ? input.now : undefined,
      now: input.now
    });
    if (!updated) return null;
    await this.createDeliveryAttempt({
      workerOfferId: input.workerOfferId,
      status: input.attemptStatus,
      providerBoundary: "configured_http_v1",
      reason: input.attemptReason,
      actorUserId: input.actorUserId,
      now: input.now
    });
    await this.recordWorkerOfferAuditEvent({
      action:
        input.nextStatus === "delivered" ? "worker_offer.delivery_succeeded" : "worker_offer.sent",
      organizationId: input.organizationId,
      workerOfferId: input.workerOfferId,
      dispatchReviewId: input.dispatchReviewId,
      jobRequestId: input.jobRequestId,
      actorUserId: input.actorUserId,
      priorState: "approved",
      newState: input.nextStatus,
      reason: null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return updated;
  }

  async findResponseByOfferId(workerOfferId: string) {
    return (
      [...this.responses.values()].find((response) => response.workerOfferId === workerOfferId) ??
      null
    );
  }

  async createResponse(input: Parameters<WorkerOfferRepository["createResponse"]>[0]) {
    const response: StoredWorkerOfferResponse = {
      id: `worker-offer-response-${this.nextResponse}`,
      workerOfferId: input.workerOfferId,
      workerIdentityId: input.workerIdentityId,
      termsVersionId: input.termsVersionId,
      responseType: input.responseType,
      reason: input.reason,
      createdAt: input.now
    };
    this.nextResponse += 1;
    this.responses.set(response.id, response);
    return response;
  }

  async respondToWorkerOfferAtomically(
    input: Parameters<WorkerOfferRepository["respondToWorkerOfferAtomically"]>[0]
  ) {
    const offer = this.workerOffers.get(input.workerOfferId);
    if (
      !offer ||
      offer.version !== input.expectedVersion ||
      this.responses.has(input.workerOfferId)
    ) {
      return null;
    }
    const response: StoredWorkerOfferResponse = {
      id: `worker-offer-response-${this.nextResponse}`,
      workerOfferId: input.workerOfferId,
      workerIdentityId: input.workerIdentityId,
      termsVersionId: input.termsVersionId,
      responseType: input.responseType,
      reason: input.reason,
      createdAt: input.now
    };
    this.nextResponse += 1;
    this.responses.set(input.workerOfferId, response);
    offer.status = input.nextStatus;
    offer.respondedAt = input.now;
    offer.updatedByUserId = input.actorUserId;
    offer.updatedAt = input.now;
    offer.version += 1;
    return offer;
  }

  async recordWorkerOfferAuditEvent(
    input: Parameters<WorkerOfferRepository["recordWorkerOfferAuditEvent"]>[0]
  ) {
    this.auditEvents.push(input);
  }
}

class MemoryAssignmentRepository implements AssignmentRepository {
  private assignments = new Map<string, StoredAssignment>();
  private auditEvents: Parameters<AssignmentRepository["recordAssignmentAuditEvent"]>[0][] = [];
  private nextAssignment = 1;
  private atomicQueue: Promise<void> = Promise.resolve();
  private sources:
    | {
        workerOffers: MemoryWorkerOfferRepository;
        dispatches: MemoryDispatchRepository;
        jobRequests: MemoryJobRequestRepositoryWithSeed;
      }
    | undefined;

  createdAttendanceRecords = 0;
  createdWorkerCalendarEntries = 0;
  createdTimesheets = 0;
  createdPayrollRecords = 0;
  createdNotificationProviderMessages = 0;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  configureSources(sources: NonNullable<MemoryAssignmentRepository["sources"]>) {
    this.sources = sources;
  }

  async createAssignmentFromAcceptedOfferAtomically(
    input: Parameters<AssignmentRepository["createAssignmentFromAcceptedOfferAtomically"]>[0]
  ): Promise<
    Awaited<ReturnType<AssignmentRepository["createAssignmentFromAcceptedOfferAtomically"]>>
  > {
    const prior = this.atomicQueue;
    let release = () => {};
    this.atomicQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prior;
    try {
      if (!this.sources) throw new Error("assignment sources unavailable");
      const workerOffer = await this.sources.workerOffers.findWorkerOfferById(input.workerOfferId);
      if (!workerOffer) return { ok: false, reason: "worker_offer_not_found" };
      if (workerOffer.dispatchReviewId !== input.expectedDispatchReviewId) {
        return { ok: false, reason: "source_chain_mismatch" };
      }
      const fail = async (reason: AtomicAssignmentCreateFailure) => {
        await this.recordAssignmentAuditEvent({
          action: "assignment.validation_failed",
          organizationId: workerOffer.organizationId,
          assignmentId: null,
          workerOfferId: workerOffer.id,
          jobRequestId: workerOffer.jobRequestId,
          actorUserId: input.actorUserId,
          priorState: "pending_validation",
          newState: "rejected",
          reason,
          correlationId: input.correlationId,
          createdAt: input.now
        });
        return { ok: false as const, reason };
      };
      if (workerOffer.status !== "accepted") return fail("worker_offer_not_accepted");
      if (workerOffer.version !== input.expectedOfferVersion) {
        return fail("worker_offer_version_changed");
      }
      if (workerOffer.expiresAt <= input.now) return fail("worker_offer_expired");
      const response = await this.sources.workerOffers.findResponseByOfferId(workerOffer.id);
      if (
        !response ||
        response.responseType !== "accepted" ||
        response.workerIdentityId !== workerOffer.workerIdentityId
      ) {
        return fail("response_not_accepted");
      }
      if (await this.findAssignmentByWorkerOfferId(workerOffer.id))
        return fail("assignment_exists");
      const [termsVersion, jobRequest, dispatchReview, workerIdentity] = await Promise.all([
        this.sources.workerOffers.findCurrentTermsVersion(workerOffer.id),
        this.sources.jobRequests.findJobRequestById(workerOffer.jobRequestId),
        this.sources.dispatches.findDispatchReviewById(workerOffer.dispatchReviewId),
        this.sources.workerOffers.findWorkerIdentityById(workerOffer.workerIdentityId)
      ]);
      if (
        !termsVersion ||
        termsVersion.id !== workerOffer.currentTermsVersionId ||
        termsVersion.workerOfferId !== workerOffer.id ||
        response.termsVersionId !== termsVersion.id
      ) {
        return fail("current_terms_unavailable");
      }
      if (!jobRequest || !dispatchReview || !workerIdentity) return fail("source_chain_mismatch");
      if (
        dispatchReview.jobRequestId !== jobRequest.id ||
        workerOffer.organizationId !== jobRequest.organizationId ||
        workerOffer.organizationId !== dispatchReview.organizationId ||
        workerOffer.residenceId !== jobRequest.residenceId ||
        workerOffer.residenceId !== dispatchReview.residenceId ||
        workerOffer.departmentId !== jobRequest.departmentId ||
        workerOffer.departmentId !== dispatchReview.departmentId ||
        termsVersion.workGroupId !== jobRequest.workGroupId ||
        termsVersion.roleDefinitionId !== jobRequest.roleDefinitionId
      ) {
        return fail("source_chain_mismatch");
      }
      if (jobRequest.status !== "approved_for_dispatch") {
        return fail("job_request_not_dispatchable");
      }
      if (dispatchReview.state !== "offer_preparation") {
        return fail("dispatch_not_assignable");
      }
      if (workerIdentity.status !== "active") return fail("worker_identity_inactive");
      const activeAssignments = await this.countActiveAssignmentsForJobRequest(jobRequest.id);
      if (activeAssignments >= jobRequest.numberOfWorkers) return fail("job_capacity_reached");
      const conflictCount = await this.countConflictingAssignments({
        workerIdentityId: workerIdentity.id,
        startAt: termsVersion.startAt,
        endAt: termsVersion.endAt
      });
      if (conflictCount > 0) return fail("worker_schedule_conflict");
      const validationSnapshot = {
        policyVersion: "assignment-foundation-v2",
        workerOfferStatus: workerOffer.status,
        termsVersionId: termsVersion.id,
        jobRequestStatus: jobRequest.status,
        dispatchReviewState: dispatchReview.state,
        activeAssignmentsBeforeCreate: activeAssignments,
        requiredWorkerCount: jobRequest.numberOfWorkers,
        conflictCount,
        attendanceCreated: false,
        workerCalendarCreated: false,
        payrollCreated: false
      };
      const assignment = await this.materializeAssignment({
        workerOffer,
        termsVersion,
        jobRequest,
        dispatchReview,
        workerIdentity,
        actorUserId: input.actorUserId,
        validationSnapshot,
        now: input.now
      });
      await this.recordAssignmentAuditEvent({
        action: "assignment.validation_passed",
        organizationId: assignment.organizationId,
        assignmentId: assignment.id,
        workerOfferId: assignment.workerOfferId,
        jobRequestId: assignment.jobRequestId,
        actorUserId: input.actorUserId,
        priorState: "pending_validation",
        newState: "confirmed",
        reason: "final_validation_passed",
        correlationId: input.correlationId,
        createdAt: input.now
      });
      await this.recordAssignmentAuditEvent({
        action: "assignment.confirmed",
        organizationId: assignment.organizationId,
        assignmentId: assignment.id,
        workerOfferId: assignment.workerOfferId,
        jobRequestId: assignment.jobRequestId,
        actorUserId: input.actorUserId,
        priorState: "pending_validation",
        newState: assignment.status,
        reason: "accepted_worker_offer_confirmed",
        correlationId: input.correlationId,
        createdAt: input.now
      });
      return { ok: true, assignment };
    } finally {
      release();
    }
  }

  private async materializeAssignment(input: {
    workerOffer: StoredWorkerOffer;
    termsVersion: StoredWorkerOfferTermsVersion;
    jobRequest: StoredJobRequest;
    dispatchReview: StoredDispatchReview;
    workerIdentity: StoredWorkerIdentity;
    actorUserId: string;
    validationSnapshot: Record<string, unknown>;
    now: Date;
  }) {
    const assignment: StoredAssignment = {
      id: `assignment-${this.nextAssignment}`,
      jobRequestId: input.workerOffer.jobRequestId,
      dispatchReviewId: input.workerOffer.dispatchReviewId,
      workerOfferId: input.workerOffer.id,
      workerOfferTermsVersionId: input.termsVersion.id,
      workerIdentityId: input.workerIdentity.id,
      organizationId: input.workerOffer.organizationId,
      residenceId: input.workerOffer.residenceId,
      departmentId: input.workerOffer.departmentId,
      workGroupId: input.termsVersion.workGroupId,
      roleDefinitionId: input.termsVersion.roleDefinitionId,
      status: "confirmed",
      confirmedStartAt: input.termsVersion.startAt,
      confirmedEndAt: input.termsVersion.endAt,
      timezone: input.termsVersion.timezone,
      confirmedTitle: input.termsVersion.workerVisibleTitle,
      confirmedRoleSummary: input.jobRequest.title,
      confirmedWorksiteSummary: input.dispatchReview.residenceId,
      confirmedDepartmentSummary: input.dispatchReview.departmentId,
      confirmedResponsibilitySummary: input.termsVersion.workerVisibleSummary,
      confirmedPolicySummary: input.termsVersion.policySummary,
      confirmedCompensationSummary: input.termsVersion.compensationSummary,
      validationSnapshot: input.validationSnapshot,
      capacityCheckedAt: input.now,
      conflictCheckedAt: input.now,
      confirmedAt: input.now,
      workerAcknowledgedAt: null,
      readyForAttendanceAt: null,
      attendanceWindowStartedAt: null,
      attendanceHandoffAt: null,
      workerWithdrawnAt: null,
      cancelledAt: null,
      replacementRequiredAt: null,
      closedAt: null,
      cancellationReasonCategory: null,
      createdByUserId: input.actorUserId,
      updatedByUserId: null,
      confirmedByUserId: input.actorUserId,
      cancelledByUserId: null,
      createdAt: input.now,
      updatedAt: input.now,
      version: 0
    };
    this.nextAssignment += 1;
    this.assignments.set(assignment.id, assignment);
    return assignment;
  }

  async findAssignmentById(assignmentId: string) {
    return this.assignments.get(assignmentId) ?? null;
  }

  async findAssignmentByWorkerOfferId(workerOfferId: string) {
    return (
      [...this.assignments.values()].find(
        (assignment) => assignment.workerOfferId === workerOfferId
      ) ?? null
    );
  }

  async listAssignments(input: Parameters<AssignmentRepository["listAssignments"]>[0]) {
    return [...this.assignments.values()]
      .filter(
        (assignment) =>
          !input.dispatchReviewId || assignment.dispatchReviewId === input.dispatchReviewId
      )
      .filter(
        (assignment) => !input.organizationId || assignment.organizationId === input.organizationId
      )
      .filter(
        (assignment) =>
          !input.workerIdentityId || assignment.workerIdentityId === input.workerIdentityId
      )
      .filter((assignment) => !input.jobRequestId || assignment.jobRequestId === input.jobRequestId)
      .filter((assignment) => !input.statuses || input.statuses.includes(assignment.status))
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() ||
          left.confirmedStartAt.getTime() - right.confirmedStartAt.getTime()
      );
  }

  async countActiveAssignmentsForJobRequest(jobRequestId: string) {
    return [...this.assignments.values()].filter(
      (assignment) =>
        assignment.jobRequestId === jobRequestId &&
        [
          "pending_validation",
          "confirmed",
          "worker_acknowledged",
          "ready_for_attendance",
          "in_attendance_window",
          "attendance_handoff"
        ].includes(assignment.status)
    ).length;
  }

  async countConflictingAssignments(
    input: Parameters<AssignmentRepository["countConflictingAssignments"]>[0]
  ) {
    return [...this.assignments.values()].filter(
      (assignment) =>
        assignment.workerIdentityId === input.workerIdentityId &&
        assignment.id !== input.excludeAssignmentId &&
        [
          "pending_validation",
          "confirmed",
          "worker_acknowledged",
          "ready_for_attendance",
          "in_attendance_window",
          "attendance_handoff"
        ].includes(assignment.status) &&
        assignment.confirmedStartAt < input.endAt &&
        assignment.confirmedEndAt > input.startAt
    ).length;
  }

  async updateAssignment(input: Parameters<AssignmentRepository["updateAssignment"]>[0]) {
    const assignment = this.assignments.get(input.assignmentId);
    if (!assignment || assignment.version !== input.expectedVersion) return null;

    if (input.status !== undefined) assignment.status = input.status;
    if (input.workerAcknowledgedAt !== undefined) {
      assignment.workerAcknowledgedAt = input.workerAcknowledgedAt;
    }
    if (input.readyForAttendanceAt !== undefined) {
      assignment.readyForAttendanceAt = input.readyForAttendanceAt;
    }
    if (input.attendanceWindowStartedAt !== undefined) {
      assignment.attendanceWindowStartedAt = input.attendanceWindowStartedAt;
    }
    if (input.attendanceHandoffAt !== undefined)
      assignment.attendanceHandoffAt = input.attendanceHandoffAt;
    if (input.workerWithdrawnAt !== undefined)
      assignment.workerWithdrawnAt = input.workerWithdrawnAt;
    if (input.cancelledAt !== undefined) {
      assignment.cancelledAt = input.cancelledAt;
      assignment.cancelledByUserId = input.actorUserId;
    }
    if (input.replacementRequiredAt !== undefined) {
      assignment.replacementRequiredAt = input.replacementRequiredAt;
    }
    if (input.closedAt !== undefined) assignment.closedAt = input.closedAt;
    if (input.cancellationReasonCategory !== undefined) {
      assignment.cancellationReasonCategory = input.cancellationReasonCategory;
    }
    assignment.updatedByUserId = input.actorUserId;
    assignment.updatedAt = input.now;
    assignment.version += 1;
    return assignment;
  }

  async recordAssignmentAuditEvent(
    input: Parameters<AssignmentRepository["recordAssignmentAuditEvent"]>[0]
  ) {
    this.auditEvents.push(input);
  }
}

class MemoryAttendanceRepository implements AttendanceRepository {
  private attendanceRecords = new Map<string, StoredAttendanceRecord>();
  private auditEvents: Parameters<AttendanceRepository["recordAttendanceAuditEvent"]>[0][] = [];
  private nextAttendanceRecord = 1;

  createdTimesheets = 0;
  createdPayrollRecords = 0;
  createdFinanceRecords = 0;
  createdInvoices = 0;
  createdGpsProviderRecords = 0;
  createdOfflineSyncRecords = 0;
  createdNotificationProviderMessages = 0;
  createdAnalyticsEvents = 0;
  createdAiActions = 0;
  modifiedAssignments = 0;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  async createAttendanceFromAssignment(
    input: Parameters<AttendanceRepository["createAttendanceFromAssignment"]>[0]
  ) {
    const attendanceRecord: StoredAttendanceRecord = {
      id: `attendance-${this.nextAttendanceRecord}`,
      assignmentId: input.assignment.id,
      jobRequestId: input.assignment.jobRequestId,
      workerIdentityId: input.assignment.workerIdentityId,
      organizationId: input.assignment.organizationId,
      residenceId: input.assignment.residenceId,
      departmentId: input.assignment.departmentId,
      workGroupId: input.assignment.workGroupId,
      roleDefinitionId: input.assignment.roleDefinitionId,
      status: "pending_start",
      scheduledStartAt: input.assignment.confirmedStartAt,
      scheduledEndAt: input.assignment.confirmedEndAt,
      timezone: input.assignment.timezone,
      assignmentStatusSnapshot: input.assignment.status,
      verificationMethod: input.verificationMethod,
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
      createdByUserId: input.actorUserId,
      updatedByUserId: null,
      checkedInByUserId: null,
      checkedOutByUserId: null,
      cancelledByUserId: null,
      createdAt: input.now,
      updatedAt: input.now,
      completedAt: null,
      cancelledAt: null,
      version: 0
    };
    this.nextAttendanceRecord += 1;
    this.attendanceRecords.set(attendanceRecord.id, attendanceRecord);
    return attendanceRecord;
  }

  async findAttendanceById(attendanceRecordId: string) {
    return this.attendanceRecords.get(attendanceRecordId) ?? null;
  }

  async findAttendanceByAssignmentId(assignmentId: string) {
    return (
      [...this.attendanceRecords.values()].find(
        (attendanceRecord) => attendanceRecord.assignmentId === assignmentId
      ) ?? null
    );
  }

  async listAttendance(input: Parameters<AttendanceRepository["listAttendance"]>[0]) {
    return [...this.attendanceRecords.values()]
      .filter(
        (attendanceRecord) =>
          !input.organizationId || attendanceRecord.organizationId === input.organizationId
      )
      .filter(
        (attendanceRecord) =>
          !input.workerIdentityId || attendanceRecord.workerIdentityId === input.workerIdentityId
      )
      .filter(
        (attendanceRecord) =>
          !input.assignmentId || attendanceRecord.assignmentId === input.assignmentId
      )
      .filter(
        (attendanceRecord) => !input.statuses || input.statuses.includes(attendanceRecord.status)
      )
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() ||
          left.scheduledStartAt.getTime() - right.scheduledStartAt.getTime()
      );
  }

  async updateAttendance(input: Parameters<AttendanceRepository["updateAttendance"]>[0]) {
    const attendanceRecord = this.attendanceRecords.get(input.attendanceRecordId);
    if (!attendanceRecord || attendanceRecord.version !== input.expectedVersion) return null;

    if (input.status !== undefined) attendanceRecord.status = input.status;
    if (input.checkInAt !== undefined) attendanceRecord.checkInAt = input.checkInAt;
    if (input.checkInMethod !== undefined) attendanceRecord.checkInMethod = input.checkInMethod;
    if (input.checkInEvidenceSummary !== undefined) {
      attendanceRecord.checkInEvidenceSummary = input.checkInEvidenceSummary;
    }
    if (input.checkInLocationPolicyResult !== undefined) {
      attendanceRecord.checkInLocationPolicyResult = input.checkInLocationPolicyResult;
    }
    if (input.checkOutAt !== undefined) attendanceRecord.checkOutAt = input.checkOutAt;
    if (input.checkOutMethod !== undefined) attendanceRecord.checkOutMethod = input.checkOutMethod;
    if (input.checkOutEvidenceSummary !== undefined) {
      attendanceRecord.checkOutEvidenceSummary = input.checkOutEvidenceSummary;
    }
    if (input.checkOutLocationPolicyResult !== undefined) {
      attendanceRecord.checkOutLocationPolicyResult = input.checkOutLocationPolicyResult;
    }
    if (input.exceptionCategory !== undefined) {
      attendanceRecord.exceptionCategory = input.exceptionCategory;
    }
    if (input.supervisorNote !== undefined) attendanceRecord.supervisorNote = input.supervisorNote;
    if (input.completedAt !== undefined) attendanceRecord.completedAt = input.completedAt;
    if (input.cancelledAt !== undefined) attendanceRecord.cancelledAt = input.cancelledAt;
    if (input.checkedInByUserId !== undefined) {
      attendanceRecord.checkedInByUserId = input.checkedInByUserId;
    }
    if (input.checkedOutByUserId !== undefined) {
      attendanceRecord.checkedOutByUserId = input.checkedOutByUserId;
    }
    if (input.cancelledByUserId !== undefined) {
      attendanceRecord.cancelledByUserId = input.cancelledByUserId;
    }
    attendanceRecord.updatedByUserId = input.actorUserId;
    attendanceRecord.updatedAt = input.now;
    attendanceRecord.version += 1;
    return attendanceRecord;
  }

  async recordAttendanceAuditEvent(
    input: Parameters<AttendanceRepository["recordAttendanceAuditEvent"]>[0]
  ) {
    this.auditEvents.push(input);
  }
}

class MemoryTimesheetRepository implements TimesheetRepository {
  private timesheets = new Map<string, StoredTimesheet>();
  private snapshots = new Map<string, StoredTimesheetCalculationSnapshot>();
  private auditEvents: Parameters<TimesheetRepository["recordTimesheetAuditEvent"]>[0][] = [];
  private nextTimesheet = 1;
  private nextSnapshot = 1;

  modifiedAttendanceRecords = 0;
  createdPayrollRecords = 0;
  createdFinanceRecords = 0;
  createdInvoices = 0;
  createdPayments = 0;
  createdNotifications = 0;
  createdAiActions = 0;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  snapshotCount() {
    return this.snapshots.size;
  }

  async createTimesheetFromAttendance(
    input: Parameters<TimesheetRepository["createTimesheetFromAttendance"]>[0]
  ) {
    const timesheet: StoredTimesheet = {
      id: `timesheet-${this.nextTimesheet}`,
      assignmentId: input.assignment.id,
      attendanceRecordId: input.attendanceRecord.id,
      jobRequestId: input.attendanceRecord.jobRequestId,
      workerIdentityId: input.attendanceRecord.workerIdentityId,
      organizationId: input.attendanceRecord.organizationId,
      residenceId: input.attendanceRecord.residenceId,
      departmentId: input.attendanceRecord.departmentId,
      workGroupId: input.attendanceRecord.workGroupId,
      roleDefinitionId: input.attendanceRecord.roleDefinitionId,
      status: "draft",
      attendanceVersionSnapshot: input.attendanceRecord.version,
      assignmentVersionSnapshot: input.assignment.version,
      scheduledStartAt: input.attendanceRecord.scheduledStartAt,
      scheduledEndAt: input.attendanceRecord.scheduledEndAt,
      actualCheckInAt: null,
      actualCheckOutAt: null,
      timezone: input.attendanceRecord.timezone,
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
      createdByUserId: input.actorUserId,
      updatedByUserId: null,
      workerReviewedByUserId: null,
      employerReviewedByUserId: null,
      platformReviewedByUserId: null,
      lockedByUserId: null,
      createdAt: input.now,
      updatedAt: input.now,
      version: 0
    };
    this.nextTimesheet += 1;
    this.timesheets.set(timesheet.id, timesheet);
    return timesheet;
  }

  async findTimesheetById(timesheetId: string) {
    return this.timesheets.get(timesheetId) ?? null;
  }

  async findTimesheetByAttendanceRecordId(attendanceRecordId: string) {
    return (
      [...this.timesheets.values()].find(
        (timesheet) => timesheet.attendanceRecordId === attendanceRecordId
      ) ?? null
    );
  }

  async findTimesheetByAssignmentId(assignmentId: string) {
    return (
      [...this.timesheets.values()].find((timesheet) => timesheet.assignmentId === assignmentId) ??
      null
    );
  }

  async listTimesheets(input: Parameters<TimesheetRepository["listTimesheets"]>[0]) {
    return [...this.timesheets.values()]
      .filter(
        (timesheet) => !input.organizationId || timesheet.organizationId === input.organizationId
      )
      .filter(
        (timesheet) =>
          !input.workerIdentityId || timesheet.workerIdentityId === input.workerIdentityId
      )
      .filter((timesheet) => !input.assignmentId || timesheet.assignmentId === input.assignmentId)
      .filter((timesheet) => !input.statuses || input.statuses.includes(timesheet.status))
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() ||
          left.scheduledStartAt.getTime() - right.scheduledStartAt.getTime()
      );
  }

  async updateTimesheet(input: Parameters<TimesheetRepository["updateTimesheet"]>[0]) {
    const timesheet = this.timesheets.get(input.timesheetId);
    if (!timesheet || timesheet.version !== input.expectedVersion) return null;

    if (input.status !== undefined) timesheet.status = input.status;
    if (input.actualCheckInAt !== undefined) timesheet.actualCheckInAt = input.actualCheckInAt;
    if (input.actualCheckOutAt !== undefined) timesheet.actualCheckOutAt = input.actualCheckOutAt;
    if (input.rawElapsedMinutes !== undefined)
      timesheet.rawElapsedMinutes = input.rawElapsedMinutes;
    if (input.payableMinutes !== undefined) timesheet.payableMinutes = input.payableMinutes;
    if (input.billableMinutes !== undefined) timesheet.billableMinutes = input.billableMinutes;
    if (input.excludedMinutes !== undefined) timesheet.excludedMinutes = input.excludedMinutes;
    if (input.breakMinutes !== undefined) timesheet.breakMinutes = input.breakMinutes;
    if (input.premiumCandidateMinutes !== undefined) {
      timesheet.premiumCandidateMinutes = input.premiumCandidateMinutes;
    }
    if (input.overtimeCandidateMinutes !== undefined) {
      timesheet.overtimeCandidateMinutes = input.overtimeCandidateMinutes;
    }
    if (input.roundingAdjustmentMinutes !== undefined) {
      timesheet.roundingAdjustmentMinutes = input.roundingAdjustmentMinutes;
    }
    if (input.exceptionSummary !== undefined) timesheet.exceptionSummary = input.exceptionSummary;
    if (input.workerReviewStatus !== undefined) {
      timesheet.workerReviewStatus = input.workerReviewStatus;
    }
    if (input.workerReviewedAt !== undefined) timesheet.workerReviewedAt = input.workerReviewedAt;
    if (input.employerReviewStatus !== undefined) {
      timesheet.employerReviewStatus = input.employerReviewStatus;
    }
    if (input.employerReviewedAt !== undefined) {
      timesheet.employerReviewedAt = input.employerReviewedAt;
    }
    if (input.platformReviewStatus !== undefined) {
      timesheet.platformReviewStatus = input.platformReviewStatus;
    }
    if (input.platformReviewedAt !== undefined) {
      timesheet.platformReviewedAt = input.platformReviewedAt;
    }
    if (input.approvedAt !== undefined) timesheet.approvedAt = input.approvedAt;
    if (input.lockedAt !== undefined) timesheet.lockedAt = input.lockedAt;
    if (input.rejectedAt !== undefined) timesheet.rejectedAt = input.rejectedAt;
    if (input.cancelledAt !== undefined) timesheet.cancelledAt = input.cancelledAt;
    if (input.correctionReason !== undefined) timesheet.correctionReason = input.correctionReason;
    if (input.workerReviewedByUserId !== undefined) {
      timesheet.workerReviewedByUserId = input.workerReviewedByUserId;
    }
    if (input.employerReviewedByUserId !== undefined) {
      timesheet.employerReviewedByUserId = input.employerReviewedByUserId;
    }
    if (input.platformReviewedByUserId !== undefined) {
      timesheet.platformReviewedByUserId = input.platformReviewedByUserId;
    }
    if (input.lockedByUserId !== undefined) timesheet.lockedByUserId = input.lockedByUserId;
    timesheet.updatedByUserId = input.actorUserId;
    timesheet.updatedAt = input.now;
    timesheet.version += 1;
    return timesheet;
  }

  async createCalculationSnapshot(
    input: Parameters<TimesheetRepository["createCalculationSnapshot"]>[0]
  ) {
    const snapshot: StoredTimesheetCalculationSnapshot = {
      id: `timesheet-snapshot-${this.nextSnapshot}`,
      timesheetId: input.timesheet.id,
      attendanceRecordId: input.attendanceRecord.id,
      attendanceVersionSnapshot: input.attendanceRecord.version,
      assignmentId: input.assignment.id,
      assignmentVersionSnapshot: input.assignment.version,
      calculationPolicyVersion: input.calculation.calculationPolicyVersion,
      countryPackVersion: input.calculation.countryPackVersion,
      rawCheckInAt: input.calculation.rawCheckInAt,
      rawCheckOutAt: input.calculation.rawCheckOutAt,
      normalizedCheckInAt: input.calculation.normalizedCheckInAt,
      normalizedCheckOutAt: input.calculation.normalizedCheckOutAt,
      timezone: input.attendanceRecord.timezone,
      breakRule: input.calculation.breakRule,
      roundingRule: input.calculation.roundingRule,
      rawElapsedMinutes: input.calculation.rawElapsedMinutes,
      payableMinutes: input.calculation.payableMinutes,
      billableMinutes: input.calculation.billableMinutes,
      excludedMinutes: input.calculation.excludedMinutes,
      breakMinutes: input.calculation.breakMinutes,
      premiumCandidateMinutes: input.calculation.premiumCandidateMinutes,
      overtimeCandidateMinutes: input.calculation.overtimeCandidateMinutes,
      roundingAdjustmentMinutes: input.calculation.roundingAdjustmentMinutes,
      exceptionFlags: input.calculation.exceptionFlags,
      calculationEngineVersion: input.calculation.calculationEngineVersion,
      createdAt: input.now
    };
    this.nextSnapshot += 1;
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  async listCalculationSnapshots(timesheetId: string) {
    return [...this.snapshots.values()]
      .filter((snapshot) => snapshot.timesheetId === timesheetId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async recordTimesheetAuditEvent(
    input: Parameters<TimesheetRepository["recordTimesheetAuditEvent"]>[0]
  ) {
    this.auditEvents.push(input);
  }
}

class FixtureDispatchCandidateSource implements DispatchCandidateSource {
  async getStatus() {
    return { status: "available" as const };
  }

  async searchCandidates(input: Parameters<DispatchCandidateSource["searchCandidates"]>[0]) {
    const candidate = await this.evaluateCandidate({
      dispatchReview: input.dispatchReview,
      candidateSourceReference: "worker-alpha",
      staffingWindow: input.staffingWindow,
      requestedAt: input.requestedAt
    });

    return {
      status: "available" as const,
      candidates: candidate.candidate ? [candidate.candidate] : []
    };
  }

  async evaluateCandidate(input: Parameters<DispatchCandidateSource["evaluateCandidate"]>[0]) {
    const now = input.requestedAt;
    return {
      status: "available" as const,
      candidate: {
        id: `fixture-${input.candidateSourceReference}`,
        dispatchReviewId: input.dispatchReview.id,
        workerIdentityId: "worker-identity-1",
        candidateSourceType: "internal_worker_profile" as const,
        candidateSourceReference: input.candidateSourceReference,
        approvedDisplayName: "Approved Worker Alpha",
        workGroupMatch: "match" as const,
        roleDefinitionMatch: "match" as const,
        qualificationSummaryState: "meets_requirements" as const,
        verificationSummaryState: "verification_pending" as const,
        availabilityState: "available" as const,
        scheduleConflictState: "conflict_free" as const,
        serviceAreaState: "inside_service_area" as const,
        travelSuitabilityState: "suitable" as const,
        transportConstraintState: "available" as const,
        recommendationState: "recommended" as const,
        shortlistState: "not_shortlisted" as const,
        shortlistOrder: null,
        sourceFreshnessAt: now,
        lastEvaluatedAt: now,
        evaluationVersion: 1,
        addedByUserId: null,
        removedByUserId: null,
        createdAt: now,
        updatedAt: now,
        version: 0,
        versionToken: 0
      }
    };
  }
}

function createResidenceTestServices() {
  const membershipRepository = new MemoryOrganizationMembershipRepository();
  const organizationRepository = new MemoryEmployerOrganizationRepository(membershipRepository);
  const residenceRepository = new MemoryResidenceRepository();
  const membershipService = createOrganizationMembershipService(membershipRepository);
  const authorizationService = createAuthorizationService();
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

  return {
    membershipService,
    organizationService,
    residenceService,
    residenceRepository
  };
}

function createDepartmentTestServices() {
  const membershipRepository = new MemoryOrganizationMembershipRepository();
  const organizationRepository = new MemoryEmployerOrganizationRepository(membershipRepository);
  const residenceRepository = new MemoryResidenceRepository();
  const departmentRepository = new MemoryDepartmentRepository();
  const membershipService = createOrganizationMembershipService(membershipRepository);
  const authorizationService = createAuthorizationService();
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

  return {
    membershipService,
    organizationService,
    residenceService,
    departmentService,
    departmentRepository
  };
}

function createWorkGroupTestServices() {
  const workGroupRepository = new MemoryWorkGroupRepository();
  const authorizationService = createAuthorizationService();
  const workGroupService = createWorkGroupService(workGroupRepository, authorizationService);

  return {
    workGroupService,
    workGroupRepository
  };
}

function createRoleDefinitionTestServices() {
  const roleDefinitionRepository = new MemoryRoleDefinitionRepository();
  const authorizationService = createAuthorizationService();
  const roleDefinitionService = createRoleDefinitionService(
    roleDefinitionRepository,
    authorizationService
  );

  return {
    roleDefinitionService,
    roleDefinitionRepository
  };
}

function createJobRequestTestServices() {
  const membershipRepository = new MemoryOrganizationMembershipRepository();
  const organizationRepository = new MemoryEmployerOrganizationRepository(membershipRepository);
  const residenceRepository = new MemoryResidenceRepository();
  const departmentRepository = new MemoryDepartmentRepository();
  const workGroupRepository = new MemoryWorkGroupRepository();
  const roleDefinitionRepository = new MemoryRoleDefinitionRepository();
  const jobRequestRepository = new MemoryJobRequestRepository();
  const membershipService = createOrganizationMembershipService(membershipRepository);
  const authorizationService = createAuthorizationService();
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
    jobRequestRepository,
    organizationRepository,
    residenceRepository,
    departmentRepository,
    workGroupRepository,
    roleDefinitionRepository,
    membershipService,
    authorizationService
  );

  return {
    organizationService,
    residenceService,
    departmentService,
    jobRequestService,
    jobRequestRepository,
    organizationRepository,
    membershipService,
    authorizationService
  };
}

async function createApprovedDispatchContext(
  input: { candidateSource?: DispatchCandidateSource } = {}
) {
  const {
    organizationService,
    residenceService,
    departmentService,
    jobRequestService,
    jobRequestRepository,
    organizationRepository,
    membershipService,
    authorizationService
  } = createJobRequestTestServices();
  const dispatchRepository = new MemoryDispatchRepository();
  const dispatchService = createDispatchService(
    dispatchRepository,
    jobRequestRepository,
    organizationRepository,
    membershipService,
    authorizationService,
    input.candidateSource
  );
  const ownerId = "owner-dispatch";
  const adminSession = activeSession({ emailNormalized: "dispatcher@example.com" });
  const organization = await organizationService.createOrganization({
    actorUserId: ownerId,
    legalName: "Dispatch Org",
    displayName: "Dispatch Org"
  });
  const residence = await residenceService.createResidence({
    actorUserId: ownerId,
    organizationId: organization.organization.id,
    name: "Dispatch Residence"
  });
  const department = await departmentService.createDepartment({
    actorUserId: ownerId,
    organizationId: organization.organization.id,
    residenceId: residence.id,
    name: "Kitchen"
  });
  const draft = await jobRequestService.createDraft({
    actorUserId: ownerId,
    organizationId: organization.organization.id,
    residenceId: residence.id,
    departmentId: department.id,
    workGroupSlug: "kitchen",
    roleDefinitionIdentifier: "chef",
    title: "Dispatch Chef Coverage",
    numberOfWorkers: 2,
    urgency: "urgent",
    requestType: "single_day",
    timezone: "America/Toronto",
    startAt: new Date("2026-08-12T12:00:00.000Z"),
    endAt: new Date("2026-08-12T20:00:00.000Z")
  });
  const submitted = await jobRequestService.submit({
    actorUserId: ownerId,
    organizationId: organization.organization.id,
    jobRequestId: draft.id,
    expectedVersion: draft.versionToken
  });
  const review = await jobRequestService.startAdminReview({
    session: adminSession,
    roles: ["PLATFORM_ADMINISTRATOR"],
    jobRequestId: submitted.id,
    expectedVersion: submitted.versionToken
  });
  const approvedJobRequest = await jobRequestService.approveForDispatch({
    session: adminSession,
    roles: ["PLATFORM_ADMINISTRATOR"],
    jobRequestId: review.id,
    expectedVersion: review.versionToken
  });

  return {
    dispatchService,
    dispatchRepository,
    approvedJobRequest,
    adminSession,
    ownerId,
    organization
  };
}

async function createWorkerOfferContext(
  input: { deliveryProvider?: WorkerOfferDeliveryProvider } = {}
) {
  const { dispatchService, dispatchRepository, approvedJobRequest, adminSession, organization } =
    await createApprovedDispatchContext({
      candidateSource: new FixtureDispatchCandidateSource()
    });
  const workerOfferRepository = new MemoryWorkerOfferRepository();
  const workerOfferService = createWorkerOfferService(
    workerOfferRepository,
    dispatchRepository,
    new MemoryJobRequestRepositoryWithSeed(approvedJobRequest),
    createAuthorizationService(),
    {
      deliveryProvider: input.deliveryProvider ?? {
        async deliver() {
          return { status: "sent", providerReference: "test-provider", retryable: false };
        }
      }
    }
  );
  const dispatchReview = await dispatchService.createDispatch({
    session: adminSession,
    roles: ["DISPATCHER"],
    jobRequestIdOrNumber: approvedJobRequest.id
  });
  const reviewing = await dispatchService.startCandidateReview({
    session: adminSession,
    roles: ["DISPATCHER"],
    dispatchReviewId: dispatchReview.id,
    expectedVersion: dispatchReview.versionToken
  });
  const evaluated = await dispatchService.evaluateCandidate({
    session: adminSession,
    roles: ["DISPATCHER"],
    dispatchReviewId: reviewing.id,
    candidateSourceReference: "worker-alpha"
  });
  if (evaluated.status === "available") {
    await dispatchService.addCandidateToShortlist({
      session: adminSession,
      roles: ["DISPATCHER"],
      dispatchReviewId: reviewing.id,
      candidateSourceReference: "worker-alpha"
    });
  }
  const latest = await dispatchService.getDispatch({
    session: adminSession,
    roles: ["DISPATCHER"],
    dispatchReviewId: reviewing.id
  });
  const ready = await dispatchService.markShortlistReady({
    session: adminSession,
    roles: ["DISPATCHER"],
    dispatchReviewId: latest.dispatchReview.id,
    expectedVersion: latest.dispatchReview.versionToken
  });
  const offerPreparation = await dispatchService.moveToOfferPreparation({
    session: adminSession,
    roles: ["DISPATCHER"],
    dispatchReviewId: ready.id,
    expectedVersion: ready.versionToken
  });
  const workerOne = await workerOfferService.ensureWorkerIdentity({
    userId: "00000000-0000-4000-8000-000000000001",
    displayName: "Worker One",
    preferredLanguage: "en"
  });
  await workerOfferService.ensureWorkerIdentity({
    userId: "00000000-0000-4000-8000-000000000002",
    displayName: "Worker Two",
    preferredLanguage: "en"
  });

  return {
    workerOfferService,
    workerOfferRepository,
    dispatchRepository,
    dispatchReview: offerPreparation,
    adminSession,
    workerOne,
    workerSession: activeSession({ emailNormalized: "worker-one@example.com" }),
    otherWorkerSession: {
      ...activeSession({ emailNormalized: "worker-two@example.com" }),
      user: {
        ...activeSession().user,
        id: "00000000-0000-4000-8000-000000000002",
        emailNormalized: "worker-two@example.com"
      }
    },
    approvedJobRequest,
    organization
  };
}

async function createAcceptedAssignmentContext() {
  const context = await createWorkerOfferContext();
  const assignmentRepository = new MemoryAssignmentRepository();
  const jobRequestRepository = new MemoryJobRequestRepositoryWithSeed(context.approvedJobRequest);
  assignmentRepository.configureSources({
    workerOffers: context.workerOfferRepository,
    dispatches: context.dispatchRepository,
    jobRequests: jobRequestRepository
  });
  const assignmentService = createAssignmentService(
    assignmentRepository,
    context.workerOfferRepository,
    context.dispatchRepository,
    jobRequestRepository,
    createAuthorizationService()
  );
  const draftForAcceptance = await context.workerOfferService.createOffer({
    session: context.adminSession,
    roles: ["DISPATCHER"],
    dispatchReviewId: context.dispatchReview.id,
    workerIdentityId: context.workerOne.id,
    expiresAt: new Date("2026-08-12T10:00:00.000Z")
  });
  const approved = await context.workerOfferService.approve({
    session: context.adminSession,
    roles: ["DISPATCHER"],
    workerOfferId: draftForAcceptance.id,
    expectedVersion: draftForAcceptance.versionToken
  });
  const sent = await context.workerOfferService.send({
    session: context.adminSession,
    roles: ["DISPATCHER"],
    workerOfferId: approved.id,
    expectedVersion: approved.versionToken
  });
  const viewed = await context.workerOfferService.workerRead({
    session: context.workerSession,
    roles: ["WORKER_ACCESS"],
    workerOfferId: sent.id
  });
  const acceptedOffer = await context.workerOfferService.accept({
    session: context.workerSession,
    roles: ["WORKER_ACCESS"],
    workerOfferId: viewed.id,
    expectedVersion: viewed.versionToken,
    expectedTermsVersionId: viewed.currentTermsVersion!.id
  });

  return {
    ...context,
    assignmentService,
    assignmentRepository,
    acceptedOffer
  };
}

async function createAttendanceContext(input: { assignmentReady?: boolean } = {}) {
  const context = await createAcceptedAssignmentContext();
  const attendanceRepository = new MemoryAttendanceRepository();
  const attendanceService = createAttendanceService(
    attendanceRepository,
    context.assignmentRepository,
    context.workerOfferRepository,
    createAuthorizationService()
  );
  const confirmed = await context.assignmentService.createFromAcceptedOffer({
    session: context.adminSession,
    roles: ["DISPATCHER"],
    workerOfferId: context.acceptedOffer.id,
    expectedDispatchReviewId: context.acceptedOffer.dispatchReviewId,
    expectedOfferVersion: context.acceptedOffer.version
  });
  const ready =
    input.assignmentReady === false
      ? null
      : await context.assignmentService.markReadyForAttendance({
          session: context.adminSession,
          roles: ["DISPATCHER"],
          assignmentId: confirmed.id,
          expectedVersion: confirmed.versionToken
        });
  const assignment =
    ready === null
      ? confirmed
      : await context.assignmentService.attendanceHandoff({
          session: context.adminSession,
          roles: ["DISPATCHER"],
          assignmentId: ready.id,
          expectedVersion: ready.versionToken
        });

  return {
    ...context,
    attendanceService,
    attendanceRepository,
    assignment
  };
}

async function createTimesheetContext() {
  const context = await createAttendanceContext();
  const timesheetRepository = new MemoryTimesheetRepository();
  const timesheetService = createTimesheetService(
    timesheetRepository,
    context.attendanceRepository,
    context.assignmentRepository,
    context.workerOfferRepository,
    createAuthorizationService()
  );
  const created = await context.attendanceService.createFromAssignment({
    session: context.adminSession,
    roles: ["DISPATCHER"],
    assignmentId: context.assignment.id,
    verificationMethod: "none"
  });
  const checkedIn = await context.attendanceService.workerCheckIn({
    session: context.workerSession,
    roles: ["WORKER_ACCESS"],
    attendanceRecordId: created.id,
    expectedVersion: created.versionToken,
    method: "secure_pin",
    evidenceSummary: "Worker submitted secure PIN.",
    locationPolicyResult: "not_required"
  });
  const checkedOut = await context.attendanceService.workerCheckOut({
    session: context.workerSession,
    roles: ["WORKER_ACCESS"],
    attendanceRecordId: checkedIn.id,
    expectedVersion: checkedIn.versionToken,
    method: "secure_pin",
    evidenceSummary: "Worker submitted secure PIN at departure.",
    locationPolicyResult: "not_required"
  });
  const attendanceRecord = await context.attendanceService.markCompleted({
    session: context.adminSession,
    roles: ["DISPATCHER"],
    attendanceRecordId: checkedOut.id,
    expectedVersion: checkedOut.versionToken
  });
  const storedAttendanceRecord =
    (await context.attendanceRepository.findAttendanceById(attendanceRecord.id)) ??
    attendanceRecord;
  storedAttendanceRecord.checkInAt = new Date("2026-08-12T12:00:00.000Z");
  storedAttendanceRecord.checkOutAt = new Date("2026-08-12T20:00:00.000Z");

  return {
    ...context,
    timesheetService,
    timesheetRepository,
    attendanceRecord: storedAttendanceRecord
  };
}

class MemoryJobRequestRepositoryWithSeed extends MemoryJobRequestRepository {
  constructor(private readonly seededJobRequest: StoredJobRequest) {
    super();
  }

  override async findJobRequestById(jobRequestId: string) {
    return this.seededJobRequest.id === jobRequestId ? this.seededJobRequest : null;
  }

  override async findJobRequestByNumber(jobRequestNumber: string) {
    return this.seededJobRequest.jobRequestNumber === jobRequestNumber
      ? this.seededJobRequest
      : null;
  }
}

function activeSession(
  input: { userStatus?: StoredAuthenticationUser["status"]; emailNormalized?: string } = {}
) {
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

function inviteInput(): InviteMembershipInput {
  return {
    organizationId: "org-1",
    userId: "00000000-0000-4000-8000-000000000001",
    invitedByUserId: "00000000-0000-4000-8000-000000000002",
    accessRoleKeys: ["ORGANIZATION_OWNER"]
  };
}
