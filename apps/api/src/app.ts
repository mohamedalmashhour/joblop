import Fastify, { type FastifyReply } from "fastify";
import {
  AuthenticationError,
  AuthenticationRequiredError,
  AssignmentError,
  AttendanceError,
  CalendarRequestError,
  DepartmentError,
  DispatchError,
  EmployerOrganizationError,
  JobRequestError,
  OrganizationMembershipError,
  PasswordPolicyError,
  ResidenceError,
  RegistrationUnavailableError,
  RoleDefinitionError,
  TimesheetError,
  WorkerOfferError,
  WorkGroupError,
  authenticationErrorCode,
  authenticationErrorMessage,
  authenticationRequiredCode,
  authorizationDeniedCode,
  authorizationDeniedMessage,
  createAuthenticationService,
  createAssignmentService,
  createAttendanceService,
  createCalendarRequestService,
  createAuthorizationService,
  createDepartmentService,
  createDispatchService,
  createEmployerOrganizationService,
  createJobRequestService,
  createOrganizationMembershipService,
  createResidenceService,
  createRoleDefinitionService,
  createTimesheetService,
  createWorkerOfferService,
  createWorkGroupService,
  createPrismaAssignmentRepository,
  createPrismaAttendanceRepository,
  createPrismaCalendarRequestProfileRepository,
  createPrismaDepartmentRepository,
  createPrismaDispatchRepository,
  createPrismaAuthenticationRepository,
  createPrismaEmployerOrganizationRepository,
  createPrismaJobRequestRepository,
  createPrismaOrganizationMembershipRepository,
  createPrismaResidenceRepository,
  createPrismaRoleDefinitionRepository,
  createPrismaTimesheetRepository,
  createPrismaWorkerOfferRepository,
  createPrismaWorkGroupRepository,
  passwordPolicyErrorCode,
  registrationUnavailableCode,
  toSafeAuthorizationResponse,
  type AuthorizationRoleKey,
  type AuthorizationService,
  type AssignmentService,
  type AssignmentStatus,
  type AttendanceService,
  type AttendanceStatus,
  type AuthenticationService,
  type CalendarRequestService,
  type CalendarVerificationState,
  type DepartmentService,
  type DepartmentStatus,
  type DispatchService,
  type DispatchPriority,
  type EmployerOrganizationService,
  type JobRequestService,
  type JobRequestType,
  type JobRequestUrgency,
  type OrganizationMembershipService,
  type ResidenceService,
  type ResidenceStatus,
  type RoleDefinitionService,
  type TimesheetService,
  type TimesheetStatus,
  type WorkerOfferService,
  type WorkerOfferStatus,
  type WorkGroupService
} from "@rwos/auth";
import { getRuntimeConfig } from "@rwos/config";
import { createPrismaClient } from "@rwos/database";
import { createLogger } from "@rwos/observability";

export interface BuildApiOptions {
  authService?: AuthenticationService;
  authorizationService?: AuthorizationService;
  membershipService?: OrganizationMembershipService;
  organizationService?: EmployerOrganizationService;
  residenceService?: ResidenceService;
  departmentService?: DepartmentService;
  dispatchService?: DispatchService;
  workerOfferService?: WorkerOfferService;
  assignmentService?: AssignmentService;
  attendanceService?: AttendanceService;
  timesheetService?: TimesheetService;
  calendarRequestService?: CalendarRequestService;
  workGroupService?: WorkGroupService;
  roleDefinitionService?: RoleDefinitionService;
  jobRequestService?: JobRequestService;
  resolveAuthorizationRoles?: (
    userId: string
  ) => Promise<readonly AuthorizationRoleKey[]> | readonly AuthorizationRoleKey[];
}

export function buildApi(options: BuildApiOptions = {}) {
  const app = Fastify({ logger: false });
  const logger = createLogger("api");
  const authRateLimiter = createAuthenticationRateLimiter();
  const prisma = options.authService ? null : createPrismaClient();
  const authService =
    options.authService ??
    createAuthenticationService(createPrismaAuthenticationRepository(prisma!), {
      sessionTtlSeconds: 60 * 60 * 8
    });
  const authorizationService = options.authorizationService ?? createAuthorizationService();
  const membershipService =
    options.membershipService ??
    createOrganizationMembershipService(createPrismaOrganizationMembershipRepository(prisma!));
  const organizationRepository = prisma ? createPrismaEmployerOrganizationRepository(prisma) : null;
  const organizationService =
    options.organizationService ??
    createEmployerOrganizationService(
      organizationRepository!,
      membershipService,
      authorizationService
    );
  const residenceService =
    options.residenceService ??
    createResidenceService(
      createPrismaResidenceRepository(prisma!),
      organizationRepository!,
      membershipService,
      authorizationService
    );
  const departmentService =
    options.departmentService ??
    createDepartmentService(
      createPrismaDepartmentRepository(prisma!),
      createPrismaResidenceRepository(prisma!),
      organizationRepository!,
      membershipService,
      authorizationService
    );
  const workGroupService =
    options.workGroupService ??
    createWorkGroupService(createPrismaWorkGroupRepository(prisma!), authorizationService);
  const roleDefinitionService =
    options.roleDefinitionService ??
    createRoleDefinitionService(
      createPrismaRoleDefinitionRepository(prisma!),
      authorizationService
    );
  const jobRequestService =
    options.jobRequestService ??
    createJobRequestService(
      createPrismaJobRequestRepository(prisma!),
      organizationRepository!,
      createPrismaResidenceRepository(prisma!),
      createPrismaDepartmentRepository(prisma!),
      createPrismaWorkGroupRepository(prisma!),
      createPrismaRoleDefinitionRepository(prisma!),
      membershipService,
      authorizationService
    );
  const dispatchService =
    options.dispatchService ??
    (prisma
      ? createDispatchService(
          createPrismaDispatchRepository(prisma),
          createPrismaJobRequestRepository(prisma),
          organizationRepository!,
          membershipService,
          authorizationService
        )
      : createUnavailableDispatchService());
  const workerOfferService =
    options.workerOfferService ??
    (prisma
      ? createWorkerOfferService(
          createPrismaWorkerOfferRepository(prisma),
          createPrismaDispatchRepository(prisma),
          createPrismaJobRequestRepository(prisma),
          authorizationService
        )
      : createUnavailableWorkerOfferService());
  const assignmentService =
    options.assignmentService ??
    (prisma
      ? createAssignmentService(
          createPrismaAssignmentRepository(prisma),
          createPrismaWorkerOfferRepository(prisma),
          createPrismaDispatchRepository(prisma),
          createPrismaJobRequestRepository(prisma),
          authorizationService
        )
      : createUnavailableAssignmentService());
  const attendanceService =
    options.attendanceService ??
    (prisma
      ? createAttendanceService(
          createPrismaAttendanceRepository(prisma),
          createPrismaAssignmentRepository(prisma),
          createPrismaWorkerOfferRepository(prisma),
          authorizationService
        )
      : createUnavailableAttendanceService());
  const timesheetService =
    options.timesheetService ??
    (prisma
      ? createTimesheetService(
          createPrismaTimesheetRepository(prisma),
          createPrismaAttendanceRepository(prisma),
          createPrismaAssignmentRepository(prisma),
          createPrismaWorkerOfferRepository(prisma),
          authorizationService
        )
      : createUnavailableTimesheetService());
  const calendarRequestService =
    options.calendarRequestService ??
    (prisma
      ? createCalendarRequestService({
          repository: createPrismaCalendarRequestProfileRepository(prisma),
          jobRequestAccess: jobRequestService,
          workerOfferAccess: workerOfferService
        })
      : createUnavailableCalendarRequestService());
  const resolveAuthorizationRoles = options.resolveAuthorizationRoles ?? (() => []);

  if (prisma) {
    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof OrganizationMembershipError) {
      return sendMembershipDenied(reply);
    }

    if (error instanceof EmployerOrganizationError) {
      return sendOrganizationDenied(reply);
    }

    if (error instanceof ResidenceError) {
      return sendResidenceDenied(reply);
    }

    if (error instanceof DepartmentError) {
      return sendDepartmentDenied(reply);
    }

    if (error instanceof WorkGroupError) {
      return sendWorkGroupDenied(reply);
    }

    if (error instanceof RoleDefinitionError) {
      return sendRoleDefinitionDenied(reply);
    }

    if (error instanceof JobRequestError) {
      return sendJobRequestDenied(reply);
    }

    if (error instanceof DispatchError) {
      return sendDispatchDenied(reply);
    }

    if (error instanceof WorkerOfferError) {
      return sendWorkerOfferDenied(reply);
    }

    if (error instanceof AssignmentError) {
      return sendAssignmentDenied(reply);
    }

    if (error instanceof AttendanceError) {
      return sendAttendanceDenied(reply);
    }

    if (error instanceof TimesheetError) {
      return sendTimesheetDenied(reply);
    }

    if (error instanceof CalendarRequestError) {
      const conflict =
        error.code === "RWOS_CALENDAR_REQUEST_NOT_EDITABLE" ||
        error.code === "RWOS_CALENDAR_REQUEST_VERSION_CONFLICT";
      return reply.code(conflict ? 409 : 400).send({
        error: error.code,
        message: "Calendar request operation was denied."
      });
    }

    throw error;
  });

  app.get("/health", async () => {
    const config = getRuntimeConfig();
    logger.info("health-check");

    return {
      ok: true,
      service: "resident-workforce-os-api",
      environment: config.rwosEnv,
      foundationOnly: true
    };
  });

  app.post("/auth/register", async (request, reply) => {
    const body = asRecord(request.body);
    const email = readRequiredString(body, "email");
    const password = readRequiredString(body, "password");
    const displayName = readOptionalString(body, "displayName");

    if (!email || !password) {
      return reply.code(400).send({
        error: "RWOS_INVALID_AUTH_REQUEST",
        message: "Invalid authentication request."
      });
    }

    const rateLimit = authRateLimiter.consume(`register:${request.ip}:${email.toLowerCase()}`);
    if (!rateLimit.allowed) {
      return sendAuthenticationRateLimited(reply, rateLimit.retryAfterSeconds);
    }

    try {
      const result = await authService.register({
        email,
        password,
        displayName,
        source: "api",
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      });

      return reply.code(201).send(serializeAuthenticationResult(result));
    } catch (error) {
      return sendAuthenticationError(reply, error);
    }
  });

  app.post("/auth/sign-in", async (request, reply) => {
    const body = asRecord(request.body);
    const email = readRequiredString(body, "email");
    const password = readRequiredString(body, "password");

    if (!email || !password) {
      return reply.code(401).send({
        error: authenticationErrorCode,
        message: authenticationErrorMessage
      });
    }

    const rateLimit = authRateLimiter.consume(`sign-in:${request.ip}:${email.toLowerCase()}`);
    if (!rateLimit.allowed) {
      return sendAuthenticationRateLimited(reply, rateLimit.retryAfterSeconds);
    }

    try {
      const result = await authService.signIn({
        email,
        password,
        source: "api",
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      });

      return reply.code(200).send(serializeAuthenticationResult(result));
    } catch (error) {
      return sendAuthenticationError(reply, error);
    }
  });

  app.get("/auth/session", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated) {
      return reply.code(401).send({
        error: authenticationRequiredCode,
        message: "Authentication required."
      });
    }

    return reply.code(200).send({
      authenticated: true,
      user: session.user,
      session: session.session
        ? {
            ...session.session,
            expiresAt: session.session.expiresAt.toISOString()
          }
        : null
    });
  });

  app.post("/auth/sign-out", async (request, reply) => {
    await authService.revokeSession({
      token: readBearerToken(request.headers.authorization),
      reason: "logout",
      source: "api"
    });

    return reply.code(204).send();
  });

  app.post("/auth/sessions/revoke", async (request, reply) => {
    await authService.revokeSession({
      token: readBearerToken(request.headers.authorization),
      reason: "session_revoked",
      source: "api"
    });

    return reply.code(204).send();
  });

  app.post("/authz/check", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return reply.code(403).send({
        error: authorizationDeniedCode,
        message: authorizationDeniedMessage
      });
    }

    const body = asRecord(request.body);
    const permission = readRequiredString(body, "permission");

    if (!permission) {
      return reply.code(400).send({
        error: "RWOS_INVALID_AUTHORIZATION_REQUEST",
        message: "Invalid authorization request."
      });
    }

    const organizationId = readOptionalString(body, "organizationId");
    const platform = body.platform === true;
    const decision = await authorizationService.decide({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      permission,
      resourceContext: { organizationId },
      platformContext: { platform }
    });

    return reply.code(decision.allow ? 200 : 403).send(toSafeAuthorizationResponse(decision));
  });

  app.post("/authz/platform-admin/probe", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return reply.code(403).send({
        error: authorizationDeniedCode,
        message: authorizationDeniedMessage
      });
    }

    const decision = await authorizationService.decide({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      permission: "platform.supervise",
      platformContext: { platform: true }
    });

    return reply.code(decision.allow ? 200 : 403).send(toSafeAuthorizationResponse(decision));
  });

  app.get("/work-groups", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const roles = await resolveCatalogueReadRoles(
      session.user.id,
      readOptionalString(asRecord(request.query), "organizationId")
    );
    const workGroups = await workGroupService.listActiveWorkGroups({ session, roles });

    return reply.code(200).send({ workGroups: workGroups.map(serializeWorkGroup) });
  });

  app.get("/work-groups/:slug", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const roles = await resolveCatalogueReadRoles(
      session.user.id,
      readOptionalString(asRecord(request.query), "organizationId")
    );
    const workGroup = await workGroupService.getActiveWorkGroup({
      session,
      roles,
      slug: readRouteParam(request.params, "slug")
    });

    return reply.code(200).send({ workGroup: serializeWorkGroup(workGroup) });
  });

  app.get("/platform/work-groups", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const workGroups = await workGroupService.listAllWorkGroups({
      session,
      roles: await resolveAuthorizationRoles(session.user.id)
    });

    return reply.code(200).send({ workGroups: workGroups.map(serializeWorkGroup) });
  });

  app.get("/platform/work-groups/:slug", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const workGroup = await workGroupService.getWorkGroupForManagement({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      slug: readRouteParam(request.params, "slug")
    });

    return reply.code(200).send({ workGroup: serializeWorkGroup(workGroup) });
  });

  app.patch("/platform/work-groups/:slug", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const body = asRecord(request.body);
    const workGroup = await workGroupService.updateWorkGroup({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      slug: readRouteParam(request.params, "slug"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      displayLabel: readOptionalString(body, "displayLabel"),
      displayOrder: readOptionalNumber(body, "displayOrder"),
      iconKey: readOptionalString(body, "iconKey")
    });

    return reply.code(200).send({ workGroup: serializeWorkGroup(workGroup) });
  });

  app.post("/platform/work-groups/:slug/status", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendWorkGroupDenied(reply);
    }

    const body = asRecord(request.body);
    const status = readWorkGroupLifecycleStatus(readRequiredString(body, "status"));
    const reason = readRequiredString(body, "reason");

    if (!status || !reason) {
      return reply.code(400).send({
        error: "RWOS_INVALID_WORK_GROUP_REQUEST",
        message: "Invalid work group request."
      });
    }

    const workGroup = await workGroupService.updateWorkGroupStatus({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      slug: readRouteParam(request.params, "slug"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      status,
      reason
    });

    return reply.code(200).send({ workGroup: serializeWorkGroup(workGroup) });
  });

  app.get("/role-definitions", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const query = asRecord(request.query);
    const roles = await resolveCatalogueReadRoles(
      session.user.id,
      readOptionalString(query, "organizationId")
    );
    const roleDefinitions = await roleDefinitionService.listActiveRoleDefinitions({
      session,
      roles,
      workGroupSlug: readOptionalString(query, "workGroup")
    });

    return reply.code(200).send({ roleDefinitions: roleDefinitions.map(serializeRoleDefinition) });
  });

  app.get("/role-definitions/:identifier", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const roles = await resolveCatalogueReadRoles(
      session.user.id,
      readOptionalString(asRecord(request.query), "organizationId")
    );
    const roleDefinition = await roleDefinitionService.getActiveRoleDefinition({
      session,
      roles,
      identifier: readRouteParam(request.params, "identifier")
    });

    return reply.code(200).send({ roleDefinition: serializeRoleDefinition(roleDefinition) });
  });

  app.get("/platform/role-definitions", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const roleDefinitions = await roleDefinitionService.listAllRoleDefinitions({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workGroupSlug: readOptionalString(asRecord(request.query), "workGroup")
    });

    return reply.code(200).send({ roleDefinitions: roleDefinitions.map(serializeRoleDefinition) });
  });

  app.get("/platform/role-definitions/:identifier", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const roleDefinition = await roleDefinitionService.getRoleDefinitionForManagement({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      identifier: readRouteParam(request.params, "identifier")
    });

    return reply.code(200).send({ roleDefinition: serializeRoleDefinition(roleDefinition) });
  });

  app.patch("/platform/role-definitions/:identifier", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const body = asRecord(request.body);
    const roleDefinition = await roleDefinitionService.updateRoleDefinition({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      identifier: readRouteParam(request.params, "identifier"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      displayLabel: readOptionalString(body, "displayLabel"),
      displayOrder: readOptionalNumber(body, "displayOrder"),
      localizedLabelKey: readOptionalString(body, "localizedLabelKey"),
      qualificationSummary: readOptionalString(body, "qualificationSummary"),
      safetyRequirementSummary: readOptionalString(body, "safetyRequirementSummary")
    });

    return reply.code(200).send({ roleDefinition: serializeRoleDefinition(roleDefinition) });
  });

  app.post("/platform/role-definitions/:identifier/status", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendRoleDefinitionDenied(reply);
    }

    const body = asRecord(request.body);
    const status = readRoleDefinitionLifecycleStatus(readRequiredString(body, "status"));
    const reason = readRequiredString(body, "reason");

    if (!status || !reason) {
      return reply.code(400).send({
        error: "RWOS_INVALID_ROLE_DEFINITION_REQUEST",
        message: "Invalid role definition request."
      });
    }

    const roleDefinition = await roleDefinitionService.updateRoleDefinitionStatus({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      identifier: readRouteParam(request.params, "identifier"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      status,
      reason
    });

    return reply.code(200).send({ roleDefinition: serializeRoleDefinition(roleDefinition) });
  });

  app.get("/memberships", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    return reply.code(200).send({
      memberships: serializeMemberships(await membershipService.listMemberships(session.user.id))
    });
  });

  app.get("/memberships/:membershipId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membershipId = readRouteParam(request.params, "membershipId");
    const membership = membershipId
      ? await membershipService.getMembership(session.user.id, membershipId)
      : null;

    if (!membership) {
      return sendMembershipDenied(reply);
    }

    return reply.code(200).send({
      membership: serializeMembership(membership)
    });
  });

  app.post("/memberships/:membershipId/activate", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membership = await membershipService.activateMembership({
      userId: session.user.id,
      membershipId: readRouteParam(request.params, "membershipId"),
      actorUserId: session.user.id
    });

    return reply.code(200).send({ membership: serializeMembership(membership) });
  });

  app.post("/memberships/:membershipId/suspend", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membership = await membershipService.suspendMembership({
      userId: session.user.id,
      membershipId: readRouteParam(request.params, "membershipId"),
      actorUserId: session.user.id
    });

    return reply.code(200).send({ membership: serializeMembership(membership) });
  });

  app.post("/memberships/:membershipId/revoke", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membership = await membershipService.revokeMembership({
      userId: session.user.id,
      membershipId: readRouteParam(request.params, "membershipId"),
      actorUserId: session.user.id
    });

    return reply.code(200).send({ membership: serializeMembership(membership) });
  });

  app.post("/memberships/context/select", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const body = asRecord(request.body);
    const decision = await membershipService.selectOrganizationContext({
      userId: session.user.id,
      organizationId: readOptionalString(body, "organizationId")
    });

    if (!decision.allow) {
      return sendMembershipDenied(reply);
    }

    return reply.code(200).send({
      organizationContext: {
        organizationId: decision.organizationId,
        membership: decision.membership ? serializeMembership(decision.membership) : null,
        roles: decision.roles
      }
    });
  });

  app.post("/organizations", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const body = asRecord(request.body);
    const legalName = readRequiredString(body, "legalName");
    const displayName = readRequiredString(body, "displayName");

    if (!legalName || !displayName) {
      return reply.code(400).send({
        error: "RWOS_INVALID_ORGANIZATION_REQUEST",
        message: "Invalid organization request."
      });
    }

    const created = await organizationService.createOrganization({
      actorUserId: session.user.id,
      legalName,
      displayName
    });

    return reply.code(201).send({
      organization: serializeOrganization(created.organization),
      membership: serializeMembership(created.membership),
      organizationContext: created.organizationContext
    });
  });

  app.get("/organizations/current", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const organizationId = readOptionalString(asRecord(request.query), "organizationId");

    if (!organizationId) {
      return sendOrganizationDenied(reply);
    }

    const organization = await organizationService.getOrganization({
      actorUserId: session.user.id,
      organizationId
    });

    return reply.code(200).send({ organization: serializeOrganization(organization) });
  });

  app.get("/organizations/:organizationId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const organization = await organizationService.getOrganization({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId")
    });

    return reply.code(200).send({ organization: serializeOrganization(organization) });
  });

  app.get("/organizations/:organizationId/status", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const organization = await organizationService.getOrganizationStatus({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId")
    });

    return reply.code(200).send({
      organizationId: organization.id,
      status: organization.status,
      version: organization.version
    });
  });

  app.patch("/organizations/:organizationId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const body = asRecord(request.body);
    const organization = await organizationService.updateOrganization({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      legalName: readOptionalString(body, "legalName"),
      displayName: readOptionalString(body, "displayName")
    });

    return reply.code(200).send({ organization: serializeOrganization(organization) });
  });

  app.post("/organizations/:organizationId/residences", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendResidenceDenied(reply);
    }

    const body = asRecord(request.body);
    const name = readRequiredString(body, "name");

    if (!name) {
      return reply.code(400).send({
        error: "RWOS_INVALID_RESIDENCE_REQUEST",
        message: "Invalid residence request."
      });
    }

    const residence = await residenceService.createResidence({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      name,
      addressSummary: readOptionalString(body, "addressSummary"),
      city: readOptionalString(body, "city"),
      region: readOptionalString(body, "region"),
      country: readOptionalString(body, "country")
    });

    return reply.code(201).send({ residence: serializeResidence(residence) });
  });

  app.get("/organizations/:organizationId/residences", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendResidenceDenied(reply);
    }

    const status = readResidenceStatus(readOptionalString(asRecord(request.query), "status"));
    const residences = await residenceService.listResidences({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      status
    });

    return reply.code(200).send({ residences: residences.map(serializeResidence) });
  });

  app.get("/organizations/:organizationId/residences/:residenceId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendResidenceDenied(reply);
    }

    const residence = await residenceService.getResidence({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readRouteParam(request.params, "residenceId")
    });

    return reply.code(200).send({ residence: serializeResidence(residence) });
  });

  app.patch("/organizations/:organizationId/residences/:residenceId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendResidenceDenied(reply);
    }

    const body = asRecord(request.body);
    const residence = await residenceService.updateResidence({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readRouteParam(request.params, "residenceId"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      name: readOptionalString(body, "name"),
      addressSummary: readOptionalString(body, "addressSummary"),
      city: readOptionalString(body, "city"),
      region: readOptionalString(body, "region"),
      country: readOptionalString(body, "country")
    });

    return reply.code(200).send({ residence: serializeResidence(residence) });
  });

  app.post(
    "/organizations/:organizationId/residences/:residenceId/status",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendResidenceDenied(reply);
      }

      const body = asRecord(request.body);
      const status = readResidenceLifecycleStatus(readRequiredString(body, "status"));
      const reason = readRequiredString(body, "reason");

      if (!status || !reason) {
        return reply.code(400).send({
          error: "RWOS_INVALID_RESIDENCE_REQUEST",
          message: "Invalid residence request."
        });
      }

      const residence = await residenceService.updateResidenceStatus({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
        status,
        reason
      });

      return reply.code(200).send({ residence: serializeResidence(residence) });
    }
  );

  app.post(
    "/organizations/:organizationId/residences/:residenceId/departments",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const body = asRecord(request.body);
      const name = readRequiredString(body, "name");

      if (!name) {
        return reply.code(400).send({
          error: "RWOS_INVALID_DEPARTMENT_REQUEST",
          message: "Invalid department request."
        });
      }

      const department = await departmentService.createDepartment({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        name
      });

      return reply.code(201).send({ department: serializeDepartment(department) });
    }
  );

  app.get(
    "/organizations/:organizationId/residences/:residenceId/departments",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const status = readDepartmentStatus(readOptionalString(asRecord(request.query), "status"));
      const departments = await departmentService.listDepartments({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        status
      });

      return reply.code(200).send({ departments: departments.map(serializeDepartment) });
    }
  );

  app.get(
    "/organizations/:organizationId/residences/:residenceId/departments/:departmentId",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const department = await departmentService.getDepartment({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        departmentId: readRouteParam(request.params, "departmentId")
      });

      return reply.code(200).send({ department: serializeDepartment(department) });
    }
  );

  app.patch(
    "/organizations/:organizationId/residences/:residenceId/departments/:departmentId",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const body = asRecord(request.body);
      const department = await departmentService.updateDepartment({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        departmentId: readRouteParam(request.params, "departmentId"),
        expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
        name: readOptionalString(body, "name")
      });

      return reply.code(200).send({ department: serializeDepartment(department) });
    }
  );

  app.post(
    "/organizations/:organizationId/residences/:residenceId/departments/:departmentId/status",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendDepartmentDenied(reply);
      }

      const body = asRecord(request.body);
      const status = readDepartmentLifecycleStatus(readRequiredString(body, "status"));
      const reason = readRequiredString(body, "reason");

      if (!status || !reason) {
        return reply.code(400).send({
          error: "RWOS_INVALID_DEPARTMENT_REQUEST",
          message: "Invalid department request."
        });
      }

      const department = await departmentService.updateDepartmentStatus({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        residenceId: readRouteParam(request.params, "residenceId"),
        departmentId: readRouteParam(request.params, "departmentId"),
        expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
        status,
        reason
      });

      return reply.code(200).send({ department: serializeDepartment(department) });
    }
  );

  app.post("/organizations/:organizationId/job-requests", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const body = asRecord(request.body);
    const urgency = readJobRequestUrgency(readRequiredString(body, "urgency"));
    const requestType = readJobRequestType(readRequiredString(body, "requestType"));
    const startAt = readRequiredDate(body, "startAt");
    const endAt = readRequiredDate(body, "endAt");

    if (!urgency || !requestType || !startAt || !endAt) {
      return reply.code(400).send({
        error: "RWOS_INVALID_JOB_REQUEST",
        message: "Invalid job request."
      });
    }

    const jobRequest = await jobRequestService.createDraft({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readRequiredString(body, "residenceId") ?? "",
      departmentId: readRequiredString(body, "departmentId") ?? "",
      workGroupSlug: readRequiredString(body, "workGroup") ?? "",
      roleDefinitionIdentifier: readRequiredString(body, "roleDefinition") ?? "",
      title: readRequiredString(body, "title") ?? "",
      description: readOptionalString(body, "description"),
      numberOfWorkers: readOptionalNumber(body, "numberOfWorkers") ?? 0,
      urgency,
      requestType,
      timezone: readRequiredString(body, "timezone") ?? "",
      startAt,
      endAt
    });

    return reply.code(201).send({ jobRequest: serializeJobRequest(jobRequest) });
  });

  app.get("/organizations/:organizationId/job-requests", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const query = asRecord(request.query);
    const jobRequests = await jobRequestService.listForOrganization({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readOptionalString(query, "residenceId"),
      departmentId: readOptionalString(query, "departmentId")
    });

    return reply.code(200).send({ jobRequests: jobRequests.map(serializeJobRequest) });
  });

  app.get(
    "/organizations/:organizationId/job-requests/:jobRequestIdOrNumber",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const jobRequest = await jobRequestService.getForOrganization({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  app.patch("/organizations/:organizationId/job-requests/:jobRequestId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const body = asRecord(request.body);
    const urgency =
      body.urgency === undefined
        ? null
        : readJobRequestUrgency(readRequiredString(body, "urgency"));
    const requestType =
      body.requestType === undefined
        ? null
        : readJobRequestType(readRequiredString(body, "requestType"));

    if (body.urgency !== undefined && !urgency) {
      return reply
        .code(400)
        .send({ error: "RWOS_INVALID_JOB_REQUEST", message: "Invalid job request." });
    }

    if (body.requestType !== undefined && !requestType) {
      return reply
        .code(400)
        .send({ error: "RWOS_INVALID_JOB_REQUEST", message: "Invalid job request." });
    }

    const jobRequest = await jobRequestService.updateDraft({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      jobRequestId: readRouteParam(request.params, "jobRequestId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      residenceId: readOptionalString(body, "residenceId"),
      departmentId: readOptionalString(body, "departmentId"),
      workGroupSlug: readOptionalString(body, "workGroup"),
      roleDefinitionIdentifier: readOptionalString(body, "roleDefinition"),
      title: readOptionalString(body, "title"),
      description: body.description === null ? null : readOptionalString(body, "description"),
      numberOfWorkers: readOptionalNumber(body, "numberOfWorkers"),
      urgency,
      requestType,
      timezone: readOptionalString(body, "timezone"),
      startAt: readOptionalDate(body, "startAt"),
      endAt: readOptionalDate(body, "endAt")
    });

    return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
  });

  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/submit",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const body = asRecord(request.body);
      const jobRequest = await jobRequestService.submit({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  app.post(
    "/organizations/:organizationId/job-requests/:jobRequestId/cancel",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const body = asRecord(request.body);
      const reason = readRequiredString(body, "reason");

      if (!reason) {
        return reply
          .code(400)
          .send({ error: "RWOS_INVALID_JOB_REQUEST", message: "Invalid job request." });
      }

      const jobRequest = await jobRequestService.cancel({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
        reason
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  app.get("/platform/job-requests/intake", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const jobRequests = await jobRequestService.listAdminIntake({
      session,
      roles: await resolveAuthorizationRoles(session.user.id)
    });

    return reply.code(200).send({ jobRequests: jobRequests.map(serializeJobRequest) });
  });

  app.get("/platform/job-requests/intake/:jobRequestIdOrNumber", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const jobRequest = await jobRequestService.getForAdmin({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
    });

    return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
  });

  app.post("/platform/job-requests/intake/:jobRequestId/admin-review", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );

    if (!session.authenticated || !session.user) {
      return sendJobRequestDenied(reply);
    }

    const body = asRecord(request.body);
    const jobRequest = await jobRequestService.startAdminReview({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      jobRequestId: readRouteParam(request.params, "jobRequestId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
  });

  app.post(
    "/platform/job-requests/intake/:jobRequestId/request-information",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const body = asRecord(request.body);
      const reason = readRequiredString(body, "reason");

      if (!reason) {
        return reply
          .code(400)
          .send({ error: "RWOS_INVALID_JOB_REQUEST", message: "Invalid job request." });
      }

      const jobRequest = await jobRequestService.requestInformation({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
        reason
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  app.post(
    "/platform/job-requests/intake/:jobRequestId/approve-for-dispatch",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );

      if (!session.authenticated || !session.user) {
        return sendJobRequestDenied(reply);
      }

      const body = asRecord(request.body);
      const jobRequest = await jobRequestService.approveForDispatch({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
      });

      return reply.code(200).send({ jobRequest: serializeJobRequest(jobRequest) });
    }
  );

  app.put(
    "/organizations/:organizationId/calendar/requests/:jobRequestId/profile",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

      const body = asRecord(request.body);
      const qualifications = readStringArray(body, "qualifications");

      if (!qualifications) {
        return reply.code(400).send({
          error: "RWOS_INVALID_CALENDAR_REQUEST",
          message: "Invalid calendar request."
        });
      }

      const profile = await calendarRequestService.upsertClientProfile({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestId: readRouteParam(request.params, "jobRequestId"),
        dutiesSummary: readOptionalString(body, "dutiesSummary"),
        qualifications,
        addressSummary: readOptionalString(body, "addressSummary"),
        specialInstructions: readOptionalString(body, "specialInstructions"),
        expectedVersion: readOptionalNumber(body, "expectedVersion")
      });

      return reply.code(200).send({ profile: serializeCalendarProfile(profile) });
    }
  );

  app.get("/organizations/:organizationId/calendar/requests", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

    const query = asRecord(request.query);
    const requests = await calendarRequestService.listClientCalendar({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      residenceId: readOptionalString(query, "residenceId"),
      departmentId: readOptionalString(query, "departmentId")
    });

    return reply.code(200).send({ requests: requests.map(serializeCalendarRequest) });
  });

  app.get(
    "/organizations/:organizationId/calendar/requests/:jobRequestIdOrNumber",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

      const calendarRequest = await calendarRequestService.getClientCalendarRequest({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
      });

      return reply.code(200).send({ request: serializeCalendarRequest(calendarRequest) });
    }
  );

  app.get("/platform/calendar/requests", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

    const requests = await calendarRequestService.listAdminCalendar({
      session,
      roles: await resolveAuthorizationRoles(session.user.id)
    });

    return reply.code(200).send({ requests: requests.map(serializeCalendarRequest) });
  });

  app.get("/platform/calendar/requests/:jobRequestIdOrNumber", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

    const calendarRequest = await calendarRequestService.getAdminCalendarRequest({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
    });

    return reply.code(200).send({ request: serializeCalendarRequest(calendarRequest) });
  });

  app.put(
    "/platform/calendar/requests/:jobRequestIdOrNumber/verification",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

      const body = asRecord(request.body);
      const contractVerificationState = readCalendarVerificationState(
        readRequiredString(body, "contractVerificationState")
      );
      const paymentMethodReadinessState = readCalendarVerificationState(
        readRequiredString(body, "paymentMethodReadinessState")
      );
      const locationVerificationState = readCalendarVerificationState(
        readRequiredString(body, "locationVerificationState")
      );
      const expectedVersion = readOptionalNumber(body, "expectedVersion");
      if (
        !contractVerificationState ||
        !paymentMethodReadinessState ||
        !locationVerificationState ||
        expectedVersion === null
      ) {
        return reply.code(400).send({
          error: "RWOS_INVALID_CALENDAR_REQUEST",
          message: "Invalid calendar request."
        });
      }

      const profile = await calendarRequestService.updateAdminVerification({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber"),
        contractVerificationState,
        paymentMethodReadinessState,
        locationVerificationState,
        expectedVersion
      });

      return reply.code(200).send({ profile: serializeCalendarProfile(profile) });
    }
  );

  app.get("/worker/calendar/offers/:workerOfferId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const reference = await calendarRequestService.getWorkerOfferCalendarReference({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId")
    });

    return reply.code(200).send({ offer: serializeWorkerCalendarReference(reference) });
  });

  app.post("/platform/dispatches", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const priority = readDispatchPriority(readRequiredString(body, "priority"));
    const dispatchReview = await dispatchService.createDispatch({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      jobRequestIdOrNumber: readRequiredString(body, "jobRequestIdOrNumber") ?? "",
      operationalOwnerUserId: readOptionalString(body, "operationalOwnerUserId"),
      ...(priority ? { priority } : {})
    });

    return reply.code(201).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.get("/platform/dispatches", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const query = asRecord(request.query);
    const dispatches = await dispatchService.listDispatches({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readOptionalString(query, "organizationId")
    });

    return reply
      .code(200)
      .send({ dispatches: dispatches.map((item) => serializeDispatchReview(item)) });
  });

  app.get("/platform/dispatches/:dispatchReviewId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const result = await dispatchService.getDispatch({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId")
    });

    return reply.code(200).send({
      dispatchReview: serializeDispatchReview(result.dispatchReview),
      candidates: result.candidates.map(serializeDispatchCandidate)
    });
  });

  app.post("/platform/dispatches/:dispatchReviewId/owner", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.assignOperationalOwner({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      operationalOwnerUserId: readOptionalString(body, "operationalOwnerUserId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/candidate-review", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.startCandidateReview({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.get("/platform/dispatches/:dispatchReviewId/candidates/search", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const result = await dispatchService.searchCandidates({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId")
    });

    return reply.code(200).send({
      status: result.status,
      candidates: result.candidates.map(serializeDispatchCandidate)
    });
  });

  app.post("/platform/dispatches/:dispatchReviewId/candidates/evaluate", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const result = await dispatchService.evaluateCandidate({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      candidateSourceReference: readRequiredString(body, "candidateSourceReference") ?? ""
    });

    return reply.code(200).send({
      status: result.status,
      candidate: result.candidate ? serializeDispatchCandidate(result.candidate) : null
    });
  });

  app.post("/platform/dispatches/:dispatchReviewId/shortlist", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const candidate = await dispatchService.addCandidateToShortlist({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      candidateSourceReference: readRequiredString(body, "candidateSourceReference") ?? "",
      shortlistOrder: readOptionalNumber(body, "shortlistOrder")
    });

    return reply.code(200).send({ candidate: serializeDispatchCandidate(candidate) });
  });

  app.delete(
    "/platform/dispatches/:dispatchReviewId/shortlist/:candidateSourceReference",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

      const candidate = await dispatchService.removeCandidateFromShortlist({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
        candidateSourceReference: readRouteParam(request.params, "candidateSourceReference")
      });

      return reply.code(200).send({ candidate: serializeDispatchCandidate(candidate) });
    }
  );

  app.post("/platform/dispatches/:dispatchReviewId/shortlist/reorder", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const references = Array.isArray(body.candidateSourceReferences)
      ? body.candidateSourceReferences.filter((value): value is string => typeof value === "string")
      : [];
    const candidates = await dispatchService.reorderShortlist({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      candidateSourceReferences: references
    });

    return reply.code(200).send({ candidates: candidates.map(serializeDispatchCandidate) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/shortlist-ready", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.markShortlistReady({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/offer-preparation", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.moveToOfferPreparation({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/pause", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.pause({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/resume", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.resume({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/cancel", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.cancel({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.post("/platform/dispatches/:dispatchReviewId/close", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const body = asRecord(request.body);
    const dispatchReview = await dispatchService.close({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ dispatchReview: serializeDispatchReview(dispatchReview) });
  });

  app.get("/platform/dispatches/:dispatchReviewId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendDispatchDenied(reply);

    const audit = await dispatchService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRouteParam(request.params, "dispatchReviewId")
    });

    return reply.code(200).send({ audit });
  });

  app.get(
    "/organizations/:organizationId/job-requests/:jobRequestIdOrNumber/dispatch-status",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendJobRequestDenied(reply);

      const status = await dispatchService.getEmployerDispatchStatus({
        actorUserId: session.user.id,
        organizationId: readRouteParam(request.params, "organizationId"),
        jobRequestIdOrNumber: readRouteParam(request.params, "jobRequestIdOrNumber")
      });

      return reply.code(200).send({ dispatchStatus: serializeEmployerDispatchStatus(status) });
    }
  );

  app.post("/platform/worker-offers", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const expiresAt = readRequiredDate(body, "expiresAt");
    if (!expiresAt) return sendWorkerOfferDenied(reply);

    const workerOffer = await workerOfferService.createOffer({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readRequiredString(body, "dispatchReviewId") ?? "",
      workerIdentityId: readRequiredString(body, "workerIdentityId") ?? "",
      expiresAt,
      workerVisibleTitle: readOptionalString(body, "workerVisibleTitle"),
      workerVisibleSummary: readOptionalString(body, "workerVisibleSummary"),
      compensationSummary: readOptionalString(body, "compensationSummary"),
      policySummary: readOptionalString(body, "policySummary")
    });

    return reply.code(201).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.get("/platform/worker-offers", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const query = asRecord(request.query);
    const status = readWorkerOfferStatus(readOptionalString(query, "status"));
    const workerOffers = await workerOfferService.listOffers({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      dispatchReviewId: readOptionalString(query, "dispatchReviewId"),
      organizationId: readOptionalString(query, "organizationId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply
      .code(200)
      .send({ workerOffers: workerOffers.map((item) => serializeWorkerOffer(item)) });
  });

  app.get("/platform/worker-offers/:workerOfferId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const workerOffer = await workerOfferService.readOffer({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId")
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/worker-offers/:workerOfferId/approve", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.approve({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/worker-offers/:workerOfferId/send", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.send({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/worker-offers/:workerOfferId/withdraw", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.withdraw({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/worker-offers/:workerOfferId/cancel", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.cancel({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.get("/platform/worker-offers/:workerOfferId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const audit = await workerOfferService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId")
    });

    return reply.code(200).send({ audit });
  });

  app.get("/worker/offers/:workerOfferId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const workerOffer = await workerOfferService.workerRead({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId")
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/worker/offers/:workerOfferId/accept", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.accept({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      expectedTermsVersionId: readRequiredString(body, "expectedTermsVersionId") ?? "",
      reason: readOptionalString(body, "reason")
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/worker/offers/:workerOfferId/decline", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendWorkerOfferDenied(reply);

    const body = asRecord(request.body);
    const workerOffer = await workerOfferService.decline({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRouteParam(request.params, "workerOfferId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      expectedTermsVersionId: readRequiredString(body, "expectedTermsVersionId") ?? "",
      reason: readOptionalString(body, "reason")
    });

    return reply.code(200).send({ workerOffer: serializeWorkerOffer(workerOffer) });
  });

  app.post("/platform/assignments", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.createFromAcceptedOffer({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      workerOfferId: readRequiredString(body, "workerOfferId") ?? ""
    });

    return reply.code(201).send({ assignment: serializeAssignment(assignment) });
  });

  app.get("/platform/assignments", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const query = asRecord(request.query);
    const status = readAssignmentStatus(readOptionalString(query, "status"));
    const assignments = await assignmentService.listAssignments({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readOptionalString(query, "organizationId"),
      jobRequestId: readOptionalString(query, "jobRequestId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply
      .code(200)
      .send({ assignments: assignments.map((item) => serializeAssignment(item)) });
  });

  app.get("/platform/assignments/:assignmentId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const assignment = await assignmentService.readAssignment({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId")
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/ready-for-attendance", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.markReadyForAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/attendance-window", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.startAttendanceWindow({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/attendance-handoff", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.attendanceHandoff({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/cancel", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.cancel({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? "",
      status: readAssignmentStatus(readOptionalString(body, "status")) ?? "platform_cancelled"
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/assignments/:assignmentId/replacement-required", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.markReplacementRequired({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.get("/platform/assignments/:assignmentId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const audit = await assignmentService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId")
    });

    return reply.code(200).send({ audit });
  });

  app.get("/organizations/:organizationId/assignments", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const query = asRecord(request.query);
    const status = readAssignmentStatus(readOptionalString(query, "status"));
    const assignments = await assignmentService.listAssignments({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readRouteParam(request.params, "organizationId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply
      .code(200)
      .send({ assignments: assignments.map((item) => serializeAssignment(item)) });
  });

  app.get("/worker/assignments/:assignmentId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const assignment = await assignmentService.workerRead({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId")
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/worker/assignments/:assignmentId/acknowledge", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.acknowledge({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/worker/assignments/:assignmentId/withdraw", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAssignmentDenied(reply);

    const body = asRecord(request.body);
    const assignment = await assignmentService.workerWithdraw({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRouteParam(request.params, "assignmentId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ assignment: serializeAssignment(assignment) });
  });

  app.post("/platform/attendance", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.createFromAssignment({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      assignmentId: readRequiredString(body, "assignmentId") ?? "",
      verificationMethod: readOptionalString(body, "verificationMethod")
    });

    return reply.code(201).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.get("/platform/attendance", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const query = asRecord(request.query);
    const status = readAttendanceStatus(readOptionalString(query, "status"));
    const attendanceRecords = await attendanceService.listAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readOptionalString(query, "organizationId"),
      assignmentId: readOptionalString(query, "assignmentId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply.code(200).send({
      attendanceRecords: attendanceRecords.map((item) => serializeAttendanceRecord(item))
    });
  });

  app.get("/platform/attendance/:attendanceRecordId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const attendanceRecord = await attendanceService.readAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/platform/attendance/:attendanceRecordId/complete", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.markCompleted({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/platform/attendance/:attendanceRecordId/missed", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.markMissed({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/platform/attendance/:attendanceRecordId/exception", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.markException({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? "",
      note: readOptionalString(body, "note")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/platform/attendance/:attendanceRecordId/cancel", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.cancel({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.get("/platform/attendance/:attendanceRecordId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const audit = await attendanceService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId")
    });

    return reply.code(200).send({ audit });
  });

  app.get("/organizations/:organizationId/attendance", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const query = asRecord(request.query);
    const status = readAttendanceStatus(readOptionalString(query, "status"));
    const attendanceRecords = await attendanceService.listAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readRouteParam(request.params, "organizationId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply.code(200).send({
      attendanceRecords: attendanceRecords.map((item) => serializeAttendanceRecord(item))
    });
  });

  app.get("/worker/attendance/:attendanceRecordId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const attendanceRecord = await attendanceService.workerRead({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/worker/attendance/:attendanceRecordId/check-in", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.workerCheckIn({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      method: readOptionalString(body, "method"),
      evidenceSummary: readOptionalString(body, "evidenceSummary"),
      locationPolicyResult: readOptionalString(body, "locationPolicyResult")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/worker/attendance/:attendanceRecordId/check-out", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendAttendanceDenied(reply);

    const body = asRecord(request.body);
    const attendanceRecord = await attendanceService.workerCheckOut({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRouteParam(request.params, "attendanceRecordId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      method: readOptionalString(body, "method"),
      evidenceSummary: readOptionalString(body, "evidenceSummary"),
      locationPolicyResult: readOptionalString(body, "locationPolicyResult")
    });

    return reply.code(200).send({ attendanceRecord: serializeAttendanceRecord(attendanceRecord) });
  });

  app.post("/platform/timesheets", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.createFromAttendance({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      attendanceRecordId: readRequiredString(body, "attendanceRecordId") ?? ""
    });

    return reply.code(201).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.get("/platform/timesheets", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const query = asRecord(request.query);
    const status = readTimesheetStatus(readOptionalString(query, "status"));
    const timesheets = await timesheetService.listTimesheets({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readOptionalString(query, "organizationId"),
      assignmentId: readOptionalString(query, "assignmentId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply.code(200).send({ timesheets: timesheets.map((item) => serializeTimesheet(item)) });
  });

  app.get("/platform/timesheets/:timesheetId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const timesheet = await timesheetService.readTimesheet({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId")
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/calculate", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.calculate({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/request-correction", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.requestCorrection({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/approve", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.approve({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/reject", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.reject({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/platform/timesheets/:timesheetId/lock", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.lock({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.get("/platform/timesheets/:timesheetId/audit", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const audit = await timesheetService.readAuditSummary({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId")
    });

    return reply.code(200).send({ audit });
  });

  app.get("/organizations/:organizationId/timesheets", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const query = asRecord(request.query);
    const status = readTimesheetStatus(readOptionalString(query, "status"));
    const timesheets = await timesheetService.listTimesheets({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      organizationId: readRouteParam(request.params, "organizationId"),
      ...(status ? { statuses: [status] } : {})
    });

    return reply.code(200).send({ timesheets: timesheets.map((item) => serializeTimesheet(item)) });
  });

  app.post(
    "/organizations/:organizationId/timesheets/:timesheetId/confirm",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

      const body = asRecord(request.body);
      const timesheet = await timesheetService.employerConfirm({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        timesheetId: readRouteParam(request.params, "timesheetId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
      });

      return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
    }
  );

  app.post(
    "/organizations/:organizationId/timesheets/:timesheetId/dispute",
    async (request, reply) => {
      const session = await authService.validateSession(
        readBearerToken(request.headers.authorization)
      );
      if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

      const body = asRecord(request.body);
      const timesheet = await timesheetService.employerDispute({
        session,
        roles: await resolveAuthorizationRoles(session.user.id),
        timesheetId: readRouteParam(request.params, "timesheetId"),
        expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
        reason: readRequiredString(body, "reason") ?? ""
      });

      return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
    }
  );

  app.get("/worker/timesheets/:timesheetId", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const timesheet = await timesheetService.workerRead({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId")
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/worker/timesheets/:timesheetId/confirm", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.workerConfirm({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  app.post("/worker/timesheets/:timesheetId/dispute", async (request, reply) => {
    const session = await authService.validateSession(
      readBearerToken(request.headers.authorization)
    );
    if (!session.authenticated || !session.user) return sendTimesheetDenied(reply);

    const body = asRecord(request.body);
    const timesheet = await timesheetService.workerDispute({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      timesheetId: readRouteParam(request.params, "timesheetId"),
      expectedVersion: readOptionalNumber(body, "expectedVersion") ?? 0,
      reason: readRequiredString(body, "reason") ?? ""
    });

    return reply.code(200).send({ timesheet: serializeTimesheet(timesheet) });
  });

  async function resolveCatalogueReadRoles(userId: string, organizationId: string | null) {
    if (organizationId) {
      const decision = await membershipService.selectOrganizationContext({
        userId,
        organizationId
      });

      return decision.allow ? decision.roles : [];
    }

    return resolveAuthorizationRoles(userId);
  }

  return app;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readRequiredString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value : null;
}

function readOptionalString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readOptionalNumber(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "number" ? value : null;
}

function readStringArray(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}

function readRequiredDate(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string") return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readOptionalDate(body: Record<string, unknown>, key: string) {
  if (body[key] === undefined || body[key] === null) return null;

  return readRequiredDate(body, key);
}

function readBearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) return null;

  return authorization.slice("Bearer ".length).trim() || null;
}

function readRouteParam(params: unknown, key: string) {
  const record = asRecord(params);
  const value = record[key];

  return typeof value === "string" ? value : "";
}

function createAuthenticationRateLimiter(options = { maxAttempts: 5, windowMs: 60_000 }) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    consume(key: string) {
      const now = Date.now();
      const current = buckets.get(key);
      const bucket =
        current && current.resetAt > now
          ? current
          : { count: 0, resetAt: now + options.windowMs };

      bucket.count += 1;
      buckets.set(key, bucket);

      return {
        allowed: bucket.count <= options.maxAttempts,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
      };
    }
  };
}

function sendAuthenticationRateLimited(reply: FastifyReply, retryAfterSeconds: number) {
  return reply
    .code(429)
    .header("retry-after", String(retryAfterSeconds))
    .send({
      error: "RWOS_AUTH_RATE_LIMITED",
      message: "Too many authentication attempts. Try again later."
    });
}

function serializeAuthenticationResult(result: {
  user: Awaited<ReturnType<AuthenticationService["signIn"]>>["user"];
  session: Awaited<ReturnType<AuthenticationService["signIn"]>>["session"];
  token: string;
}) {
  return {
    user: result.user,
    session: {
      ...result.session,
      expiresAt: result.session.expiresAt.toISOString()
    },
    token: result.token
  };
}

function sendAuthenticationError(reply: FastifyReply, error: unknown) {
  if (error instanceof PasswordPolicyError) {
    return reply.code(400).send({
      error: passwordPolicyErrorCode,
      message: "Password requirements not met."
    });
  }

  if (error instanceof RegistrationUnavailableError) {
    return reply.code(409).send({
      error: registrationUnavailableCode,
      message: "Registration unavailable."
    });
  }

  if (error instanceof AuthenticationError) {
    return reply.code(401).send({
      error: authenticationErrorCode,
      message: authenticationErrorMessage
    });
  }

  if (error instanceof AuthenticationRequiredError) {
    return reply.code(401).send({
      error: authenticationRequiredCode,
      message: "Authentication required."
    });
  }

  throw error;
}

function sendMembershipDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendOrganizationDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendResidenceDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendDepartmentDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendWorkGroupDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendRoleDefinitionDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendJobRequestDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendDispatchDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendWorkerOfferDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendAssignmentDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendAttendanceDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendTimesheetDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function serializeMemberships(
  memberships: Awaited<ReturnType<OrganizationMembershipService["listMemberships"]>>
) {
  return memberships.map(serializeMembership);
}

function serializeMembership(
  membership: Awaited<ReturnType<OrganizationMembershipService["listMemberships"]>>[number]
) {
  return {
    ...membership,
    invitedAt: membership.invitedAt.toISOString(),
    activatedAt: membership.activatedAt?.toISOString() ?? null,
    suspendedAt: membership.suspendedAt?.toISOString() ?? null,
    revokedAt: membership.revokedAt?.toISOString() ?? null,
    expiresAt: membership.expiresAt?.toISOString() ?? null,
    updatedAt: membership.updatedAt.toISOString()
  };
}

function serializeOrganization(
  organization: Awaited<ReturnType<EmployerOrganizationService["getOrganization"]>>
) {
  return {
    ...organization,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    restrictedAt: organization.restrictedAt?.toISOString() ?? null,
    suspendedAt: organization.suspendedAt?.toISOString() ?? null,
    closedAt: organization.closedAt?.toISOString() ?? null
  };
}

function serializeResidence(residence: Awaited<ReturnType<ResidenceService["getResidence"]>>) {
  return {
    ...residence,
    createdAt: residence.createdAt.toISOString(),
    updatedAt: residence.updatedAt.toISOString(),
    archivedAt: residence.archivedAt?.toISOString() ?? null
  };
}

function serializeDepartment(department: Awaited<ReturnType<DepartmentService["getDepartment"]>>) {
  return {
    ...department,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
    archivedAt: department.archivedAt?.toISOString() ?? null
  };
}

function serializeWorkGroup(
  workGroup: Awaited<ReturnType<WorkGroupService["getActiveWorkGroup"]>>
) {
  return {
    ...workGroup,
    createdAt: workGroup.createdAt.toISOString(),
    updatedAt: workGroup.updatedAt.toISOString()
  };
}

function serializeRoleDefinition(
  roleDefinition: Awaited<ReturnType<RoleDefinitionService["getActiveRoleDefinition"]>>
) {
  return {
    ...roleDefinition,
    createdAt: roleDefinition.createdAt.toISOString(),
    updatedAt: roleDefinition.updatedAt.toISOString()
  };
}

function serializeJobRequest(jobRequest: Awaited<ReturnType<JobRequestService["createDraft"]>>) {
  return {
    ...jobRequest,
    startAt: jobRequest.startAt.toISOString(),
    endAt: jobRequest.endAt.toISOString(),
    createdAt: jobRequest.createdAt.toISOString(),
    updatedAt: jobRequest.updatedAt.toISOString(),
    submittedAt: jobRequest.submittedAt?.toISOString() ?? null,
    cancelledAt: jobRequest.cancelledAt?.toISOString() ?? null,
    expiredAt: jobRequest.expiredAt?.toISOString() ?? null,
    archivedAt: jobRequest.archivedAt?.toISOString() ?? null
  };
}

function serializeDispatchReview(
  dispatchReview: Awaited<ReturnType<DispatchService["createDispatch"]>>
) {
  return {
    ...dispatchReview,
    startedAt: dispatchReview.startedAt?.toISOString() ?? null,
    pausedAt: dispatchReview.pausedAt?.toISOString() ?? null,
    cancelledAt: dispatchReview.cancelledAt?.toISOString() ?? null,
    closedAt: dispatchReview.closedAt?.toISOString() ?? null,
    createdAt: dispatchReview.createdAt.toISOString(),
    updatedAt: dispatchReview.updatedAt.toISOString()
  };
}

function serializeDispatchCandidate(
  candidate: Awaited<ReturnType<DispatchService["addCandidateToShortlist"]>>
) {
  return {
    ...candidate,
    sourceFreshnessAt: candidate.sourceFreshnessAt?.toISOString() ?? null,
    lastEvaluatedAt: candidate.lastEvaluatedAt?.toISOString() ?? null,
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString()
  };
}

function serializeEmployerDispatchStatus(
  status: Awaited<ReturnType<DispatchService["getEmployerDispatchStatus"]>>
) {
  return {
    ...status,
    updatedAt: status.updatedAt?.toISOString() ?? null
  };
}

function serializeWorkerOffer(workerOffer: Awaited<ReturnType<WorkerOfferService["createOffer"]>>) {
  return {
    ...workerOffer,
    expiresAt: workerOffer.expiresAt.toISOString(),
    approvedAt: workerOffer.approvedAt?.toISOString() ?? null,
    sentAt: workerOffer.sentAt?.toISOString() ?? null,
    deliveredAt: workerOffer.deliveredAt?.toISOString() ?? null,
    viewedAt: workerOffer.viewedAt?.toISOString() ?? null,
    respondedAt: workerOffer.respondedAt?.toISOString() ?? null,
    withdrawnAt: workerOffer.withdrawnAt?.toISOString() ?? null,
    cancelledAt: workerOffer.cancelledAt?.toISOString() ?? null,
    createdAt: workerOffer.createdAt.toISOString(),
    updatedAt: workerOffer.updatedAt.toISOString(),
    currentTermsVersion: workerOffer.currentTermsVersion
      ? {
          ...workerOffer.currentTermsVersion,
          startAt: workerOffer.currentTermsVersion.startAt.toISOString(),
          endAt: workerOffer.currentTermsVersion.endAt.toISOString(),
          createdAt: workerOffer.currentTermsVersion.createdAt.toISOString()
        }
      : null
  };
}

function serializeCalendarProfile(
  profile: Awaited<ReturnType<CalendarRequestService["upsertClientProfile"]>>
) {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

function serializeCalendarRequest(
  request: Awaited<ReturnType<CalendarRequestService["getClientCalendarRequest"]>>
) {
  return {
    ...request,
    startAt: request.startAt.toISOString(),
    endAt: request.endAt.toISOString(),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString()
  };
}

function serializeWorkerCalendarReference(
  reference: Awaited<ReturnType<CalendarRequestService["getWorkerOfferCalendarReference"]>>
) {
  return {
    ...reference,
    expiresAt: reference.expiresAt.toISOString(),
    startAt: reference.startAt?.toISOString() ?? null,
    endAt: reference.endAt?.toISOString() ?? null
  };
}

function serializeAssignment(
  assignment: Awaited<ReturnType<AssignmentService["createFromAcceptedOffer"]>>
) {
  return {
    ...assignment,
    confirmedStartAt: assignment.confirmedStartAt.toISOString(),
    confirmedEndAt: assignment.confirmedEndAt.toISOString(),
    capacityCheckedAt: assignment.capacityCheckedAt.toISOString(),
    conflictCheckedAt: assignment.conflictCheckedAt.toISOString(),
    confirmedAt: assignment.confirmedAt.toISOString(),
    workerAcknowledgedAt: assignment.workerAcknowledgedAt?.toISOString() ?? null,
    readyForAttendanceAt: assignment.readyForAttendanceAt?.toISOString() ?? null,
    attendanceWindowStartedAt: assignment.attendanceWindowStartedAt?.toISOString() ?? null,
    attendanceHandoffAt: assignment.attendanceHandoffAt?.toISOString() ?? null,
    workerWithdrawnAt: assignment.workerWithdrawnAt?.toISOString() ?? null,
    cancelledAt: assignment.cancelledAt?.toISOString() ?? null,
    replacementRequiredAt: assignment.replacementRequiredAt?.toISOString() ?? null,
    closedAt: assignment.closedAt?.toISOString() ?? null,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString()
  };
}

function serializeAttendanceRecord(
  attendanceRecord: Awaited<ReturnType<AttendanceService["createFromAssignment"]>>
) {
  return {
    ...attendanceRecord,
    scheduledStartAt: attendanceRecord.scheduledStartAt.toISOString(),
    scheduledEndAt: attendanceRecord.scheduledEndAt.toISOString(),
    checkInAt: attendanceRecord.checkInAt?.toISOString() ?? null,
    checkOutAt: attendanceRecord.checkOutAt?.toISOString() ?? null,
    createdAt: attendanceRecord.createdAt.toISOString(),
    updatedAt: attendanceRecord.updatedAt.toISOString(),
    completedAt: attendanceRecord.completedAt?.toISOString() ?? null,
    cancelledAt: attendanceRecord.cancelledAt?.toISOString() ?? null
  };
}

function serializeTimesheet(
  timesheet: Awaited<ReturnType<TimesheetService["createFromAttendance"]>>
) {
  return {
    ...timesheet,
    scheduledStartAt: timesheet.scheduledStartAt.toISOString(),
    scheduledEndAt: timesheet.scheduledEndAt.toISOString(),
    actualCheckInAt: timesheet.actualCheckInAt?.toISOString() ?? null,
    actualCheckOutAt: timesheet.actualCheckOutAt?.toISOString() ?? null,
    workerReviewedAt: timesheet.workerReviewedAt?.toISOString() ?? null,
    employerReviewedAt: timesheet.employerReviewedAt?.toISOString() ?? null,
    platformReviewedAt: timesheet.platformReviewedAt?.toISOString() ?? null,
    approvedAt: timesheet.approvedAt?.toISOString() ?? null,
    lockedAt: timesheet.lockedAt?.toISOString() ?? null,
    rejectedAt: timesheet.rejectedAt?.toISOString() ?? null,
    cancelledAt: timesheet.cancelledAt?.toISOString() ?? null,
    createdAt: timesheet.createdAt.toISOString(),
    updatedAt: timesheet.updatedAt.toISOString()
  };
}

function readResidenceStatus(value: string | null): ResidenceStatus | null {
  return value === "draft" ||
    value === "active" ||
    value === "restricted" ||
    value === "inactive" ||
    value === "closed"
    ? value
    : null;
}

function readResidenceLifecycleStatus(value: string | null) {
  return value === "active" || value === "inactive" || value === "closed" ? value : null;
}

function readDepartmentStatus(value: string | null): DepartmentStatus | null {
  return value === "draft" ||
    value === "active" ||
    value === "restricted" ||
    value === "inactive" ||
    value === "closed"
    ? value
    : null;
}

function readDepartmentLifecycleStatus(value: string | null) {
  return value === "active" || value === "inactive" || value === "closed" ? value : null;
}

function readWorkGroupLifecycleStatus(value: string | null) {
  return value === "active" || value === "inactive" ? value : null;
}

function readRoleDefinitionLifecycleStatus(value: string | null) {
  return value === "active" || value === "inactive" ? value : null;
}

function readJobRequestUrgency(value: string | null): JobRequestUrgency | null {
  return value === "normal" || value === "urgent" || value === "immediate" ? value : null;
}

function readJobRequestType(value: string | null): JobRequestType | null {
  return value === "single_day" || value === "multi_day" || value === "recurring_intent"
    ? value
    : null;
}

function readCalendarVerificationState(value: string | null): CalendarVerificationState | null {
  return value === "pending" ||
    value === "verified" ||
    value === "failed" ||
    value === "unavailable"
    ? value
    : null;
}

function readDispatchPriority(value: string | null): DispatchPriority | null {
  return value === "normal" || value === "urgent" || value === "emergency" ? value : null;
}

function readWorkerOfferStatus(value: string | null): WorkerOfferStatus | null {
  return value === "draft" ||
    value === "approved" ||
    value === "sent" ||
    value === "delivered" ||
    value === "viewed" ||
    value === "accepted" ||
    value === "declined" ||
    value === "expired" ||
    value === "withdrawn" ||
    value === "cancelled"
    ? value
    : null;
}

function readAssignmentStatus(value: string | null): AssignmentStatus | null {
  return value === "pending_validation" ||
    value === "confirmed" ||
    value === "worker_acknowledged" ||
    value === "ready_for_attendance" ||
    value === "in_attendance_window" ||
    value === "attendance_handoff" ||
    value === "worker_withdrawn" ||
    value === "employer_cancelled" ||
    value === "platform_cancelled" ||
    value === "replacement_required" ||
    value === "expired_before_start" ||
    value === "closed"
    ? value
    : null;
}

function readAttendanceStatus(value: string | null): AttendanceStatus | null {
  return value === "pending_start" ||
    value === "checked_in" ||
    value === "checked_out" ||
    value === "completed" ||
    value === "missed" ||
    value === "cancelled" ||
    value === "exception"
    ? value
    : null;
}

function readTimesheetStatus(value: string | null): TimesheetStatus | null {
  return value === "draft" ||
    value === "calculation_pending" ||
    value === "review_required" ||
    value === "worker_review" ||
    value === "employer_review" ||
    value === "platform_review" ||
    value === "approved" ||
    value === "locked" ||
    value === "rejected" ||
    value === "correction_required" ||
    value === "cancelled"
    ? value
    : null;
}

function createUnavailableDispatchService(): DispatchService {
  const denied = async () => {
    throw new DispatchError({
      status: "permission_denied",
      allow: false,
      dispatchReview: null,
      roles: [],
      internalReason: "dispatch_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    createDispatch: denied,
    listDispatches: denied,
    getDispatch: denied,
    assignOperationalOwner: denied,
    startCandidateReview: denied,
    searchCandidates: denied,
    evaluateCandidate: denied,
    addCandidateToShortlist: denied,
    removeCandidateFromShortlist: denied,
    reorderShortlist: denied,
    markShortlistReady: denied,
    moveToOfferPreparation: denied,
    pause: denied,
    resume: denied,
    cancel: denied,
    close: denied,
    readAuditSummary: denied,
    getEmployerDispatchStatus: denied
  } as DispatchService;
}

function createUnavailableWorkerOfferService(): WorkerOfferService {
  const denied = async () => {
    throw new WorkerOfferError({
      status: "permission_denied",
      allow: false,
      workerOffer: null,
      roles: [],
      internalReason: "worker_offer_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    ensureWorkerIdentity: denied,
    createOffer: denied,
    listOffers: denied,
    readOffer: denied,
    approve: denied,
    send: denied,
    workerRead: denied,
    workerCalendarReference: denied,
    accept: denied,
    decline: denied,
    withdraw: denied,
    cancel: denied,
    readAuditSummary: denied
  } as WorkerOfferService;
}

function createUnavailableAssignmentService(): AssignmentService {
  const denied = async () => {
    throw new AssignmentError({
      status: "permission_denied",
      allow: false,
      assignment: null,
      roles: [],
      internalReason: "assignment_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    createFromAcceptedOffer: denied,
    listAssignments: denied,
    readAssignment: denied,
    workerRead: denied,
    acknowledge: denied,
    workerWithdraw: denied,
    markReadyForAttendance: denied,
    startAttendanceWindow: denied,
    attendanceHandoff: denied,
    cancel: denied,
    markReplacementRequired: denied,
    readAuditSummary: denied
  } as AssignmentService;
}

function createUnavailableAttendanceService(): AttendanceService {
  const denied = async () => {
    throw new AttendanceError({
      status: "permission_denied",
      allow: false,
      attendanceRecord: null,
      roles: [],
      internalReason: "attendance_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    createFromAssignment: denied,
    listAttendance: denied,
    readAttendance: denied,
    workerRead: denied,
    workerCheckIn: denied,
    workerCheckOut: denied,
    markCompleted: denied,
    markMissed: denied,
    markException: denied,
    cancel: denied,
    readAuditSummary: denied
  } as AttendanceService;
}

function createUnavailableTimesheetService(): TimesheetService {
  const denied = async () => {
    throw new TimesheetError({
      status: "permission_denied",
      allow: false,
      timesheet: null,
      roles: [],
      internalReason: "timesheet_service_unavailable",
      externalCode: authorizationDeniedCode,
      externalMessage: authorizationDeniedMessage
    });
  };

  return {
    createFromAttendance: denied,
    calculate: denied,
    listTimesheets: denied,
    readTimesheet: denied,
    workerRead: denied,
    workerConfirm: denied,
    workerDispute: denied,
    employerConfirm: denied,
    employerDispute: denied,
    requestCorrection: denied,
    approve: denied,
    reject: denied,
    lock: denied,
    readAuditSummary: denied
  } as TimesheetService;
}

function createUnavailableCalendarRequestService(): CalendarRequestService {
  const denied = async () => {
    throw new CalendarRequestError("RWOS_INVALID_CALENDAR_REQUEST");
  };

  return {
    upsertClientProfile: denied,
    updateAdminVerification: denied,
    listClientCalendar: denied,
    getClientCalendarRequest: denied,
    listAdminCalendar: denied,
    getAdminCalendarRequest: denied,
    getWorkerOfferCalendarReference: denied
  } as CalendarRequestService;
}
