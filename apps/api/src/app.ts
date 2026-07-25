import Fastify, { type FastifyReply } from "fastify";
import {
  AuthenticationError,
  AuthenticationRequiredError,
  DepartmentError,
  DispatchError,
  EmployerOrganizationError,
  JobRequestError,
  OrganizationMembershipError,
  PasswordPolicyError,
  ResidenceError,
  RegistrationUnavailableError,
  RoleDefinitionError,
  WorkGroupError,
  authenticationErrorCode,
  authenticationErrorMessage,
  authenticationRequiredCode,
  authorizationDeniedCode,
  authorizationDeniedMessage,
  createAuthenticationService,
  createAuthorizationService,
  createDepartmentService,
  createDispatchService,
  createEmployerOrganizationService,
  createJobRequestService,
  createOrganizationMembershipService,
  createResidenceService,
  createRoleDefinitionService,
  createWorkGroupService,
  createPrismaDepartmentRepository,
  createPrismaDispatchRepository,
  createPrismaAuthenticationRepository,
  createPrismaEmployerOrganizationRepository,
  createPrismaJobRequestRepository,
  createPrismaOrganizationMembershipRepository,
  createPrismaResidenceRepository,
  createPrismaRoleDefinitionRepository,
  createPrismaWorkGroupRepository,
  passwordPolicyErrorCode,
  registrationUnavailableCode,
  toSafeAuthorizationResponse,
  type AuthorizationRoleKey,
  type AuthorizationService,
  type AuthenticationService,
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

function readDispatchPriority(value: string | null): DispatchPriority | null {
  return value === "normal" || value === "urgent" || value === "emergency" ? value : null;
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
